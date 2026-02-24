
/* Production-ready service worker for offline support.
     Strategy summary:
     - Precache app shell (index.html, CSS, JS, menu.json, manifest, icons).
     - Runtime cache images and other fetched assets with Cache-First for images
         (serves from cache when offline and caches new images when online).
     - For navigation requests, respond with network-first then fall back to cached index.html.
     - Use cache versioning and clean up old caches on activate.
*/

const CACHE_VERSION = 'v5';
const PRECACHE = `cafe-app-shell-${CACHE_VERSION}`;
const RUNTIME = `cafe-runtime-${CACHE_VERSION}`;

// Files to precache — use paths relative to the service worker scope so
// the app can be deployed at a subpath (GitHub Pages, Netlify subfolder, etc.).
// Note: I intentionally avoid precaching 'index.html' to ensure the latest
// HTML is fetched from the network (prevents stale cached app shell hiding updates).
const PRECACHE_URLS = [
    'menu.json',
    'manifest.json'
];

// Helper to avoid caching non-http(s) or cross-origin requests (eg. chrome-extension://)
function isCacheableRequest(request) {
    try {
        const u = new URL(request.url);
        return (u.protocol === 'http:' || u.protocol === 'https:') && u.origin === self.location.origin;
    } catch (e) {
        return false;
    }
}
self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(PRECACHE).then(cache => cache.addAll(PRECACHE_URLS))
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== PRECACHE && key !== RUNTIME)
                    .map(key => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

// Helper: Cache-first with network update for images and other static assets.
async function cacheFirstThenUpdate(request) {
    const cache = await caches.open(RUNTIME);
    const cached = await cache.match(request);
    if (cached) return cached;
    try {
        const response = await fetch(request);
        if (response && response.status === 200 && isCacheableRequest(request) && !response.bodyUsed) {
            try { await cache.put(request, response.clone()); } catch (e) { /* ignore cache errors */ }
        }
        return response;
    } catch (err) {
        return cached || Promise.reject(err);
    }
}

self.addEventListener('fetch', event => {
    const request = event.request;

    // Always bypass non-GET requests
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // Serve precached assets (app shell) cache-first — tolerant to subpath hosting
    if (PRECACHE_URLS.some(p => url.pathname.endsWith('/' + p) || url.pathname.endsWith(p))) {
        event.respondWith(
            caches.match(request).then(cached => cached || fetch(request).then(networkRes => {
                return caches.open(RUNTIME).then(async cache => {
                    if (isCacheableRequest(request) && networkRes && networkRes.status === 200 && !networkRes.bodyUsed) {
                        try { await cache.put(request, networkRes.clone()); } catch (e) { /* ignore */ }
                    }
                    return networkRes;
                });
            }).catch(() => cached))
        );
        return;
    }

    // Treat core assets (CSS/JS) with network-first so dev changes propagate immediately
    if (url.pathname.endsWith('/style.css') || url.pathname.endsWith('/app.js') || url.pathname.endsWith('/index.html') || url.pathname.endsWith('style.css') || url.pathname.endsWith('app.js') || url.pathname.endsWith('index.html')) {
        event.respondWith(
            fetch(request).then(networkRes => {
                // update runtime cache for these assets
                try {
                    if (isCacheableRequest(request) && networkRes && networkRes.status === 200 && !networkRes.bodyUsed) {
                        caches.open(RUNTIME).then(cache => cache.put(request, networkRes.clone())).catch(() => { });
                    }
                } catch (e) { }
                return networkRes;
            }).catch(() => caches.match(request))
        );
        return;
    }

    // Images: cache-first then network update
    if (url.pathname.indexOf('/images/') !== -1) {
        event.respondWith(cacheFirstThenUpdate(request));
        return;
    }

    // Provide stale-while-revalidate for menu.json so UI updates in background
    if (url.pathname.endsWith('/menu.json') || url.pathname === 'menu.json') {
        event.respondWith(
            caches.open(RUNTIME).then(async cache => {
                const cached = await cache.match(request);
                const networkPromise = fetch(request).then(networkRes => {
                    if (networkRes && networkRes.status === 200 && isCacheableRequest(request) && !networkRes.bodyUsed) {
                        try { cache.put(request, networkRes.clone()).catch(() => { }); } catch (e) { }
                    }
                    return networkRes;
                }).catch(() => null);

                // Return cached immediately if available, otherwise wait for network
                return cached || networkPromise;
            })
        );
        return;
    }

    // Navigation requests: try network first, fall back to cached index.html
    if (request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html')) {
        event.respondWith(
            fetch(request).then(response => {
                // update cache for navigation responses
                try {
                    if (response && response.status === 200) {
                        const copy = response.clone();
                        // store using scope-relative name so subpath deployments match
                        caches.open(RUNTIME).then(cache => cache.put('index.html', copy)).catch(() => { });
                    }
                } catch (e) { /* ignore clone/cache errors */ }
                return response;
            }).catch(() => caches.match('/index.html'))
        );
        return;
    }

    // Default: try cache first, then network and populate runtime cache
    event.respondWith(
        caches.match(request).then(cached => {
            if (cached) return cached;
            return fetch(request).then(response => {
                return caches.open(RUNTIME).then(async cache => {
                    if (isCacheableRequest(request) && response && response.status === 200 && !response.bodyUsed) {
                        try { await cache.put(request, response.clone()); } catch (e) { }
                    }
                    return response;
                });
            }).catch(() => cached);
        })
    );
});

// Listen for skipWaiting message from the page to activate new SW immediately.
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});