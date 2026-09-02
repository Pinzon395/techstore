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
})();
