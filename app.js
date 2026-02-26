console.log('app.js loading', new Date().toISOString());
let menuData = {};

// Global reference to Supabase client for realtime
let _supaClient = null;

// Safe localStorage write
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
    return String(str || '').replace(/[&<>"']/g, (s) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": "&#39;"
    })[s]);
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
                        ${ingredientsText
                ? (`<ul>${ingredientsText.split(',').map(s => `<li>${escapeHtml(s.trim())}</li>`).join('')}</ul>`)
                : (`<p>${escapeHtml(translations[currentLanguage].notListed)}</p>`)}
                    </div>
                </details>
            </div>
        `;

        menuContainer.appendChild(card);
    });

    if (!itemsToRender || itemsToRender.length === 0) {
        const no = document.createElement('div');
        no.className = 'no-results';
        no.textContent = currentLanguage === 'am'
            ? 'ምንም አይታየም'
            : currentLanguage === 'om'
                ? 'Waa hin argamne'
                : 'No results found';
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
// SUPABASE MENU LOADING
// ═══════════════════════════════════════════════════════
async function tryLoadFromSupabase() {
    try {
        var url = window.SUPABASE_URL;
        var key = window.SUPABASE_ANON_KEY;
        if (!url || !key) {
            console.warn('❌ Supabase URL or Key missing');
            return null;
        }

        // Reuse existing client - never create a new one
        var client = window.SUPABASE_CLIENT || null;

        if (!client) {
            if (window.supabase && typeof window.supabase.createClient === 'function') {
                client = window.supabase.createClient(url, key);
                window.SUPABASE_CLIENT = client;
                console.log('✅ Created Supabase client in app.js');
            } else {
                console.warn('❌ Supabase library not loaded');
                return null;
            }
        }

        _supaClient = client;

        console.log('📡 Fetching menu from Supabase...');

        var catResult = await client.from('categories').select('id, name');
        var itemResult = await client.from('menu_items').select('*');

        if (catResult.error) {
            console.error('❌ Categories error:', catResult.error);
            return null;
        }
        if (itemResult.error) {
            console.error('❌ Menu items error:', itemResult.error);
            return null;
        }

        var categories = catResult.data || [];
        var items = itemResult.data || [];

        console.log('✅ Loaded', categories.length, 'categories,', items.length, 'items');

        var catMap = {};
        categories.forEach(function (c) {
            var nameStr = c.name || '';
            if (typeof nameStr === 'string') {
                try {
                    var parsed = JSON.parse(nameStr);
                    nameStr = parsed.en || parsed.am || nameStr;
                } catch (e) { }
            } else if (typeof nameStr === 'object') {
                nameStr = nameStr.en || nameStr.am || '';
            }
            var slug = String(nameStr).toLowerCase().trim().replace(/\s+/g, '-');
            catMap[c.id] = { slug: slug, name: c.name };
        });

        var grouped = {};
        items.forEach(function (row) {
            var catSlug = (row.category_id && catMap[row.category_id])
                ? catMap[row.category_id].slug
                : 'uncategorized';

            if (!grouped[catSlug]) grouped[catSlug] = [];

            grouped[catSlug].push({
                id: row.id,
                name: row.name || { en: '' },
                price: row.price || 0,
                image: row.image_url || row.image || '',
                ingredients: row.ingredients || ''
            });
        });

        window.SUPABASE_CATEGORIES = catMap;
        console.log('✅ Menu grouped into categories:', Object.keys(grouped));
        return grouped;

    } catch (e) {
        console.error('❌ tryLoadFromSupabase failed:', e);
        return null;
    }
}

async function loadMenuData() {
    // Try Supabase first
    var supa = await tryLoadFromSupabase();
    if (supa && Object.keys(supa).length > 0) {
        menuData = supa;
        safeSetLocalStorage('menuDataCache', JSON.stringify(supa));
        console.log('✅ Menu loaded from Supabase');
        return;
    }

    // Fallback: try menu.json
    try {
        var resp = await fetch('menu.json');
        if (resp && resp.ok) {
            var json = await resp.json();
            menuData = json;
            safeSetLocalStorage('menuDataCache', JSON.stringify(json));
            console.log('✅ Menu loaded from menu.json');
            return;
        }
    } catch (e) {
        console.warn('menu.json fetch failed:', e.message);
    }

    // Fallback: try localStorage cache
    try {
        var cached = localStorage.getItem('menuDataCache');
        if (cached) {
            menuData = JSON.parse(cached);
            console.log('✅ Menu loaded from cache');
            return;
        }
    } catch (e) { }

    console.warn('❌ No menu data available');
    menuData = {};
}

// ═══════════════════════════════════════════════════════
// REALTIME SUBSCRIPTION
// ═══════════════════════════════════════════════════════
let _realtimeStarted = false;
function startCustomerRealtime() {
    if (_realtimeStarted || !_supaClient) return;
    _realtimeStarted = true;

    console.log('📡 Starting customer realtime subscription');
    _supaClient.channel('customer-live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, function () {
            console.log('🔄 Realtime: menu_items changed — reloading');
            loadMenuData().then(function () {
                var query = searchInput.value.trim();
                if (query) {
                    renderMenu(filterItems(query));
                } else {
                    renderMenu();
                }
            });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, function () {
            console.log('🔄 Realtime: categories changed — reloading');
            loadMenuData().then(function () {
                var query = searchInput.value.trim();
                if (query) {
                    renderMenu(filterItems(query));
                } else {
                    renderMenu();
                }
            });
        })
        .subscribe(function (status) {
            console.log('📡 Customer realtime status:', status);
        });
}

// Listen for live supabase menu updates from menu.js
window.addEventListener('supabase-menu-data', function (e) {
    try {
        if (e && e.detail) {
            var incoming = e.detail || {};
            var merged = Object.assign({}, menuData);
            Object.keys(incoming).forEach(function (k) {
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
    } catch (err) {
        console.error('supabase-menu-data handler error', err);
    }
});

// ═══════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════
loadMenuData().then(function () {
    var savedLang = localStorage.getItem('language');
    if (savedLang && translations[savedLang]) {
        currentLanguage = savedLang;
        languageSelect.value = savedLang;
    }

    var savedCat = localStorage.getItem('lastCategory');
    if (savedCat && menuData[savedCat]) {
        currentCategory = savedCat;
    }

    var savedSearch = localStorage.getItem('lastSearch') || '';
    searchInput.value = savedSearch;

    categoryBtns.forEach(function (b) { b.classList.remove('active'); });
    var activeBtn = Array.from(categoryBtns).find(function (b) {
        return b.dataset.category === currentCategory;
    });
    if (activeBtn) activeBtn.classList.add('active');

    updateLanguage();
    if (savedSearch) {
        var filtered = filterItems(savedSearch);
        renderMenu(filtered);
    } else {
        renderMenu();
    }

    // Start realtime subscription
    startCustomerRealtime();

    // Service worker (only works on http/https, not file://)
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
        navigator.serviceWorker.register('service-worker.js').then(function (reg) {
            console.log('Service Worker registered.', reg);
            if (reg.update) reg.update();

            var updateBanner = document.getElementById('sw-update-banner');
            if (!updateBanner) {
                updateBanner = document.createElement('div');
                updateBanner.id = 'sw-update-banner';
                updateBanner.style.cssText = 'position:fixed;bottom:16px;left:16px;right:16px;padding:12px;background:#222;border:1px solid #FFD700;color:#fff;border-radius:6px;display:flex;justify-content:space-between;align-items:center;gap:12px;z-index:9999;';
                updateBanner.innerHTML = '<span>New version available</span><div><button id="sw-reload-btn" style="background:#FFD700;border:none;padding:8px 12px;border-radius:4px;cursor:pointer">Reload</button></div>';
                updateBanner.style.display = 'none';
                document.body.appendChild(updateBanner);
            }

            function showUpdatePrompt(waitingWorker) {
                updateBanner.style.display = 'flex';
                var btn = document.getElementById('sw-reload-btn');
                btn.onclick = function () {
                    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
                };
            }

            if (reg.waiting) showUpdatePrompt(reg.waiting);

            reg.addEventListener('updatefound', function () {
                var newWorker = reg.installing;
                if (!newWorker) return;
                newWorker.addEventListener('statechange', function () {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        showUpdatePrompt(reg.waiting || newWorker);
                    }
                });
            });
        }).catch(function (err) {
            console.warn('Service Worker registration failed:', err);
        });

        navigator.serviceWorker.addEventListener('controllerchange', function () {
            if (swRefreshing) return;
            swRefreshing = true;
            window.location.reload();
        });
    }
});

// Sticky header offsets
function updateStickyOffsets() {
    try {
        if (typeof window.setHeaderOffsets === 'function') {
            window.setHeaderOffsets();
            return;
        }
        var headerEl = document.querySelector('header');
        var navEl = document.querySelector('.category-nav');
        var headerH = headerEl ? Math.ceil(headerEl.getBoundingClientRect().height) : 0;
        var navH = navEl ? Math.ceil(navEl.getBoundingClientRect().height) : 0;
        var combined = headerH + navH;
        document.documentElement.style.setProperty('--header-height', headerH + 'px');
        document.documentElement.style.setProperty('--nav-height', navH + 'px');
        document.documentElement.style.setProperty('--combined-header-height', combined + 'px');
    } catch (e) { }
}

window.addEventListener('load', function () {
    updateStickyOffsets();
    setTimeout(updateStickyOffsets, 250);
});
window.addEventListener('resize', function () { updateStickyOffsets(); });
if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { updateStickyOffsets(); });
}

try {
    var obsTarget = document.querySelector('header') || document.body;
    var mo = new MutationObserver(function () { updateStickyOffsets(); });
    mo.observe(obsTarget, { childList: true, subtree: true, characterData: true });
    try { updateStickyOffsets(); } catch (e) { }
} catch (e) { }