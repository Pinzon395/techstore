/**
 * ════════════════════════════════════════════════════════════════
 *  floating-dock.js — Pixon PC Auto-Layout Coordinator
 *  Coordina reactivamente WhatsApp, Botón Scroll (Back-to-top)
 *  y la card de Privacidad / Cookies / Términos.
 *
 *  Garantiza animación suave (cubic-bezier) y cero solapamiento
 *  en móvil, tablet y escritorio.
 * ════════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  function syncFloatingDock() {
    const banner = document.getElementById('pixon-cookie-banner');
    const stickyCta = document.querySelector('.mobile-sticky-cta');
    const btt = document.getElementById('back-to-top');
    const wa = document.getElementById('whatsapp-float');
    const cart = document.getElementById('store-cart-launcher');

    let leftClearance = 0;
    let rightClearance = 0;

    const isBannerVisible = banner instanceof HTMLElement &&
      !banner.classList.contains('hide') &&
      banner.offsetHeight > 0;

    if (isBannerVisible) {
      const rect = banner.getBoundingClientRect();
      const bannerHeight = rect.height;
      const windowWidth = window.innerWidth;

      // El banner se ubica en el fondo de la pantalla.
      // Clearance para el botón de scroll (lado izquierdo):
      leftClearance = Math.max(leftClearance, Math.ceil(bannerHeight + 14));

      // Clearance para el botón de WhatsApp (lado derecho):
      // En pantallas estrechas (móvil/tablet <= 640px) o si la card abarca cerca del margen derecho,
      // WhatsApp se eleva automáticamente sobre la card para jamás solaparse.
      const distanceToRight = windowWidth - rect.right;
      if (windowWidth <= 640 || distanceToRight < 100) {
        rightClearance = Math.max(rightClearance, Math.ceil(bannerHeight + 14));
      }
    }

    // Si existe una barra de acción inferior sticky (ej. páginas de servicio en móvil):
    if (stickyCta instanceof HTMLElement && window.innerWidth <= 768 && stickyCta.offsetHeight > 0) {
      const ctaHeight = stickyCta.getBoundingClientRect().height;
      leftClearance = Math.max(leftClearance, Math.ceil(ctaHeight + 14));
      rightClearance = Math.max(rightClearance, Math.ceil(ctaHeight + 14));
    }

    if (btt) {
      btt.style.setProperty('--btt-clearance', `${leftClearance}px`);
    }
    if (wa) {
      wa.style.setProperty('--wa-clearance', `${rightClearance}px`);
    }
    if (cart) {
      const bannerRect = isBannerVisible ? banner.getBoundingClientRect() : null;
      const cartRect = cart.getBoundingClientRect();
      const overlapsBanner = bannerRect && cartRect.left < bannerRect.right && cartRect.right > bannerRect.left;
      cart.style.setProperty('--cart-clearance', `${Math.max(overlapsBanner ? Math.ceil(window.innerHeight - bannerRect.top + 14) : 0, stickyCta instanceof HTMLElement && window.innerWidth <= 768 ? Math.ceil(stickyCta.getBoundingClientRect().height + 14) : 0)}px`);
    }
  }

  let dockResizeObserver = null;
  let dockBannerAttrObserver = null;
  let dockBodyChildObserver = null;
  let observedBanner = null;

  function observeBanner(banner) {
    if (!banner || observedBanner === banner) return;
    observedBanner = banner;
    if (dockResizeObserver) dockResizeObserver.observe(banner);
    if (typeof MutationObserver === 'function') {
      if (dockBannerAttrObserver) dockBannerAttrObserver.disconnect();
      dockBannerAttrObserver = new MutationObserver(syncFloatingDock);
      dockBannerAttrObserver.observe(banner, {
        attributes: true,
        attributeFilter: ['class', 'style']
      });
    }
  }

  function initDockCoordinator() {
    syncFloatingDock();

    if (!dockResizeObserver && typeof ResizeObserver === 'function') {
      dockResizeObserver = new ResizeObserver(() => syncFloatingDock());
      const stickyCta = document.querySelector('.mobile-sticky-cta');
      if (stickyCta) dockResizeObserver.observe(stickyCta);
    }

    const existingBanner = document.getElementById('pixon-cookie-banner');
    if (existingBanner) {
      observeBanner(existingBanner);
    } else if (!dockBodyChildObserver && typeof MutationObserver === 'function') {
      // El banner de cookies se inserta dinámicamente: solo vigilamos
      // altas/bajas directas en <body>, no todo el subárbol, hasta que aparezca.
      dockBodyChildObserver = new MutationObserver(() => {
        const banner = document.getElementById('pixon-cookie-banner');
        if (banner) {
          observeBanner(banner);
          dockBodyChildObserver.disconnect();
          dockBodyChildObserver = null;
        }
        syncFloatingDock();
      });
      dockBodyChildObserver.observe(document.body, { childList: true });
    }

    window.addEventListener('resize', syncFloatingDock, { passive: true });
    window.addEventListener('pixon:layout-change', syncFloatingDock, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDockCoordinator);
  } else {
    initDockCoordinator();
  }

  document.addEventListener('astro:page-load', syncFloatingDock);
  document.addEventListener('astro:after-swap', syncFloatingDock);

  window.syncFloatingDock = syncFloatingDock;
})();
