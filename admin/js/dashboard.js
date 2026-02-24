// dashboard.js — FIXED: sign-out, delete type, edit reset, category CRUD, error messages
(async function () {
    const SUPABASE_URL = window.SUPABASE_URL;
    const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.error('Supabase not configured — redirecting to login.');
        location.href = 'login.html';
        return;
    }

    const supabase = window.SUPABASE_CLIENT || (window.supabase && typeof window.supabase.createClient === 'function' ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null);
    if (!supabase) { console.error('dashboard.js: Supabase client not available'); location.href = 'login.html'; return; }

    let session = null;
    try {
        if (supabase.auth && typeof supabase.auth.getSession === 'function') {
            const { data } = await supabase.auth.getSession();
            session = data && data.session;
        }
    } catch (err) {
        console.error('dashboard.js: session check error', err);
    }
    if (!session) { location.href = 'login.html'; return; }

    try {
        const userId = session.user && session.user.id;
        const { data: owner, error: ownerErr } = await supabase.from('owners').select('*').eq('user_id', userId).single();
        if (ownerErr || !owner) {
            try { await supabase.auth.signOut(); } catch (e) { }
            location.href = 'login.html';
            return;
        }
    } catch (err) {
        try { await supabase.auth.signOut(); } catch (e) { }
        location.href = 'login.html';
        return;
    }

    // DOM ELEMENTS
    const signoutBtn = document.getElementById('signout');
    const signoutTop = document.getElementById('signout-top');
    const pageTitle = document.getElementById('page-title');
    const navItems = document.getElementById('nav-items');
    const navCats = document.getElementById('nav-categories');
    const loadingEl = document.getElementById('loading');
    const newItemBtn = document.getElementById('new-item');
    const importBtn = document.getElementById('import-menu-json');
    const globalSearch = document.getElementById('global-search');

    const categoryCardsView = document.getElementById('category-cards-view');
    const categoryCardsGrid = document.getElementById('category-cards-grid');
    const categoryItemsView = document.getElementById('category-items-view');
    const itemsListEl = document.getElementById('items-list');
    const itemsViewTitle = document.getElementById('items-view-title');
    const categoriesViewEl = document.getElementById('categories-view');
    const categoriesList = document.getElementById('categories-list');
    const addCategoryBtn = document.getElementById('add-category');
    const newCategoryInput = document.getElementById('new-category-name');
    const backToCategoriesBtn = document.getElementById('back-to-categories');

    const itemForm = document.getElementById('item-form');
    const itemModalTitle = document.getElementById('item-modal-title');
    const itemNameEn = document.getElementById('item-name-en');
    const itemNameAm = document.getElementById('item-name-am');
    const itemNameOm = document.getElementById('item-name-om');
    const itemIngredientsEn = document.getElementById('item-ingredients-en');
    const itemIngredientsAm = document.getElementById('item-ingredients-am');
    const itemIngredientsOm = document.getElementById('item-ingredients-om');
    const itemPrice = document.getElementById('item-price');
    const itemCategory = document.getElementById('item-category');
    const itemImageFile = document.getElementById('item-image-file');
    const itemImageUrl = document.getElementById('item-image-url');
    const itemImagePreviewWrap = document.getElementById('item-image-preview-wrap');
    const itemImagePreview = document.getElementById('item-image-preview');
    const itemCancel = document.getElementById('item-cancel');
    const itemSave = document.getElementById('item-save');

    const confirmYes = document.getElementById('confirm-yes');
    const confirmNo = document.getElementById('confirm-no');
    const confirmText = document.getElementById('confirm-text');

    // ═══════════════════════════════════════════════════════
    // FIX 1: SIGN-OUT — was completely missing
    // ═══════════════════════════════════════════════════════
    async function handleSignOut() {
        try { await supabase.auth.signOut(); } catch (e) { console.error('Sign-out error:', e); }
        location.href = 'login.html';
    }
    signoutBtn?.addEventListener('click', handleSignOut);
    signoutTop?.addEventListener('click', handleSignOut);

    // STATE
    let categoriesCache = [];
    let itemsCache = [];
    let _editingId = null;
    let _editingImageUrl = null;
    let toDelete = null;
    let currentView = 'category-cards';
    let selectedCategoryId = null;

    const busyEl = document.getElementById('busy-overlay');
    let _busyCount = 0;
    function showBusy(text) {
        _busyCount++;
        if (busyEl) {
            busyEl.setAttribute('aria-hidden', 'false');
            const t = busyEl.querySelector('.busy-text');
            if (t && text) t.textContent = text;
        }
    }
    function hideBusy() {
        _busyCount = Math.max(0, _busyCount - 1);
        if (_busyCount <= 0 && busyEl) busyEl.setAttribute('aria-hidden', 'true');
    }

    function escapeHtmlLocal(s) {
        return String(s || '').replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c;
        });
    }
    function clearChildren(el) { if (el) el.innerHTML = ''; }
    function sanitizeFilename(s) { return String(s || '').replace(/[^a-z0-9.-]/ig, '_'); }

    function extractLang(field, lang) {
        if (!field) return '';
        if (typeof field === 'string') {
            var trimmed = field.trim();
            if (trimmed.charAt(0) === '{' || trimmed.charAt(0) === '[') {
                try { field = JSON.parse(trimmed); } catch (e) { return trimmed; }
            } else { return trimmed; }
        }
        if (typeof field === 'object' && field !== null) { return field[lang] || field.en || ''; }
        return String(field || '');
    }

    function safeParse(field) {
        if (!field) return {};
        if (typeof field === 'string') {
            var t = field.trim();
            if (t.charAt(0) === '{') { try { return JSON.parse(t); } catch (e) { return { en: t }; } }
            return { en: t };
        }
        if (typeof field === 'object' && field !== null) return field;
        return { en: String(field || '') };
    }

    function buildIngredientsHtml(item) {
        var ingRaw = extractLang(item.ingredients, 'en');
        if (!ingRaw) return '';
        var parts = ingRaw.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        if (parts.length === 0) return '';
        var listItems = parts.map(function (p) { return '<li>' + escapeHtmlLocal(p) + '</li>'; }).join('');
        return '<details class="admin-ingredients"><summary>Ingredients</summary><ul>' + listItems + '</ul></details>';
    }

    // ─── DATA LOADING ────────────────────────────────────
    async function loadCategories() {
        try {
            const { data, error } = await supabase.from('categories').select('*').order('id', { ascending: true });
            if (error) { window.showToast('Failed to load categories: ' + error.message); return; }
            categoriesCache = data || [];
            if (itemCategory) {
                itemCategory.innerHTML = '<option value="">— Select category —</option>' +
                    categoriesCache.map(c => `<option value="${c.id}">${escapeHtmlLocal(c.name)}</option>`).join('');
            }
        } catch (e) { console.error(e); }
    }

    async function loadItems() {
        showBusy('Loading items...');
        try {
            const { data, error } = await supabase.from('menu_items').select('*').order('id', { ascending: true });
            if (error) { window.showToast('Failed to load items: ' + error.message); return; }
            itemsCache = data || [];
        } finally { hideBusy(); }
    }

    // ─── RENDERING ───────────────────────────────────────
    function renderCurrentView() {
        if (loadingEl) loadingEl.style.display = 'none';
        [categoryCardsView, categoryItemsView, categoriesViewEl].forEach(el => el?.classList.add('hidden'));

        if (currentView === 'category-cards') {
            renderCategoryCards();
            categoryCardsView?.classList.remove('hidden');
            if (pageTitle) pageTitle.textContent = 'Menu Items';
        } else if (currentView === 'category-items') {
            renderCategoryItems();
            categoryItemsView?.classList.remove('hidden');
        } else if (currentView === 'categories-manage') {
            renderCategoriesManage();
            categoriesViewEl?.classList.remove('hidden');
            if (pageTitle) pageTitle.textContent = 'Categories';
        }
        updateNavActiveState();
    }

    function updateNavActiveState() {
        navItems?.classList.toggle('active', currentView === 'category-cards' || currentView === 'category-items');
        navCats?.classList.toggle('active', currentView === 'categories-manage');
    }

    function renderCategoryCards() {
        if (!categoryCardsGrid) return;
        clearChildren(categoryCardsGrid);
        categoriesCache.forEach(cat => {
            var count = itemsCache.filter(i => String(i.category_id) === String(cat.id)).length;
            var div = document.createElement('div');
            div.className = 'category-card';
            div.innerHTML = `<h3>${escapeHtmlLocal(cat.name)}</h3><div class="item-count">${count} items</div>`;
            div.onclick = () => { selectedCategoryId = cat.id; currentView = 'category-items'; renderCurrentView(); };
            categoryCardsGrid.appendChild(div);
        });
    }

    function renderCategoryItems(filteredItems) {
        if (!itemsListEl) return;
        clearChildren(itemsListEl);
        var list = Array.isArray(filteredItems) ? filteredItems : itemsCache.filter(i => String(i.category_id) === String(selectedCategoryId));
        var cat = categoriesCache.find(c => String(c.id) === String(selectedCategoryId));
        if (itemsViewTitle) itemsViewTitle.textContent = cat ? cat.name : 'Search Results';

        if (!list || list.length === 0) {
            itemsListEl.innerHTML = '<div class="no-results">No items found</div>';
            return;
        }

        list.forEach(item => {
            var el = document.createElement('article');
            el.className = 'card-item';
            var name = extractLang(item.name, 'en');
            var imgSrc = item.image_url ? (/^(https?:|data:|\/)/i.test(item.image_url) ? item.image_url : '../' + item.image_url) : '';
            var imgHtml = imgSrc ? `<img src="${escapeHtmlLocal(imgSrc)}" alt="${escapeHtmlLocal(name)}" onerror="this.style.display='none'">` : '';

            el.innerHTML = imgHtml + `<div class="card-body"><h4>${escapeHtmlLocal(name)}</h4>${buildIngredientsHtml(item)}` +
                `<div class="meta"><span class="price">${item.price || 0} Birr</span></div>` +
                `<div class="card-actions"><button class="btn btn-edit" data-id="${item.id}">Edit</button>` +
                `<button class="btn btn-delete" data-id="${item.id}">Delete</button></div></div>`;
            itemsListEl.appendChild(el);
        });
    }

    function renderCategoriesManage() {
        if (!categoriesList) return;
        categoriesList.innerHTML = categoriesCache.map(c => `
            <li data-id="${c.id}"><div>${escapeHtmlLocal(c.name)}</div>
            <div><button class="cat-edit btn" data-id="${c.id}">Edit</button>
            <button class="cat-del btn" data-id="${c.id}">Delete</button></div></li>`).join('');
    }

    // ─── NAVIGATION ──────────────────────────────────────
    navItems?.addEventListener('click', () => { currentView = 'category-cards'; selectedCategoryId = null; renderCurrentView(); });
    navCats?.addEventListener('click', () => { currentView = 'categories-manage'; renderCurrentView(); });
    backToCategoriesBtn?.addEventListener('click', () => { currentView = 'category-cards'; selectedCategoryId = null; renderCurrentView(); });

    // ─── NEW ITEM MODAL ──────────────────────────────────
    newItemBtn?.addEventListener('click', () => {
        _editingId = null;
        _editingImageUrl = null;
        itemForm.reset();
        itemImagePreviewWrap.style.display = 'none';
        itemModalTitle.textContent = 'New Item';
        itemForm.dataset.mode = 'new';
        window.showModal('item-modal');
    });

    // ═══════════════════════════════════════════════════════
    // FIX 2 + 3 + 5: EVENT DELEGATION
    //   - cat-edit handler (was missing entirely)
    //   - cat-del sets type:'category' (was always 'item')
    //   - form.reset() BEFORE populating edit fields (stale data fix)
    // ═══════════════════════════════════════════════════════
    document.addEventListener('click', e => {
        const btn = e.target.closest('button');
        if (!btn || !btn.dataset.id) return;
        const id = btn.dataset.id;

        // ── FIX 5: CATEGORY EDIT (was completely missing) ──
        if (btn.classList.contains('cat-edit')) {
            const cat = categoriesCache.find(c => String(c.id) === String(id));
            if (!cat) return;
            const newName = prompt('Rename category:', cat.name);
            if (newName && newName.trim() && newName.trim() !== cat.name) {
                supabase.from('categories').update({ name: newName.trim() }).eq('id', cat.id)
                    .then(({ error }) => {
                        if (error) { window.showToast('Rename failed: ' + error.message); return; }
                        window.showToast('Category renamed!');
                        loadCategories().then(renderCurrentView);
                    });
            }
            return; // stop here — don't fall through to item handlers
        }

        // ── FIX 2: CATEGORY DELETE — was setting type:'item' ──
        if (btn.classList.contains('cat-del')) {
            toDelete = { type: 'category', id: id };
            confirmText.textContent = 'Delete this category and all its items?';
            window.showModal('confirm-modal');
            return; // stop here
        }

        // ── ITEM EDIT ──
        if (btn.classList.contains('btn-edit')) {
            const item = itemsCache.find(x => String(x.id) === String(id));
            if (!item) { window.showToast('Item not found in cache'); return; }

            _editingId = item.id;
            _editingImageUrl = item.image_url;

            // FIX 3: Reset form FIRST so no stale image/data bleeds through
            itemForm.reset();

            itemForm.dataset.mode = 'edit';
            itemModalTitle.textContent = 'Edit Item';

            const name = safeParse(item.name);
            const ing = safeParse(item.ingredients);
            itemNameEn.value = name.en || '';
            itemNameAm.value = name.am || '';
            itemNameOm.value = name.om || '';
            itemIngredientsEn.value = ing.en || '';
            itemIngredientsAm.value = ing.am || '';
            itemIngredientsOm.value = ing.om || '';
            itemPrice.value = item.price || '';
            itemCategory.value = item.category_id || '';

            if (item.image_url) {
                let src = item.image_url;
                if (!/^(https?:|data:|\/)/i.test(src)) src = '../' + src;
                itemImagePreview.src = src;
                itemImagePreviewWrap.style.display = 'block';
            } else {
                itemImagePreview.src = '';
                itemImagePreviewWrap.style.display = 'none';
            }
            window.showModal('item-modal');
            return;
        }

        // ── ITEM DELETE ──
        if (btn.classList.contains('btn-delete')) {
            toDelete = { type: 'item', id: id };
            confirmText.textContent = 'Delete this menu item?';
            window.showModal('confirm-modal');
            return;
        }
    });

    itemCancel?.addEventListener('click', () => {
        _editingId = null;
        _editingImageUrl = null;
        window.hideModal('item-modal');
    });

    // ═══════════════════════════════════════════════════════
    // FIX 4: SAVE — reset _editingId after save, better errors
    // ═══════════════════════════════════════════════════════
    itemForm?.addEventListener('submit', async e => {
        e.preventDefault();
        const isEditing = itemForm.dataset.mode === 'edit' && _editingId;
        if (itemSave) { itemSave.disabled = true; itemSave.textContent = 'Saving...'; }

        try {
            const price = parseFloat(itemPrice.value) || 0;
            const categoryId = itemCategory.value;

            if (!categoryId) throw new Error('Please select a category');

            const payload = {
                price: price,
                category_id: categoryId
            };

            // Name — always include what's in the form (for edit, the form was pre-filled)
            const nameEn = itemNameEn.value.trim();
            const nameAm = itemNameAm.value.trim();
            const nameOm = itemNameOm.value.trim();

            if (!nameEn && !isEditing) throw new Error('Name (English) is required');

            if (nameEn) {
                payload.name = {
                    en: nameEn,
                    am: nameAm || nameEn,
                    om: nameOm || nameEn
                };
            }

            // Ingredients — only include if at least one language has content
            const ingEn = itemIngredientsEn.value.trim();
            const ingAm = itemIngredientsAm.value.trim();
            const ingOm = itemIngredientsOm.value.trim();
            if (ingEn || ingAm || ingOm) {
                payload.ingredients = { en: ingEn, am: ingAm, om: ingOm };
            }

            // Image — new upload or URL overrides; otherwise keep existing (don't send field)
            const file = itemImageFile?.files?.[0];
            const manualUrl = itemImageUrl?.value.trim();

            if (file) {
                const path = `menu-images/${Date.now()}-${sanitizeFilename(file.name)}`;
                const { error: upErr } = await supabase.storage.from('menu-images').upload(path, file);
                if (upErr) throw upErr;
                payload.image_url = supabase.storage.from('menu-images').getPublicUrl(path).data.publicUrl;
            } else if (manualUrl) {
                payload.image_url = manualUrl;
            }
            // If editing + no new image → image_url is absent from payload → DB keeps old value ✓

            if (isEditing) {
                console.log('Updating item', _editingId, payload);
                const { error } = await supabase.from('menu_items').update(payload).eq('id', _editingId);
                if (error) throw error;
                window.showToast('Updated!');
            } else {
                if (!payload.name) throw new Error('Name is required for new items');
                console.log('Inserting new item', payload);
                const { error } = await supabase.from('menu_items').insert([payload]);
                if (error) throw error;
                window.showToast('Added!');
            }

            window.hideModal('item-modal');

            // FIX 4: Reset editing state AFTER successful save
            _editingId = null;
            _editingImageUrl = null;
            itemForm.dataset.mode = '';

            await loadItems();
            renderCurrentView();
        } catch (err) {
            console.error('Save error:', err);
            window.showToast(err.message || 'Save failed');
        } finally {
            if (itemSave) { itemSave.disabled = false; itemSave.textContent = 'Save'; }
        }
    });

    // ═══════════════════════════════════════════════════════
    // FIX 2 (continued): DELETE CONFIRM — handle category vs item
    // ═══════════════════════════════════════════════════════
    confirmYes?.addEventListener('click', async () => {
        if (!toDelete) return;
        showBusy('Deleting...');
        try {
            if (toDelete.type === 'category') {
                // First delete all items that belong to this category
                const { error: itemsErr } = await supabase
                    .from('menu_items').delete().eq('category_id', toDelete.id);
                if (itemsErr) {
                    console.error('Failed to delete category items:', itemsErr);
                    throw itemsErr;
                }
                // Then delete the category itself
                const { error: catErr } = await supabase
                    .from('categories').delete().eq('id', toDelete.id);
                if (catErr) {
                    console.error('Failed to delete category:', catErr);
                    throw catErr;
                }
                window.showToast('Category deleted!');
                await loadCategories();
                await loadItems();
            } else {
                // Item delete
                console.log('Deleting item id:', toDelete.id);
                const { error } = await supabase
                    .from('menu_items').delete().eq('id', toDelete.id);
                if (error) {
                    console.error('Delete item error:', error);
                    throw error;
                }
                window.showToast('Item deleted!');
                await loadItems();
            }
            renderCurrentView();
        } catch (err) {
            console.error('Delete failed:', err);
            window.showToast('Delete failed: ' + (err.message || JSON.stringify(err)));
        } finally {
            hideBusy();
            window.hideModal('confirm-modal');
            toDelete = null;
        }
    });

    confirmNo?.addEventListener('click', () => { window.hideModal('confirm-modal'); toDelete = null; });

    // ─── CATEGORY ADD ────────────────────────────────────
    addCategoryBtn?.addEventListener('click', async () => {
        const name = newCategoryInput.value.trim();
        if (!name) return;
        const { error } = await supabase.from('categories').insert([{ name }]);
        if (error) return window.showToast('Failed: ' + error.message);
        newCategoryInput.value = '';
        await loadCategories();
        renderCurrentView();
    });

    // ─── SEARCH ──────────────────────────────────────────
    globalSearch?.addEventListener('input', e => {
        const q = e.target.value.toLowerCase().trim();
        if (!q) { currentView = 'category-cards'; renderCurrentView(); return; }
        const filtered = itemsCache.filter(i => extractLang(i.name, 'en').toLowerCase().includes(q));
        currentView = 'category-items';
        // Show the correct view container
        [categoryCardsView, categoryItemsView, categoriesViewEl].forEach(el => el?.classList.add('hidden'));
        categoryItemsView?.classList.remove('hidden');
        renderCategoryItems(filtered);
    });

    // ─── REALTIME ────────────────────────────────────────
    function startRealtime() {
        supabase.channel('admin-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => loadItems().then(renderCurrentView))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => loadCategories().then(renderCurrentView))
            .subscribe();
    }

    // ─── INIT ────────────────────────────────────────────
    await loadCategories();
    await loadItems();
    renderCurrentView();
    startRealtime();
})();

