/**
 * ════════════════════════════════════════════════════════════════
 *  CookieBanner.js — Pixon PC
 *  Web Component reutilizable para aviso de privacidad simplificado.
 *
 *  Cumple con:
 *  - LFPDPPP (Ley Federal de Protección de Datos — México)
 *  - Google Consent Mode v2
 *
 *  Uso: <script type="module" src="/components/cookies/CookieBanner.js"></script>
 *  No requiere HTML adicional. Se autoinyecta al cargar.
 * ════════════════════════════════════════════════════════════════
 */

'use strict';

/* ── 1. Configurar Google Consent Mode v2 por defecto (denegado) ── */
function initConsentModeDefault() {
    if (typeof window.gtag !== 'function') return;
    window.gtag('consent', 'default', {
        ad_storage:              'denied',
        analytics_storage:       'denied',
        ad_user_data:            'denied',
        ad_personalization:      'denied',
        functionality_storage:   'denied',
        personalization_storage: 'denied',
        wait_for_update:         500
    });
}

/* ── 2. Actualizar consentimiento tras elección del usuario ── */
function updateConsentGrantAll() {
    if (typeof window.gtag !== 'function') return;
    window.gtag('consent', 'update', {
        ad_storage:              'granted',
        analytics_storage:       'granted',
        ad_user_data:            'granted',
        ad_personalization:      'granted',
        functionality_storage:   'granted',
        personalization_storage: 'granted'
    });
}

function updateConsentEssentialOnly() {
    if (typeof window.gtag !== 'function') return;
    window.gtag('consent', 'update', {
        ad_storage:              'denied',
        analytics_storage:       'denied',
        ad_user_data:            'denied',
        ad_personalization:      'denied',
        functionality_storage:   'granted',
        personalization_storage: 'denied'
    });
}

/* ── 3. Helpers para guardar/leer preferencias ── */
const CONSENT_KEY = 'pixon_cookie_consent';

function getConsentPref() {
    try { return localStorage.getItem(CONSENT_KEY); } catch { return null; }
}

function setConsentPref(value) {
    try { localStorage.setItem(CONSENT_KEY, value); } catch { /* no-op */ }
}

/* ── 4. Inyectar CSS del banner en el <head> ── */
function injectBannerStyles() {
    if (document.getElementById('pixon-cookie-banner-style')) return;
    const style = document.createElement('style');
    style.id = 'pixon-cookie-banner-style';
    style.textContent = `
        /* Cookie Banner — Pixon PC */
        #pixon-cookie-banner {
            position: fixed;
            bottom: 20px;
            left: 20px;
            z-index: 990;
            width: min(340px, calc(100vw - 40px));
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(8px);
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            padding: 16px;
            font-family: 'Red Hat Display', sans-serif;
            animation: bannerFadeIn 0.4s ease both;
            display: flex;
            flex-direction: column;
            gap: 12px;
            border: 1px solid rgba(0,0,0,0.05);
        }

        @keyframes bannerFadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to   { opacity: 1; transform: translateY(0); }
        }

        #pixon-cookie-banner.hide {
            animation: bannerFadeOut 0.3s ease forwards;
        }

        @keyframes bannerFadeOut {
            to { opacity: 0; transform: translateY(10px); }
        }

        .pixon-cb-header {
            display: flex;
            align-items: flex-start;
            gap: 8px;
        }

        .pixon-cb-icon {
            font-size: 1.1rem;
            flex-shrink: 0;
            line-height: 1;
        }

        .pixon-cb-title {
            font-size: 0.85rem;
            font-weight: 700;
            color: #1e293b;
            margin: 0 0 2px;
            line-height: 1.2;
        }

        .pixon-cb-desc {
            font-size: 0.75rem;
            color: #64748b;
            margin: 0;
            line-height: 1.4;
        }

        .pixon-cb-desc a {
            color: #2563eb;
            text-decoration: underline;
        }

        .pixon-cb-actions {
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
            align-items: center;
        }

        .pixon-cb-btn {
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 0.75rem;
            font-weight: 600;
            font-family: inherit;
            cursor: pointer;
            border: none;
            transition: all 0.2s ease;
            line-height: 1;
        }

        .pixon-cb-btn--accept {
            background: #2563eb;
            color: #fff;
            flex: 1;
        }
        .pixon-cb-btn--accept:hover { background: #1d4ed8; }

        .pixon-cb-btn--essential {
            background: #f1f5f9;
            color: #475569;
            border: 1px solid #e2e8f0;
        }
        .pixon-cb-btn--essential:hover { background: #e2e8f0; }

        .pixon-cb-more {
            font-size: 0.7rem;
            color: #94a3b8;
            background: none;
            border: none;
            cursor: pointer;
            margin-left: auto;
            text-decoration: underline;
            padding: 2px 0;
            font-family: inherit;
        }

        @media (max-width: 480px) {
            #pixon-cookie-banner {
                bottom: 80px; /* Separación del botón de WhatsApp */
                left: 50%;
                transform: translateX(-50%);
                width: calc(100vw - 32px);
                padding: 14px;
            }
            @keyframes bannerFadeIn {
                from { opacity: 0; transform: translateX(-50%) translateY(10px); }
                to   { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
            @keyframes bannerFadeOut {
                to { opacity: 0; transform: translateX(-50%) translateY(10px); }
            }
        }
    `;
    document.head.appendChild(style);
}

/* ── 5. Crear y montar el banner ── */
function mountBanner() {
    if (document.getElementById('pixon-cookie-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'pixon-cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Aviso de cookies y privacidad');
    banner.innerHTML = `
        <div class="pixon-cb-header">
            <span class="pixon-cb-icon" aria-hidden="true">🍪</span>
            <div>
                <p class="pixon-cb-title">Privacidad y Cookies</p>
                <p class="pixon-cb-desc">
                    Usamos cookies anónimas para mejorar tu experiencia.
                    <a href="/privacidad" target="_blank" rel="noopener noreferrer">Aviso de Privacidad</a>.
                </p>
            </div>
        </div>
        <div class="pixon-cb-actions">
            <button class="pixon-cb-btn pixon-cb-btn--accept" id="pixon-cb-accept" aria-label="Aceptar todas las cookies">
                ✓ Aceptar todo
            </button>
            <button class="pixon-cb-btn pixon-cb-btn--essential" id="pixon-cb-essential" aria-label="Aceptar solo cookies esenciales">
                Solo esenciales
            </button>
            <button class="pixon-cb-more" id="pixon-cb-more" aria-label="Más información sobre privacidad">
                Más info
            </button>
        </div>
    `;

    document.body.appendChild(banner);

    /* Evento: Aceptar todo */
    document.getElementById('pixon-cb-accept').addEventListener('click', () => {
        setConsentPref('all');
        updateConsentGrantAll();
        hideBanner();
    });

    /* Evento: Solo esenciales */
    document.getElementById('pixon-cb-essential').addEventListener('click', () => {
        setConsentPref('essential');
        updateConsentEssentialOnly();
        hideBanner();
    });

    /* Evento: Más info → redirige a política de privacidad */
    document.getElementById('pixon-cb-more').addEventListener('click', () => {
        window.open('/privacidad', '_blank', 'noopener');
    });
}

/* ── 6. Ocultar banner con animación ── */
function hideBanner() {
    const banner = document.getElementById('pixon-cookie-banner');
    if (!banner) return;
    banner.classList.add('hide');
    setTimeout(() => banner.remove(), 350);
}

/* ── 7. Helper: ejecutar en tiempo idle (fallback Safari) ── */
function whenIdle(cb) {
    if ('requestIdleCallback' in window) {
        window.requestIdleCallback(cb, { timeout: 2000 });
    } else {
        setTimeout(cb, 1);
    }
}

/* ── 8. Inicializar ── */
function initCookieBanner() {
    /*
     * IMPORTANTE: initConsentModeDefault() corre SINCRONO antes de
     * cualquier tag de Google Analytics/Ads. No puede diferirse a
     * idle porque GA registraria hits sin el default-denied
     * establecido (problema de cumplimiento LFPDPPP/GDPR).
     */
    initConsentModeDefault();

    const pref = getConsentPref();
    if (!pref) {
        /*
         * Primera visita — montar banner cuando el navegador este idle
         * para no colisionar con el calculo de estilos del navegador
         * en el momento critico de carga (evita forced reflow / TBT).
         */
        const showBanner = () => whenIdle(() => {
            injectBannerStyles();
            mountBanner();
        });
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', showBanner);
        } else {
            showBanner();
        }
    } else if (pref === 'all') {
        /* Ya aceptó todo — actualizar consent directamente */
        updateConsentGrantAll();
    } else if (pref === 'essential') {
        updateConsentEssentialOnly();
    }
}

initCookieBanner();
