(function () {
  'use strict';
  var mainImage = document.querySelector('.product-main-image img');
  document.querySelector('.product-thumbnails')?.addEventListener('click', function (event) {
    var button = event.target.closest('[data-product-image]');
    if (!button || !mainImage) return;
    mainImage.src = button.dataset.productImage;
    mainImage.alt = button.dataset.productAlt || mainImage.alt;
    button.parentElement.querySelectorAll('button').forEach(function (candidate) { candidate.classList.toggle('is-active', candidate === button); });
  });
  var mainButton = document.querySelector('[data-add-to-cart]');
  var total = document.getElementById('product-visual-total');
  var complements = Array.from(document.querySelectorAll('[data-complement-id]'));
  function updateTotal() {
    if (!total || !mainButton) return;
    var amount = Number(mainButton.dataset.itemPrice || 0);
    complements.forEach(function (input) { if (input.checked) amount += Number(input.dataset.complementPrice || 0); });
    total.textContent = window.PixonCart ? window.PixonCart.money(amount, mainButton.dataset.itemCurrency) : amount.toFixed(2);
  }
  complements.forEach(function (input) { input.addEventListener('change', updateTotal); });
  mainButton?.addEventListener('click', function () {
    complements.filter(function (input) { return input.checked; }).forEach(function (input) {
      window.PixonCart?.add({ id: input.dataset.complementId, slug: input.dataset.complementSlug, name: input.dataset.complementName, displayPrice: input.dataset.complementPrice, currency: input.dataset.complementCurrency, type: 'SERVICE', maxQuantity: 100 }, 1);
    });
  });

  function isEn() {

    return (document.documentElement.lang && document.documentElement.lang.startsWith('en'));
  }

  function localizePage() {
    if (!isEn()) return;
    var soldStamp = document.querySelector('.product-sold-stamp');
    if (soldStamp) soldStamp.textContent = 'SOLD';

    var facts = document.querySelectorAll('.product-quick-facts div');
    if (facts[0]) {
      var dt = facts[0].querySelector('dt'); if (dt) dt.textContent = 'Availability';
      var dd = facts[0].querySelector('dd');
      if (dd) {
        if (dd.textContent.trim() === 'Disponible') dd.textContent = 'Available';
        else if (dd.textContent.trim() === 'Vendido') dd.textContent = 'Sold';
        else if (dd.textContent.trim() === 'No disponible') dd.textContent = 'Unavailable';
      }
    }
    if (facts[1]) {
      var dt = facts[1].querySelector('dt'); if (dt) dt.textContent = 'Condition';
    }
    if (facts[2]) {
      var dt = facts[2].querySelector('dt'); if (dt) dt.textContent = 'Warranty';
    }

    var soldMsg = document.querySelector('.product-sold-message');
    if (soldMsg) {
      var h2 = soldMsg.querySelector('h2'); if (h2) h2.textContent = 'This listing has found an owner.';
      var p = soldMsg.querySelector('p'); if (p) p.textContent = 'The listing remains visible as a reference. Check available items or request a similar setup.';
      var a = soldMsg.querySelector('a'); if (a) a.textContent = 'Browse available devices';
    }

    if (mainButton) {
      if (!mainButton.disabled) {
        mainButton.textContent = mainButton.textContent.includes('última') ? 'Add last unit' : 'Add to Cart';
      } else {
        mainButton.textContent = 'Unavailable';
      }
    }

    var consultA = document.querySelector('.product-buy-actions .store-action-secondary');
    if (consultA) consultA.textContent = 'Inquire before buying';

    var trustItems = document.querySelectorAll('.product-trust-list li');
    if (trustItems[0]) trustItems[0].textContent = 'Price and stock verified upon confirmation';
    if (trustItems[1]) trustItems[1].textContent = 'Pickup by appointment or confirmed local delivery';
    if (trustItems[2]) trustItems[2].textContent = 'Terms and warranty documented before confirming purchase';
    if (trustItems[3]) trustItems[3].textContent = 'Documented warranty where applicable';

    var policyLink = document.querySelector('.product-policy-link');
    if (policyLink) policyLink.textContent = 'View delivery & warranty terms';

    var specsTitle = document.getElementById('product-specs-title');
    if (specsTitle) specsTitle.textContent = 'Specifications & condition';

    var includesH2 = document.querySelector('.product-information aside h2');
    if (includesH2) includesH2.textContent = 'What is included';
    var includesP = document.querySelector('.product-information aside p');
    if (includesP) includesP.textContent = 'Delivery includes only what is described in this listing. Confirm accessories, installation, and service scope before paying.';
    var includesA = document.querySelector('.product-information aside a');
    if (includesA) includesA.textContent = 'Create inquiry ticket';

    var compHeader = document.querySelector('.product-complements header');
    if (compHeader) {
      var ch2 = compHeader.querySelector('h2'); if (ch2) ch2.textContent = 'Complementary services';
      var cp = compHeader.querySelector('p'); if (cp) cp.textContent = 'Add professional support; the final total is verified at checkout.';
    }

    var simHeader = document.querySelector('.product-similar header');
    if (simHeader) {
      var sh2 = simHeader.querySelector('h2'); if (sh2) sh2.textContent = 'Available alternatives';
      var sa = simHeader.querySelector('a'); if (sa) sa.textContent = 'View full catalog →';
    }
  }

  localizePage();
})();
