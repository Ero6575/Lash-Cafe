// kitchen/js/kitchen.js — Kitchen Display
(async function () {
  console.log('🍳 Kitchen Display Loading...');

  // ═══════════════════════════════════════════════════════
  // NOTIFICATION SOUND
  // ═══════════════════════════════════════════════════════
  let notificationSound = null;
  let soundEnabled = false;

  function initSound() {
    if (!notificationSound) {
      notificationSound = new Audio('sound/soundreality-notification-tone-443095.mp3');
      notificationSound.volume = 0.7;
      notificationSound.load();
    }
  }

  function playNotificationSound() {
    if (!soundEnabled || !notificationSound) return;
    notificationSound.currentTime = 0;
    notificationSound.play().catch(err => {
      console.log('🔇 Sound blocked:', err.message);
    });
  }

  document.addEventListener('click', function enableSound() {
    if (!soundEnabled) {
      soundEnabled = true;
      initSound();
      console.log('🔊 Sound enabled');
    }
  }, { once: true });

  window.testSound = function () {
    console.log('Testing sound...');
    playNotificationSound();
  };

  // ═══════════════════════════════════════════════════════
  // WAIT FOR SUPABASE
  // ═══════════════════════════════════════════════════════
  let attempts = 0;
  while (!window.SUPABASE_URL && attempts < 30) {
    await new Promise(r => setTimeout(r, 100));
    attempts++;
  }

  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    console.error('❌ Supabase config not loaded');
    return;
  }

  const supabase = window.SUPABASE_CLIENT || window.supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_ANON_KEY
  );

  if (!window.SUPABASE_CLIENT) {
    window.SUPABASE_CLIENT = supabase;
  }

  console.log('✅ Supabase ready');

  // ═══════════════════════════════════════════════════════
  // TRANSLATIONS
  // ═══════════════════════════════════════════════════════
  const kitchenTranslations = {
    en: {
      noOrders: 'No active orders',
      waiting: 'Waiting for orders...',
      pending: '⏳ Pending',
      preparing: '👨‍🍳 Preparing',
      ready: '✅ Ready',
      startPreparing: '▶️ Start Preparing',
      markReady: '✅ Mark Ready',
      markServed: '🍽️ Mark Served',
      table: 'Table',
      justNow: 'Just now',
      minAgo: 'min ago',
      minsAgo: 'mins ago',
      hourAgo: '1 hour ago',
      hoursAgo: 'hours ago'
    },
    am: {
      noOrders: 'ምንም ትዕዛዝ የለም',
      waiting: 'ትዕዛዝ በመጠበቅ ላይ...',
      pending: '⏳ በመጠበቅ ላይ',
      preparing: '👨‍🍳 በማዘጋጀት ላይ',
      ready: '✅ ዝግጁ',
      startPreparing: '▶️ ማዘጋጀት ጀምር',
      markReady: '✅ ዝግጁ ምልክት አድርግ',
      markServed: '🍽️ ተቀርቧል ምልክት አድርግ',
      table: 'ጠረጴዛ',
      justNow: 'አሁን',
      minAgo: 'ደቂቃ በፊት',
      minsAgo: 'ደቂቃዎች በፊት',
      hourAgo: '1 ሰዓት በፊት',
      hoursAgo: 'ሰዓቶች በፊት'
    }
  };

  let currentLang = 'en';

  // ═══════════════════════════════════════════════════════
  // DOM ELEMENTS
  // ═══════════════════════════════════════════════════════
  const ordersGrid = document.getElementById('ordersGrid');
  const pendingCount = document.getElementById('pendingCount');
  const preparingCount = document.getElementById('preparingCount');
  const readyCount = document.getElementById('readyCount');
  const langBtn = document.getElementById('langBtn');
  const langToggle = document.getElementById('langToggle');

  if (!ordersGrid) {
    console.error('❌ ordersGrid not found');
    return;
  }

  // ═══════════════════════════════════════════════════════
  // LANGUAGE SWITCHER
  // ═══════════════════════════════════════════════════════
  if (langBtn) {
    langBtn.addEventListener('click', function () {
      currentLang = currentLang === 'en' ? 'am' : 'en';
      if (langToggle) {
        langToggle.textContent = currentLang === 'en' ? 'አማ' : 'EN';
      }
      console.log('🌍 Language switched to', currentLang);
      renderOrders();
    });
  } else {
    console.warn('⚠️ langBtn not found - check kitchen.html has id="langBtn"');
  }

  // ═══════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════
  let orders = [];
  let lastOrderCount = 0;

  // ═══════════════════════════════════════════════════════
  // LOAD ORDERS
  // ═══════════════════════════════════════════════════════
  async function loadOrders() {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
                    *,
                    order_items (
                        id,
                        quantity,
                        notes,
                        special_instructions,
                        menu_items (
                            name,
                            price
                        )
                    )
                `)
        .in('status', ['pending', 'preparing', 'ready'])
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Load failed:', error);
        return;
      }

      orders = data || [];

      if (orders.length > lastOrderCount && lastOrderCount > 0) {
        console.log('🔔 New order!');
        playNotificationSound();
      }

      lastOrderCount = orders.length;

      console.log('✅ Loaded', orders.length, 'orders');
      renderOrders();
      updateStats();

    } catch (err) {
      console.error('❌ Error:', err);
    }
  }

  // ═══════════════════════════════════════════════════════
  // UPDATE STATS
  // ═══════════════════════════════════════════════════════
  function updateStats() {
    const pending = orders.filter(o => o.status === 'pending').length;
    const preparing = orders.filter(o => o.status === 'preparing').length;
    const ready = orders.filter(o => o.status === 'ready').length;

    if (pendingCount) pendingCount.textContent = pending;
    if (preparingCount) preparingCount.textContent = preparing;
    if (readyCount) readyCount.textContent = ready;
  }

  // ═══════════════════════════════════════════════════════
  // RENDER ORDERS
  // ═══════════════════════════════════════════════════════
  function renderOrders() {
    const lang = kitchenTranslations[currentLang];

    if (!orders || orders.length === 0) {
      ordersGrid.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">🍳</span>
                    <h2>${lang.noOrders}</h2>
                    <p>${lang.waiting}</p>
                </div>
            `;
      return;
    }

    ordersGrid.innerHTML = orders.map(order => {
      const items = order.order_items || [];
      const tableNum = order.table_number || '?';
      const waiterName = order.waiter_name || 'Unknown';
      const timeAgo = getTimeAgo(order.created_at);
      const status = order.status || 'pending';

      const itemsHtml = items.map(item => {
        const menuItem = item.menu_items || {};
        const name = getTranslatedName(menuItem.name);
        const qty = item.quantity || 1;

        // ✅ Check both special_instructions and notes
        const specialNote = item.special_instructions || item.notes || '';
        const notesHtml = specialNote ? `
                    <div class="order-item-instructions">
                        <span class="instructions-icon">❌</span>
                        <span class="instructions-text">${escapeHtml(specialNote)}</span>
                    </div>
                ` : '';

        return `
                    <div class="order-item">
                        <div class="order-item-main">
                            <span class="item-name">${escapeHtml(name)}</span>
                            <span class="item-qty">${qty}x</span>
                        </div>
                        ${notesHtml}
                    </div>
                `;
      }).join('');

      return `
                <div class="order-card ${status}">
                    <div class="order-header">
                        <div class="table-info">
                            <h3>🪑 ${lang.table} ${tableNum}</h3>
                            <div class="waiter">👤 ${escapeHtml(waiterName)}</div>
                        </div>
                        <div class="order-meta">
                            <div class="order-time">🕐 ${timeAgo}</div>
                            <span class="order-badge ${status}">${formatStatus(status)}</span>
                        </div>
                    </div>
                    <div class="order-items">
                        ${itemsHtml}
                    </div>
                    <div class="order-footer">
                        <div class="order-actions">
                            ${getActionButton(order.id, status)}
                        </div>
                    </div>
                </div>
            `;
    }).join('');
  }

  // ═══════════════════════════════════════════════════════
  // GET ACTION BUTTON
  // ═══════════════════════════════════════════════════════
  function getActionButton(orderId, status) {
    const lang = kitchenTranslations[currentLang];
    if (status === 'pending') {
      return `<button class="action-btn preparing-btn" data-action="preparing" data-order-id="${orderId}">${lang.startPreparing}</button>`;
    }
    if (status === 'preparing') {
      return `<button class="action-btn ready-btn" data-action="ready" data-order-id="${orderId}">${lang.markReady}</button>`;
    }
    if (status === 'ready') {
      return `<button class="action-btn served-btn" data-action="served" data-order-id="${orderId}">${lang.markServed}</button>`;
    }
    return '';
  }

  // ═══════════════════════════════════════════════════════
  // EVENT DELEGATION FOR ORDER BUTTONS
  // ═══════════════════════════════════════════════════════
  ordersGrid.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const orderId = btn.dataset.orderId;

    console.log('Button clicked:', action, orderId);

    if (action && orderId) {
      updateOrderStatus(orderId, action);
    }
  });

  // ═══════════════════════════════════════════════════════
  // UPDATE ORDER STATUS
  // ═══════════════════════════════════════════════════════
  async function updateOrderStatus(orderId, newStatus) {
    console.log('Updating order', orderId, 'to', newStatus);

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) {
        console.error('❌ Update failed:', error);
        alert('Failed to update: ' + error.message);
        return;
      }

      console.log('✅ Updated successfully');
      loadOrders();

    } catch (err) {
      console.error('❌ Error:', err);
      alert('Error: ' + err.message);
    }
  }

  // ═══════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function getTranslatedName(nameField) {
    if (!nameField) return 'Unknown';

    if (typeof nameField === 'string') {
      try {
        const parsed = JSON.parse(nameField);
        return parsed[currentLang] || parsed.en || nameField;
      } catch (e) {
        return nameField;
      }
    }

    if (typeof nameField === 'object') {
      return nameField[currentLang] || nameField.en || 'Unknown';
    }

    return String(nameField);
  }

  function formatStatus(status) {
    const lang = kitchenTranslations[currentLang];
    const map = {
      pending: lang.pending,
      preparing: lang.preparing,
      ready: lang.ready
    };
    return map[status] || status;
  }

  function getTimeAgo(timestamp) {
    const lang = kitchenTranslations[currentLang];
    const now = new Date();
    const then = new Date(timestamp);
    const mins = Math.floor((now - then) / 60000);

    if (mins < 1) return lang.justNow;
    if (mins === 1) return `1 ${lang.minAgo}`;
    if (mins < 60) return `${mins} ${lang.minsAgo}`;

    const hours = Math.floor(mins / 60);
    return hours === 1 ? lang.hourAgo : `${hours} ${lang.hoursAgo}`;
  }

  // ═══════════════════════════════════════════════════════
  // REALTIME
  // ═══════════════════════════════════════════════════════
  supabase
    .channel('kitchen-live')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'orders'
    }, (payload) => {
      console.log('🔄 Order changed:', payload.eventType);

      if (payload.eventType === 'INSERT') {
        console.log('🔔 NEW ORDER!');
        playNotificationSound();
      }

      loadOrders();
    })
    .subscribe((status) => {
      console.log('📡 Realtime:', status);
    });

  // ═══════════════════════════════════════════════════════
  // AUTO-REFRESH
  // ═══════════════════════════════════════════════════════
  setInterval(loadOrders, 30000);

  // ═══════════════════════════════════════════════════════
  // INITIAL LOAD
  // ═══════════════════════════════════════════════════════
  loadOrders();

  console.log('✅ Kitchen Ready');
})();