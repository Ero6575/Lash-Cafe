// STATE MANAGEMENT
let cart = [];
let menuItems = [];
let categories = [];
let currentCategory = 'all';
let searchQuery = '';

// INITIALIZATION
document.addEventListener('DOMContentLoaded', function () {
    initApp();
});

function initApp() {
    if (!db) {
        console.error('❌ Database not ready!');
        showToast('Connection error. Please refresh.', 'error');
        return;
    }

    applyTranslations();

    const tableSelect = document.getElementById('tableNumber');
    generateTableOptions(tableSelect, 30);

    loadCategories();
    loadMenuItems();
    setupEventListeners();
    createIngredientsModal();

    const savedName = localStorage.getItem('waiterName');
    if (savedName) {
        document.getElementById('waiterName').value = savedName;
    }

    console.log('✅ Waiter App Initialized');
}

// CART TOGGLE
function toggleCart() {
    const cartSection = document.getElementById('cartSection');
    cartSection.classList.toggle('expanded');
}

// TRANSLATIONS
function applyTranslations() {
    document.getElementById('langToggle').textContent = currentLang === 'en' ? 'አማ' : 'EN';

    document.querySelectorAll('[data-translate]').forEach(function (el) {
        const key = el.getAttribute('data-translate');
        el.textContent = t(key);
    });

    document.querySelectorAll('[data-placeholder]').forEach(function (el) {
        const key = el.getAttribute('data-placeholder');
        el.placeholder = t(key);
    });
}

// EVENT LISTENERS
function setupEventListeners() {
    document.getElementById('searchMenu').addEventListener('input', function (e) {
        searchQuery = e.target.value.toLowerCase();
        renderMenuItems();
    });

    document.getElementById('waiterName').addEventListener('change', function (e) {
        localStorage.setItem('waiterName', e.target.value);
    });

    document.getElementById('submitOrder').addEventListener('click', submitOrder);
}

// HELPER: Get Localized Text
function getLocalizedText(field) {
    if (!field) return '';

    if (typeof field === 'string') {
        if (field.startsWith('{') && field.includes('"en"')) {
            try {
                const parsed = JSON.parse(field);
                return parsed[currentLang] || parsed['en'] || field;
            } catch (e) {
                return field;
            }
        }
        return field;
    }

    if (typeof field === 'object') {
        return field[currentLang] || field['en'] || '';
    }

    return String(field);
}

// HELPER: Parse Ingredients to Array
function parseIngredients(ingredientsField) {
    const text = getLocalizedText(ingredientsField);
    if (!text || text === '') return [];

    const ingredients = text.split(/[,\n•·]/);

    return ingredients
        .map(function (ing) {
            return ing.trim();
        })
        .filter(function (ing) {
            return ing.length > 0;
        });
}

// HELPER: Fix Image Path
function getImageUrl(imageUrl) {
    if (!imageUrl || imageUrl === '') {
        return 'https://via.placeholder.com/150x150?text=No+Image';
    }

    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        return imageUrl;
    }

    if (imageUrl.startsWith('../')) {
        return imageUrl;
    }

    return '../' + imageUrl;
}

// INGREDIENTS MODAL
function createIngredientsModal() {
    if (document.getElementById('ingredientsModal')) return;

    const modalHTML = '<div id="ingredientsModal" class="ing-modal">' +
        '<div class="ing-modal-content">' +
        '<div class="ing-modal-header">' +
        '<button class="ing-modal-close" onclick="closeIngredientsModal()">×</button>' +
        '</div>' +
        '<div class="ing-modal-body">' +
        '<img id="ingModalImage" class="ing-modal-image" src="" alt="">' +
        '<h2 id="ingModalTitle" class="ing-modal-title"></h2>' +
        '<p id="ingModalPrice" class="ing-modal-price"></p>' +
        '<div class="ing-modal-section">' +
        '<h3 id="ingModalLabel" class="ing-section-title">Ingredients</h3>' +
        '<p class="ing-section-subtitle" id="ingModalSubtitle">Uncheck items customer doesn\'t want</p>' +
        '<div id="ingModalList" class="ing-list"></div>' +
        '</div>' +
        '</div>' +
        '<div class="ing-modal-footer">' +
        '<button class="ing-cancel-btn" onclick="closeIngredientsModal()">Cancel</button>' +
        '<button class="ing-add-btn" id="ingAddBtn" onclick="addToCartFromModal()">Add to Order</button>' +
        '</div>' +
        '</div>' +
        '</div>';

    const modalStyles = '<style>' +
        '.ing-modal {' +
        '  display: none;' +
        '  position: fixed;' +
        '  top: 0;' +
        '  left: 0;' +
        '  width: 100%;' +
        '  height: 100%;' +
        '  background: rgba(0, 0, 0, 0.7);' +
        '  z-index: 9999;' +
        '  justify-content: center;' +
        '  align-items: center;' +
        '  padding: 20px;' +
        '}' +
        '.ing-modal.show {' +
        '  display: flex;' +
        '}' +
        '.ing-modal-content {' +
        '  background: #fff;' +
        '  border-radius: 20px;' +
        '  width: 100%;' +
        '  max-width: 420px;' +
        '  max-height: 90vh;' +
        '  overflow: hidden;' +
        '  box-shadow: 0 20px 60px rgba(0,0,0,0.4);' +
        '  animation: ingModalSlideIn 0.3s ease;' +
        '  display: flex;' +
        '  flex-direction: column;' +
        '}' +
        '@keyframes ingModalSlideIn {' +
        '  from { transform: translateY(50px); opacity: 0; }' +
        '  to { transform: translateY(0); opacity: 1; }' +
        '}' +
        '.ing-modal-header {' +
        '  display: flex;' +
        '  justify-content: flex-end;' +
        '  padding: 12px 16px 0;' +
        '}' +
        '.ing-modal-close {' +
        '  background: #f0f0f0;' +
        '  border: none;' +
        '  color: #666;' +
        '  font-size: 24px;' +
        '  width: 40px;' +
        '  height: 40px;' +
        '  border-radius: 50%;' +
        '  cursor: pointer;' +
        '  display: flex;' +
        '  align-items: center;' +
        '  justify-content: center;' +
        '  transition: all 0.2s;' +
        '}' +
        '.ing-modal-close:hover {' +
        '  background: #e0e0e0;' +
        '}' +
        '.ing-modal-body {' +
        '  padding: 0 24px 20px;' +
        '  overflow-y: auto;' +
        '  flex: 1;' +
        '}' +
        '.ing-modal-image {' +
        '  width: 100%;' +
        '  height: 180px;' +
        '  object-fit: cover;' +
        '  border-radius: 16px;' +
        '  margin-bottom: 16px;' +
        '}' +
        '.ing-modal-title {' +
        '  font-size: 24px;' +
        '  font-weight: 700;' +
        '  color: #1a1a1a;' +
        '  margin: 0 0 8px;' +
        '}' +
        '.ing-modal-price {' +
        '  font-size: 20px;' +
        '  font-weight: 700;' +
        '  color: #667eea;' +
        '  margin: 0 0 20px;' +
        '}' +
        '.ing-modal-section {' +
        '  background: #f8f9fa;' +
        '  border-radius: 16px;' +
        '  padding: 16px;' +
        '}' +
        '.ing-section-title {' +
        '  font-size: 16px;' +
        '  font-weight: 700;' +
        '  color: #1a1a1a;' +
        '  margin: 0 0 4px;' +
        '}' +
        '.ing-section-subtitle {' +
        '  font-size: 13px;' +
        '  color: #888;' +
        '  margin: 0 0 16px;' +
        '}' +
        '.ing-list {' +
        '  display: flex;' +
        '  flex-direction: column;' +
        '  gap: 8px;' +
        '}' +
        '.ing-item {' +
        '  display: flex;' +
        '  align-items: center;' +
        '  gap: 12px;' +
        '  padding: 12px;' +
        '  background: #fff;' +
        '  border-radius: 10px;' +
        '  cursor: pointer;' +
        '  transition: all 0.2s;' +
        '  border: 2px solid transparent;' +
        '}' +
        '.ing-item:hover {' +
        '  border-color: #667eea;' +
        '}' +
        '.ing-item.excluded {' +
        '  background: #fff0f0;' +
        '  border-color: #fc8181;' +
        '}' +
        '.ing-item.excluded .ing-item-text {' +
        '  text-decoration: line-through;' +
        '  color: #999;' +
        '}' +
        '.ing-checkbox {' +
        '  width: 24px;' +
        '  height: 24px;' +
        '  border-radius: 6px;' +
        '  border: 2px solid #ddd;' +
        '  display: flex;' +
        '  align-items: center;' +
        '  justify-content: center;' +
        '  background: #fff;' +
        '  flex-shrink: 0;' +
        '  transition: all 0.2s;' +
        '}' +
        '.ing-item:not(.excluded) .ing-checkbox {' +
        '  background: #48bb78;' +
        '  border-color: #48bb78;' +
        '}' +
        '.ing-item:not(.excluded) .ing-checkbox::after {' +
        '  content: "✓";' +
        '  color: #fff;' +
        '  font-size: 14px;' +
        '  font-weight: bold;' +
        '}' +
        '.ing-item.excluded .ing-checkbox {' +
        '  background: #fc8181;' +
        '  border-color: #fc8181;' +
        '}' +
        '.ing-item.excluded .ing-checkbox::after {' +
        '  content: "✕";' +
        '  color: #fff;' +
        '  font-size: 14px;' +
        '  font-weight: bold;' +
        '}' +
        '.ing-item-text {' +
        '  font-size: 15px;' +
        '  color: #333;' +
        '  flex: 1;' +
        '}' +
        '.ing-modal-footer {' +
        '  padding: 16px 24px;' +
        '  border-top: 1px solid #eee;' +
        '  display: flex;' +
        '  gap: 12px;' +
        '}' +
        '.ing-cancel-btn {' +
        '  flex: 1;' +
        '  padding: 16px;' +
        '  background: #f0f0f0;' +
        '  color: #666;' +
        '  border: none;' +
        '  border-radius: 12px;' +
        '  font-size: 16px;' +
        '  font-weight: 600;' +
        '  cursor: pointer;' +
        '}' +
        '.ing-add-btn {' +
        '  flex: 2;' +
        '  padding: 16px;' +
        '  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);' +
        '  color: #fff;' +
        '  border: none;' +
        '  border-radius: 12px;' +
        '  font-size: 16px;' +
        '  font-weight: 600;' +
        '  cursor: pointer;' +
        '  transition: all 0.2s;' +
        '}' +
        '.ing-add-btn:hover {' +
        '  transform: translateY(-2px);' +
        '  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);' +
        '}' +
        '.ing-no-ingredients {' +
        '  text-align: center;' +
        '  padding: 20px;' +
        '  color: #888;' +
        '  font-style: italic;' +
        '}' +
        '</style>';

    document.body.insertAdjacentHTML('beforeend', modalStyles + modalHTML);
}

// Current item being viewed
let currentModalItem = null;
let excludedIngredients = [];

function showIngredients(itemId, event) {
    if (event) event.stopPropagation();

    const item = menuItems.find(function (m) {
        return m.id === itemId;
    });

    if (!item) return;

    currentModalItem = item;
    excludedIngredients = [];

    const itemName = getLocalizedText(item.name);
    const itemPrice = parseFloat(item.price).toFixed(0) + ' Birr';
    const imageUrl = getImageUrl(item.image_url);
    const ingredients = parseIngredients(item.ingredients);

    document.getElementById('ingModalImage').src = imageUrl;
    document.getElementById('ingModalImage').alt = itemName;
    document.getElementById('ingModalTitle').textContent = itemName;
    document.getElementById('ingModalPrice').textContent = itemPrice;

    document.getElementById('ingModalLabel').textContent = currentLang === 'am' ? 'ንጥረ ነገሮች' : 'Ingredients';
    document.getElementById('ingModalSubtitle').textContent = currentLang === 'am'
        ? 'ደንበኛው የማይፈልጋቸውን ያስወግዱ'
        : 'Uncheck items customer doesn\'t want';
    document.getElementById('ingAddBtn').textContent = currentLang === 'am' ? 'ወደ ትዕዛዝ ጨምር' : 'Add to Order';

    const listContainer = document.getElementById('ingModalList');

    if (ingredients.length === 0) {
        listContainer.innerHTML = '<div class="ing-no-ingredients">' +
            (currentLang === 'am' ? 'ምንም ንጥረ ነገሮች አልተመዘገቡም' : 'No ingredients listed') +
            '</div>';
    } else {
        let html = '';
        ingredients.forEach(function (ing, index) {
            html += '<div class="ing-item" data-index="' + index + '" data-ingredient="' + ing + '" onclick="toggleIngredient(this)">' +
                '<div class="ing-checkbox"></div>' +
                '<span class="ing-item-text">' + ing + '</span>' +
                '</div>';
        });
        listContainer.innerHTML = html;
    }

    document.getElementById('ingredientsModal').classList.add('show');
}

function toggleIngredient(element) {
    const ingredient = element.getAttribute('data-ingredient');

    if (element.classList.contains('excluded')) {
        element.classList.remove('excluded');
        excludedIngredients = excludedIngredients.filter(function (ing) {
            return ing !== ingredient;
        });
    } else {
        element.classList.add('excluded');
        excludedIngredients.push(ingredient);
    }
}

function addToCartFromModal() {
    if (!currentModalItem) return;

    const item = currentModalItem;
    const existing = cart.find(function (c) {
        return c.id === item.id && JSON.stringify(c.excludedIngredients || []) === JSON.stringify(excludedIngredients);
    });

    if (existing) {
        existing.quantity++;
    } else {
        cart.push({
            id: item.id,
            name: item.name,
            price: item.price,
            image_url: item.image_url,
            quantity: 1,
            excludedIngredients: excludedIngredients.slice()
        });
    }

    renderCart();
    closeIngredientsModal();

    const cartSection = document.getElementById('cartSection');
    if (!cartSection.classList.contains('expanded')) {
        cartSection.classList.add('expanded');
    }

    const itemName = getLocalizedText(item.name);
    const message = excludedIngredients.length > 0
        ? itemName + ' ' + (currentLang === 'am' ? 'ተጨምሯል (ማስተካከያ አለው)' : 'added (modified)')
        : itemName + ' ' + (currentLang === 'am' ? 'ተጨምሯል' : 'added');
    showToast(message, 'success');

    if (navigator.vibrate) {
        navigator.vibrate(50);
    }
}

function closeIngredientsModal() {
    document.getElementById('ingredientsModal').classList.remove('show');
    currentModalItem = null;
    excludedIngredients = [];
}

document.addEventListener('click', function (e) {
    const modal = document.getElementById('ingredientsModal');
    if (modal && e.target === modal) {
        closeIngredientsModal();
    }
});

// LOAD CATEGORIES
function loadCategories() {
    db.from('categories')
        .select('*')
        .order('name')
        .then(function (response) {
            if (response.error) {
                console.error('Error loading categories:', response.error);
                showToast('Error loading categories', 'error');
                return;
            }
            categories = response.data;
            renderCategories();
        });
}

function renderCategories() {
    const container = document.getElementById('categories');

    let html = '<button class="category-btn active" data-category="all" onclick="filterCategory(\'all\', this)">' +
        t('allCategories') + '</button>';

    categories.forEach(function (cat) {
        let catName = getLocalizedText(cat.name);

        if (typeof catName === 'object') {
            catName = catName[currentLang] || catName['en'] || catName.en || JSON.stringify(catName);
        }

        html += '<button class="category-btn" data-category="' + cat.id + '" onclick="filterCategory(\'' + cat.id + '\', this)">' +
            catName + '</button>';
    });

    container.innerHTML = html;
}

function filterCategory(categoryId, btn) {
    currentCategory = categoryId;

    document.querySelectorAll('.category-btn').forEach(function (b) {
        b.classList.remove('active');
    });
    btn.classList.add('active');

    renderMenuItems();
}

// LOAD MENU ITEMS
function loadMenuItems() {
    db.from('menu_items')
        .select('*')
        .order('name')
        .then(function (response) {
            if (response.error) {
                console.error('Error loading menu:', response.error);
                showToast('Error loading menu', 'error');
                return;
            }
            menuItems = response.data;
            renderMenuItems();
        });
}

function renderMenuItems() {
    const container = document.getElementById('menuGrid');

    let filtered = menuItems;

    if (currentCategory !== 'all') {
        filtered = filtered.filter(function (item) {
            return item.category_id === currentCategory;
        });
    }

    if (searchQuery) {
        filtered = filtered.filter(function (item) {
            const itemName = getLocalizedText(item.name).toLowerCase();
            const itemIngredients = getLocalizedText(item.ingredients).toLowerCase();
            return itemName.includes(searchQuery) || itemIngredients.includes(searchQuery);
        });
    }

    if (filtered.length === 0) {
        container.innerHTML = '<div class="loading">' + (currentLang === 'am' ? 'ምንም አልተገኘም' : 'No items found') + '</div>';
        return;
    }

    const ingredientsLabel = currentLang === 'am' ? 'ንጥረ ነገሮች' : 'Ingredients';

    let html = '';
    filtered.forEach(function (item) {
        const imageUrl = getImageUrl(item.image_url);
        const itemName = getLocalizedText(item.name);
        const itemPrice = parseFloat(item.price).toFixed(0) + ' Birr';
        const hasIngredients = item.ingredients && item.ingredients !== '';

        html += '<div class="menu-item" onclick="showIngredients(\'' + item.id + '\', event)">' +
            '<div class="menu-item-image">' +
            '<img src="' + imageUrl + '" alt="' + itemName + '" onerror="this.src=\'https://via.placeholder.com/150x150?text=No+Image\'">' +
            '</div>' +
            '<div class="menu-item-content">' +
            '<h4>' + itemName + '</h4>' +
            '<p class="price">' + itemPrice + '</p>';

        if (hasIngredients) {
            html += '<span class="menu-item-ingredients">📋 ' + ingredientsLabel + '</span>';
        }

        html += '</div>' +
            '<div class="menu-item-add">+</div>' +
            '</div>';
    });

    container.innerHTML = html;
}

// CART MANAGEMENT
function addToCart(itemId) {
    showIngredients(itemId, null);
}

function updateQuantity(itemId, cartIndex, change) {
    const item = cart[cartIndex];
    if (!item) return;

    item.quantity += change;

    if (item.quantity <= 0) {
        cart.splice(cartIndex, 1);
    }

    renderCart();
}

function removeFromCart(cartIndex) {
    cart.splice(cartIndex, 1);
    renderCart();
}

function renderCart() {
    const container = document.getElementById('cartItems');
    const countEl = document.getElementById('cartCount');
    const totalEl = document.getElementById('cartTotal');
    const submitBtn = document.getElementById('submitOrder');

    const totalItems = cart.reduce(function (sum, item) {
        return sum + item.quantity;
    }, 0);
    countEl.textContent = totalItems;

    if (cart.length === 0) {
        container.innerHTML = '<div class="empty-cart">' + t('emptyCart') + '</div>';
        totalEl.textContent = '0 Birr';
        submitBtn.disabled = true;
        return;
    }

    let html = '';
    cart.forEach(function (item, index) {
        const itemName = getLocalizedText(item.name);
        const itemPrice = parseFloat(item.price).toFixed(0) + ' Birr';
        const hasExclusions = item.excludedIngredients && item.excludedIngredients.length > 0;

        html += '<div class="cart-item">' +
            '<div class="cart-item-info">' +
            '<h4>' + itemName + '</h4>' +
            '<p>' + itemPrice + ' × ' + item.quantity + '</p>';

        if (hasExclusions) {
            html += '<p class="excluded-info">' +
                (currentLang === 'am' ? '❌ ያለ: ' : '❌ Without: ') +
                item.excludedIngredients.join(', ') + '</p>';
        }

        html += '</div>' +
            '<div class="cart-item-controls">' +
            '<button class="qty-btn" onclick="updateQuantity(\'' + item.id + '\', ' + index + ', -1)">−</button>' +
            '<span class="qty-value">' + item.quantity + '</span>' +
            '<button class="qty-btn" onclick="updateQuantity(\'' + item.id + '\', ' + index + ', 1)">+</button>' +
            '<button class="qty-btn remove" onclick="removeFromCart(' + index + ')">×</button>' +
            '</div>' +
            '</div>';
    });

    container.innerHTML = html;

    const total = cart.reduce(function (sum, item) {
        return sum + (item.price * item.quantity);
    }, 0);
    totalEl.textContent = parseFloat(total).toFixed(0) + ' Birr';

    submitBtn.disabled = false;
}

// SUBMIT ORDER
function submitOrder() {
    const tableNumber = document.getElementById('tableNumber').value;
    const waiterName = document.getElementById('waiterName').value.trim();

    if (!tableNumber) {
        showToast(currentLang === 'am' ? 'ጠረጴዛ ይምረጡ' : 'Please select a table', 'error');
        return;
    }

    if (!waiterName) {
        showToast(currentLang === 'am' ? 'ስምዎን ያስገቡ' : 'Please enter your name', 'error');
        return;
    }

    if (cart.length === 0) {
        showToast(currentLang === 'am' ? 'ምንም ዕቃ የለም' : 'Cart is empty', 'error');
        return;
    }

    const submitBtn = document.getElementById('submitOrder');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>' + (currentLang === 'am' ? 'በመላክ ላይ...' : 'Sending...') + '</span>';

    const total = cart.reduce(function (sum, item) {
        return sum + (item.price * item.quantity);
    }, 0);

    db.from('orders')
        .insert({
            table_number: parseInt(tableNumber),
            waiter_name: waiterName,
            status: 'pending',
            total_price: total
        })
        .select()
        .single()
        .then(function (response) {
            if (response.error) {
                console.error('Error creating order:', response.error);
                showToast(t('orderError'), 'error');
                resetSubmitButton();
                return;
            }

            const order = response.data;

            const orderItems = cart.map(function (item) {
                let specialInstructions = '';
                if (item.excludedIngredients && item.excludedIngredients.length > 0) {
                    specialInstructions = 'WITHOUT: ' + item.excludedIngredients.join(', ');
                }

                return {
                    order_id: order.id,
                    menu_item_id: item.id,
                    menu_item_name: getLocalizedText(item.name),
                    quantity: item.quantity,
                    price: item.price,
                    special_instructions: specialInstructions
                };
            });

            db.from('order_items')
                .insert(orderItems)
                .then(function (itemsResponse) {
                    if (itemsResponse.error) {
                        console.error('Error creating order items:', itemsResponse.error);
                        showToast(t('orderError'), 'error');
                        resetSubmitButton();
                        return;
                    }

                    showToast(t('orderSuccess') + ' - ' + t('table') + ' ' + tableNumber, 'success');

                    cart = [];
                    renderCart();

                    document.getElementById('tableNumber').value = '';

                    resetSubmitButton();
                });
        });
}

function resetSubmitButton() {
    const submitBtn = document.getElementById('submitOrder');
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span>' + t('sendToKitchen') + '</span><span class="btn-icon">🚀</span>';
}

console.log('✅ Waiter JS Loaded');