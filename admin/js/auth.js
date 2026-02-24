// admin/js/auth.js — robust sign up / sign in handling
(async function () {
    // Config helper
    const SUPABASE_URL = window.SUPABASE_URL;
    const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;

    const signinMsg = document.getElementById('signin-msg');
    const signupMsg = document.getElementById('signup-msg');
    const authPage = document.getElementById('auth-page');

    function revealPage() { try { if (authPage) authPage.classList.add('ready'); } catch (e) { } }

    // Clear any residual message containers so the login UI is clean on first paint
    if (signinMsg) signinMsg.textContent = '';
    if (signupMsg) signupMsg.textContent = '';

    // If opened via file:// log a warning (do not show it in UI)
    if (location.protocol === 'file:') {
        console.warn('Running admin over file:// may break authentication; serve via http://localhost or a static host.');
    }

    // Basic config check
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        // silently redirect to login/root if misconfigured
        console.error('Supabase not configured — missing SUPABASE_URL or SUPABASE_ANON_KEY.');
        try { location.href = 'login.html'; } catch (e) { }
        return;
    }

    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
        // Keep this as a developer console error only (avoid polluting UI)
        console.error('Supabase client library not loaded. Ensure the Supabase CDN script is included before auth scripts.');
        return;
    }

    // Create or reuse client (prefer global single client to avoid multiple GoTrue instances)
    const supabase = window.SUPABASE_CLIENT || (window.supabase && typeof window.supabase.createClient === 'function' ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null);
    if (!supabase) { console.error('auth.js: Supabase client not available'); revealPage(); return; }
    console.log('auth.js: Supabase client ready');

    // If a session exists, immediately redirect to dashboard without revealing login
    try {
        if (supabase.auth && typeof supabase.auth.getSession === 'function') {
            const { data } = await supabase.auth.getSession();
            if (data && data.session) { console.log('auth.js: session exists — redirecting'); location.href = 'dashboard.html'; return; }
        } else if (supabase.auth && typeof supabase.auth.session === 'function') {
            const s = supabase.auth.session(); if (s) { console.log('auth.js: session exists (legacy) — redirecting'); location.href = 'dashboard.html'; return; }
        }
    } catch (e) { console.warn('auth.js: session check failed', e); }

    // No existing session — reveal page
    revealPage();

    // Elements (do not change structure)
    const signinForm = document.getElementById('signin-form');
    const signupForm = document.getElementById('signup-form');
    const showSignup = document.getElementById('show-signup');
    const showSignin = document.getElementById('show-signin');

    // Defensive: ensure forms exist
    if (!signinForm || !signupForm) {
        console.error('auth.js: signin or signup form not found in DOM. Check your HTML.');
        return;
    }

    // Toggle links (safe-guard with checks)
    if (showSignup) showSignup.addEventListener('click', (e) => { e.preventDefault(); signupForm.classList.add('active'); signinForm.classList.remove('active'); });
    if (showSignin) showSignin.addEventListener('click', (e) => { e.preventDefault(); signinForm.classList.add('active'); signupForm.classList.remove('active'); });

    function showSigninMsg(text) { if (signinMsg) signinMsg.textContent = text; }
    function showSignupMsg(text) { if (signupMsg) signupMsg.textContent = text; }

    function validatePassword(p) { return p && p.length >= 8; }

    // Ensure the signed-in user is recorded as an owner (first user rule handled by RLS policy/trigger)
    async function ensureOwner(user) {
        if (!user || !user.id) return;
        try {
            const { error } = await supabase.from('owners').insert([{ user_id: user.id, email: user.email }]);
            if (error) {
                // expected for most users (only first insert allowed by policy)
                console.log('ensureOwner: insert returned error (likely not first user)', error.message || error);
            } else {
                console.log('ensureOwner: owner record created for', user.email);
            }
        } catch (e) {
            console.warn('ensureOwner failed', e);
        }
    }

    // SIGN UP (create owner account)
    let signupInProgress = false;
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (signupInProgress) return; // guard against double-submit
        signupInProgress = true;
        showSignupMsg('');
        console.log('auth.js: signup form submitted');

        const signupBtn = document.getElementById('signup-btn');
        const origSignupText = signupBtn ? signupBtn.textContent : 'Sign Up';
        if (signupBtn) {
            signupBtn.disabled = true;
            // set innerHTML with spinner for consistent reset
            signupBtn.innerHTML = origSignupText + ' <span class="btn-spinner" aria-hidden="true"></span>';
        }

        const email = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value;
        const confirm = document.getElementById('signup-password-confirm').value;

        if (!email) { showSignupMsg('Email is required'); signupInProgress = false; if (signupBtn) { signupBtn.disabled = false; signupBtn.innerHTML = origSignupText; } return; }
        if (!validatePassword(password)) { showSignupMsg('Password must be at least 8 characters'); signupInProgress = false; if (signupBtn) { signupBtn.disabled = false; signupBtn.innerHTML = origSignupText; } return; }
        if (password !== confirm) { showSignupMsg('Passwords do not match'); signupInProgress = false; if (signupBtn) { signupBtn.disabled = false; signupBtn.innerHTML = origSignupText; } return; }

        showSignupMsg('Creating account...');

        try {
            let res;
            // Try modern API
            if (supabase.auth && typeof supabase.auth.signUp === 'function') {
                res = await supabase.auth.signUp({ email, password });
            } else if (supabase.auth && typeof supabase.auth.api === 'object' && typeof supabase.auth.api.createUser === 'function') {
                // older SDK fallback (rare)
                res = await supabase.auth.api.createUser({ email, password });
            } else {
                throw new Error('Supabase auth API not available');
            }

            console.log('auth.js: signup response', res);
            const error = res.error || (res.data && res.data.error);
            const data = res.data || res;

            if (error) {
                console.error('auth.js: signup error', error);
                showSignupMsg(error.message || String(error));
                signupInProgress = false;
                if (signupBtn) { signupBtn.disabled = false; signupBtn.innerHTML = origSignupText; }
                return;
            }

            // If session present we are signed in immediately; otherwise confirm via email may be needed
            const hasSession = Boolean(data && (data.session || data.user && data.session));
            if (hasSession) {
                // try to ensure owner record exists (RLS may allow first insert) — don't block redirect
                try { ensureOwner(data.user || (res && res.user)); } catch (e) { /* ignore */ }
                showSignupMsg('Account created and signed in. Redirecting...');
                // Redirect immediately for smooth UX
                location.href = 'dashboard.html';
                return;
            } else {
                showSignupMsg('Account created. Please check your email to confirm (if required), then sign in.');
            }
        } catch (err) {
            console.error('auth.js: signup exception', err);
            showSignupMsg(err.message || 'Sign up failed');
        } finally {
            signupInProgress = false;
            if (signupBtn) { signupBtn.disabled = false; signupBtn.innerHTML = (typeof origSignupText !== 'undefined' ? origSignupText : 'Sign Up'); }
        }
    });

    // SIGN IN
    let signinInProgress = false;
    signinForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (signinInProgress) return; // prevent double-submit
        signinInProgress = true;
        showSigninMsg('');
        console.log('auth.js: signin form submitted');

        const signinBtn = document.getElementById('signin-btn');
        const origSigninText = signinBtn ? signinBtn.textContent : 'Sign In';
        if (signinBtn) {
            signinBtn.disabled = true;
            signinBtn.innerHTML = origSigninText + ' <span class="btn-spinner" aria-hidden="true"></span>';
        }

        const email = document.getElementById('signin-email').value.trim();
        const password = document.getElementById('signin-password').value;

        if (!email || !password) { showSigninMsg('Email and password are required'); signinInProgress = false; if (signinBtn) { signinBtn.disabled = false; signinBtn.innerHTML = origSigninText; } return; }

        showSigninMsg('Signing in...');

        try {
            let res;
            if (supabase.auth && typeof supabase.auth.signInWithPassword === 'function') {
                res = await supabase.auth.signInWithPassword({ email, password });
            } else if (supabase.auth && typeof supabase.auth.signIn === 'function') {
                // older SDK fallback
                res = await supabase.auth.signIn({ email, password });
            } else {
                throw new Error('Supabase auth API not available');
            }

            console.log('auth.js: signin response', res);
            const error = res.error || (res.data && res.data.error);
            const data = res.data || res;

            if (error) {
                console.error('auth.js: signin error', error);
                showSigninMsg(error.message || String(error));
                signinInProgress = false;
                if (signinBtn) { signinBtn.disabled = false; signinBtn.innerHTML = origSigninText; }
                return;
            }

            // If we have a session or user, redirect
            const hasSession = Boolean(data && (data.session || data.user || data.access_token || data.provider_token));
            if (hasSession) {
                showSigninMsg('Signed in. Redirecting...');
                try {
                    const user = (data && data.user) || res.user || null;
                    if (user && user.id) {
                        await ensureOwner(user);
                    }
                } catch (e) { console.warn('ensureOwner failed', e); }
                setTimeout(() => location.href = 'dashboard.html', 400);
            } else {
                // No session returned - likely email confirm required
                showSigninMsg('Signed in but no session found. If your project requires email confirmation, check your email.');
            }
        } catch (err) {
            console.error('auth.js: signin exception', err);
            showSigninMsg(err.message || 'Sign in failed');
        } finally {
            signinInProgress = false;
            if (signinBtn) { signinBtn.disabled = false; signinBtn.innerHTML = (typeof origSigninText !== 'undefined' ? origSigninText : 'Sign In'); }
        }
    });

    // NOTE: auth state changes and initial session check handled above; avoid onAuthStateChange here to prevent redirect loops/flicker
})();
