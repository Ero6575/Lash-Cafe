/*
  supabase-config.js — single place to add Supabase project settings.
*/


window.SUPABASE_URL = 'https://uffpgrzoxsbecvgeynxp.supabase.co';
window.SUPABASE_ANON_KEY = 'sb_publishable_Rh-3Q5PTKTf-CIBUEJXPHA_OHcFE2CX';

window.initSupabase = function (url, anonKey) {
    if (!url || !anonKey) return null;
    window.SUPABASE_URL = url;
    window.SUPABASE_ANON_KEY = anonKey;
    if (window.supabase && typeof window.supabase.createClient === 'function') {
        try { window.SUPABASE_CLIENT = window.supabase.createClient(url, anonKey); } catch (e) { console.warn('initSupabase: client init failed', e); }
    }
    return window.SUPABASE_CLIENT || null;
};

// Friendly developer message when config is missing
if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    /* leave empty by default — set these values locally before using admin features */
    console.warn('supabase-config: set SUPABASE_URL and SUPABASE_ANON_KEY in supabase-config.js');
} else {
    // If the CDN is already loaded, create a client for convenience
    if (window.supabase && typeof window.supabase.createClient === 'function') {
        try { window.SUPABASE_CLIENT = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY); console.log('supabase-config: SUPABASE_CLIENT ready'); } catch (e) { console.warn('supabase-config: client init failed', e); }
    }
}
