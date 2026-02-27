// SUPABASE CONFIGURATION
window.SUPABASE_URL = 'https://uffpgrzoxsbecvgeynxp.supabase.co';
window.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmZnBncnpveHNiZWN2Z2V5bnhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNDE1NTcsImV4cCI6MjA4NjcxNzU1N30.UFuBmJ9C0xpvHbVndXtSB52R3Ehc1jzzaE068hpMnJA';

// Initialize Supabase Client
var db = null;
function initSupabaseClient() {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
        db = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
        window.SUPABASE_CLIENT = db;
        console.log('✅ Supabase Client Ready');
        return true;
    }
    return false;
}

// Try to initialize immediately
if (!initSupabaseClient()) {
    setTimeout(initSupabaseClient, 100);
}

// LANGUAGE TRANSLATIONS
var LANG = {
    en: {
        waiterDashboard: 'Waiter Dashboard',
        kitchenDisplay: 'Kitchen Display',
        waiterName: 'Waiter Name',
        enterName: 'Enter your name',
        tableNumber: 'Table Number',
        selectTable: 'Select Table',
        menu: 'Menu',
        allCategories: 'All',
        currentOrder: 'Current Order',
        emptyCart: 'No items added yet',
        total: 'Total',
        submitOrder: 'Submit Order',
        sendToKitchen: 'Send to Kitchen',
        orderSuccess: 'Order sent successfully!',
        orderError: 'Error sending order',
        pending: 'Pending',
        preparing: 'Preparing',
        ready: 'Ready',
        served: 'Served',
        newOrder: 'NEW',
        table: 'Table',
        items: 'items',
        markPreparing: 'Start Preparing',
        markReady: 'Mark Ready',
        markServed: 'Mark Served',
        noOrders: 'No active orders',
        waitingOrders: 'Waiting for orders...',
        quantity: 'Qty',
        notes: 'Special notes',
        addNote: 'Add note',
        remove: 'Remove',
        searchMenu: 'Search menu...',
        recentOrders: 'Recent Orders'
    },
    am: {
        waiterDashboard: 'የአስተናጋጅ ዳሽቦርድ',
        kitchenDisplay: 'የወጥ ቤት ማሳያ',
        waiterName: 'የአስተናጋጅ ስም',
        enterName: 'ስምዎን ያስገቡ',
        tableNumber: 'የጠረጴዛ ቁጥር',
        selectTable: 'ጠረጴዛ ይምረጡ',
        menu: 'ምናሌ',
        allCategories: 'ሁሉም',
        currentOrder: 'የአሁኑ ትዕዛዝ',
        emptyCart: 'ምንም ዕቃ አልተጨመረም',
        total: 'ጠቅላላ',
        submitOrder: 'ትዕዛዝ አስገባ',
        sendToKitchen: 'ወደ ወጥ ቤት ላክ',
        orderSuccess: 'ትዕዛዙ በተሳካ ሁኔታ ተልኳል!',
        orderError: 'ትዕዛዙን መላክ አልተቻለም',
        pending: 'በመጠበቅ ላይ',
        preparing: 'በማዘጋጀት ላይ',
        ready: 'ዝግጁ',
        served: 'ተቀርቧል',
        newOrder: 'አዲስ',
        table: 'ጠረጴዛ',
        items: 'ዕቃዎች',
        markPreparing: 'ማዘጋጀት ጀምር',
        markReady: 'ዝግጁ ምልክት አድርግ',
        markServed: 'ተቀርቧል ምልክት አድርግ',
        noOrders: 'ምንም ትዕዛዝ የለም',
        waitingOrders: 'ትዕዛዝ በመጠበቅ ላይ...',
        quantity: 'ብዛት',
        notes: 'ልዩ ማስታወሻ',
        addNote: 'ማስታወሻ ጨምር',
        remove: 'አስወግድ',
        searchMenu: 'ምናሌ ፈልግ...',
        recentOrders: 'የቅርብ ጊዜ ትዕዛዞች'
    }
};

// Current language
var currentLang = localStorage.getItem('lang') || 'en';

// Get translation
function t(key) {
    return (LANG[currentLang] && LANG[currentLang][key]) || LANG['en'][key] || key;
}

// Switch language
function switchLanguage() {
    currentLang = currentLang === 'en' ? 'am' : 'en';
    localStorage.setItem('lang', currentLang);
    location.reload();
}

// CURRENCY FORMATTER
function formatPrice(price) {
    return parseFloat(price).toFixed(2) + ' ETB';
}

// TIME FORMATTERS
function timeAgo(timestamp) {
    var now = new Date();
    var then = new Date(timestamp);
    var minutes = Math.floor((now - then) / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 min ago';
    if (minutes < 60) return minutes + ' mins ago';

    var hours = Math.floor(minutes / 60);
    if (hours === 1) return '1 hour ago';
    return hours + ' hours ago';
}

// TOAST NOTIFICATIONS
function showToast(message, type) {
    type = type || 'success';

    var existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();

    var toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.innerHTML = '<span class="toast-icon">' + (type === 'success' ? '✅' : '❌') + '</span>' +
        '<span class="toast-message">' + message + '</span>';
    document.body.appendChild(toast);

    setTimeout(function () { toast.classList.add('show'); }, 10);

    setTimeout(function () {
        toast.classList.remove('show');
        setTimeout(function () { toast.remove(); }, 300);
    }, 3000);
}

// Make showToast global
window.showToast = showToast;

// TABLE OPTIONS
function generateTableOptions(selectElement, maxTables) {
    maxTables = maxTables || 30;
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">' + t('selectTable') + '</option>';
    for (var i = 1; i <= maxTables; i++) {
        selectElement.innerHTML += '<option value="' + i + '">' + t('table') + ' ' + i + '</option>';
    }
}

// NOTIFICATION SOUND
function playNotificationSound() {
    var audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBzyO1fPTgjMGHm7A7+OZRQ0LPJ3i8bpmHgU8eleP');
    audio.play().catch(function (e) { });
}

console.log('✅ Supabase Config Loaded');
console.log('🌐 Language:', currentLang === 'en' ? 'English' : 'አማርኛ');