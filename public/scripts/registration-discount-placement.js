(() => {
  const offer = document.querySelector('[data-registration-placement="after-hero"]');
  if (!(offer instanceof HTMLElement)) return;

  const heading = document.querySelector('#main-content h1');
  if (!(heading instanceof HTMLElement)) return;

  const hero = heading.closest('section, header')
    ?? heading.closest('[data-page-hero], .hero, [class*="hero"]');

  if (hero instanceof HTMLElement) {
    hero.after(offer);
    return;
  }

  const main = heading.closest('main') ?? document.querySelector('#main-content main');
  if (main instanceof HTMLElement) main.prepend(offer);
})();
