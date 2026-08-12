(() => {
  if (window.__pixonFaqAccordionReady) return;
  window.__pixonFaqAccordionReady = true;

  const setFaqState = (item, isOpen) => {
    const button = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');
    if (!(button instanceof HTMLButtonElement) || !(answer instanceof HTMLElement)) return;

    item.classList.toggle('faq-item--open', isOpen);
    button.setAttribute('aria-expanded', String(isOpen));
    answer.setAttribute('aria-hidden', String(!isOpen));
    answer.style.maxHeight = isOpen ? `${answer.scrollHeight}px` : '';
  };

  const closeSiblingFaqs = (item) => {
    const scope = item.closest('.faq-page-content') || item.parentElement;
    if (!(scope instanceof HTMLElement)) return;

    scope.querySelectorAll('.faq-item--open').forEach((openItem) => {
      if (openItem !== item && openItem instanceof HTMLElement) setFaqState(openItem, false);
    });
  };

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const button = target.closest('.faq-question');
    if (!(button instanceof HTMLButtonElement)) return;

    const item = button.closest('.faq-item');
    if (!(item instanceof HTMLElement)) return;

    const isOpen = button.getAttribute('aria-expanded') === 'true';
    if (!isOpen) closeSiblingFaqs(item);
    setFaqState(item, !isOpen);
  });

  window.addEventListener('resize', () => {
    document.querySelectorAll('.faq-item--open').forEach((item) => {
      if (item instanceof HTMLElement) setFaqState(item, true);
    });
  }, { passive: true });
})();
