// admin/js/auth.js — FIXED VERSION with better error handling
(async function () {
    const signinMsg = document.getElementById('signin-msg');
    const signupMsg = document.getElementById('signup-msg');
    const authPage = document.getElementById('auth-page');
    let redirecting = false;

    function revealPage() {
        if (authPage) authPage.classList.add('ready');
    }

    function showSigninMsg(text) {
        console.log('SIGNIN MSG:', text);
        if (signinMsg) signinMsg.textContent = text;
    }

    function showSignupMsg(text) {
        console.log('SIGNUP MSG:', text);
        if (signupMsg) signupMsg.textContent = text;
    }

    // Clear messages
    if (signinMsg) signinMsg.textContent = '';
    if (signupMsg) signupMsg.textContent = '';

    // Wait for Supabase to load
    let attempts = 0;
    while (!window.supabase && attempts < 50) {
        await new Promise(function (r) { setTimeout(r, 100); });
        attempts++;
    }

    if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY || !window.supabase) {
        revealPage();
        showSigninMsg('Failed to load. Please refresh the page.');
        console.error('Supabase not loaded');
        return;
    }

    console.log('✅ Supabase loaded');

    // Create Supabase client
    let supabase = window.SUPABASE_CLIENT;
    if (!supabase) {
        supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
        window.SUPABASE_CLIENT = supabase;
    }

    console.log('✅ Supabase client ready');

    // Check if already logged in
    try {
        const result = await supabase.auth.getSession();
        if (result.data && result.data.session && !redirecting) {
            console.log('✅ Already logged in, redirecting...');
            redirecting = true;
            window.location.replace('dashboard.html');
            return;
        }
    } catch (e) {
        console.log('Session check error:', e);
    }

    // Show login form
    revealPage();

    // Get form elements
    const signinForm = document.getElementById('signin-form');
    const signupForm = document.getElementById('signup-form');
    const showSignup = document.getElementById('show-signup');
    const showSignin = document.getElementById('show-signin');

    // Toggle between signin and signup forms
    if (showSignup) {
        showSignup.addEventListener('click', function (e) {
            e.preventDefault();
            signinForm.classList.remove('active');
            signupForm.classList.add('active');
            showSigninMsg('');
            showSignupMsg('');
        });
    }

    if (showSignin) {
        showSignin.addEventListener('click', function (e) {
            e.preventDefault();
            signupForm.classList.remove('active');
            signinForm.classList.add('active');
            showSigninMsg('');
            showSignupMsg('');
        });
    }

    // Create owner record with retry
    async function ensureOwner(user) {
        if (!user || !user.id) {
            console.error('No user provided to ensureOwner');
            return false;
        }

        console.log('Creating/updating owner for user:', user.id);

        let retries = 3;
        while (retries > 0) {
            try {
                const checkResult = await supabase
                    .from('owners')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();

                if (checkResult.data) {
                    console.log('✅ Owner already exists:', checkResult.data);
                    return true;
                }

                // Create new owner
                const insertResult = await supabase
                    .from('owners')
                    .insert([{
                        user_id: user.id,
                        email: user.email,
                        is_active: true
                    }]);

                if (insertResult.error) {
                    console.error('Owner insert error:', insertResult.error);
                    retries--;
                    await new Promise(r => setTimeout(r, 500));
                    continue;
                }

                console.log('✅ Owner created successfully');
                return true;

            } catch (e) {
                console.error('ensureOwner error:', e);
                retries--;
                if (retries > 0) {
                    await new Promise(r => setTimeout(r, 500));
                }
            }
        }

        console.error('❌ Failed to create owner after retries');
        return false;
    }

    // SIGN IN
    let signinBusy = false;
    signinForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        if (signinBusy || redirecting) return;
        signinBusy = true;

        const btn = document.getElementById('signin-btn');
        const originalText = btn ? btn.textContent : 'Sign In';
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Signing in...';
        }

        const email = document.getElementById('signin-email').value.trim();
        const password = document.getElementById('signin-password').value;

        if (!email || !password) {
            showSigninMsg('Email and password required');
            resetButton();
            return;
        }

        console.log('Attempting sign in for:', email);

        try {
            const result = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (result.error) {
                console.error('Sign in error:', result.error);
                showSigninMsg(result.error.message);
                resetButton();
                return;
            }

            if (result.data && result.data.session) {
                console.log('✅ Sign in successful');
                showSigninMsg('Signed in! Setting up...');

                const ownerCreated = await ensureOwner(result.data.user);

                if (!ownerCreated) {
                    showSigninMsg('Warning: Owner setup incomplete, but proceeding...');
                }

                showSigninMsg('Success! Redirecting...');

                await new Promise(r => setTimeout(r, 500));

                redirecting = true;
                window.location.replace('dashboard.html');
            } else {
                showSigninMsg('Login failed. Please try again.');
                resetButton();
            }
        } catch (err) {
            console.error('Sign in exception:', err);
            showSigninMsg(err.message || 'Login failed');
            resetButton();
        }

        function resetButton() {
            signinBusy = false;
            if (btn) {
                btn.disabled = false;
                btn.textContent = originalText;
            }
        }
    });

    // SIGN UP
    let signupBusy = false;
    signupForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        if (signupBusy || redirecting) return;
        signupBusy = true;

        const btn = document.getElementById('signup-btn');
        const originalText = btn ? btn.textContent : 'Sign Up';
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Creating account...';
        }

        const email = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value;
        const confirm = document.getElementById('signup-password-confirm').value;

        if (!email) {
            showSignupMsg('Email required');
            resetButton();
            return;
        }

        if (!password || password.length < 8) {
            showSignupMsg('Password must be at least 8 characters');
            resetButton();
            return;
        }

        if (password !== confirm) {
            showSignupMsg('Passwords do not match');
            resetButton();
            return;
        }

        console.log('Attempting sign up for:', email);

        try {
            const result = await supabase.auth.signUp({
                email: email,
                password: password
            });

            if (result.error) {
                console.error('Sign up error:', result.error);
                showSignupMsg(result.error.message);
                resetButton();
                return;
            }

            if (result.data && result.data.session) {
                console.log('✅ Sign up successful with session');
                showSignupMsg('Account created! Setting up...');

                await ensureOwner(result.data.user);
                showSignupMsg('Success! Redirecting...');

                await new Promise(r => setTimeout(r, 500));

                redirecting = true;
                window.location.replace('dashboard.html');
            } else {
                console.log('Sign up successful but no session (email confirmation required)');
                showSignupMsg('Account created! Check your email to confirm, then sign in.');
                resetButton();
            }
        } catch (err) {
            console.error('Sign up exception:', err);
            showSignupMsg(err.message || 'Sign up failed');
            resetButton();
        }

        function resetButton() {
            signupBusy = false;
            if (btn) {
                btn.disabled = false;
                btn.textContent = originalText;
            }
        }
    });

    console.log('✅ Auth.js loaded');
})();