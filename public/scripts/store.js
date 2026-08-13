(function () {
  'use strict';

  const API_ROOT = '/api/commerce/catalog';
  const PAGE_SIZE = 12;
  const TYPE_LABELS = {
    PRODUCT: 'Producto',
    EQUIPMENT: 'Equipo',
    HARDWARE: 'Hardware',
    SERVICE: 'Servicio',
    BUNDLE: 'Paquete',
  };
  const CONDITION_LABELS = {
    NEW: 'Nuevo',
    USED: 'Usado',
    REFURBISHED: 'Reacondicionado',
    OPEN_BOX: 'Caja abierta',
    FOR_PARTS: 'Para refacciones',
    NOT_APPLICABLE: 'No aplica',
  };

  const elements = {
    form: document.getElementById('store-filters'),
    filterToggle: document.getElementById('store-filter-toggle'),
    search: document.getElementById('store-search'),
    type: document.getElementById('store-type'),
    condition: document.getElementById('store-condition'),
    brand: document.getElementById('store-brand'),
    minPrice: document.getElementById('store-min-price'),
    maxPrice: document.getElementById('store-max-price'),
    availability: document.getElementById('store-availability'),
    sort: document.getElementById('store-sort'),
    clear: document.getElementById('store-clear-filters'),
    emptyClear: document.getElementById('store-empty-clear'),
    categories: document.getElementById('store-category-row'),
    summary: document.getElementById('store-result-summary'),
    loading: document.getElementById('store-loading'),
    error: document.getElementById('store-error'),
    retry: document.getElementById('store-retry'),
    empty: document.getElementById('store-empty'),
    grid: document.getElementById('store-product-grid'),
    pagination: document.getElementById('store-pagination'),
    previous: document.getElementById('store-prev-page'),
    next: document.getElementById('store-next-page'),
    pageLabel: document.getElementById('store-page-label'),
    soldSection: document.getElementById('ofertas-vendidas'),
    soldGrid: document.getElementById('store-sold-grid'),
    showAvailable: document.getElementById('store-show-available'),
    dialog: document.getElementById('store-detail-dialog'),
    dialogClose: document.getElementById('store-dialog-close'),
    dialogContent: document.getElementById('store-dialog-content'),
    suggestions: document.getElementById('store-suggestions'),
    promotionBanner: document.getElementById('store-promotion-banner'),
  };

  if (!elements.form || !elements.grid) return;

  const state = {
    category: '',
    page: 1,
    pages: 1,
    controller: null,
    debounce: null,
    suggestionController: null,
  };

  function asObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  }

  function unwrapPayload(payload) {
    const root = asObject(payload);
    const data = root.data;
    if (Array.isArray(data)) return { items: data, meta: asObject(root.meta) };
    const body = asObject(data);
    const candidates = [body.items, body.results, body.catalog, root.items, root.results];
    return {
      items: candidates.find(Array.isArray) || [],
      meta: Object.keys(asObject(root.meta)).length ? asObject(root.meta) : asObject(body.meta),
    };
  }

  function finiteNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function firstDefined() {
    for (const value of arguments) {
      if (value !== null && value !== undefined && value !== '') return value;
    }
    return null;
  }

  function mediaUrl(item) {
    const media = Array.isArray(item.media) ? item.media : [];
    const primary = media.find((entry) => entry && (entry.is_primary || entry.isPrimary)) || media[0];
    const candidate = firstDefined(
      asObject(primary).url,
      asObject(primary).path,
      item.primary_image_url,
      item.primaryImageUrl,
      item.image_url,
      item.image
    );
    if (!candidate || typeof candidate !== 'string') return '';
    try {
      const url = new URL(candidate, window.location.origin);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch (_) {
      return '';
    }
  }

  function normalizeItem(raw) {
    if (raw && raw.__storeNormalized === true) return raw;
    const item = asObject(raw);
    const pricing = asObject(item.pricing);
    const inventory = asObject(item.inventory);
    const categories = Array.isArray(item.categories) ? item.categories.filter(Boolean) : [];
    const category = asObject(item.category || categories[0]);
    const badges = Array.isArray(item.badges) ? item.badges.filter(Boolean) : [];
    const basePrice = finiteNumber(firstDefined(pricing.original, pricing.base, pricing.base_price, item.base_price, item.basePrice));
    const currentPrice = finiteNumber(firstDefined(pricing.current, pricing.sale, pricing.effective_price, pricing.sale_price, item.currentPrice, item.effective_price, item.effectivePrice, item.sale_price, item.salePrice, basePrice));
    const stock = finiteNumber(firstDefined(inventory.available, inventory.available_quantity, inventory.stock_quantity, item.stock, item.available_quantity, item.availableQuantity, item.stock_quantity, item.stockQuantity));
    const status = String(firstDefined(item.status, 'ACTIVE')).toUpperCase();
    const trackStock = Boolean(firstDefined(inventory.tracked, item.track_stock, item.trackStock, false));
    const slug = String(firstDefined(item.slug, item.public_id, item.publicId, item.id, ''));

    return {
      __storeNormalized: true,
      id: firstDefined(item.id, item.public_id, item.publicId, slug),
      slug,
      name: String(firstDefined(item.name, 'Publicación sin nombre')),
      shortDescription: String(firstDefined(item.short_description, item.shortDescription, item.description, 'Consulta los detalles y la disponibilidad con Pixon PC.')),
      description: String(firstDefined(item.description, item.short_description, item.shortDescription, '')),
      type: String(firstDefined(item.item_type, item.itemType, item.type, 'PRODUCT')).toUpperCase(),
      condition: String(firstDefined(item.condition, 'NOT_APPLICABLE')).toUpperCase(),
      status,
      currency: String(firstDefined(pricing.currency, item.currency, 'MXN')).toUpperCase(),
      basePrice,
      currentPrice,
      stock,
      trackStock,
      allowQuote: Boolean(firstDefined(item.allow_quote, item.allowQuote, true)),
      allowPurchase: Boolean(firstDefined(item.allow_purchase, item.allowPurchase, false)),
      image: mediaUrl(item),
      imageAlt: String(firstDefined(asObject((item.media || [])[0]).alt_text, asObject((item.media || [])[0]).altText, item.imageAlt, item.name, 'Publicación de Pixon PC')),
      categoryName: String(firstDefined(category.name, item.category_name, item.categoryName, 'Catálogo')),
      badges: badges.map((badge) => String(firstDefined(asObject(badge).label, asObject(badge).name, badge))).filter(Boolean).slice(0, 2),
      attributes: Array.isArray(item.attributes) ? item.attributes.filter(Boolean) : [],
    };
  }

  function money(value, currency) {
    if (value === null) return 'Precio a consultar';
    try {
      return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: currency || 'MXN',
        maximumFractionDigits: 2,
      }).format(value);
    } catch (_) {
      return '$' + Number(value).toFixed(2) + ' MXN';
    }
  }

  function availability(item) {
    if (item.status === 'SOLD') return 'Vendido';
    if (item.status === 'RESERVED') return 'Reservado';
    if (item.status === 'OUT_OF_STOCK' || (item.trackStock && item.stock !== null && item.stock <= 0)) return 'Agotado';
    if (item.trackStock && item.stock === 1) return 'Última unidad';
    return 'Disponible';
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function appendIcon(parent, iconClass) {
    const icon = element('i', iconClass);
    icon.setAttribute('aria-hidden', 'true');
    parent.appendChild(icon);
  }

  function whatsappUrl(item) {
    const message = 'Hola Pixon PC, quiero consultar “' + item.name + '” de la tienda' + (item.slug ? ' (' + item.slug + ')' : '') + '.';
    return 'https://wa.me/529986690777?text=' + encodeURIComponent(message);
  }

  function createMedia(item) {
    const media = element('div', 'store-card-media');
    if (item.image) {
      const image = document.createElement('img');
      image.src = item.image;
      image.alt = item.imageAlt;
      image.loading = 'lazy';
      image.decoding = 'async';
      media.appendChild(image);
    } else {
      const placeholder = element('div', 'store-card-placeholder');
      appendIcon(placeholder, item.type === 'SERVICE' ? 'fa-solid fa-screwdriver-wrench' : 'fa-solid fa-microchip');
      media.appendChild(placeholder);
    }

    const flags = element('div', 'store-card-flags');
    const statusFlag = element('span', 'store-card-flag', availability(item));
    flags.appendChild(statusFlag);
    item.badges.forEach((badge) => flags.appendChild(element('span', 'store-card-flag is-sale', badge)));
    media.appendChild(flags);
    return media;
  }

  function createProductCard(raw, options) {
    const item = normalizeItem(raw);
    const card = element('article', 'store-product-card');
    card.dataset.itemId = String(item.id || '');
    card.appendChild(createMedia(item));

    const body = element('div', 'store-card-body');
    const meta = element('div', 'store-card-meta');
    meta.appendChild(element('span', '', TYPE_LABELS[item.type] || item.type));
    meta.appendChild(element('span', '', CONDITION_LABELS[item.condition] || item.condition));
    body.appendChild(meta);
    body.appendChild(element('h3', '', item.name));
    body.appendChild(element('p', 'store-card-description', item.shortDescription));

    const priceRow = element('div', 'store-card-price-row');
    priceRow.appendChild(element('span', 'store-card-price', money(item.currentPrice, item.currency)));
    if (item.basePrice !== null && item.currentPrice !== null && item.basePrice > item.currentPrice) {
      priceRow.appendChild(element('span', 'store-card-original', money(item.basePrice, item.currency)));
      priceRow.appendChild(element('span', 'store-card-saving', 'Ahorras ' + money(item.basePrice - item.currentPrice, item.currency)));
    }
    body.appendChild(priceRow);

    const actions = element('div', 'store-card-actions');
    if (item.slug) {
      const detail = element('a', '', 'Ver detalles');
      detail.href = '/tienda/' + encodeURIComponent(item.slug);
      detail.setAttribute('aria-label', 'Ver detalles de ' + item.name);
      actions.appendChild(detail);
    }
    const isSold = Boolean(options && options.sold) || item.status === 'SOLD';
    const purchasable = !isSold && item.status === 'ACTIVE' && item.allowPurchase
      && (!item.trackStock || item.stock === null || item.stock > 0);
    if (purchasable) {
      const add = element('button', 'store-card-add', 'Agregar');
      add.type = 'button';
      add.dataset.addToCart = '';
      add.dataset.itemId = String(item.id);
      add.dataset.itemSlug = item.slug;
      add.dataset.itemName = item.name;
      add.dataset.itemPrice = String(item.currentPrice || '');
      add.dataset.itemCurrency = item.currency;
      add.dataset.itemImage = item.image;
      add.setAttribute('aria-label', 'Agregar ' + item.name + ' al carrito');
      actions.appendChild(add);
    }
    const quote = element('a', '');
    quote.href = isSold ? '#catalogo-tienda' : item.allowQuote ? whatsappUrl(item) : '/contacto';
    if (!isSold && item.allowQuote) {
      quote.target = '_blank';
      quote.rel = 'noopener noreferrer';
      quote.setAttribute('aria-label', 'Consultar ' + item.name + ' por WhatsApp');
      appendIcon(quote, 'fa-brands fa-whatsapp');
    } else {
      quote.setAttribute('aria-label', isSold ? 'Ver publicaciones disponibles' : 'Contactar a Pixon PC');
      appendIcon(quote, isSold ? 'fa-solid fa-arrow-right' : 'fa-solid fa-envelope');
    }
    actions.appendChild(quote);
    body.appendChild(actions);
    card.appendChild(body);
    return card;
  }

  function readMeta(meta, itemCount) {
    const page = finiteNumber(firstDefined(meta.page, meta.current_page, meta.currentPage)) || state.page;
    const pageSize = finiteNumber(firstDefined(meta.page_size, meta.pageSize, meta.limit)) || PAGE_SIZE;
    const total = finiteNumber(firstDefined(meta.total, meta.total_items, meta.totalItems, meta.count));
    const pages = finiteNumber(firstDefined(meta.pages, meta.total_pages, meta.totalPages)) || (total !== null ? Math.max(1, Math.ceil(total / pageSize)) : (itemCount < pageSize ? page : page + 1));
    return { page, pageSize, total, pages };
  }

  function setView(view) {
    elements.loading.hidden = view !== 'loading';
    elements.error.hidden = view !== 'error';
    elements.empty.hidden = view !== 'empty';
    elements.grid.hidden = view !== 'results';
    if (view !== 'results') elements.pagination.hidden = true;
  }

  function buildQuery(overrides) {
    const params = new URLSearchParams();
    const values = {
      q: elements.search.value.trim(),
      type: elements.type.value,
      condition: elements.condition.value,
      brand: elements.brand.value.trim(),
      minPrice: elements.minPrice.value,
      maxPrice: elements.maxPrice.value,
      availability: elements.availability.value,
      category: state.category,
      sort: elements.sort.value,
      page: state.page,
      pageSize: PAGE_SIZE,
      ...(overrides || {}),
    };
    Object.entries(values).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) params.set(key, String(value));
    });
    return params;
  }

  function syncUrl() {
    const params = buildQuery();
    params.delete('pageSize');
    if (params.get('page') === '1') params.delete('page');
    if (params.get('sort') === 'newest') params.delete('sort');
    const query = params.toString();
    history.replaceState(null, '', window.location.pathname + (query ? '?' + query : '') + window.location.hash);
  }

  async function fetchJson(url, options) {
    const response = await fetch(url, { headers: { Accept: 'application/json' }, ...(options || {}) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) {
      const error = asObject(payload.error);
      throw new Error(String(firstDefined(error.message, payload.message, 'No fue posible completar la consulta.')));
    }
    return payload;
  }

  async function loadCatalog(options) {
    const shouldFocus = Boolean(options && options.focus);
    if (state.controller) state.controller.abort();
    state.controller = new AbortController();
    setView('loading');
    elements.summary.textContent = 'Consultando publicaciones…';

    try {
      const payload = await fetchJson(API_ROOT + '?' + buildQuery().toString(), { signal: state.controller.signal });
      const result = unwrapPayload(payload);
      const items = result.items.map(normalizeItem);
      const pagination = readMeta(result.meta, result.items.length);
      state.page = pagination.page;
      state.pages = pagination.pages;
      elements.grid.replaceChildren(...items.map((item) => createProductCard(item)));

      if (!items.length) {
        setView('empty');
        elements.summary.textContent = 'Sin resultados para esta selección';
      } else {
        setView('results');
        const totalLabel = pagination.total === null ? items.length + ' publicaciones en esta página' : pagination.total + (pagination.total === 1 ? ' publicación' : ' publicaciones');
        elements.summary.textContent = totalLabel;
        elements.pageLabel.textContent = 'Página ' + state.page + ' de ' + state.pages;
        elements.previous.disabled = state.page <= 1;
        elements.next.disabled = state.page >= state.pages;
        elements.pagination.hidden = state.pages <= 1;
      }
      syncUrl();
      if (shouldFocus) document.getElementById('catalog-title')?.focus({ preventScroll: true });
    } catch (error) {
      if (error && error.name === 'AbortError') return;
      setView('error');
      elements.summary.textContent = 'Catálogo temporalmente no disponible';
    }
  }

  function categoryList(payload) {
    const result = unwrapPayload(payload);
    if (result.items.length) return result.items;
    const data = asObject(payload.data);
    return Array.isArray(data.categories) ? data.categories : [];
  }

  async function loadCategories() {
    try {
      const payload = await fetchJson(API_ROOT + '/categories');
      const categories = categoryList(payload);
      categories.forEach((raw) => {
        const category = asObject(raw);
        const value = String(firstDefined(category.slug, category.id, ''));
        const name = String(firstDefined(category.name, 'Categoría'));
        if (!value) return;
        const button = element('button', 'store-category-chip', name);
        button.type = 'button';
        button.dataset.category = value;
        button.setAttribute('aria-pressed', String(state.category === value));
        button.classList.toggle('is-active', state.category === value);
        elements.categories.appendChild(button);
      });
      const matched = Array.from(elements.categories.querySelectorAll('[data-category]')).some((button) => button.dataset.category === state.category);
      elements.categories.querySelectorAll('[data-category]').forEach((button) => {
        const active = matched ? button.dataset.category === state.category : button.dataset.category === '';
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', String(active));
      });
    } catch (_) {
      // El catálogo sigue siendo utilizable aunque no cargue el filtro de categorías.
    }
  }

  async function loadPromotionBanner() {
    if (!elements.promotionBanner) return;
    try {
      const payload = await fetchJson('/api/commerce/promotions');
      const promotions = Array.isArray(payload.data) ? payload.data : [];
      const promotion = promotions[0];
      if (!promotion) return;
      const presentation = asObject(promotion.presentation);
      document.getElementById('store-promotion-title').textContent = presentation.title || promotion.name;
      document.getElementById('store-promotion-text').textContent = presentation.text || 'Descuento validado automáticamente al crear tu pedido.';
      elements.promotionBanner.hidden = false;
    } catch (_) { elements.promotionBanner.hidden = true; }
  }

  function closeSuggestions() {
    if (!elements.suggestions) return;
    elements.suggestions.hidden = true;
    elements.search.setAttribute('aria-expanded', 'false');
  }

  async function loadSuggestions() {
    if (!elements.suggestions) return;
    const q = elements.search.value.trim();
    if (q.length < 2) { closeSuggestions(); return; }
    if (state.suggestionController) state.suggestionController.abort();
    state.suggestionController = new AbortController();
    try {
      const payload = await fetchJson(API_ROOT + '?' + new URLSearchParams({ q, page: '1', pageSize: '6' }), { signal: state.suggestionController.signal });
      const items = unwrapPayload(payload).items.map(normalizeItem);
      elements.suggestions.replaceChildren();
      ['PRODUCT', 'SERVICE'].forEach((group) => {
        const matches = items.filter((item) => group === 'SERVICE' ? item.type === 'SERVICE' : item.type !== 'SERVICE');
        if (!matches.length) return;
        elements.suggestions.appendChild(element('strong', 'store-suggestion-group', group === 'SERVICE' ? 'Servicios' : 'Productos'));
        matches.forEach((item) => {
          const link = element('a', 'store-suggestion-option');
          link.href = '/tienda/' + encodeURIComponent(item.slug);
          link.setAttribute('role', 'option');
          link.append(element('span', '', item.name), element('small', '', money(item.currentPrice, item.currency)));
          elements.suggestions.appendChild(link);
        });
      });
      const categories = new Map();
      items.forEach((item) => { if (item.categoryName && item.categoryName !== 'Catálogo') categories.set(item.categoryName, item.categoryName); });
      if (categories.size) {
        elements.suggestions.appendChild(element('strong', 'store-suggestion-group', 'Categorías'));
        categories.forEach((name) => {
          const button = element('button', 'store-suggestion-option', name); button.type = 'button';
          button.setAttribute('role', 'option');
          button.addEventListener('click', () => { elements.search.value = name; closeSuggestions(); state.page = 1; loadCatalog(); });
          elements.suggestions.appendChild(button);
        });
      }
      elements.suggestions.hidden = items.length === 0;
      elements.search.setAttribute('aria-expanded', String(items.length > 0));
    } catch (error) { if (error?.name !== 'AbortError') closeSuggestions(); }
  }

  async function loadSold() {
    try {
      const query = new URLSearchParams({ status: 'SOLD', sort: 'newest', page: '1', pageSize: '4' });
      const payload = await fetchJson(API_ROOT + '?' + query.toString());
      const items = unwrapPayload(payload).items.map(normalizeItem).filter((item) => item.status === 'SOLD');
      if (!items.length) return;
      elements.soldGrid.replaceChildren(...items.map((item) => createProductCard(item, { sold: true })));
      elements.soldSection.hidden = false;
    } catch (_) {
      elements.soldSection.hidden = true;
    }
  }

  function resetFilters() {
    elements.form.reset();
    state.category = '';
    state.page = 1;
    elements.categories.querySelectorAll('[data-category]').forEach((button) => {
      const active = button.dataset.category === '';
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    loadCatalog({ focus: true });
  }

  function descriptionNode(item) {
    return element('p', '', item.description || item.shortDescription);
  }

  function buildDialog(raw) {
    const item = normalizeItem(raw);
    const accessibleTitle = document.getElementById('store-dialog-title');
    if (accessibleTitle) accessibleTitle.textContent = 'Detalle de ' + item.name;
    const grid = element('div', 'store-dialog-grid');
    const media = element('div', 'store-dialog-media');
    if (item.image) {
      const image = document.createElement('img');
      image.src = item.image;
      image.alt = item.imageAlt;
      image.decoding = 'async';
      media.appendChild(image);
    } else {
      const placeholder = element('div', 'store-card-placeholder');
      appendIcon(placeholder, 'fa-solid fa-microchip');
      media.appendChild(placeholder);
    }
    grid.appendChild(media);

    const copy = element('div', 'store-dialog-copy');
    const title = element('h3', '', item.name);
    copy.appendChild(title);
    copy.appendChild(descriptionNode(item));
    copy.appendChild(element('p', 'store-card-price', money(item.currentPrice, item.currency)));

    const specs = document.createElement('dl');
    specs.className = 'store-dialog-specs';
    const baseSpecs = [
      ['Tipo', TYPE_LABELS[item.type] || item.type],
      ['Condición', CONDITION_LABELS[item.condition] || item.condition],
      ['Estado', availability(item)],
      ['Categoría', item.categoryName],
    ];
    item.attributes.slice(0, 8).forEach((attribute) => {
      const entry = asObject(attribute);
      baseSpecs.push([
        String(firstDefined(entry.label, entry.name, entry.key, 'Característica')),
        String(firstDefined(entry.formatted_value, entry.formattedValue, entry.value, '')),
      ]);
    });
    baseSpecs.filter((entry) => entry[1]).forEach(([label, value]) => {
      const row = document.createElement('div');
      row.appendChild(element('dt', '', label));
      row.appendChild(element('dd', '', value));
      specs.appendChild(row);
    });
    copy.appendChild(specs);
    const cta = element('a', 'store-dialog-cta');
    const isSold = item.status === 'SOLD';
    cta.href = isSold ? '#catalogo-tienda' : item.allowQuote ? whatsappUrl(item) : '/contacto';
    if (!isSold && item.allowQuote) {
      cta.target = '_blank';
      cta.rel = 'noopener noreferrer';
      appendIcon(cta, 'fa-brands fa-whatsapp');
      cta.appendChild(document.createTextNode(' Consultar esta publicación'));
    } else if (isSold) {
      appendIcon(cta, 'fa-solid fa-arrow-right');
      cta.appendChild(document.createTextNode(' Ver publicaciones disponibles'));
    } else {
      appendIcon(cta, 'fa-solid fa-envelope');
      cta.appendChild(document.createTextNode(' Contactar a Pixon PC'));
    }
    copy.appendChild(cta);
    grid.appendChild(copy);
    return grid;
  }

  async function openDetail(slug) {
    if (!slug || !elements.dialog || typeof elements.dialog.showModal !== 'function') return;
    const accessibleTitle = document.getElementById('store-dialog-title');
    if (accessibleTitle) accessibleTitle.textContent = 'Cargando detalle de la publicación';
    elements.dialogContent.replaceChildren(element('div', 'store-state', 'Cargando detalle…'));
    elements.dialog.showModal();
    try {
      const payload = await fetchJson(API_ROOT + '/' + encodeURIComponent(slug));
      const raw = asObject(payload.data).item || payload.data;
      elements.dialogContent.replaceChildren(buildDialog(raw));
    } catch (_) {
      const error = element('div', 'store-state store-state-error');
      appendIcon(error, 'fa-solid fa-triangle-exclamation');
      error.appendChild(element('h3', '', 'No pudimos cargar el detalle'));
      error.appendChild(element('p', '', 'Cierra esta ventana e intenta nuevamente.'));
      elements.dialogContent.replaceChildren(error);
    }
  }

  function applyInitialQuery() {
    const params = new URLSearchParams(window.location.search);
    elements.search.value = (params.get('q') || '').slice(0, 120);
    ['type', 'condition', 'availability', 'sort'].forEach((name) => {
      const control = elements[name];
      const value = params.get(name);
      if (control && value && Array.from(control.options).some((option) => option.value === value)) control.value = value;
    });
    elements.brand.value = (params.get('brand') || '').slice(0, 100);
    const minPrice = params.get('minPrice');
    const maxPrice = params.get('maxPrice');
    if (minPrice && /^\d+(?:\.\d{1,2})?$/.test(minPrice)) elements.minPrice.value = minPrice;
    if (maxPrice && /^\d+(?:\.\d{1,2})?$/.test(maxPrice)) elements.maxPrice.value = maxPrice;
    state.category = (params.get('category') || '').slice(0, 100);
    state.page = Math.max(1, Math.min(10000, Number.parseInt(params.get('page') || '1', 10) || 1));
  }

  elements.filterToggle?.addEventListener('click', () => {
    const open = !elements.form.classList.contains('is-open');
    elements.form.classList.toggle('is-open', open);
    elements.filterToggle.setAttribute('aria-expanded', String(open));
  });
  elements.form.addEventListener('submit', (event) => event.preventDefault());
  [elements.type, elements.condition, elements.availability, elements.sort].forEach((control) => {
    control.addEventListener('change', () => {
      state.page = 1;
      loadCatalog();
    });
  });
  elements.search.addEventListener('input', () => {
    window.clearTimeout(state.debounce);
    state.debounce = window.setTimeout(() => {
      state.page = 1;
      loadSuggestions();
      loadCatalog();
    }, 320);
  });
  [elements.brand, elements.minPrice, elements.maxPrice].forEach((control) => {
    control.addEventListener('input', () => {
      window.clearTimeout(state.debounce);
      state.debounce = window.setTimeout(() => {
        state.page = 1;
        loadCatalog();
      }, 320);
    });
  });
  elements.categories.addEventListener('click', (event) => {
    const button = event.target.closest('[data-category]');
    if (!button) return;
    state.category = button.dataset.category || '';
    state.page = 1;
    elements.categories.querySelectorAll('[data-category]').forEach((candidate) => {
      const active = candidate === button;
      candidate.classList.toggle('is-active', active);
      candidate.setAttribute('aria-pressed', String(active));
    });
    loadCatalog();
  });
  elements.clear.addEventListener('click', resetFilters);
  elements.emptyClear.addEventListener('click', resetFilters);
  elements.retry.addEventListener('click', () => loadCatalog());
  elements.previous.addEventListener('click', () => {
    if (state.page <= 1) return;
    state.page -= 1;
    loadCatalog();
    document.getElementById('catalogo-tienda')?.scrollIntoView({ behavior: 'smooth' });
  });
  elements.next.addEventListener('click', () => {
    if (state.page >= state.pages) return;
    state.page += 1;
    loadCatalog();
    document.getElementById('catalogo-tienda')?.scrollIntoView({ behavior: 'smooth' });
  });
  elements.grid.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-detail-slug]');
    if (trigger) openDetail(trigger.dataset.detailSlug);
  });
  elements.soldGrid?.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-detail-slug]');
    if (trigger) openDetail(trigger.dataset.detailSlug);
  });
  elements.dialogClose?.addEventListener('click', () => elements.dialog.close());
  elements.dialog?.addEventListener('click', (event) => {
    if (event.target === elements.dialog) elements.dialog.close();
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.store-search-field')) closeSuggestions();
  });
  elements.search.addEventListener('keydown', (event) => {
    const options = Array.from(elements.suggestions?.querySelectorAll('[role="option"]') || []);
    if (event.key === 'Escape') closeSuggestions();
    if (event.key === 'ArrowDown' && options.length) { event.preventDefault(); options[0].focus(); }
  });
  elements.suggestions?.addEventListener('keydown', (event) => {
    const options = Array.from(elements.suggestions.querySelectorAll('[role="option"]'));
    const index = options.indexOf(document.activeElement);
    if (event.key === 'Escape') { closeSuggestions(); elements.search.focus(); }
    if (event.key === 'ArrowDown' && index >= 0) { event.preventDefault(); options[Math.min(options.length - 1, index + 1)]?.focus(); }
    if (event.key === 'ArrowUp' && index >= 0) { event.preventDefault(); if (index === 0) elements.search.focus(); else options[index - 1]?.focus(); }
  });
  elements.showAvailable?.addEventListener('click', () => {
    resetFilters();
    document.getElementById('catalogo-tienda')?.scrollIntoView({ behavior: 'smooth' });
  });

  applyInitialQuery();
  Promise.allSettled([loadCategories(), loadCatalog(), loadSold(), loadPromotionBanner()]);
})();
