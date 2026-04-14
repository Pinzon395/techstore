/**
 * ============================================================
 *  PIXON PC — script.js  v3.0
 *  Lógica global compartida por TODAS las páginas.
 * ============================================================
 *
 *  SECCIONES:
 *  1. Navbar    — compactar al hacer scroll
 *  2. Scroll-spy — marcar el link activo según sección visible
 *  3. Menú móvil — hamburguesa toggle
 *  4. WhatsApp   — función global + botón flotante
 *  5. Footer     — año dinámico
 *  6. Tabs       — openTab() para paquetes
 *  7. Lazy-Video — IntersectionObserver + click-to-play
 *
 *  NOTE: La lógica de comentarios vive en comments.js
 *        Solo se carga en páginas que tengan .comments-marquee-container
 * ============================================================
 */

'use strict';

/* ══════════════════════════════════════════════════════════════
   1. NAVBAR — Compactar al hacer scroll
   Cambia padding y sombra cuando el usuario baja más de 50px
══════════════════════════════════════════════════════════════ */
const navbar  = document.getElementById('navbar');
const waFloat = document.getElementById('whatsapp-float');

/** Referencia al paquetes section SOLO en index.html */
const paquetesSection = document.getElementById('paquetes');

let lastScrollY = 0;

window.addEventListener('scroll', () => {
    if (!navbar) return;
    const currentY = window.scrollY;

    // Compactar navbar al bajar de 50px
    if (currentY > 50) {
        navbar.style.background = 'rgba(255,255,255,0.98)';
        navbar.style.boxShadow  = '0 4px 20px rgba(0,0,0,0.08)';
        navbar.style.padding    = '10px 20px';
    } else {
        navbar.style.background = 'rgba(255,255,255,0.9)';
        navbar.style.boxShadow  = 'none';
        navbar.style.padding    = '15px 20px';
    }

    // Auto-hide navbar: desaparece al bajar, aparece al subir
    if (currentY > 120) {
        if (currentY > lastScrollY) {
            // Scroll hacia abajo → ocultar
            navbar.style.transform = 'translateY(-100%)';
        } else {
            // Scroll hacia arriba → mostrar
            navbar.style.transform = 'translateY(0)';
        }
    } else {
        navbar.style.transform = 'translateY(0)';
    }
    lastScrollY = currentY;

    /* WhatsApp flotante: aparece al llegar a #paquetes en el home,
       o simplemente al bajar 300px en otras páginas */
    if (waFloat) {
        const threshold = paquetesSection
            ? paquetesSection.offsetTop + 200
            : 300;
        waFloat.classList.toggle('visible', currentY > threshold);
    }
}, { passive: true });

// Agregar CSS para transition de navbar si no existe
if (navbar) {
    navbar.style.transition = 'transform 0.35s cubic-bezier(0.4,0,0.2,1), padding 0.3s ease, box-shadow 0.3s ease, background 0.3s ease';
}

/* ══════════════════════════════════════════════════════════════
   2. SCROLL-SPY — Resalta el nav-link de la sección visible
   Solo activo en index.html (donde los links son anchors #xxx)
   En otras páginas el active-link está hardcoded en el HTML
══════════════════════════════════════════════════════════════ */
(function initScrollSpy() {
    /* Detectar si estamos en index.html buscando enlaces con #hash */
    const anchorLinks = document.querySelectorAll('.nav-links[href^="#"]');
    if (!anchorLinks.length) return; // no hay anchors → página independiente

    /* Recopilar las secciones a observar */
    const sections = [];
    anchorLinks.forEach(link => {
        const id = link.getAttribute('href').slice(1); // quitar el #
        const el = document.getElementById(id);
        if (el) sections.push({ id, el, link });
    });

    /* IntersectionObserver: detecta qué sección ocupa el centro del viewport */
    const spy = new IntersectionObserver(
        entries => {
            entries.forEach(entry => {
                const matched = sections.find(s => s.el === entry.target);
                if (!matched) return;

                if (entry.isIntersecting) {
                    // Quitar active de todos
                    anchorLinks.forEach(l => l.classList.remove('active-link'));
                    // Marcar el link activo
                    matched.link.classList.add('active-link');
                }
            });
        },
        {
            /* El observer dispara cuando al menos el 30% de la sección
               entra al viewport — ajusta rootMargin para fine-tuning */
            rootMargin: '-20% 0px -60% 0px',
            threshold: 0,
        }
    );

    sections.forEach(({ el }) => spy.observe(el));
})();

/* ══════════════════════════════════════════════════════════════
   3. MENÚ MÓVIL — Hamburguesa toggle
══════════════════════════════════════════════════════════════ */
const mobileMenu = document.getElementById('mobile-menu');
const navMenu    = document.querySelector('.nav-menu');

if (mobileMenu && navMenu) {
    mobileMenu.addEventListener('click', () => {
        mobileMenu.classList.toggle('active');
        navMenu.classList.toggle('active');
    });

    /* Cerrar menú al pulsar cualquier enlace */
    document.querySelectorAll('.nav-links').forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });

    /* Cerrar menú al pulsar fuera de él */
    document.addEventListener('click', e => {
        if (navMenu.classList.contains('active') &&
            !navMenu.contains(e.target) &&
            !mobileMenu.contains(e.target)) {
            mobileMenu.classList.remove('active');
            navMenu.classList.remove('active');
        }
    });
}

/* ══════════════════════════════════════════════════════════════
   4. WHATSAPP — Redirección Inteligente (Mobile First)
   Evita el error de "about:blank" en iOS/Android al abrir pestañas nuevas.
   @param {string} url — La URL completa de wa.me a la que redirigir
══════════════════════════════════════════════════════════════ */
function smartWaRedirect(url) {
    if (window.innerWidth < 768) {
        window.location.href = url; // En móvil usamos redirección directa
    } else {
        window.open(url, '_blank', 'noopener'); // En escritorio sí usamos target _blank
    }
}

// Hacer global para HTML inline onclick
window.smartWaRedirect = smartWaRedirect;

// Smooth scroll al top cuando se hace clic en "Inicio"
document.querySelectorAll('a[href="#inicio"]').forEach(el => {
    el.addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
});

/* ══════════════════════════════════════════════════════════════
   5. FOOTER — Año dinámico
   Evita actualizar el HTML cada 1 de enero
══════════════════════════════════════════════════════════════ */
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ══════════════════════════════════════════════════════════════
   6. TABS — Selector de pestañas (paquetes.html + index.html)
   Oculta todos los .tab-content y muestra solo el elegido.
   @param {Event}  evt   — Evento click del botón
   @param {string} tabId — ID del div a mostrar
══════════════════════════════════════════════════════════════ */
function openTab(evt, tabId) {
    document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

    const target = document.getElementById(tabId);
    if (target) target.classList.add('active');
    if (evt?.currentTarget) evt.currentTarget.classList.add('active');
}

/* ══════════════════════════════════════════════════════════════
   7. LAZY LOADING DE VIDEOS YOUTUBE Y HERO
   ─────────────────────────────────────────────────────────────
   a) Hero HTML5 Video — Fade in suave cuando esté listo
   b) YouTube Videos — IntersectionObserver
      - Todas las plataformas: cargan cuando entran al viewport
      - Móvil (<768px): Se pausan automáticamente si salen (60%), play si entran.
      - Ocultar "cargando" y mostrar suavemente.
══════════════════════════════════════════════════════════════ */

/* a) Hero YouTube Video con Poster */
window.addEventListener('DOMContentLoaded', () => {
    const poster = document.getElementById('hero-poster');
    const wrapper = document.getElementById('hero-yt-wrapper');
    if (poster && wrapper) {
        const iframe = document.createElement('iframe');
        iframe.src = 'https://www.youtube.com/embed/cbKre_xAFlo?autoplay=1&mute=1&loop=1&playlist=cbKre_xAFlo&controls=0&rel=0&modestbranding=1&showinfo=0&enablejsapi=1&disablekb=1';
        iframe.setAttribute('frameborder', '0');
        iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
        iframe.setAttribute('allowfullscreen', '');
        iframe.className = 'bg-video-iframe';
        iframe.style.opacity = '0';
        iframe.style.transition = 'opacity 0.8s ease-in-out';

        wrapper.appendChild(iframe);

        const onYouTubeMessageHero = (e) => {
            if (e.origin !== "https://www.youtube.com") return;
            try {
                const data = JSON.parse(e.data);
                if (data.event === 'infoDelivery' && data.info && data.info.playerState === 1) {
                    if (e.source === iframe.contentWindow) {
                        iframe.style.opacity = '1';
                        poster.style.opacity = '0';
                        setTimeout(() => poster.remove(), 800);
                        window.removeEventListener('message', onYouTubeMessageHero);
                    }
                }
            } catch(err) {}
        };
        window.addEventListener('message', onYouTubeMessageHero);

        // Fallback: Si YouTube tarda mucho o bloquea el evento
        setTimeout(() => {
            if (poster && poster.parentNode) {
                iframe.style.opacity = '1';
                poster.style.opacity = '0';
                setTimeout(() => poster.remove(), 800);
                window.removeEventListener('message', onYouTubeMessageHero);
            }
        }, 3500);
    }
});

/**
 * b) YouTube Videos
 */
const isMobile = window.innerWidth < 768;

function postMessageToPlayer(iframe, func, args = []) {
    if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(JSON.stringify({
            event: 'command',
            func: func,
            args: args
        }), '*');
    }
}

// Observer MÓVIL y DESKTOP
let playObserver = null;
if ('IntersectionObserver' in window) {
    playObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const iframe = entry.target.querySelector('iframe');
            if (!iframe) return;
            if (isMobile) {
                if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
                    postMessageToPlayer(iframe, 'playVideo');
                } else if (!entry.isIntersecting || entry.intersectionRatio < 0.6) {
                    postMessageToPlayer(iframe, 'pauseVideo');
                }
            } else {
                if (entry.isIntersecting && entry.intersectionRatio > 0) {
                    postMessageToPlayer(iframe, 'playVideo');
                } else if (!entry.isIntersecting || entry.intersectionRatio === 0) {
                    postMessageToPlayer(iframe, 'pauseVideo');
                }
            }
        });
    }, { threshold: [0, 0.1, 0.6] });
}

function loadVideoFromThumb(thumb) {
    if (thumb.dataset.loading) return; // evitar cargas dobles
    thumb.dataset.loading = "true";

    const videoId     = thumb.getAttribute('data-video-id');
    const wrapper     = thumb.closest('.video-wrapper');
    const isLandscape = thumb.hasAttribute('data-landscape');
    if (!videoId || !wrapper) return;

    const iframe = document.createElement('iframe');
    // enablejsapi=1 es crucial para postMessage
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&rel=0&modestbranding=1&showinfo=0&enablejsapi=1&disablekb=1`;
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
    iframe.setAttribute('allowfullscreen', '');
    
    Object.assign(iframe.style, {
        width: '100%', height: '100%', border: 'none',
        position: 'absolute', top: '0', left: '0',
        pointerEvents: 'none',
        opacity: '0', // Oculto mientras YouTube carga su interfaz predeterminada (pantalla negra)
        transition: 'opacity 0.5s ease-in-out'
    });

    if (wrapper.classList.contains('b2b-zoom-wrapper')) {
        Object.assign(iframe.style, {
            width: '140%', height: '140%', top: '50%', left: '50%', transform: 'translate(-50%, -50%)'
        });
    } else if (wrapper.classList.contains('b2b-vertical-wrapper')) {
        Object.assign(iframe.style, {
            width: '200%', height: '200%', top: '50%', left: '50%', transform: 'translate(-50%, -50%)'
        });
    } else if (!isLandscape) {
        iframe.style.minHeight = '450px';
    }

    // El thumbnail se mantiene y hace un fade out cuando el video ya se está reproduciendo
    thumb.style.transition = 'opacity 0.5s ease-in-out';
    wrapper.appendChild(iframe);

    // Escuchar mensajes de YouTube para saber cuándo empieza a reproducirse
    const onYouTubeMessage = (e) => {
        if (e.origin !== "https://www.youtube.com") return;
        try {
            const data = JSON.parse(e.data);
            if (data.event === 'infoDelivery' && data.info && data.info.playerState === 1) {
                if (e.source === iframe.contentWindow) {
                    iframe.style.opacity = '1';
                    thumb.style.opacity = '0';
                    setTimeout(() => thumb.remove(), 500);
                    window.removeEventListener('message', onYouTubeMessage);
                }
            }
        } catch(err) {}
    };
    window.addEventListener('message', onYouTubeMessage);

    // Fallback: Remove thumb and show video after 3 seconds in case iframe API takes longer or blocks messages
    setTimeout(() => {
        if (thumb && thumb.parentNode) {
            iframe.style.opacity = '1';
            thumb.style.opacity = '0';
            setTimeout(() => thumb.remove(), 500);
            window.removeEventListener('message', onYouTubeMessage);
        }
    }, 3000);

    // Observer para pausar/play en Desktop y Móvil (usamos la variable global playObserver)
    if (typeof playObserver !== 'undefined' && playObserver) {
        playObserver.observe(wrapper);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Para asegurar un diseño final profesional sin interacción, todos cargan automáticamente
    const allThumbs = document.querySelectorAll('.video-lazy-thumb');
    if (!allThumbs.length || !('IntersectionObserver' in window)) {
        allThumbs.forEach(t => t.addEventListener('click', () => loadVideoFromThumb(t), { once: true }));
        return;
    }

    const loadObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                loadVideoFromThumb(entry.target);
                loadObserver.unobserve(entry.target);
            }
        });
    }, { rootMargin: '300px' }); 

    allThumbs.forEach(t => loadObserver.observe(t));
});
/* ══════════════════════════════════════════════════════════════
   EXPORTS GLOBALES PARA MODULE BUNDLING (Vite)
══════════════════════════════════════════════════════════════ */
window.openTab = openTab;

/* ══════════════════════════════════════════════════════════════
   SPECIALTIES LOGIC
   Dual behavior: Desktop (Grow) vs Mobile (Modal-ish)
══════════════════════════════════════════════════════════════ */
function initSpecialties() {
    const specialtyCards = document.querySelectorAll('.specialty-card');
    const overlay = document.getElementById('specialty-overlay');

    let openScrollY = null;

    // Función auxiliar para cerrar de forma centralizada (Mobile y Desktop)
    const closeAllSpecialties = () => {
        document.querySelectorAll('.specialty-card.active').forEach(c => c.classList.remove('active'));
        if (overlay) overlay.classList.remove('active');
        openScrollY = null;
    };

    // 1. Cerrar automáticamente solo si el scroll es significativo
    window.addEventListener('scroll', () => {
        if (openScrollY !== null && document.querySelector('.specialty-card.active')) {
            // Evaluamos la distancia recorrida desde que se abrió
            if (Math.abs(window.scrollY - openScrollY) > 200) {
                closeAllSpecialties();
            }
        }
    }, { passive: true });

    // 2. Cerrar al tocar en "cualquier lado" fuera de las cards
    document.addEventListener('click', (e) => {
        if (document.querySelector('.specialty-card.active')) {
            // Si el elemento clicado NO es y NO está dentro de una tarjeta
            if (!e.target.closest('.specialty-card')) {
                closeAllSpecialties();
            }
        }
    });

    if (specialtyCards.length > 0) {
        specialtyCards.forEach(card => {
            // Eliminar el atributo inline onclick para evitar conflictos
            card.removeAttribute('onclick');

            card.addEventListener('click', function(e) {
                // Prevenir interferencia si hacen clic directamente en el botón de WhatsApp
                if (e.target.closest('button')) return;

                const isMobile = window.innerWidth < 768;

                // Cierre manual tocando la misma tarjeta que está abierta
                if (this.classList.contains('active')) {
                    closeAllSpecialties();
                    return;
                }

                // Cerramos cualquier otra card antes de abrir la nueva
                closeAllSpecialties();

                // Abrimos la card presionada
                this.classList.add('active');
                openScrollY = window.scrollY;

                // Si estamos en móvil, el estilo CSS ahora hace una expansión inline hermosa (eliminando el efecto modal estático).
                // No necesitamos encender un #specialty-overlay negro que se quede pegado, con el scale 1.03 basta.
            });
        });
    }
}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', initSpecialties);
} else {
    initSpecialties();
}
