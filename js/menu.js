(async function () {
    // Lightweight public menu synchronizer — dispatches 'supabase-menu-data' event when loaded/updated
    const url = window.SUPABASE_URL;
    const key = window.SUPABASE_ANON_KEY;
    if (!url || !key) return; // no supabase configured — do nothing

    // Load supabase client if needed
    if (typeof window.supabase === 'undefined' && typeof window.createClient === 'undefined') {
        await new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/dist/umd/supabase.min.js';
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
        });
    }

    // Prefer an existing global client if available to avoid creating multiple auth instances
    const supabase = window.SUPABASE_CLIENT || ((window.supabase && typeof window.supabase.createClient === 'function') ? window.supabase.createClient(url, key) : (window.createClient ? window.createClient(url, key) : null));
    if (!supabase) return;

    async function fetchAndDispatch() {
        try {
            const { data: categories = [], error: catErr } = await supabase.from('categories').select('*');
            if (catErr) { console.warn('menu.js: categories load failed', catErr); }
            const { data: items = [], error: itemsErr } = await supabase.from('menu_items').select('*');
            if (itemsErr) { console.warn('menu.js: menu_items load failed', itemsErr); }

            // Also try to fetch local menu.json as a fallback/source of truth for categories not in Supabase
            var menuJson = null;
            try {
                const resp = await fetch('/menu.json');
                if (resp && resp.ok) {
                    menuJson = await resp.json();
                }
            } catch (e) {
                // ignore fetch errors — menu.json may be unavailable in some deployments
            }

            // map categories by id -> slug
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
                    ingredients: row.ingredients || null,
                    price: row.price || 0,
                    image: row.image_url || row.image || ''
                });
            });

            // Merge menu.json entries for any categories that Supabase didn't return
            if (menuJson && typeof menuJson === 'object') {
                Object.keys(menuJson).forEach(function (slug) {
                    if (!grouped[slug] || (Array.isArray(grouped[slug]) && grouped[slug].length === 0)) {
                        grouped[slug] = (menuJson[slug] || []).map(function (it) {
                            return {
                                id: it.id || ('json-' + slug + '-' + Math.random().toString(36).slice(2, 8)),
                                name: it.name || { en: it.en || '' },
                                ingredients: it.ingredients || null,
                                price: it.price || 0,
                                image: it.image || it.image_url || ''
                            };
                        });
                    }
                });
            }

            window.dispatchEvent(new CustomEvent('supabase-menu-data', { detail: grouped }));
        } catch (e) {
            console.warn('menu.js: fetch failed', e);
        }
    }

    // initial fetch
    await fetchAndDispatch();

    // subscribe to changes (realtime)
    try {
        const channel = supabase.channel('public-menu');
        channel.on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => fetchAndDispatch());
        channel.on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => fetchAndDispatch());
        await channel.subscribe();
    } catch (e) {
        console.warn('menu.js: realtime subscribe failed', e);
    }
})();
