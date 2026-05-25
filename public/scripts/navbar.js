// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  Navbar 3.0 â€” JavaScript v3.2 â€” Full UX Overhaul
//  Â· Desktop: 4s auto-close, 2s cross-section, 3s exit grace
//  Â· Mobile: stable accordion, no accidental close on scroll
//  Â· Gap tolerance 400ms between nested items
//  Â· Click-outside closes all (including mobile hamburger)
//  Â· Progressive scroll-hide (2 scrolls to fully hide)
//  Â· All routes unchanged
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const IS_MOBILE = () => window.innerWidth <= 750;

// 1. HAMBURGER
const mobileMenuBtn = document.getElementById('mobile-menu');
const navMenu = document.getElementById('nav-menu');
mobileMenuBtn?.addEventListener('click', () => {
  navbarEl?.classList.remove('is-hidden', 'is-scrolling-down');
  const isOpen = mobileMenuBtn.classList.toggle('active');
  navMenu?.classList.toggle('active');
  navMenu?.classList.remove('is-menu-peeking');
  mobileMenuBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  mobileMenuBtn.setAttribute('aria-label', isOpen ? 'Cerrar menÃº' : 'Abrir menÃº');
  if (!isOpen) closeAllCascades();
});

// 2. DROPDOWNS ESTÃNDAR (sin cascade â€” compatibilidad futura)
document.querySelectorAll('.has-dropdown:not(.has-cascade) > .nav-dd-trigger').forEach((trigger) => {
  trigger.addEventListener('click', (e) => {
    if (!IS_MOBILE()) return;
    e.preventDefault();
    const parent = trigger.parentElement;
    const menu = parent?.querySelector('.dropdown-menu');
    if (!menu) return;
    const isOpen = parent.classList.toggle('open');
    menu.classList.toggle('active', isOpen);
    trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    document.querySelectorAll('.has-dropdown.open').forEach((el) => {
      if (el !== parent) {
        el.classList.remove('open');
        el.querySelector('.dropdown-menu')?.classList.remove('active');
        el.querySelector('.nav-dd-trigger')?.setAttribute('aria-expanded', 'false');
      }
    });
  });
});

// â”€â”€ Shared state â”€â”€
let autoCloseTimer = null;
let crossSectionTimer = null;
let lastOpenedCascade = null;
let activeCascade = null;
let desktopCloseTimer = null;

function clearTimers() {
  if (autoCloseTimer)    { clearTimeout(autoCloseTimer);    autoCloseTimer = null; }
  if (crossSectionTimer) { clearTimeout(crossSectionTimer); crossSectionTimer = null; }
  if (desktopCloseTimer) { clearTimeout(desktopCloseTimer); desktopCloseTimer = null; }
}

function openCascade(parent) {
  if (!parent) return;
  clearTimers();
  closeAllCascades(parent);
  parent.classList.add('open');
  parent.querySelector('.v3-cascade-l1')?.classList.add('active');
  parent.querySelector('.nav-dd-trigger')?.setAttribute('aria-expanded', 'true');
  lastOpenedCascade = parent;
  activeCascade = parent;
}

function closeCascade(el) {
  el.classList.remove('open');
  el.querySelector('.v3-cascade-l1')?.classList.remove('active');
  el.querySelector('.nav-dd-trigger')?.setAttribute('aria-expanded', 'false');
  el.querySelectorAll('.cascade-item.open').forEach((sub) => {
    sub.classList.remove('open');
    sub.querySelector('.cascade-cat-link')?.setAttribute('aria-expanded', 'false');
  });
  el.querySelectorAll('.cascade-item.intent-open').forEach((sub) => sub.classList.remove('intent-open'));
  if (activeCascade === el) activeCascade = null;
}

function closeAllCascades(except) {
  document.querySelectorAll('.has-cascade.open').forEach((el) => {
    if (el !== except) closeCascade(el);
  });
  activeCascade = except || null;
}

function closeMobileMenu() {
  navMenu?.classList.remove('active', 'is-menu-peeking');
  mobileMenuBtn?.classList.remove('active');
  mobileMenuBtn?.setAttribute('aria-expanded', 'false');
  mobileMenuBtn?.setAttribute('aria-label', 'Abrir menÃº');
  closeAllCascades();
  lastOpenedCascade = null;
  activeCascade = null;
}

// 3. CASCADE TRIGGERS
document.querySelectorAll('.has-cascade > .nav-dd-trigger').forEach((trigger) => {
  const parent = trigger.parentElement;

  trigger.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const wasOpen = parent.classList.contains('open');
    clearTimers();
    navbarEl?.classList.remove('is-hidden', 'is-scrolling-down');
    if (wasOpen) { closeCascade(parent); lastOpenedCascade = null; return; }
    openCascade(parent);
    // Desktop: auto-cierre 4s si el cursor nunca entra
    if (!IS_MOBILE()) {
      autoCloseTimer = setTimeout(() => {
        if (!parent.matches(':hover')) { closeCascade(parent); if (lastOpenedCascade === parent) lastOpenedCascade = null; }
      }, 4000);
    }
  });

  let exitTimer = null;
  parent.addEventListener('mouseenter', () => {
    if (IS_MOBILE()) return;
    clearTimers();
    if (exitTimer) { clearTimeout(exitTimer); exitTimer = null; }
    if (activeCascade !== parent) openCascade(parent);
  });
  parent.addEventListener('mouseleave', () => {
    if (IS_MOBILE() || !parent.classList.contains('open')) return;
    if (exitTimer) clearTimeout(exitTimer);
    exitTimer = setTimeout(() => {
      if (!parent.matches(':hover') && activeCascade === parent) {
        closeCascade(parent);
        if (lastOpenedCascade === parent) lastOpenedCascade = null;
      }
    }, 90);
  });
  trigger.addEventListener('mouseenter', () => {
    if (IS_MOBILE()) return;
    if (activeCascade !== parent) openCascade(parent);
  });
  trigger.addEventListener('mouseleave', () => {
    if (IS_MOBILE()) return;
    if (crossSectionTimer) { clearTimeout(crossSectionTimer); crossSectionTimer = null; }
  });
});

// 4. TOLERANCIA DE GAPS â€” L1 panel: 3s de gracia
document.querySelectorAll('.v3-cascade-l1').forEach((l1) => {
  let l1Timer = null;
  l1.addEventListener('mouseenter', () => { clearTimers(); if (l1Timer) { clearTimeout(l1Timer); l1Timer = null; } });
  l1.addEventListener('mouseleave', () => {
    if (IS_MOBILE()) return;
    const pc = l1.closest('.has-cascade');
    if (!pc?.classList.contains('open')) return;
    l1Timer = setTimeout(() => {
      if (!pc.matches(':hover')) { closeCascade(pc); if (lastOpenedCascade === pc) lastOpenedCascade = null; }
    }, 3000);
  });
});

// L2 items: 400ms de gracia entre opciones
document.querySelectorAll('.cascade-item').forEach((item) => {
  let gapTimer = null;
  item.addEventListener('mouseenter', () => {
    if (IS_MOBILE()) return;
    if (gapTimer) { clearTimeout(gapTimer); gapTimer = null; }
    if (item.querySelector('.v3-cascade-l2')) item.classList.add('intent-open');
  });
  item.addEventListener('mouseleave', () => {
    if (IS_MOBILE()) return;
    const l2 = item.querySelector('.v3-cascade-l2');
    if (!l2) return;
    gapTimer = setTimeout(() => {
      if (!item.matches(':hover') && !l2.matches(':hover')) {
        item.classList.remove('intent-open');
        item.classList.remove('open');
        item.querySelector('.cascade-cat-link')?.setAttribute('aria-expanded', 'false');
      }
    }, 450);
  });
});

// 5. CASCADE CATEGORÃAS
document.querySelectorAll('.cascade-cat-link').forEach((link) => {
  link.addEventListener('click', (e) => {
    const item = link.parentElement;
    const submenu = item?.querySelector('.v3-cascade-l2');
    if (!submenu) {
      const href = link.getAttribute('href');
      if (href && href !== '#') {
        link.getAttribute('target') === '_blank'
          ? window.open(href, '_blank', 'noopener,noreferrer')
          : (window.location.href = href);
      }
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    const isOpen = item.classList.toggle('open');
    link.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    item.parentElement?.querySelectorAll('.cascade-item.open').forEach((sib) => {
      if (sib !== item) { sib.classList.remove('open'); sib.querySelector('.cascade-cat-link')?.setAttribute('aria-expanded', 'false'); }
    });
  });
});

// 6. CLICK FUERA
document.addEventListener('click', (e) => {
  const navbar = document.getElementById('navbar');
  if (navbar && !navbar.contains(e.target)) {
    clearTimers();
    if (IS_MOBILE() && navMenu?.classList.contains('active')) closeMobileMenu();
    else { closeAllCascades(); lastOpenedCascade = null; }
    return;
  }
  document.querySelectorAll('.has-cascade.open').forEach((el) => { if (!el.contains(e.target)) closeCascade(el); });
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  clearTimers();
  if (IS_MOBILE() && navMenu?.classList.contains('active')) {
    closeMobileMenu();
    mobileMenuBtn?.focus();
    return;
  }
  if (document.querySelector('.has-cascade.open')) {
    closeAllCascades();
    lastOpenedCascade = null;
  }
});

let mobileEdgeScrollCount = 0;
let touchStartY = 0;
let edgeResetTimer = null;
let lastEdgeRegisterAt = 0;
function registerMobileEdgeScroll(direction) {
  if (!IS_MOBILE() || !navMenu?.classList.contains('active')) return;
  if (Math.abs(direction) < 6) return;
  const atTop = navMenu.scrollTop <= 1;
  const atBottom = navMenu.scrollTop + navMenu.clientHeight >= navMenu.scrollHeight - 1;
  if ((direction > 0 && !atBottom) || (direction < 0 && !atTop)) {
    mobileEdgeScrollCount = 0;
    navMenu.classList.remove('is-menu-peeking');
    return;
  }
  const now = Date.now();
  if (now - lastEdgeRegisterAt < 350) return;
  lastEdgeRegisterAt = now;
  mobileEdgeScrollCount += 1;
  navMenu.classList.add('is-menu-peeking');
  clearTimeout(edgeResetTimer);
  edgeResetTimer = setTimeout(() => {
    mobileEdgeScrollCount = 0;
    navMenu?.classList.remove('is-menu-peeking');
  }, 900);
  if (mobileEdgeScrollCount >= 2) {
    closeMobileMenu();
    mobileEdgeScrollCount = 0;
  }
}

navMenu?.addEventListener('wheel', (e) => {
  registerMobileEdgeScroll(e.deltaY);
}, { passive: true });
navMenu?.addEventListener('touchstart', (e) => {
  touchStartY = e.touches[0]?.clientY || 0;
}, { passive: true });
navMenu?.addEventListener('touchmove', (e) => {
  const currentY = e.touches[0]?.clientY || touchStartY;
  registerMobileEdgeScroll(touchStartY - currentY);
}, { passive: true });

// 7. ADMIN GEAR
const adminGear = document.getElementById('nav-admin-gear');
if (adminGear) {
  fetch('/api/me', { credentials: 'include' })
    .then((r) => r.json()).then((d) => {
      if (d?.user?.role === 'admin') {
        adminGear.href = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
          ? 'https://pixon.com.mx/admin'
          : '/admin';
        adminGear.style.display = 'inline-flex';
      }
    })
    .catch(() => {});
}

// 8. SCROLL HIDE progresivo
let lastScroll = 0, ticking = false, scrollDownCount = 0;
const navbarEl = document.getElementById('navbar');
const navRevealZone = document.getElementById('nav-reveal-zone');

function syncNavbarHiddenState() {
  document.body.classList.toggle('navbar-hidden', Boolean(navbarEl?.classList.contains('is-hidden')));
}

function revealNavbarForInteraction() {
  if (IS_MOBILE()) return;
  scrollDownCount = 0;
  navbarEl?.classList.remove('is-hidden', 'is-scrolling-down');
  syncNavbarHiddenState();
}

navRevealZone?.addEventListener('mouseenter', revealNavbarForInteraction);
navbarEl?.addEventListener('mouseenter', revealNavbarForInteraction);
window.addEventListener('mousemove', (event) => {
  if (event.clientY <= 28 && navbarEl?.classList.contains('is-hidden')) {
    revealNavbarForInteraction();
  }
}, { passive: true });

function handleScroll() {
  const curr = window.pageYOffset;
  const delta = curr - lastScroll;
  if (curr > 80) navbarEl?.classList.add('is-scrolled'); else navbarEl?.classList.remove('is-scrolled');
  const menuOpen = IS_MOBILE() && navMenu?.classList.contains('active');
  if (menuOpen && Math.abs(delta) > 4) {
    navMenu?.classList.add('is-menu-peeking');
    window.setTimeout(() => closeMobileMenu(), 180);
  } else if (!menuOpen) {
    if (delta > 4 && curr > 220) {
      scrollDownCount++;
      navbarEl?.classList.add('is-scrolling-down');
      if (scrollDownCount >= 2) { navbarEl?.classList.add('is-hidden'); closeAllCascades(); lastOpenedCascade = null; }
    } else if (delta < -4) {
      scrollDownCount = 0;
      navbarEl?.classList.remove('is-hidden');
      navbarEl?.classList.remove('is-scrolling-down');
    }
  }
  syncNavbarHiddenState();
  lastScroll = Math.max(curr, 0);
  ticking = false;
}
window.addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(handleScroll); ticking = true; } }, { passive: true });
syncNavbarHiddenState();
