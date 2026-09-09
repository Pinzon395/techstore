'use strict';

function localizedAccountPath(locale) {
    return locale === 'en' ? '/en/account' : '/cuenta';
}

function safeInternalReturnTo(value, fallback = '/cuenta') {
    const path = typeof value === 'string' ? value.trim() : '';
    if (!path || !path.startsWith('/') || path.startsWith('//') || /[\\\u0000-\u001f]/.test(path)) return fallback;
    try {
        const parsed = new URL(path, 'https://pixon.local');
        return parsed.origin === 'https://pixon.local' ? `${parsed.pathname}${parsed.search}${parsed.hash}`.slice(0, 240) : fallback;
    } catch (_) {
        return fallback;
    }
}

module.exports = { localizedAccountPath, safeInternalReturnTo };
