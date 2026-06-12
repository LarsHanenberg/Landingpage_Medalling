(function () {
    var DARK = 'dark';
    var LIGHT = 'light';
    var KEY = 'medalling-theme';

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(KEY, theme);
        document.querySelectorAll('.theme-toggle').forEach(function (btn) {
            btn.setAttribute('aria-label', theme === DARK ? 'Schakel naar lichte modus' : 'Schakel naar donkere modus');
            btn.setAttribute('aria-pressed', theme === DARK ? 'true' : 'false');
        });
        document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: theme } }));
    }

    function toggle() {
        var current = document.documentElement.getAttribute('data-theme');
        applyTheme(current === DARK ? LIGHT : DARK);
    }

    // Apply saved preference immediately (before paint)
    var saved = localStorage.getItem(KEY) || LIGHT;
    applyTheme(saved);

    // Expose globally
    window.toggleTheme = toggle;
    window.applyTheme = applyTheme;
    window.getTheme = function () { return document.documentElement.getAttribute('data-theme'); };
})();
