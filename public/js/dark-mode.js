/**
 * Sathi AI — Dark Mode Manager
 * Persists dark mode preference to localStorage and applies it on load.
 * Include this script in every page BEFORE </body>.
 *
 * Usage: Call SathiDarkMode.toggle() from the moon/sun button.
 */
(function () {
    'use strict';

    const STORAGE_KEY = 'sathi_dark_mode';

    function isDarkMode() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored !== null) return stored === 'true';
        // Fallback: respect OS preference
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    function apply(dark) {
        document.body.classList.toggle('dark-mode', dark);
        // Update every toggle icon on the page (there may be more than one)
        document.querySelectorAll('.dark-mode-icon').forEach(function (el) {
            el.textContent = dark ? '☀️' : '🌙';
        });
    }

    function toggle() {
        const next = !document.body.classList.contains('dark-mode');
        localStorage.setItem(STORAGE_KEY, String(next));
        apply(next);
    }

    // Apply immediately (script runs synchronously before paint)
    // We also listen for DOMContentLoaded in case body isn't ready yet
    function init() {
        apply(isDarkMode());
    }

    if (document.body) {
        init();
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }

    // Expose to global scope
    window.SathiDarkMode = { toggle: toggle, isDarkMode: isDarkMode };
})();
