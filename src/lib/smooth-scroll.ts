export function initSmoothScroll(): void {
  document.documentElement.classList.add('native-scroll');
}

export function scrollToSection(sectionId: string, offset = 0): void {
  const target = document.getElementById(sectionId);
  if (!target) return;
  const top = target.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({
    top,
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
  });
}

export function cleanupScroll(): void {
  document.documentElement.classList.remove('native-scroll');
}
