// admin/js/auth-ui.js — Password toggle (FIXED - no flicker)
document.addEventListener('DOMContentLoaded', function () {
    // Toggle show/hide for password inputs
    const toggleButtons = document.querySelectorAll('.pw-toggle');

    toggleButtons.forEach(function (btn) {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();

            const wrapper = btn.closest('.input-with-action');
            if (!wrapper) return;

            const input = wrapper.querySelector('input');
            if (!input) return;

            if (input.type === 'password') {
                input.type = 'text';
                btn.textContent = 'Hide';
                btn.setAttribute('aria-pressed', 'true');
            } else {
                input.type = 'password';
                btn.textContent = 'Show';
                btn.setAttribute('aria-pressed', 'false');
            }
        });

        // Prevent button from stealing focus
        btn.addEventListener('mousedown', function (e) {
            e.preventDefault();
        });
    });
});