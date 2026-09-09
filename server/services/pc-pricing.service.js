'use strict';

const fs = require('fs');
const path = require('path');
const { cacheDir } = require('../config/persistent-paths');

const rootPath = path.join(__dirname, '..', '..');
const catalogPath = path.join(rootPath, 'src', 'data', 'pc-builder-catalog.json');
const cachePath = path.join(cacheDir, 'pc-prices-cache.json');

const API_BASE = 'https://api.pricesapi.io/api/v1';
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_REFRESH_LIMIT = 6;
const MARKET_COUNTRY = 'mx';

let refreshInFlight = false;
let lastRefreshStartedAt = 0;

function readJson(filePath, fallback) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (_err) {
        return fallback;
    }
}

function writeJson(filePath, value) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function loadCatalog() {
    const catalog = readJson(catalogPath, null);
    if (!catalog || !Array.isArray(catalog.components)) {
        throw new Error('Catalogo de componentes PC invalido.');
    }
    return catalog;
}

function loadCache() {
    const cache = readJson(cachePath, null);
    if (!cache || typeof cache !== 'object' || !cache.items) {
        return { version: 1, items: {} };
    }
    return cache;
}

function saveCache(cache) {
    writeJson(cachePath, {
        version: 1,
        updatedAt: new Date().toISOString(),
        items: cache.items || {}
    });
}

function marginRate(catalog) {
    const rate = Number(catalog?.pricing?.marginRate);
    return Number.isFinite(rate) && rate >= 0 ? rate : 0.30;
}

function salePriceFromMarket(marketPrice, catalog) {
    const price = Number(marketPrice) || 0;
    return Math.round(price * (1 + marginRate(catalog)));
}

function isFresh(entry, ttlMs) {
    if (!entry?.updatedAt) return false;
    const ts = Date.parse(entry.updatedAt);
    return Number.isFinite(ts) && Date.now() - ts < ttlMs;
}

function sanePrice(candidatePrice, seedPrice) {
    const price = Number(candidatePrice);
    const seed = Number(seedPrice);
    if (!Number.isFinite(price) || price < 0) return null;
    if (seed <= 0) return price;

    const min = Math.max(1, seed * 0.55);
    const max = seed * 1.95;
    if (price < min || price > max) return null;
    return Math.round(price);
}

function offerPrice(offer) {
    if (!offer) return null;
    const price = Number(offer.price);
    const shipping = Number(offer.shipping);
    if (!Number.isFinite(price) || price <= 0) return null;
    return Math.round(price + (Number.isFinite(shipping) && shipping > 0 ? shipping : 0));
}

function bestMarketPriceFromPricesApi(payload, seedPrice) {
    const products = payload?.data?.products;
    if (!Array.isArray(products) || products.length === 0) return null;

    const prices = [];
    for (const product of products) {
        const productCurrency = String(product.currency || '').toUpperCase();
        const productPrice = sanePrice(product.price, seedPrice);
        if (productPrice !== null && (!productCurrency || productCurrency === 'MXN')) {
            prices.push({
                marketPrice: productPrice,
                source: product.source || 'PricesAPI',
                seller: product.source || null,
                title: product.title || null
            });
        }

        const offers = Array.isArray(product.offers) ? product.offers : [];
        for (const offer of offers) {
            const currency = String(offer.currency || product.currency || '').toUpperCase();
            const raw = offerPrice(offer);
            const marketPrice = sanePrice(raw, seedPrice);
            if (marketPrice !== null && (!currency || currency === 'MXN')) {
                prices.push({
                    marketPrice,
                    source: product.source || 'PricesAPI',
                    seller: offer.seller || product.source || null,
                    title: product.title || null
                });
            }
        }
    }

    prices.sort((a, b) => a.marketPrice - b.marketPrice);
    return prices[0] || null;
}

async function fetchPricesApiItem(item, apiKey) {
    if (!item.query || Number(item.marketPrice) <= 0) {
        return {
            marketPrice: Number(item.marketPrice) || 0,
            source: 'catalog',
            seller: null,
            title: item.name,
            status: 'static'
        };
    }

    if (typeof fetch !== 'function') {
        throw new Error('fetch no esta disponible en este runtime de Node.');
    }

    const params = new URLSearchParams({
        q: item.query,
        country: MARKET_COUNTRY,
        limit: '3',
        offers_limit: '5'
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 95000);
    try {
        const response = await fetch(`${API_BASE}/products/search?${params}`, {
            headers: { Authorization: `Bearer ${apiKey}` },
            signal: controller.signal
        });

        if (response.status === 503) {
            const retryAfter = response.headers.get('Retry-After') || '5';
            throw new Error(`PricesAPI ocupado. Reintentar despues de ${retryAfter}s.`);
        }
        if (!response.ok) {
            throw new Error(`PricesAPI respondio ${response.status}.`);
        }

        const payload = await response.json();
        const best = bestMarketPriceFromPricesApi(payload, item.marketPrice);
        if (!best) {
            return {
                marketPrice: Number(item.marketPrice) || 0,
                source: 'catalog',
                seller: null,
                title: item.name,
                status: 'fallback_no_match'
            };
        }

        return {
            ...best,
            status: 'live',
            cacheSource: payload?.meta?.cache_source || null
        };
    } finally {
        clearTimeout(timeout);
    }
}

function ttlMs() {
    const hours = Number(process.env.PC_PRICE_CACHE_HOURS || 24);
    if (!Number.isFinite(hours) || hours <= 0) return DEFAULT_TTL_MS;
    return Math.round(hours * 60 * 60 * 1000);
}

function refreshLimit() {
    const raw = Number(process.env.PC_PRICE_REFRESH_LIMIT || DEFAULT_REFRESH_LIMIT);
    if (!Number.isFinite(raw)) return DEFAULT_REFRESH_LIMIT;
    return Math.min(20, Math.max(1, Math.round(raw)));
}

async function refreshStalePrices({ force = false } = {}) {
    const apiKey = String(process.env.PRICEAPI_KEY || process.env.PRICESAPI_KEY || '').trim();
    if (!apiKey) return { ok: false, reason: 'missing_api_key', refreshed: 0 };
    if (refreshInFlight) return { ok: false, reason: 'refresh_in_flight', refreshed: 0 };

    const now = Date.now();
    if (!force && now - lastRefreshStartedAt < 60 * 1000) {
        return { ok: false, reason: 'refresh_throttled', refreshed: 0 };
    }

    refreshInFlight = true;
    lastRefreshStartedAt = now;

    const catalog = loadCatalog();
    const cache = loadCache();
    const stale = catalog.components
        .filter((item) => Number(item.marketPrice) > 0)
        .filter((item) => force || !isFresh(cache.items[item.id], ttlMs()))
        .slice(0, refreshLimit());

    let refreshed = 0;
    try {
        for (const item of stale) {
            try {
                const live = await fetchPricesApiItem(item, apiKey);
                cache.items[item.id] = {
                    marketPrice: live.marketPrice,
                    source: live.source,
                    seller: live.seller,
                    title: live.title,
                    status: live.status,
                    cacheSource: live.cacheSource || null,
                    updatedAt: new Date().toISOString()
                };
                refreshed += 1;
            } catch (err) {
                cache.items[item.id] = {
                    marketPrice: Number(item.marketPrice) || 0,
                    source: 'catalog',
                    seller: null,
                    title: item.name,
                    status: 'error',
                    error: err.message,
                    updatedAt: new Date().toISOString()
                };
            }
            saveCache(cache);
        }
        return { ok: true, refreshed };
    } finally {
        refreshInFlight = false;
    }
}

function backgroundRefresh() {
    if (String(process.env.PC_PRICE_AUTO_REFRESH || 'true').toLowerCase() === 'false') return;
    setTimeout(() => {
        refreshStalePrices().catch(() => {});
    }, 0);
}

function publicCatalog() {
    const catalog = loadCatalog();
    const cache = loadCache();
    const rate = marginRate(catalog);
    const cacheTtl = ttlMs();
    const apiConfigured = Boolean(String(process.env.PRICEAPI_KEY || process.env.PRICESAPI_KEY || '').trim());

    const components = catalog.components.map((item) => {
        const entry = cache.items[item.id];
        const hasFreshLive = isFresh(entry, cacheTtl) && Number.isFinite(Number(entry.marketPrice));
        const marketPrice = hasFreshLive ? Number(entry.marketPrice) : Number(item.marketPrice) || 0;
        const priceStatus = hasFreshLive ? (entry.status || 'cached') : 'catalog';

        return {
            ...item,
            marketPrice,
            salePrice: salePriceFromMarket(marketPrice, catalog),
            marginRate: rate,
            source: hasFreshLive ? entry.source : 'catalog',
            seller: hasFreshLive ? entry.seller : null,
            priceStatus,
            updatedAt: hasFreshLive ? entry.updatedAt : catalog.pricing.fallbackUpdatedAt
        };
    });

    if (apiConfigured) backgroundRefresh();

    return {
        success: true,
        meta: {
            currency: catalog.pricing.currency || 'MXN',
            country: catalog.pricing.country || MARKET_COUNTRY,
            marginRate: rate,
            assemblyFee: catalog.pricing.assemblyFee || 1000,
            quoteLockHours: catalog.pricing.quoteLockHours || 24,
            apiConfigured,
            refreshInFlight,
            cacheHours: Math.round(cacheTtl / 60 / 60 / 1000),
            componentCount: components.length
        },
        components
    };
}

module.exports = {
    publicCatalog,
    refreshStalePrices,
    salePriceFromMarket
};
