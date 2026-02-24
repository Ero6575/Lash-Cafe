document.addEventListener('DOMContentLoaded', () => {
    // Toggle show/hide for password inputs
    document.querySelectorAll('.pw-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const wrapper = btn.closest('.input-with-action')
            if (!wrapper) return
            const input = wrapper.querySelector('input')
            if (!input) return
            if (input.type === 'password') {
                input.type = 'text'
                btn.textContent = 'Hide'
                btn.setAttribute('aria-pressed', 'true')
            } else {
                input.type = 'password'
                btn.textContent = 'Show'
                btn.setAttribute('aria-pressed', 'false')
            }
        })

        // Prevent button from stealing focus on mousedown
        btn.addEventListener('mousedown', (e) => e.preventDefault())
    })
})
