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
   SW — Service Worker para caché offline/instantánea
══════════════════════════════════════════════════════════════ */
if ('serviceWorker' in navigator && !document.documentElement.classList.contains('low-end-mode')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}


/* ══════════════════════════════════════════════════════════════
   1. NAVBAR — Compactar y auto-ocultar al hacer scroll
   Toggle de clases (.is-scrolled / .is-hidden) — los estilos están
   en styles/style.css. El handler usa requestAnimationFrame para
   evitar layout thrashing en scrolls rápidos.
══════════════════════════════════════════════════════════════ */
const navbar  = document.getElementById('navbar');
const waFloat = document.getElementById('whatsapp-float');

/** Referencia al paquetes section SOLO en index.html */
const paquetesSection = document.getElementById('paquetes');

let lastScrollY = 0;
let scrollTicking = false;

function onScroll() {
    if (!navbar) return;
    const currentY = window.scrollY;

    // Compactar al bajar de 50px
    navbar.classList.toggle('is-scrolled', currentY > 50);

    // Auto-hide: ocultar al bajar > 120px, mostrar al subir / cerca del top
    let hidden = false;
    if (currentY > 120 && currentY > lastScrollY + 2) {
        hidden = true;
    } else if (currentY < lastScrollY - 2 || currentY <= 120) {
        hidden = false;
    } else {
        // delta menor a la histéresis → mantener estado actual
        hidden = navbar.classList.contains('is-hidden');
    }
    navbar.classList.toggle('is-hidden', hidden);
    document.body.classList.toggle('nav-hidden', hidden);

    lastScrollY = currentY;

    // WhatsApp flotante
    if (waFloat) {
        const threshold = paquetesSection
            ? paquetesSection.offsetTop + 200
            : 300;
        waFloat.classList.toggle('visible', currentY > threshold);
    }
    scrollTicking = false;
}

window.addEventListener('scroll', () => {
    if (!scrollTicking) {
        scrollTicking = true;
        requestAnimationFrame(onScroll);
    }
}, { passive: true });

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

    /* Toggle dropdown en móvil y cerrar menú al pulsar enlace normal */
    document.querySelectorAll('.nav-links').forEach(link => {
        link.addEventListener('click', (e) => {
            const parentLi = link.closest('.has-dropdown');
            if (parentLi && window.innerWidth < 769) {
                e.preventDefault();
                parentLi.classList.toggle('open');
                const dropdown = parentLi.querySelector('.dropdown-menu');
                if (dropdown) dropdown.classList.toggle('active');
            } else {
                mobileMenu.classList.remove('active');
                navMenu.classList.remove('active');
            }
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
    if (!poster || !wrapper) return;

    // No cargar el video si es móvil (poster estático basta)
    // o modo gama baja extremo (ahorra datos/batería)
    if (window.innerWidth < 768 || document.body.classList.contains('low-end-mode')) return;

    // Deferir usando IntersectionObserver para cargar solo cuando el hero esté cerca
    let loaded = false;
    function loadHeroVideo() {
        if (loaded) return;
        loaded = true;
        observer.disconnect();

        // Pequeño delay extra para no competir con LCP
        setTimeout(() => {
            const iframe = document.createElement('iframe');
            iframe.loading = 'lazy';
            iframe.src = 'https://www.youtube-nocookie.com/embed/cbKre_xAFlo?autoplay=1&mute=1&loop=1&playlist=cbKre_xAFlo&controls=0&rel=0&modestbranding=1&showinfo=0&enablejsapi=1&disablekb=1';
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
            }, 4000);
        }, 500);
    }

    // Observar cuando el hero esté a 200px del viewport
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) loadHeroVideo();
    }, { rootMargin: '200px' });
    observer.observe(wrapper);
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
    iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&rel=0&modestbranding=1&showinfo=0&enablejsapi=1&disablekb=1`;
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

/* ══════════════════════════════════════════════════════════════
   8. CONTADORES ANIMADOS (IntersectionObserver)
   Fix: Si el elemento ya está en viewport al registrarse (primera
   carga), el observer dispara de inmediato con threshold:0.
   Se marca con data-counted para no animar dos veces.
══════════════════════════════════════════════════════════════ */
const animateCounters = () => {
    const counters = document.querySelectorAll('.animated-counter');
    if (!counters.length) return;

    const runCount = (counter) => {
        if (counter.dataset.counted) return; // evitar doble animación
        counter.dataset.counted = 'true';

        const target    = +counter.getAttribute('data-target');
        const duration  = 1400; // ms
        const increment = target / (duration / 16); // ~60fps

        let current = 0;
        const updateCounter = () => {
            current += increment;
            if (current < target) {
                counter.innerText = Math.ceil(current);
                requestAnimationFrame(updateCounter);
            } else {
                counter.innerText = target;
            }
        };
        updateCounter();
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                runCount(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0, rootMargin: '0px' }); // threshold:0 → dispara en cuanto 1px es visible

    counters.forEach(counter => {
        // Chequeo inmediato: si ya está en el viewport al cargar, animar ya
        const rect = counter.getBoundingClientRect();
        const inView = rect.top < window.innerHeight && rect.bottom > 0;
        if (inView) {
            runCount(counter);
        } else {
            observer.observe(counter);
        }
    });
};

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', animateCounters);
} else {
    animateCounters();
}

/* ══════════════════════════════════════════════════════════════
   FAQ LOGIC — Acordeones de Preguntas Frecuentes
══════════════════════════════════════════════════════════════ */
function toggleFaq(button) {
    const item = button.closest('.faq-item');
    const answer = item.querySelector('.faq-answer');
    const isExpanded = button.getAttribute('aria-expanded') === 'true';

    // Cierra todos los tabs abiertos (comportamiento puro de acordeón)
    document.querySelectorAll('.faq-item').forEach(i => {
        i.classList.remove('faq-item--open');
        i.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
        i.querySelector('.faq-answer').style.maxHeight = null;
    });

    if (!isExpanded) {
        button.setAttribute('aria-expanded', 'true');
        item.classList.add('faq-item--open');
        answer.style.maxHeight = answer.scrollHeight + "px";
    }
}
window.toggleFaq = toggleFaq;

/* ══════════════════════════════════════════════════════════════
   9. LENIS SMOOTH SCROLL (Apple-like Momentum Scrolling)
   Bundleado localmente vía npm — sin fetch a unpkg, queda con
   cache-control immutable 1 año en /assets/ con hash de Vite.
══════════════════════════════════════════════════════════════ */
(async function initLenis() {
    // Evitar cargar en móviles (el scroll nativo ya es perfecto)
    // y en gama baja (reduce jank)
    if (window.innerWidth < 768 || document.body.classList.contains('low-end-mode')) return;

    const { default: Lenis } = await import('lenis');

    const lenis = new Lenis({
        duration: 1.5,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        syncTouch: false,
        wheelMultiplier: 1,
        touchMultiplier: 2,
    });

    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId !== '#') {
                e.preventDefault();
                lenis.scrollTo(targetId, { duration: 1.5 });
            }
        });
    });
})();

/* ══════════════════════════════════════════════════════════════
   10. DEEP LINKING SMOOTH SCROLL (Intercepción en carga inicial)
══════════════════════════════════════════════════════════════ */
(function initDeepLinkScroll() {
    if (window.location.hash) {
        const hash = window.location.hash;
        
        // Quitar temporalmente el hash de la URL sin recargar para engañar al navegador y que no salte de golpe
        window.history.replaceState(null, null, window.location.pathname + window.location.search);
        
        window.addEventListener('DOMContentLoaded', () => {
            // Forzar a estar en el top de la página inmediatamente
            window.scrollTo(0, 0);
            
            // Esperar que la UI dibuje el inicio (ej. 800ms) y luego hacer scroll suave al objetivo
            setTimeout(() => {
                const target = document.querySelector(hash);
                if (target) {
                    // Mueve el foco también si es necesario
                    const headerOffset = 100;
                    const elementPosition = target.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                    
                    if(window.innerWidth < 768) {
                        window.scrollTo({
                            top: offsetPosition,
                            behavior: "smooth"
                        });
                    } else {
                        // En desktop usa el scrollIntoView normal o la magia nativa si está el offset
                        target.scrollIntoView({ behavior: 'smooth' });
                    }
                    
                    // Restaurar el hash en la barra de direcciones 
                    window.history.pushState(null, null, hash);
                }
            }, 800);
        });
    }
})();

/* ══════════════════════════════════════════════════════════════
   11. COUPON STICKER — Diagnóstico gratis flotante (estilo Temu)
   Aparece tras 3s, guarda localStorage 7 días al cerrar.
══════════════════════════════════════════════════════════════ */
(function initCouponSticker() {
  var sticker = document.getElementById('coupon-sticker');
  if (!sticker) return;
  if (document.body.classList.contains('low-end-mode')) return;

  try {
    var dismissed = localStorage.getItem('pixon-coupon-dismissed');
    if (dismissed) {
      var daysAgo = (Date.now() - parseInt(dismissed, 10)) / 86400000;
      if (daysAgo < 7) return;
      localStorage.removeItem('pixon-coupon-dismissed');
    }
  } catch(e) {}

  var showTimer = setTimeout(function() {
    sticker.classList.add('visible');
  }, 3000);

  document.getElementById('coupon-close').addEventListener('click', function(e) {
    e.stopPropagation();
    sticker.classList.remove('visible');
    try { localStorage.setItem('pixon-coupon-dismissed', Date.now().toString()); } catch(e) {}
    clearTimeout(showTimer);
  });

  document.getElementById('coupon-claim').addEventListener('click', function() {
    smartWaRedirect('https://wa.me/529986690777?text=Quiero%20reclamar%20mi%20cup%C3%B3n%20de%20diagn%C3%B3stico%20GRATIS');
    sticker.classList.remove('visible');
    try { localStorage.setItem('pixon-coupon-dismissed', Date.now().toString()); } catch(e) {}
  });
})();
