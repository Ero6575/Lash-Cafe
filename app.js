console.log('app.js loading', new Date().toISOString());
let menuData = {};

// ═══════════════════════════════════════════════════════
// FIX 7: Global reference to Supabase client for realtime
// ═══════════════════════════════════════════════════════
let _supaClient = null;

// Safe localStorage write (no-op in private mode)
function safeSetLocalStorage(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* ignore */ }
}

// Translations
const translations = {
    en: {
        welcome: 'Welcome to our restaurant! Enjoy our delicious menu.',
        categories: {
            all: 'All',
            breakfast: 'Breakfast',
            burger: 'Burger',
            pizza: 'Pizza',
            sandwich: 'Sandwich',
            chicken: 'Chicken',
            fish: 'Fish',
            rice: 'Rice',
            pasta: 'Pasta',
            salad: 'Salad',
            'hot-drinks': 'Hot Drinks',
            juice: 'Juice',
            'soft-drinks': 'Soft Drinks'
        },
        ingredients: 'Ingredients',
        notListed: 'Not listed'
    },
    am: {
        welcome: 'እንኳን ደህና መጡ! የእኛን ምግብ ዝርዝር ይሞክሩ።',
        categories: {
            all: 'ሁሉም',
            breakfast: 'ቁርስ',
            burger: 'በርገር',
            pizza: 'ፒዛ',
            sandwich: 'ሳንድዊች',
            chicken: 'ዶሮ',
            fish: 'ዓሣ',
            rice: 'ሩዝ',
            pasta: 'ፓስታ',
            salad: 'ሰላጣ',
            'hot-drinks': 'ትኩስ መጠጦች',
            juice: 'ጭማቂ',
            'soft-drinks': 'ለስላሳ መጠጦች'
        },
        ingredients: 'ንጥር ነገሮች',
        notListed: 'አልተዘረዘረም'
    },
    om: {
        welcome: 'Baga nagaan dhufte! Menu keenya yalaa.',
        categories: {
            all: 'Hunda',
            breakfast: 'Ciree',
            burger: 'Baargari',
            pizza: 'Piizza',
            sandwich: 'Saandwiichii',
            chicken: 'Lukkuu',
            fish: 'Qurxummii',
            rice: 'Ruuzii',
            pasta: 'Paastaa',
            salad: 'Salaaxa',
            'hot-drinks': 'Dhugaatii ho\'aa',
            juice: 'Juusii',
            'soft-drinks': 'Dhugaatii laalaafaa'
        },
        ingredients: 'Qabiyyee',
        notListed: 'Hin argamne'
    }
};

// DOM elements
const languageSelect = document.getElementById('language-select');
const searchInput = document.getElementById('search-input');
const categoryBtns = document.querySelectorAll('.category-btn');
const menuContainer = document.getElementById('menu-container');
const welcomeText = document.getElementById('welcome-text');

// Current state
let currentLanguage = 'en';
let currentCategory = 'all';
let swRefreshing = false;

// Helper: get translated field
function t(item, field) {
    const val = item[field];
    if (!val) return '';
    if (typeof val === 'object') {
        return val[currentLanguage] || val.en || '';
    }
    return val;
}

function parsePossibleJSON(val) {
    if (typeof val !== 'string') return val;
    const s = val.trim();
    if (!(s.startsWith('{') || s.startsWith('['))) return val;
    try { return JSON.parse(s); } catch (e) { return val; }
}

function getTranslatedString(item, field) {
    let v = item && item[field];
    if (v == null) return '';
    if (typeof v === 'string') v = parsePossibleJSON(v);
    if (Array.isArray(v)) return v.join(', ');
    if (typeof v === 'object') {
        const maybe = v[currentLanguage] || v.en || '';
        if (Array.isArray(maybe)) return maybe.join(', ');
        return String(maybe || '');
    }
    return String(v || '');
}

function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, (s) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": "&#39;" })[s]);
}

function loadLanguage() {
    const saved = localStorage.getItem('language');
    if (saved && translations[saved]) {
        currentLanguage = saved;
        languageSelect.value = saved;
    }
    updateLanguage();
}

function updateLanguage() {
    welcomeText.textContent = translations[currentLanguage].welcome;
    categoryBtns.forEach(btn => {
        const cat = btn.dataset.category;
        btn.textContent = translations[currentLanguage].categories[cat];
    });
    renderMenu();
}

function renderMenu(items = null) {
    menuContainer.innerHTML = '';
    const itemsToRender = items || getItemsForCategory(currentCategory);

    const fallbackImage =
        'https://images.unsplash.com/photo-1550547660-d9450f859349';

    itemsToRender.forEach(item => {
        const card = document.createElement('div');
        card.className = 'menu-item';

        const displayName = getTranslatedString(item, 'name') || '';
        const imgSrc = item.image ? item.image : fallbackImage;
        const ingredientsText = getTranslatedString(item, 'ingredients');

        card.innerHTML = `
            <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(displayName)}" loading="lazy" onerror="this.onerror=null;this.src='${fallbackImage}'">
            <div class="menu-item-content">
                <h3>${escapeHtml(displayName)}</h3>
                <p>${escapeHtml(item.price)} Birr</p>
                <details class="ingredients">
                    <summary>${escapeHtml(translations[currentLanguage].ingredients)}</summary>
                    <div class="ingredients-content">
                        ${ingredientsText ? (`<ul>${ingredientsText.split(',').map(s => `<li>${escapeHtml(s.trim())}</li>`).join('')}</ul>`) : (`<p>${escapeHtml(translations[currentLanguage].notListed)}</p>`)}
                    </div>
                </details>
            </div>
        `;

        menuContainer.appendChild(card);
    });

    if (!itemsToRender || itemsToRender.length === 0) {
        const no = document.createElement('div');
        no.className = 'no-results';
        no.textContent = currentLanguage === 'am' ? 'ምንም አይታየም' : currentLanguage === 'om' ? 'Waa hin argamne' : 'No results found';
        menuContainer.appendChild(no);
    }
}

function getItemsForCategory(category) {
    if (category === 'all') {
        return Object.values(menuData).flat();
    }
    return menuData[category] || [];
}

function filterItems(query) {
    const allItems = Object.values(menuData).flat();
    const q = query.toLowerCase();
    return allItems.filter(item => {
        const name = (t(item, 'name') || (item.name && (item.name.en || '')) || '').toLowerCase();
        const ing = (t(item, 'ingredients') || '').toLowerCase();
        const price = String(item.price || '').toLowerCase();
        return name.includes(q) || ing.includes(q) || price.includes(q);
    });
}

// Event listeners
languageSelect.addEventListener('change', () => {
    currentLanguage = languageSelect.value;
    localStorage.setItem('language', currentLanguage);
    updateLanguage();
});

categoryBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        categoryBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCategory = btn.dataset.category;
        localStorage.setItem('lastCategory', currentCategory);
        searchInput.value = '';
        try { localStorage.setItem('lastSearch', ''); } catch (e) { }
        renderMenu();
    });
});

searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim();
    try { localStorage.setItem('lastSearch', query); } catch (e) { }

    if (query) {
        const filtered = filterItems(query);
        categoryBtns.forEach(b => b.classList.remove('active'));
        renderMenu(filtered);
    } else {
        categoryBtns.forEach(b => b.classList.remove('active'));
        const activeBtn = Array.from(categoryBtns).find(b => b.dataset.category === currentCategory);
        if (activeBtn) activeBtn.classList.add('active');
        renderMenu();
    }
});

// ═══════════════════════════════════════════════════════
// FIX 6: Include `ingredients` in Supabase mapping
// FIX 7: Store client globally + add realtime subscription
// ═══════════════════════════════════════════════════════
async function tryLoadFromSupabase() {
    try {
        const url = window.SUPABASE_URL;
        const key = window.SUPABASE_ANON_KEY;
        if (!url || !key) return null;

        if (typeof window.supabase === 'undefined' && typeof window.createClient === 'undefined') {
            await new Promise((resolve, reject) => {
                const s = document.createElement('script');
                s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/dist/umd/supabase.min.js';
                s.onload = resolve;
                s.onerror = reject;
                document.head.appendChild(s);
            });
        }

        const client = window.SUPABASE_CLIENT
            || ((window.supabase && typeof window.supabase.createClient === 'function')
                ? window.supabase.createClient(url, key)
                : (window.createClient ? window.createClient(url, key) : null));
        if (!client) return null;

        // FIX 7: Persist client for realtime reuse
        if (!window.SUPABASE_CLIENT) window.SUPABASE_CLIENT = client;
        _supaClient = client;

        const [{ data: categories = [] } = {}, { data: items = [] } = {}] = await Promise.all([
            client.from('categories').select('id, name'),
            client.from('menu_items').select('*')
        ]);

        const catMap = {};
        (categories || []).forEach(c => {
            const slug = (c.name || '').toString().toLowerCase().trim().replace(/\s+/g, '-');
            catMap[c.id] = { slug, name: c.name };
        });

        const grouped = {};
        (items || []).forEach(row => {
            const catSlug = (row.category_id && catMap[row.category_id] && catMap[row.category_id].slug) || 'uncategorized';
            if (!grouped[catSlug]) grouped[catSlug] = [];
            grouped[catSlug].push({
                id: row.id,
                name: row.name || row.title || { en: row.title || '' },
                price: row.price || 0,
                image: row.image_url || row.image || '',
                // ═══ FIX 6: ingredients was NEVER mapped — customer page always showed "Not listed" ═══
                ingredients: row.ingredients || ''
            });
        });

        window.SUPABASE_CATEGORIES = catMap;
        return grouped;
    } catch (e) {
        console.warn('tryLoadFromSupabase failed', e);
        return null;
    }
}

async function loadMenuData() {
    const supa = await tryLoadFromSupabase();
    if (supa && Object.keys(supa).length > 0) {
        menuData = supa;
        safeSetLocalStorage('menuDataCache', JSON.stringify(supa));
        return;
    }

    try {
        const resp = await fetch('menu.json');
        if (resp && resp.ok) {
            const json = await resp.json();
            menuData = json;
            safeSetLocalStorage('menuDataCache', JSON.stringify(json));
            return;
        }
    } catch (e) { }

    try {
        const cached = localStorage.getItem('menuDataCache');
        if (cached) { menuData = JSON.parse(cached); return; }
    } catch (e) { }

    menuData = {};
}

// ═══════════════════════════════════════════════════════
// FIX 7: REALTIME for customer page — menu updates appear
//        instantly without manual refresh
// ═══════════════════════════════════════════════════════
let _realtimeStarted = false;
function startCustomerRealtime() {
    if (_realtimeStarted || !_supaClient) return;
    _realtimeStarted = true;

    console.log('Starting customer realtime subscription');
    _supaClient.channel('customer-live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => {
            console.log('Realtime: menu_items changed — reloading');
            loadMenuData().then(() => {
                const query = searchInput.value.trim();
                if (query) {
                    renderMenu(filterItems(query));
                } else {
                    renderMenu();
                }
            });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
            console.log('Realtime: categories changed — reloading');
            loadMenuData().then(() => {
                const query = searchInput.value.trim();
                if (query) {
                    renderMenu(filterItems(query));
                } else {
                    renderMenu();
                }
            });
        })
        .subscribe((status) => {
            console.log('Customer realtime status:', status);
        });
}

// Listen for live supabase menu updates emitted by `js/menu.js`
window.addEventListener('supabase-menu-data', (e) => {
    try {
        if (e && e.detail) {
            const incoming = e.detail || {};
            const merged = Object.assign({}, menuData);
            Object.keys(incoming).forEach(k => {
                if (Array.isArray(incoming[k]) && incoming[k].length) {
                    merged[k] = incoming[k];
                } else if (!merged[k]) {
                    merged[k] = incoming[k];
                }
            });
            menuData = merged;
            safeSetLocalStorage('menuDataCache', JSON.stringify(menuData));
            renderMenu();
        }
    } catch (err) { console.error('supabase-menu-data handler error', err); }
});

// ─── INIT ────────────────────────────────────────────
loadMenuData().then(() => {
    const savedLang = localStorage.getItem('language');
    if (savedLang && translations[savedLang]) {
        currentLanguage = savedLang;
        languageSelect.value = savedLang;
    }

    const savedCat = localStorage.getItem('lastCategory');
    if (savedCat && menuData[savedCat]) {
        currentCategory = savedCat;
    }

    const savedSearch = localStorage.getItem('lastSearch') || '';
    searchInput.value = savedSearch;

    categoryBtns.forEach(b => b.classList.remove('active'));
    const activeBtn = Array.from(categoryBtns).find(b => b.dataset.category === currentCategory);
    if (activeBtn) activeBtn.classList.add('active');

    updateLanguage();
    if (savedSearch) {
        const filtered = filterItems(savedSearch);
        renderMenu(filtered);
    } else {
        renderMenu();
    }

    // FIX 7: Start realtime subscription for customers
    startCustomerRealtime();

    // Service worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js').then(reg => {
            console.log('Service Worker registered.', reg);
            if (reg.update) reg.update();

            let updateBanner = document.getElementById('sw-update-banner');
            if (!updateBanner) {
                updateBanner = document.createElement('div');
                updateBanner.id = 'sw-update-banner';
                updateBanner.style.cssText = 'position:fixed;bottom:16px;left:16px;right:16px;padding:12px;background:#222;border:1px solid #FFD700;color:#fff;border-radius:6px;display:flex;justify-content:space-between;align-items:center;gap:12px;z-index:9999;';
                updateBanner.innerHTML = `<span>New version available</span><div><button id="sw-reload-btn" style="background:#FFD700;border:none;padding:8px 12px;border-radius:4px;cursor:pointer">Reload</button></div>`;
                updateBanner.style.display = 'none';
                document.body.appendChild(updateBanner);
            }

            function showUpdatePrompt(waitingWorker) {
                updateBanner.style.display = 'flex';
                const btn = document.getElementById('sw-reload-btn');
                btn.onclick = () => { waitingWorker.postMessage({ type: 'SKIP_WAITING' }); };
            }

            if (reg.waiting) showUpdatePrompt(reg.waiting);

            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                if (!newWorker) return;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        showUpdatePrompt(reg.waiting || newWorker);
                    }
                });
            });
        }).catch(err => console.warn('Service Worker registration failed:', err));

        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (swRefreshing) return;
            swRefreshing = true;
            window.location.reload();
        });
    }
});

// Sticky header offsets
function updateStickyOffsets() {
    try {
        if (typeof window.setHeaderOffsets === 'function') { window.setHeaderOffsets(); return; }
        const headerEl = document.querySelector('header');
        const navEl = document.querySelector('.category-nav');
        const headerH = headerEl ? Math.ceil(headerEl.getBoundingClientRect().height) : 0;
        const navH = navEl ? Math.ceil(navEl.getBoundingClientRect().height) : 0;
        const combined = headerH + navH;
        document.documentElement.style.setProperty('--header-height', headerH + 'px');
        document.documentElement.style.setProperty('--nav-height', navH + 'px');
        document.documentElement.style.setProperty('--combined-header-height', combined + 'px');
    } catch (e) { }
}

window.addEventListener('load', () => { updateStickyOffsets(); setTimeout(updateStickyOffsets, 250); });
window.addEventListener('resize', () => updateStickyOffsets());
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => updateStickyOffsets());

try {
    const obsTarget = document.querySelector('header') || document.body;
    const mo = new MutationObserver(() => updateStickyOffsets());
    mo.observe(obsTarget, { childList: true, subtree: true, characterData: true });
    try { updateStickyOffsets(); } catch (e) { }
} catch (e) { }