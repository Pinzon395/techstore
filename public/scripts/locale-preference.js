(() => {
  const cookieName = 'preferredLocale';
  const supported = new Set(['es', 'en']);

  const saveLocale = (locale) => {
    if (!supported.has(locale)) return;
    document.cookie = `${cookieName}=${locale}; path=/; max-age=31536000; samesite=lax`;
    try { localStorage.setItem(cookieName, locale); } catch {}
  };

  document.querySelectorAll('[data-locale-switch]').forEach((link) => {
    const target = new URL(link.href);
    if (target.pathname !== '/' && target.pathname !== '/en') {
      const current = new URL(location.href);
      for (const key of ['slug', 'folio']) {
        if (current.searchParams.has(key)) target.searchParams.set(key, current.searchParams.get(key));
      }
      link.href = target.href;
    }
    link.addEventListener('click', () => {
      const locale = link.dataset.localeSwitch;
      if (!supported.has(locale)) return;
      saveLocale(locale);
      window.pixonTrackEvent?.('language_switch');
    });
  });

  // Preference is informational only. Native links and the URL own navigation.
})();
