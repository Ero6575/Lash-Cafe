// utils.js - small helpers (toasts, modal helpers)
window.showToast = function (msg, time = 2500) {
    const t = document.getElementById('toast');
    if (!t) return; t.textContent = msg; t.style.display = 'block';
    clearTimeout(t._t); t._t = setTimeout(() => t.style.display = 'none', time);
}

window.showModal = function (id) { const m = document.getElementById(id); if (!m) return; m.classList.add('visible'); }
window.hideModal = function (id) { const m = document.getElementById(id); if (!m) return; m.classList.remove('visible'); }

// simple helper to create element from html
window.el = function (html) { const tmp = document.createElement('div'); tmp.innerHTML = html.trim(); return tmp.firstChild; }

// Convenience helper: add menu item using form fields and ensure jsonb formatting
// Usage: call `await window.addMenuItemSimple()` from console or code (works with window.initSupabase)
window.addMenuItemSimple = async function () {
    // Initialize or reuse client
    const supabase = window.initSupabase ? window.initSupabase(window.SUPABASE_URL, window.SUPABASE_ANON_KEY) : (window.SUPABASE_CLIENT || null);
    if (!supabase) {
        console.error('Supabase client not available. Ensure supabase-config.js is loaded and initSupabase called.');
        return { error: new Error('Supabase not initialized') };
    }

    // Read form values (defensive)
    const nameEl = document.querySelector('#item-name-en') || document.querySelector('#item-name');
    const nameVal = (nameEl && nameEl.value) ? nameEl.value.trim() : '';
    const ingredientsEl = document.querySelector('#item-ingredients-en') || document.querySelector('#item-ingredients');
    const ingredientsVal = (ingredientsEl && ingredientsEl.value) ? ingredientsEl.value.trim() : '';
    const priceVal = (document.querySelector('#item-price') && document.querySelector('#item-price').value) ? Number(document.querySelector('#item-price').value) : 0;
    const imageUrlVal = (document.querySelector('#item-image-url') && document.querySelector('#item-image-url').value) ? document.querySelector('#item-image-url').value.trim() : '';
    const fileInput = document.querySelector('#item-image-file');

    if (!nameVal) {
        if (window.showToast) window.showToast('Name is required');
        return { error: new Error('Name required') };
    }

    const payload = {
        name: { en: nameVal },
        price: Number.isFinite(priceVal) ? priceVal : 0,
        category_id: (document.querySelector('#item-category') && document.querySelector('#item-category').value) || null
    };
    // description intentionally omitted (column removed)
    if (ingredientsVal) payload.ingredients = { en: ingredientsVal };
    if (imageUrlVal) payload.image_url = imageUrlVal;

    // If file chosen, upload to storage and override image_url
    try {
        if (fileInput && fileInput.files && fileInput.files[0]) {
            const file = fileInput.files[0];
            const filePath = `menu-images/${Date.now()}-${file.name.replace(/[^a-z0-9.-]/ig, '_')}`;
            const { error: upErr } = await supabase.storage.from('menu-images').upload(filePath, file, { upsert: true });
            if (upErr) {
                console.error('Image upload failed', upErr);
                return { error: upErr };
            }
            const { data } = supabase.storage.from('menu-images').getPublicUrl(filePath);
            if (data && data.publicUrl) payload.image_url = data.publicUrl;
        }

        const { data, error } = await supabase.from('menu_items').insert([payload]);
        if (error) {
            console.error('Insert failed', error);
            return { error };
        }
        showToast('Imported item');
        return { data };
    } catch (err) {
        console.error('addMenuItemSimple error', err);
        return { error: err };
    }
};