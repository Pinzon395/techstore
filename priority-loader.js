/**
 * ============================================================
 *  PIXON PC — priority-loader.js  v1.0
 *  Sistema de carga inteligente basada en visibilidad
 * ============================================================
 *
 *  ZONAS DE PRIORIDAD:
 *  🟢 VIEWPORT  — lo que el usuario ve AHORA → carga inmediata, fetchpriority=high
 *  🟡 NEARBY    — lo próximo a ver (~600px) → preload anticipado
 *  🔴 OFFSCREEN — contenido lejano          → lazy, diferido
 *
 *  CARACTERÍSTICAS:
 *  1. Detección de dirección de scroll → preload más inteligente
 *  2. Lazy images con upgrade automático de prioridad al acercarse
 *  3. Prefetch de páginas al hacer hover en los links de navegación
 *  4. content-visibility: auto para secciones fuera de pantalla
 *  5. Preload dinámico de imágenes próximas al viewport
 * ============================================================
 */

'use strict';

/* ══════════════════════════════════════════════════════════════
   1. DETECCIÓN DE DIRECCIÓN DE SCROLL
   Necesaria para saber QUÉ zona precargar (abajo o arriba)
══════════════════════════════════════════════════════════════ */
let scrollDirection = 'down';
let lastScrollTop   = window.scrollY || 0;
let ticking         = false;

window.addEventListener('scroll', () => {
    if (!ticking) {
        requestAnimationFrame(() => {
            const currentTop = window.scrollY;
            scrollDirection = currentTop > lastScrollTop ? 'down' : 'up';
            lastScrollTop   = currentTop;
            ticking         = false;
        });
        ticking = true;
    }
}, { passive: true });

/* ══════════════════════════════════════════════════════════════
   2. PRIORITY IMAGE LOADER
   Observa imágenes lazy y las preemptivamente carga antes de
   que lleguen al viewport según la dirección de scroll.

   rootMargin dinámico:
   - Scrolling DOWN → margen extra ABAJO (carga lo de adelante)
   - Scrolling UP   → margen extra ARRIBA (carga lo de atrás)
══════════════════════════════════════════════════════════════ */
function initPriorityImageLoader() {
    if (!('IntersectionObserver' in window)) return;

    // ── Viewport inmediato: dar alta prioridad ──────────────
    const viewportObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const img = entry.target;

            // Subir prioridad al estar en pantalla
            if (img.loading === 'lazy') {
                img.setAttribute('fetchpriority', 'high');
            }

            // Si tiene data-src (lazy cargada a mano), cargar ahora
            if (img.dataset.src) {
                img.src = img.dataset.src;
                delete img.dataset.src;
            }

            viewportObserver.unobserve(img);
        });
    }, {
        rootMargin: '0px',
        threshold: 0.01,
    });

    // ── Zona próxima: precargar antes de que llegue ─────────
    // rootMargin de 600px en la dirección de scroll
    const nearbyObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const img = entry.target;

            // Precargar con link rel=preload dinámico
            if (img.src && !img.dataset.preloaded) {
                const link  = document.createElement('link');
                link.rel    = 'preload';
                link.as     = 'image';
                link.href   = img.src || img.dataset.src || '';
                if (link.href) {
                    document.head.appendChild(link);
                    img.dataset.preloaded = 'true';
                }
            }

            // Si era lazy y todavía no tiene src real, activar carga
            if (img.dataset.src && !img.src) {
                img.src = img.dataset.src;
            }

            nearbyObserver.unobserve(img);
        });
    }, {
        rootMargin: '600px 0px 600px 0px',
        threshold: 0,
    });

    // Observar todas las imágenes lazy del documento
    document.querySelectorAll('img[loading="lazy"]').forEach(img => {
        viewportObserver.observe(img);
        nearbyObserver.observe(img);
    });

    // Observar imágenes de YouTube thumbnails (no tienen loading=lazy a veces)
    document.querySelectorAll('.video-lazy-thumb img').forEach(img => {
        if (!img.hasAttribute('loading')) {
            img.setAttribute('loading', 'lazy');
        }
        nearbyObserver.observe(img);
    });
}

/* ══════════════════════════════════════════════════════════════
   3. CONTENT-VISIBILITY OPTIMIZER
   Aplica content-visibility: auto a secciones fuera del viewport
   para reducir el costo de renderizado del navegador.
   Solo aplica a secciones que ya tienen su contenido en el DOM.
══════════════════════════════════════════════════════════════ */
function initContentVisibility() {
    // Secciones candidatas (las que están "below the fold" usualmente)
    const sections = document.querySelectorAll(
        'section:not(.hero):not(#inicio), .works, .comments-section-container, .faq-section'
    );

    if (!('contentVisibility' in document.documentElement.style)) return; // No soportado → skip

    sections.forEach(section => {
        // Solo aplicar si la sección no está en el viewport inicial
        const rect = section.getBoundingClientRect();
        if (rect.top > window.innerHeight + 100) {
            section.style.contentVisibility = 'auto';
            // contain-intrinsic-size evita el layout shift cuando se aplica content-visibility
            section.style.containIntrinsicSize = `0 ${rect.height || 400}px`;
        }
    });

    // Quitar content-visibility cuando el usuario se acerque (evita visual glitches)
    const cvObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.contentVisibility = 'visible';
                cvObserver.unobserve(entry.target);
            }
        });
    }, { rootMargin: '800px 0px' });

    sections.forEach(s => cvObserver.observe(s));
}

/* ══════════════════════════════════════════════════════════════
   4. LINK PREFETCH EN HOVER (Navegación anticipada)
   Precarga HTML de las páginas internas cuando el usuario
   hace hover/focus en los links del navbar — simula SPA.
   Solo precarga una vez por URL para no desperdiciar ancho de banda.
══════════════════════════════════════════════════════════════ */
function initNavPrefetch() {
    const prefetched = new Set();

    // Esperar a que el navegador esté idle para no competir con la carga inicial
    const idle = window.requestIdleCallback || (cb => setTimeout(cb, 200));

    document.querySelectorAll('a.nav-links[href], .catalog-link-text[href], a.btn[href]').forEach(link => {
        const href = link.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto') || href.startsWith('tel')) return;

        const addPrefetch = () => {
            if (prefetched.has(href)) return;
            prefetched.add(href);

            idle(() => {
                const linkEl  = document.createElement('link');
                linkEl.rel    = 'prefetch';
                linkEl.href   = href;
                linkEl.as     = 'document';
                document.head.appendChild(linkEl);
            });
        };

        link.addEventListener('mouseenter', addPrefetch, { once: true });
        link.addEventListener('focusin',    addPrefetch, { once: true });
        link.addEventListener('touchstart', addPrefetch, { once: true, passive: true });
    });
}

/* ══════════════════════════════════════════════════════════════
   5. SCROLL-AWARE VIDEO PRELOAD
   Mejora el rootMargin del video loader según dirección de scroll:
   - Hacia abajo → carga videos más abajo antes
   - Está quieto  → margen simétrico
   (Complementa el observer de script.js, no lo reemplaza)
══════════════════════════════════════════════════════════════ */
function initScrollAwareVideoPreload() {
    if (!('IntersectionObserver' in window)) return;

    const thumbs = document.querySelectorAll('.video-lazy-thumb:not([data-priority-observed])');
    if (!thumbs.length) return;

    const videoNearbyObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const thumb = entry.target;

            // Pre-DNS para YouTube cuando el video se acerca
            if (!document.querySelector('link[rel="dns-prefetch"][href*="youtube"]')) {
                ['youtube.com', 'youtube-nocookie.com', 'ytimg.com', 'googlevideo.com'].forEach(domain => {
                    const dns    = document.createElement('link');
                    dns.rel      = 'dns-prefetch';
                    dns.href     = `//${domain}`;
                    document.head.appendChild(dns);
                });
            }

            videoNearbyObserver.unobserve(thumb);
        });
    }, {
        rootMargin: '800px 0px',
        threshold: 0,
    });

    thumbs.forEach(thumb => {
        thumb.dataset.priorityObserved = 'true';
        videoNearbyObserver.observe(thumb);
    });
}

/* ══════════════════════════════════════════════════════════════
   6. CRITICAL RESOURCE HINTS (solo si no existen ya)
   Garantiza que los recursos más críticos tengan sus hints
   correctos en el <head> sin duplicar los que ya están.
══════════════════════════════════════════════════════════════ */
function ensureCriticalHints() {
    const head = document.head;

    // Función helper para verificar si ya existe un hint
    const hasHint = (rel, href) =>
        !!document.querySelector(`link[rel="${rel}"][href="${href}"]`);

    // Preconnect a CDN de FontAwesome si no existe
    if (!hasHint('preconnect', 'https://cdnjs.cloudflare.com')) {
        const pc      = document.createElement('link');
        pc.rel        = 'preconnect';
        pc.href       = 'https://cdnjs.cloudflare.com';
        pc.crossOrigin = 'anonymous';
        head.insertBefore(pc, head.firstChild);
    }

    // DNS-prefetch para WhatsApp (se usa en casi todos los botones)
    if (!hasHint('dns-prefetch', '//wa.me')) {
        const dns  = document.createElement('link');
        dns.rel    = 'dns-prefetch';
        dns.href   = '//wa.me';
        head.appendChild(dns);
    }

    // DNS-prefetch para GTM
    if (!hasHint('dns-prefetch', '//www.googletagmanager.com')) {
        const dns  = document.createElement('link');
        dns.rel    = 'dns-prefetch';
        dns.href   = '//www.googletagmanager.com';
        head.appendChild(dns);
    }
}

/* ══════════════════════════════════════════════════════════════
   7. ABOVE-THE-FOLD IMAGE DETECTION
   Marca automáticamente las primeras imágenes visibles con
   fetchpriority="high" y elimina loading="lazy" de ellas.
   Esto evita que el navegador baje su prioridad en recursos críticos.
══════════════════════════════════════════════════════════════ */
function optimizeAboveFoldImages() {
    const vh = window.innerHeight;
    let priorityCount = 0;
    const MAX_HIGH_PRIORITY = 3; // Solo los primeros N son "críticos"

    document.querySelectorAll('img').forEach(img => {
        const rect = img.getBoundingClientRect();
        const isVisible = rect.top < vh && rect.bottom > 0;

        if (isVisible && priorityCount < MAX_HIGH_PRIORITY) {
            // Quitar lazy loading de imágenes que ya son visibles
            if (img.loading === 'lazy') {
                img.removeAttribute('loading');
            }
            img.setAttribute('fetchpriority', 'high');
            img.decoding = 'sync'; // Decodificación síncrona para imágenes críticas
            priorityCount++;
        } else if (!isVisible && !img.getAttribute('loading')) {
            // Agregar lazy a imágenes que no tienen atributo y no son visibles
            img.loading  = 'lazy';
            img.decoding = 'async';
        }
    });
}

/* ══════════════════════════════════════════════════════════════
   8. EXPOSE GLOBAL — para debug en consola
══════════════════════════════════════════════════════════════ */
window.PixonPriorityLoader = {
    scrollDirection: () => scrollDirection,
    reinit: init,
};

/* ══════════════════════════════════════════════════════════════
   INIT — Ejecutar en el orden correcto
══════════════════════════════════════════════════════════════ */
function init() {
    ensureCriticalHints();
    optimizeAboveFoldImages();
    initPriorityImageLoader();
    initContentVisibility();
    initNavPrefetch();
    initScrollAwareVideoPreload();
}

// Ejecutar inmediatamente si el DOM ya está listo, o esperar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
