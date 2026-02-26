// ================================
// STATE MANAGEMENT
// ================================
var cart = [];
var menuItems = [];
var categories = [];
var currentCategory = 'all';
var searchQuery = '';

// ================================
// INITIALIZATION
// ================================
document.addEventListener('DOMContentLoaded', function () {
    initApp();
});

function initApp() {
    // Check if db is ready
    if (!db) {
        console.error('❌ Database not ready!');
        showToast('Connection error. Please refresh.', 'error');
        return;
    }

    // Apply translations
    applyTranslations();

    // Generate table options (30 tables default)
    var tableSelect = document.getElementById('tableNumber');
    generateTableOptions(tableSelect, 30);

    // Load data
    loadCategories();
    loadMenuItems();

    // Set up event listeners
    setupEventListeners();

    // Create ingredients modal
    createIngredientsModal();

    // Load saved waiter name
    var savedName = localStorage.getItem('waiterName');
    if (savedName) {
        document.getElementById('waiterName').value = savedName;
    }

    console.log('✅ Waiter App Initialized');
}

// ================================
// CART TOGGLE
// ================================
function toggleCart() {
    var cartSection = document.getElementById('cartSection');
    cartSection.classList.toggle('expanded');
}

// ================================
// TRANSLATIONS
// ================================
function applyTranslations() {
    // Update language toggle button
    document.getElementById('langToggle').textContent = currentLang === 'en' ? 'አማ' : 'EN';

    // Translate all elements with data-translate
    document.querySelectorAll('[data-translate]').forEach(function (el) {
        var key = el.getAttribute('data-translate');
        el.textContent = t(key);
    });

    // Translate placeholders
    document.querySelectorAll('[data-placeholder]').forEach(function (el) {
        var key = el.getAttribute('data-placeholder');
        el.placeholder = t(key);
    });
}

// ================================
// EVENT LISTENERS
// ================================
function setupEventListeners() {
    // Search input
    document.getElementById('searchMenu').addEventListener('input', function (e) {
        searchQuery = e.target.value.toLowerCase();
        renderMenuItems();
    });

    // Save waiter name
    document.getElementById('waiterName').addEventListener('change', function (e) {
        localStorage.setItem('waiterName', e.target.value);
    });

    // Submit order
    document.getElementById('submitOrder').addEventListener('click', submitOrder);
}

// ================================
// HELPER: Get Localized Text
// ================================
function getLocalizedText(field) {
    if (!field) return '';

    // If it's already a string (not JSON), return as is
    if (typeof field === 'string') {
        // Check if it's a JSON string
        if (field.startsWith('{') && field.includes('"en"')) {
            try {
                var parsed = JSON.parse(field);
                return parsed[currentLang] || parsed['en'] || field;
            } catch (e) {
                return field;
            }
        }
        return field;
    }

    // If it's an object, get the correct language
    if (typeof field === 'object') {
        return field[currentLang] || field['en'] || '';
    }

    return String(field);
}

// ================================
// HELPER: Parse Ingredients to Array
// ================================
function parseIngredients(ingredientsField) {
    var text = getLocalizedText(ingredientsField);
    if (!text || text === '') return [];

    // Split by comma, newline, or bullet points
    var ingredients = text.split(/[,\n•·]/);

    // Clean up each ingredient
    return ingredients
        .map(function (ing) {
            return ing.trim();
        })
        .filter(function (ing) {
            return ing.length > 0;
        });
}

// ================================
// HELPER: Fix Image Path
// ================================
function getImageUrl(imageUrl) {
    if (!imageUrl || imageUrl === '') {
        return 'https://via.placeholder.com/150x150?text=No+Image';
    }

    // If it's already a full URL (http/https), return as is
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        return imageUrl;
    }

    // If it already has ../ prefix, return as is
    if (imageUrl.startsWith('../')) {
        return imageUrl;
    }

    // Add ../ prefix for paths like "images/breakfast/file.jpg"
    return '../' + imageUrl;
}

// ================================
// INGREDIENTS MODAL
// ================================
function createIngredientsModal() {
    // Check if modal already exists
    if (document.getElementById('ingredientsModal')) return;

    var modalHTML = '<div id="ingredientsModal" class="ing-modal">' +
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

    // Add modal styles
    var modalStyles = '<style>' +
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
var currentModalItem = null;
var excludedIngredients = [];

function showIngredients(itemId, event) {
    // Stop the click from adding to cart
    if (event) event.stopPropagation();

    var item = menuItems.find(function (m) {
        return m.id === itemId;
    });

    if (!item) return;

    currentModalItem = item;
    excludedIngredients = [];

    var itemName = getLocalizedText(item.name);
    var itemPrice = parseFloat(item.price).toFixed(0) + ' Birr';
    var imageUrl = getImageUrl(item.image_url);
    var ingredients = parseIngredients(item.ingredients);

    // Update modal content
    document.getElementById('ingModalImage').src = imageUrl;
    document.getElementById('ingModalImage').alt = itemName;
    document.getElementById('ingModalTitle').textContent = itemName;
    document.getElementById('ingModalPrice').textContent = itemPrice;

    // Update labels based on language
    document.getElementById('ingModalLabel').textContent = currentLang === 'am' ? 'ንጥረ ነገሮች' : 'Ingredients';
    document.getElementById('ingModalSubtitle').textContent = currentLang === 'am'
        ? 'ደንበኛው የማይፈልጋቸውን ያስወግዱ'
        : 'Uncheck items customer doesn\'t want';
    document.getElementById('ingAddBtn').textContent = currentLang === 'am' ? 'ወደ ትዕዛዝ ጨምር' : 'Add to Order';

    // Render ingredients list
    var listContainer = document.getElementById('ingModalList');

    if (ingredients.length === 0) {
        listContainer.innerHTML = '<div class="ing-no-ingredients">' +
            (currentLang === 'am' ? 'ምንም ንጥረ ነገሮች አልተመዘገቡም' : 'No ingredients listed') +
            '</div>';
    } else {
        var html = '';
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
    var ingredient = element.getAttribute('data-ingredient');

    if (element.classList.contains('excluded')) {
        // Include it back
        element.classList.remove('excluded');
        excludedIngredients = excludedIngredients.filter(function (ing) {
            return ing !== ingredient;
        });
    } else {
        // Exclude it
        element.classList.add('excluded');
        excludedIngredients.push(ingredient);
    }
}

function addToCartFromModal() {
    if (!currentModalItem) return;

    var item = currentModalItem;
    var existing = cart.find(function (c) {
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
            excludedIngredients: excludedIngredients.slice() // Copy the array
        });
    }

    renderCart();
    closeIngredientsModal();

    // Expand cart on mobile
    var cartSection = document.getElementById('cartSection');
    if (!cartSection.classList.contains('expanded')) {
        cartSection.classList.add('expanded');
    }

    var itemName = getLocalizedText(item.name);
    var message = excludedIngredients.length > 0
        ? itemName + ' ' + (currentLang === 'am' ? 'ተጨምሯል (ማስተካከያ አለው)' : 'added (modified)')
        : itemName + ' ' + (currentLang === 'am' ? 'ተጨምሯል' : 'added');
    showToast(message, 'success');

    // Haptic feedback (mobile)
    if (navigator.vibrate) {
        navigator.vibrate(50);
    }
}

function closeIngredientsModal() {
    document.getElementById('ingredientsModal').classList.remove('show');
    currentModalItem = null;
    excludedIngredients = [];
}

// Close modal when clicking outside
document.addEventListener('click', function (e) {
    var modal = document.getElementById('ingredientsModal');
    if (modal && e.target === modal) {
        closeIngredientsModal();
    }
});

// ================================
// LOAD CATEGORIES
// ================================
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
    var container = document.getElementById('categories');

    var html = '<button class="category-btn active" data-category="all" onclick="filterCategory(\'all\', this)">' +
        t('allCategories') + '</button>';

    categories.forEach(function (cat) {
        // Get localized category name
        var catName = getLocalizedText(cat.name);

        // If name is still an object or JSON, try to extract
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

    // Update active button
    document.querySelectorAll('.category-btn').forEach(function (b) {
        b.classList.remove('active');
    });
    btn.classList.add('active');

    renderMenuItems();
}

// ================================
// LOAD MENU ITEMS
// ================================
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
    var container = document.getElementById('menuGrid');

    // Filter items
    var filtered = menuItems;

    // By category
    if (currentCategory !== 'all') {
        filtered = filtered.filter(function (item) {
            return item.category_id === currentCategory;
        });
    }

    // By search
    if (searchQuery) {
        filtered = filtered.filter(function (item) {
            var itemName = getLocalizedText(item.name).toLowerCase();
            var itemIngredients = getLocalizedText(item.ingredients).toLowerCase();
            return itemName.includes(searchQuery) || itemIngredients.includes(searchQuery);
        });
    }

    // Render
    if (filtered.length === 0) {
        container.innerHTML = '<div class="loading">' + (currentLang === 'am' ? 'ምንም አልተገኘም' : 'No items found') + '</div>';
        return;
    }

    var ingredientsLabel = currentLang === 'am' ? 'ንጥረ ነገሮች' : 'Ingredients';

    var html = '';
    filtered.forEach(function (item) {
        var imageUrl = getImageUrl(item.image_url);
        var itemName = getLocalizedText(item.name);
        var itemPrice = parseFloat(item.price).toFixed(0) + ' Birr';
        var hasIngredients = item.ingredients && item.ingredients !== '';

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

// ================================
// CART MANAGEMENT
// ================================
function addToCart(itemId) {
    // Now redirects to show ingredients modal
    showIngredients(itemId, null);
}

function updateQuantity(itemId, cartIndex, change) {
    var item = cart[cartIndex];
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
    var container = document.getElementById('cartItems');
    var countEl = document.getElementById('cartCount');
    var totalEl = document.getElementById('cartTotal');
    var submitBtn = document.getElementById('submitOrder');

    // Update count
    var totalItems = cart.reduce(function (sum, item) {
        return sum + item.quantity;
    }, 0);
    countEl.textContent = totalItems;

    // Empty cart
    if (cart.length === 0) {
        container.innerHTML = '<div class="empty-cart">' + t('emptyCart') + '</div>';
        totalEl.textContent = '0 Birr';
        submitBtn.disabled = true;
        return;
    }

    // Render items
    var html = '';
    cart.forEach(function (item, index) {
        var itemName = getLocalizedText(item.name);
        var itemPrice = parseFloat(item.price).toFixed(0) + ' Birr';
        var hasExclusions = item.excludedIngredients && item.excludedIngredients.length > 0;

        html += '<div class="cart-item">' +
            '<div class="cart-item-info">' +
            '<h4>' + itemName + '</h4>' +
            '<p>' + itemPrice + ' × ' + item.quantity + '</p>';

        // Show excluded ingredients
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

    // Update total
    var total = cart.reduce(function (sum, item) {
        return sum + (item.price * item.quantity);
    }, 0);
    totalEl.textContent = parseFloat(total).toFixed(0) + ' Birr';

    // Enable submit
    submitBtn.disabled = false;
}

// ================================
// SUBMIT ORDER
// ================================
function submitOrder() {
    var tableNumber = document.getElementById('tableNumber').value;
    var waiterName = document.getElementById('waiterName').value.trim();

    // Validation
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

    // Disable button
    var submitBtn = document.getElementById('submitOrder');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>' + (currentLang === 'am' ? 'በመላክ ላይ...' : 'Sending...') + '</span>';

    // Calculate total
    var total = cart.reduce(function (sum, item) {
        return sum + (item.price * item.quantity);
    }, 0);

    // Create order
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

            var order = response.data;

            // Create order items with excluded ingredients as special instructions
            var orderItems = cart.map(function (item) {
                var specialInstructions = '';
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

                    // Success!
                    showToast(t('orderSuccess') + ' - ' + t('table') + ' ' + tableNumber, 'success');

                    // Clear cart
                    cart = [];
                    renderCart();

                    // Reset table selection
                    document.getElementById('tableNumber').value = '';

                    resetSubmitButton();
                });
        });
}

function resetSubmitButton() {
    var submitBtn = document.getElementById('submitOrder');
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span>' + t('sendToKitchen') + '</span><span class="btn-icon">🚀</span>';
}

console.log('✅ Waiter JS Loaded');