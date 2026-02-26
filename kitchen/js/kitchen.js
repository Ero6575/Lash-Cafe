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
    }
  }

  function playNotificationSound() {
    initSound();
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
  // DOM ELEMENTS
  // ═══════════════════════════════════════════════════════
  const ordersGrid = document.getElementById('ordersGrid');
  const pendingCount = document.getElementById('pendingCount');
  const preparingCount = document.getElementById('preparingCount');
  const readyCount = document.getElementById('readyCount');
  const langBtn = document.getElementById('langBtn');

  if (!ordersGrid) {
    console.error('❌ ordersGrid not found');
    return;
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
    if (!orders || orders.length === 0) {
      ordersGrid.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">🍳</span>
                    <h2>No active orders</h2>
                    <p>Waiting for orders...</p>
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
        const notes = item.notes ? `
                    <div class="order-item-instructions">
                        <span class="instructions-icon">📝</span>
                        <span class="instructions-text">${escapeHtml(item.notes)}</span>
                    </div>
                ` : '';

        return `
                    <div class="order-item">
                        <div class="order-item-main">
                            <span class="item-name">${escapeHtml(name)}</span>
                            <span class="item-qty">${qty}x</span>
                        </div>
                        ${notes}
                    </div>
                `;
      }).join('');

      return `
                <div class="order-card ${status}">
                    <div class="order-header">
                        <div class="table-info">
                            <h3>🪑 Table ${tableNum}</h3>
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
    if (status === 'pending') {
      return `<button class="action-btn preparing-btn" data-action="preparing" data-order-id="${orderId}">▶️ Start Preparing</button>`;
    }
    if (status === 'preparing') {
      return `<button class="action-btn ready-btn" data-action="ready" data-order-id="${orderId}">✅ Mark Ready</button>`;
    }
    if (status === 'ready') {
      return `<button class="action-btn served-btn" data-action="served" data-order-id="${orderId}">🍽️ Mark Served</button>`;
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
    const orderId = btn.dataset.orderId; // UUID string - no parseInt!

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
  // LANGUAGE SWITCHER
  // ═══════════════════════════════════════════════════════
  if (langBtn) {
    langBtn.addEventListener('click', function () {
      const toggle = document.getElementById('langToggle');
      if (!toggle) return;
      const current = toggle.textContent.trim();
      toggle.textContent = current === 'AM' ? 'አማ' : 'AM';
      console.log('Language switched to', toggle.textContent);
    });
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
        return parsed.en || parsed.am || nameField;
      } catch (e) {
        return nameField;
      }
    }

    if (typeof nameField === 'object') {
      return nameField.en || nameField.am || 'Unknown';
    }

    return String(nameField);
  }

  function formatStatus(status) {
    const map = {
      pending: '⏳ Pending',
      preparing: '👨‍🍳 Preparing',
      ready: '✅ Ready'
    };
    return map[status] || status;
  }

  function getTimeAgo(timestamp) {
    const now = new Date();
    const then = new Date(timestamp);
    const mins = Math.floor((now - then) / 60000);

    if (mins < 1) return 'Just now';
    if (mins === 1) return '1 min ago';
    if (mins < 60) return `${mins} mins ago`;

    const hours = Math.floor(mins / 60);
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
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