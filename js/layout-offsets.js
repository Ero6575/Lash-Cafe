/* Small helper to set header/nav CSS variables early (first-paint).
   Exposes `window.setHeaderOffsets()` and runs immediately.
*/
(function () {
    function setHeaderOffsets() {
        try {
            const h = document.querySelector('header');
            const n = document.querySelector('.category-nav');
            const headerH = h ? Math.ceil(h.getBoundingClientRect().height) : 0;
            const navH = n ? Math.ceil(n.getBoundingClientRect().height) : 0;
            const combined = headerH + navH;
            document.documentElement.style.setProperty('--header-height', headerH + 'px');
            document.documentElement.style.setProperty('--nav-height', navH + 'px');
            document.documentElement.style.setProperty('--combined-header-height', combined + 'px');
        } catch (e) { /* silent */ }
    }

    // expose and run immediately (keeps behavior identical to the previous inline IIFE)
    window.setHeaderOffsets = setHeaderOffsets;
    setHeaderOffsets();
    window.addEventListener('resize', setHeaderOffsets);
})();