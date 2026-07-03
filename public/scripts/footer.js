const whatsappFloat = document.getElementById('whatsapp-float');
  let whatsappTicking = false;

  function updateWhatsappFloat() {
    if (window.scrollY > 300) {
      whatsappFloat?.classList.add('visible');
    } else {
      whatsappFloat?.classList.remove('visible');
    }
    whatsappTicking = false;
  }

  window.addEventListener('scroll', () => {
    if (!whatsappTicking) {
      whatsappTicking = true;
      requestAnimationFrame(updateWhatsappFloat);
    }
  }, { passive: true });
