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
   4. WHATSAPP — Función global
   El número está aquí para cambiarlo en un solo lugar.
   @param {string} customText — Mensaje preescrito
══════════════════════════════════════════════════════════════ */
function openWhatsApp(customText) {
    const phone = '529986690777'; // Número directo Pixon PC con código de país
    const text = customText ? encodeURIComponent(customText) : encodeURIComponent('Hola, vengo de la web y quiero información.');
    const url = `https://wa.me/${phone}?text=${text}`;
    window.open(url, '_blank', 'noopener');
}

// Hacer global para HTML inline onclick
window.openWhatsApp = openWhatsApp;

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
   7. LAZY LOADING DE VIDEOS YOUTUBE
   ─────────────────────────────────────────────────────────────
   a) Hero background — carga diferida 1.5s tras window.load
      (no bloquea el First Contentful Paint)
   b) Click-to-play — cualquier .video-lazy-thumb se convierte
      en iframe al hacer click
   c) IntersectionObserver — videos con data-autoplay="true"
      se cargan solos al entrar a 300px del viewport
══════════════════════════════════════════════════════════════ */

/* a) Hero iframe diferido */
window.addEventListener('load', () => {
    const heroFrame = document.querySelector('.bg-video-iframe[data-src]');
    if (!heroFrame) return;
    /* 1500ms de gracia para que el browser pinte el LCP antes de pedir el video */
    setTimeout(() => {
        heroFrame.src = heroFrame.getAttribute('data-src');
        heroFrame.removeAttribute('data-src');
    }, 1500);
}, { once: true });

/**
 * b) Convierte un thumbnail en iframe de YouTube.
 * Detecta automáticamente el tipo de wrapper para ajustar el zoom.
 * @param {HTMLElement} thumb
 */
function loadVideoFromThumb(thumb) {
    const videoId     = thumb.getAttribute('data-video-id');
    const wrapper     = thumb.closest('.video-wrapper');
    const isLandscape = thumb.hasAttribute('data-landscape');
    if (!videoId || !wrapper) return;

    const iframe = document.createElement('iframe');
    /* autoplay+mute obligatorio para reproducción automática en mobile */
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&rel=0&modestbranding=1&disablekb=1`;
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
    iframe.setAttribute('allowfullscreen', '');
    /* pointer-events:none evita que el usuario haga click en el overlay del video */
    Object.assign(iframe.style, {
        width: '100%', height: '100%', border: 'none',
        position: 'absolute', top: '0', left: '0',
        pointerEvents: 'none',
    });

    /* Zoom para wrappers de video vertical/corporativo */
    if (wrapper.classList.contains('b2b-zoom-wrapper')) {
        Object.assign(iframe.style, {
            width: '140%', height: '140%',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
        });
    }
    if (wrapper.classList.contains('b2b-vertical-wrapper')) {
        Object.assign(iframe.style, {
            width: '200%', height: '200%',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
        });
    }
    if (!isLandscape &&
        !wrapper.classList.contains('b2b-zoom-wrapper') &&
        !wrapper.classList.contains('b2b-vertical-wrapper')) {
        iframe.style.minHeight = '450px';
    }

    thumb.remove();
    wrapper.appendChild(iframe);
}

/* c) Click manual + IntersectionObserver */
document.addEventListener('DOMContentLoaded', () => {
    /* Click-to-play en todos los thumbnails */
    document.querySelectorAll('.video-lazy-thumb').forEach(thumb => {
        thumb.addEventListener('click', () => loadVideoFromThumb(thumb), { once: true });
    });

    /* Auto-load con IntersectionObserver para data-autoplay="true" */
    const autoThumbs = document.querySelectorAll('.video-lazy-thumb[data-autoplay="true"]');
    if (!autoThumbs.length || !('IntersectionObserver' in window)) return;

    const videoObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                loadVideoFromThumb(entry.target);
                videoObserver.unobserve(entry.target);
            }
        });
    }, { rootMargin: '300px' }); /* Pre-carga 300px antes de llegar */

    autoThumbs.forEach(t => videoObserver.observe(t));
});

/* ══════════════════════════════════════════════════════════════
   EXPORTS GLOBALES PARA MODULE BUNDLING (Vite)
══════════════════════════════════════════════════════════════ */
window.openTab = openTab;
window.openWhatsApp = openWhatsApp;

/* ══════════════════════════════════════════════════════════════
   SPECIALTY MODALS LOGIC
══════════════════════════════════════════════════════════════ */
const specialtiesData = {
    'laptop': {
        icon: '<i class="fa-solid fa-laptop"></i>',
        title: '¿Quieres arreglar tu laptop?',
        desc: 'Corregimos problemas de pantalla, batería, teclado o sobrecalentamiento rápido y con garantía.',
        btnText: 'Quiero reparar una laptop',
        waText: 'Quiero reparar una laptop'
    },
    'pc': {
        icon: '<i class="fa-solid fa-desktop"></i>',
        title: '¿Quieres arreglar o mejorar tu PC Gamer?',
        desc: 'Mantenimiento profundo, actualización de componentes y overclocking seguro.',
        btnText: 'Quiero reparar una PC Gamer',
        waText: 'Quiero reparar una PC Gamer'
    },
    'mobile': {
        icon: '<i class="fa-solid fa-mobile-screen-button"></i>',
        title: '¿Quieres arreglar tu celular?',
        desc: 'Cambio de pantallas y baterías tanto para Android como para iPhone.',
        btnText: 'Quiero reparar un celular',
        waText: 'Quiero reparar un celular'
    },
    'printer': {
        icon: '<i class="fa-solid fa-print"></i>',
        title: '¿Quieres revisar tu impresora?',
        desc: 'Solucionamos atascos, problemas de cabezal y fallas de conectividad.',
        btnText: 'Quiero revisar una impresora',
        waText: 'Quiero revisar una impresora'
    },
    'console': {
        icon: '<i class="fa-solid fa-gamepad"></i>',
        title: '¿Quieres darle mantenimiento a tu consola?',
        desc: 'Limpieza profunda de PS5, Xbox y Switch. Reparación de discos y puertos HDMI.',
        btnText: 'Quiero mantenimiento para mi consola',
        waText: 'Quiero mantenimiento para mi consola'
    },
    'b2b': {
        icon: '<i class="fa-solid fa-building"></i>',
        title: '¿Requieres soporte para tu empresa?',
        desc: 'Mantenimiento de flotas de equipos, pólizas con técnica asignada y facturación.',
        btnText: 'Quiero soporte empresarial B2B',
        waText: 'Quiero soporte empresarial B2B'
    }
};

function openSpecialtyModal(id) {
    const modal = document.getElementById('specialty-modal');
    if (!modal) return;
    
    const data = specialtiesData[id];
    if (!data) return;

    document.getElementById('sm-icon').innerHTML = data.icon;
    document.getElementById('sm-title').innerText = data.title;
    document.getElementById('sm-desc').innerText = data.desc;
    document.getElementById('sm-btn-text').innerText = data.btnText;
    
    document.getElementById('sm-btn').onclick = function() {
        openWhatsApp(data.waText);
        closeSpecialtyModal();
    };

    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevents background scrolling
}

function closeSpecialtyModal() {
    const modal = document.getElementById('specialty-modal');
    if (modal) {
        modal.classList.remove('active');
    }
    document.body.style.overflow = ''; // Restores background scrolling
}

window.openSpecialtyModal = openSpecialtyModal;
window.closeSpecialtyModal = closeSpecialtyModal;
