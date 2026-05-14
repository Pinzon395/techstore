import Lenis from 'lenis';

let lenis: Lenis | null = null;
let rafId: number | null = null;

export function initSmoothScroll(): void {
  if (lenis) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTabletOrMobileViewport = window.matchMedia('(max-width: 1024px)').matches;
  const isTouchPrimary = window.matchMedia('(pointer: coarse)').matches;
  const isLowEndMode = document.documentElement.classList.contains('low-end-mode');
  const connection = (navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string; downlink?: number };
  }).connection;
  const shouldUseNativeScroll =
    prefersReducedMotion ||
    isTabletOrMobileViewport ||
    isTouchPrimary ||
    isLowEndMode ||
    Boolean(connection?.saveData) ||
    Boolean(connection?.effectiveType && /2g/.test(connection.effectiveType)) ||
    Boolean(connection?.downlink && connection.downlink < 0.8);

  if (shouldUseNativeScroll) return;

  lenis = new Lenis({
    duration: 1.9,
    easing: (t: number) => 1 - Math.pow(1 - t, 4),
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    wheelMultiplier: 0.48,
    touchMultiplier: 1,
  });

  const raf = (time: number): void => {
    lenis?.raf(time);
    rafId = requestAnimationFrame(raf);
  };

  const start = (): void => {
    if (rafId === null) rafId = requestAnimationFrame(raf);
  };

  const stop = (): void => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else start();
  });

  start();
}

export function scrollToSection(sectionId: string, offset = 0): void {
  const target = document.getElementById(sectionId);
  if (!target) return;
  const top = target.getBoundingClientRect().top + window.scrollY - offset;
  if (lenis) {
    lenis.scrollTo(top, { duration: 1.9 });
    return;
  }
  window.scrollTo({
    top,
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
  });
}

export function cleanupScroll(): void {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  lenis?.destroy();
  lenis = null;
}
