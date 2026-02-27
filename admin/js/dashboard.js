// dashboard.js — FIXED VERSION (no flickering)
(async function () {
    let redirecting = false;

    // Wait for Supabase to load
    let attempts = 0;
    while (!window.supabase && attempts < 30) {
        await new Promise(function (r) { setTimeout(r, 100); });
        attempts++;
    }

    if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY || !window.supabase) {
        console.error('Supabase not ready');
        window.location.replace('login.html');
        return;
    }

    // Create Supabase client
    let supabase = window.SUPABASE_CLIENT;
    if (!supabase) {
        supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
        window.SUPABASE_CLIENT = supabase;
    }

    // Check session
    let session = null;
    try {
        const result = await supabase.auth.getSession();
        session = result.data && result.data.session;
    } catch (e) {
        console.error('Session error:', e);
    }

    if (!session) {
        window.location.replace('login.html');
        return;
    }

    // Check owner exists
    try {
        const userId = session.user.id;
        const ownerCheck = await supabase.from('owners').select('*').eq('user_id', userId).single();

        if (ownerCheck.error || !ownerCheck.data) {
            await supabase.from('owners').upsert(
                [{ user_id: userId, email: session.user.email, is_active: true }],
                { onConflict: 'user_id' }
            );
        }
    } catch (e) {
        console.log('Owner check:', e.message);
    }

    // DOM ELEMENTS
    const signoutBtn = document.getElementById('signout');
    const signoutTop = document.getElementById('signout-top');
    const pageTitle = document.getElementById('page-title');
    const navItems = document.getElementById('nav-items');
    const navCats = document.getElementById('nav-categories');
    const loadingEl = document.getElementById('loading');
    const newItemBtn = document.getElementById('new-item');
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

    // SIGN OUT
    async function handleSignOut() {
        if (redirecting) return;
        redirecting = true;
        try {
            await supabase.auth.signOut();
        } catch (e) { }
        window.location.replace('login.html');
    }

    if (signoutBtn) signoutBtn.addEventListener('click', handleSignOut);
    if (signoutTop) signoutTop.addEventListener('click', handleSignOut);

    // STATE
    let categoriesCache = [];
    let itemsCache = [];
    let editingId = null;
    let editingImageUrl = null;
    let toDelete = null;
    let currentView = 'category-cards';
    let selectedCategoryId = null;

    // HELPER FUNCTIONS
    function escapeHtml(s) {
        return String(s || '').replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c;
        });
    }

    function extractLang(field, lang) {
        if (!field) return '';
        if (typeof field === 'object' && field !== null) {
            return field[lang] || field['en'] || Object.values(field)[0] || '';
        }
        if (typeof field === 'string') {
            const trimmed = field.trim();
            if (trimmed.charAt(0) === '{') {
                try {
                    const parsed = JSON.parse(trimmed);
                    return parsed[lang] || parsed['en'] || trimmed;
                } catch (e) {
                    return trimmed;
                }
            }
            return trimmed;
        }
        return String(field || '');
    }

    function safeParse(field) {
        if (!field) return {};
        if (typeof field === 'object' && field !== null) return field;
        if (typeof field === 'string') {
            const t = field.trim();
            if (t.charAt(0) === '{') {
                try { return JSON.parse(t); } catch (e) { return { en: t }; }
            }
            return { en: t };
        }
        return { en: String(field || '') };
    }

    function getCategoryDisplayName(cat) {
        if (!cat || !cat.name) return 'Unknown';
        return extractLang(cat.name, 'en');
    }

    // DATA LOADING
    async function loadCategories() {
        try {
            const result = await supabase.from('categories').select('*').order('id', { ascending: true });
            if (result.error) {
                window.showToast && window.showToast('Failed to load categories');
                return;
            }
            categoriesCache = result.data || [];

            if (itemCategory) {
                itemCategory.innerHTML = '<option value="">— Select category —</option>' +
                    categoriesCache.map(function (c) {
                        const name = getCategoryDisplayName(c);
                        return '<option value="' + c.id + '">' + escapeHtml(name) + '</option>';
                    }).join('');
            }
        } catch (e) {
            console.error('loadCategories error:', e);
        }
    }

    async function loadItems() {
        try {
            const result = await supabase.from('menu_items').select('*').order('id', { ascending: true });
            if (result.error) {
                window.showToast && window.showToast('Failed to load items');
                return;
            }
            itemsCache = result.data || [];
        } catch (e) {
            console.error('loadItems error:', e);
        }
    }

    // RENDERING
    function renderCurrentView() {
        if (loadingEl) loadingEl.style.display = 'none';

        if (categoryCardsView) categoryCardsView.classList.add('hidden');
        if (categoryItemsView) categoryItemsView.classList.add('hidden');
        if (categoriesViewEl) categoriesViewEl.classList.add('hidden');

        if (currentView === 'category-cards') {
            renderCategoryCards();
            if (categoryCardsView) categoryCardsView.classList.remove('hidden');
            if (pageTitle) pageTitle.textContent = 'Menu Items';
        } else if (currentView === 'category-items') {
            renderCategoryItems();
            if (categoryItemsView) categoryItemsView.classList.remove('hidden');
        } else if (currentView === 'categories-manage') {
            renderCategoriesManage();
            if (categoriesViewEl) categoriesViewEl.classList.remove('hidden');
            if (pageTitle) pageTitle.textContent = 'Categories';
        }

        if (navItems) navItems.classList.toggle('active', currentView === 'category-cards' || currentView === 'category-items');
        if (navCats) navCats.classList.toggle('active', currentView === 'categories-manage');
    }

    function renderCategoryCards() {
        if (!categoryCardsGrid) return;
        categoryCardsGrid.innerHTML = '';

        categoriesCache.forEach(function (cat) {
            const count = itemsCache.filter(function (i) {
                return String(i.category_id) === String(cat.id);
            }).length;
            const name = getCategoryDisplayName(cat);

            const div = document.createElement('div');
            div.className = 'category-card';
            div.innerHTML = '<h3>' + escapeHtml(name) + '</h3><div class="item-count">' + count + ' items</div>';
            div.onclick = function () {
                selectedCategoryId = cat.id;
                currentView = 'category-items';
                renderCurrentView();
            };
            categoryCardsGrid.appendChild(div);
        });
    }

    function renderCategoryItems(filtered) {
        if (!itemsListEl) return;
        itemsListEl.innerHTML = '';

        const list = Array.isArray(filtered) ? filtered : itemsCache.filter(function (i) {
            return String(i.category_id) === String(selectedCategoryId);
        });

        const cat = categoriesCache.find(function (c) {
            return String(c.id) === String(selectedCategoryId);
        });

        if (itemsViewTitle) {
            itemsViewTitle.textContent = cat ? getCategoryDisplayName(cat) : 'Search Results';
        }

        if (!list || list.length === 0) {
            itemsListEl.innerHTML = '<div class="no-results">No items found</div>';
            return;
        }

        list.forEach(function (item) {
            const el = document.createElement('article');
            el.className = 'card-item';
            const name = extractLang(item.name, 'en');
            let imgSrc = item.image_url || '';
            if (imgSrc && !/^(https?:|data:|\/)/i.test(imgSrc)) {
                imgSrc = '../' + imgSrc;
            }
            const imgHtml = imgSrc ? '<img src="' + escapeHtml(imgSrc) + '" alt="' + escapeHtml(name) + '" onerror="this.style.display=\'none\'">' : '';

            el.innerHTML = imgHtml + '<div class="card-body"><h4>' + escapeHtml(name) + '</h4>' +
                '<div class="meta"><span class="price">' + (item.price || 0) + ' Birr</span></div>' +
                '<div class="card-actions"><button class="btn btn-edit" data-id="' + item.id + '">Edit</button>' +
                '<button class="btn btn-delete" data-id="' + item.id + '">Delete</button></div></div>';
            itemsListEl.appendChild(el);
        });
    }

    function renderCategoriesManage() {
        if (!categoriesList) return;
        categoriesList.innerHTML = categoriesCache.map(function (c) {
            const name = getCategoryDisplayName(c);
            return '<li data-id="' + c.id + '"><div>' + escapeHtml(name) + '</div><div>' +
                '<button class="cat-edit btn" data-id="' + c.id + '">Edit</button>' +
                '<button class="cat-del btn" data-id="' + c.id + '">Delete</button></div></li>';
        }).join('');
    }

    // NAVIGATION
    if (navItems) {
        navItems.addEventListener('click', function () {
            currentView = 'category-cards';
            selectedCategoryId = null;
            renderCurrentView();
        });
    }

    if (navCats) {
        navCats.addEventListener('click', function () {
            currentView = 'categories-manage';
            renderCurrentView();
        });
    }

    if (backToCategoriesBtn) {
        backToCategoriesBtn.addEventListener('click', function () {
            currentView = 'category-cards';
            selectedCategoryId = null;
            renderCurrentView();
        });
    }

    // NEW ITEM MODAL
    if (newItemBtn) {
        newItemBtn.addEventListener('click', function () {
            editingId = null;
            editingImageUrl = null;
            if (itemForm) itemForm.reset();
            if (itemImagePreviewWrap) itemImagePreviewWrap.style.display = 'none';
            if (itemModalTitle) itemModalTitle.textContent = 'New Item';
            if (itemForm) itemForm.dataset.mode = 'new';
            window.showModal && window.showModal('item-modal');
        });
    }

    // EVENT DELEGATION (Edit, Delete buttons)
    document.addEventListener('click', function (e) {
        const btn = e.target.closest('button');
        if (!btn || !btn.dataset.id) return;
        const id = btn.dataset.id;

        // Category Edit
        if (btn.classList.contains('cat-edit')) {
            const cat = categoriesCache.find(function (c) { return String(c.id) === String(id); });
            if (!cat) return;
            const currentName = getCategoryDisplayName(cat);
            const newName = prompt('Rename category:', currentName);
            if (newName && newName.trim() && newName.trim() !== currentName) {
                const nameObj = safeParse(cat.name);
                nameObj.en = newName.trim();
                supabase.from('categories').update({ name: JSON.stringify(nameObj) }).eq('id', cat.id)
                    .then(function (res) {
                        if (res.error) {
                            window.showToast && window.showToast('Rename failed');
                            return;
                        }
                        window.showToast && window.showToast('Category renamed!');
                        loadCategories().then(renderCurrentView);
                    });
            }
            return;
        }

        // Category Delete
        if (btn.classList.contains('cat-del')) {
            toDelete = { type: 'category', id: id };
            if (confirmText) confirmText.textContent = 'Delete this category and all its items?';
            window.showModal && window.showModal('confirm-modal');
            return;
        }

        // Item Edit
        if (btn.classList.contains('btn-edit')) {
            const item = itemsCache.find(function (x) { return String(x.id) === String(id); });
            if (!item) return;

            editingId = item.id;
            editingImageUrl = item.image_url;

            if (itemForm) {
                itemForm.reset();
                itemForm.dataset.mode = 'edit';
            }
            if (itemModalTitle) itemModalTitle.textContent = 'Edit Item';

            const name = safeParse(item.name);
            const ing = safeParse(item.ingredients);
            if (itemNameEn) itemNameEn.value = name.en || '';
            if (itemNameAm) itemNameAm.value = name.am || '';
            if (itemNameOm) itemNameOm.value = name.om || '';
            if (itemIngredientsEn) itemIngredientsEn.value = ing.en || '';
            if (itemIngredientsAm) itemIngredientsAm.value = ing.am || '';
            if (itemIngredientsOm) itemIngredientsOm.value = ing.om || '';
            if (itemPrice) itemPrice.value = item.price || '';
            if (itemCategory) itemCategory.value = item.category_id || '';

            if (item.image_url && itemImagePreview && itemImagePreviewWrap) {
                let src = item.image_url;
                if (!/^(https?:|data:|\/)/i.test(src)) src = '../' + src;
                itemImagePreview.src = src;
                itemImagePreviewWrap.style.display = 'block';
            } else if (itemImagePreviewWrap) {
                itemImagePreviewWrap.style.display = 'none';
            }
            window.showModal && window.showModal('item-modal');
            return;
        }

        // Item Delete
        if (btn.classList.contains('btn-delete')) {
            toDelete = { type: 'item', id: id };
            if (confirmText) confirmText.textContent = 'Delete this menu item?';
            window.showModal && window.showModal('confirm-modal');
            return;
        }
    });

    // ITEM CANCEL
    if (itemCancel) {
        itemCancel.addEventListener('click', function () {
            editingId = null;
            editingImageUrl = null;
            window.hideModal && window.hideModal('item-modal');
        });
    }

    // SAVE ITEM
    if (itemForm) {
        itemForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const isEditing = itemForm.dataset.mode === 'edit' && editingId;
            if (itemSave) {
                itemSave.disabled = true;
                itemSave.textContent = 'Saving...';
            }

            try {
                const price = parseFloat(itemPrice ? itemPrice.value : 0) || 0;
                const categoryId = itemCategory ? itemCategory.value : '';

                if (!categoryId) throw new Error('Please select a category');

                const payload = { price: price, category_id: categoryId };

                const nameEn = itemNameEn ? itemNameEn.value.trim() : '';
                const nameAm = itemNameAm ? itemNameAm.value.trim() : '';
                const nameOm = itemNameOm ? itemNameOm.value.trim() : '';

                if (!nameEn && !isEditing) throw new Error('Name (English) is required');

                if (nameEn) {
                    payload.name = JSON.stringify({
                        en: nameEn,
                        am: nameAm || nameEn,
                        om: nameOm || nameEn
                    });
                }

                const ingEn = itemIngredientsEn ? itemIngredientsEn.value.trim() : '';
                const ingAm = itemIngredientsAm ? itemIngredientsAm.value.trim() : '';
                const ingOm = itemIngredientsOm ? itemIngredientsOm.value.trim() : '';
                if (ingEn || ingAm || ingOm) {
                    payload.ingredients = JSON.stringify({ en: ingEn, am: ingAm, om: ingOm });
                }

                const file = itemImageFile && itemImageFile.files && itemImageFile.files[0];
                const manualUrl = itemImageUrl ? itemImageUrl.value.trim() : '';

                if (file) {
                    const path = 'menu-images/' + Date.now() + '-' + file.name.replace(/[^a-z0-9.-]/ig, '_');
                    const uploadRes = await supabase.storage.from('menu-images').upload(path, file);
                    if (uploadRes.error) throw uploadRes.error;
                    payload.image_url = supabase.storage.from('menu-images').getPublicUrl(path).data.publicUrl;
                } else if (manualUrl) {
                    payload.image_url = manualUrl;
                }

                if (isEditing) {
                    const updateRes = await supabase.from('menu_items').update(payload).eq('id', editingId);
                    if (updateRes.error) throw updateRes.error;
                    window.showToast && window.showToast('Updated!');
                } else {
                    if (!payload.name) throw new Error('Name is required');
                    const insertRes = await supabase.from('menu_items').insert([payload]);
                    if (insertRes.error) throw insertRes.error;
                    window.showToast && window.showToast('Added!');
                }

                window.hideModal && window.hideModal('item-modal');
                editingId = null;
                editingImageUrl = null;
                if (itemForm) itemForm.dataset.mode = '';

                await loadItems();
                renderCurrentView();
            } catch (err) {
                console.error('Save error:', err);
                window.showToast && window.showToast(err.message || 'Save failed');
            } finally {
                if (itemSave) {
                    itemSave.disabled = false;
                    itemSave.textContent = 'Save';
                }
            }
        });
    }

    // DELETE CONFIRM
    if (confirmYes) {
        confirmYes.addEventListener('click', async function () {
            if (!toDelete) return;
            try {
                if (toDelete.type === 'category') {
                    await supabase.from('menu_items').delete().eq('category_id', toDelete.id);
                    await supabase.from('categories').delete().eq('id', toDelete.id);
                    window.showToast && window.showToast('Category deleted!');
                    await loadCategories();
                    await loadItems();
                } else {
                    await supabase.from('menu_items').delete().eq('id', toDelete.id);
                    window.showToast && window.showToast('Item deleted!');
                    await loadItems();
                }
                renderCurrentView();
            } catch (err) {
                console.error('Delete error:', err);
                window.showToast && window.showToast('Delete failed');
            } finally {
                window.hideModal && window.hideModal('confirm-modal');
                toDelete = null;
            }
        });
    }

    if (confirmNo) {
        confirmNo.addEventListener('click', function () {
            window.hideModal && window.hideModal('confirm-modal');
            toDelete = null;
        });
    }

    // ADD CATEGORY
    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', async function () {
            const name = newCategoryInput ? newCategoryInput.value.trim() : '';
            if (!name) return;

            const nameJson = JSON.stringify({ en: name, am: name });
            const result = await supabase.from('categories').insert([{ name: nameJson }]);
            if (result.error) {
                window.showToast && window.showToast('Failed to add category');
                return;
            }
            if (newCategoryInput) newCategoryInput.value = '';
            await loadCategories();
            renderCurrentView();
        });
    }

    // SEARCH
    if (globalSearch) {
        globalSearch.addEventListener('input', function (e) {
            const q = e.target.value.toLowerCase().trim();
            if (!q) {
                currentView = 'category-cards';
                renderCurrentView();
                return;
            }
            const filtered = itemsCache.filter(function (i) {
                return extractLang(i.name, 'en').toLowerCase().includes(q);
            });
            currentView = 'category-items';
            if (categoryCardsView) categoryCardsView.classList.add('hidden');
            if (categoryItemsView) categoryItemsView.classList.remove('hidden');
            if (categoriesViewEl) categoriesViewEl.classList.add('hidden');
            renderCategoryItems(filtered);
        });
    }

    // INIT
    await loadCategories();
    await loadItems();
    renderCurrentView();

    console.log('✅ Dashboard loaded');
})();