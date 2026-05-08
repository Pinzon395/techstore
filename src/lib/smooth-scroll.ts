import Lenis from 'lenis';

let lenis: Lenis | null = null;

export function initSmoothScroll(): void {
  if (lenis) return;

  lenis = new Lenis({
    duration: 1.4,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    wheelMultiplier: 1,
    touchMultiplier: 1.5,
  });

  function raf(time: number): void {
    lenis?.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
}

export function scrollToSection(sectionId: string, offset = 0): void {
  if (!lenis) return;
  const target = document.getElementById(sectionId);
  if (!target) return;
  const top = target.getBoundingClientRect().top + window.scrollY - offset;
  lenis.scrollTo(top, { duration: 1.4 });
}

export function cleanupScroll(): void {
  lenis?.destroy();
  lenis = null;
}
