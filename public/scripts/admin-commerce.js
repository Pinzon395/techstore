(function () {
  'use strict';

  const ROOT = '/api/admin/commerce';
  const PAGE_SIZE = 20;
  const TYPE_LABELS = {
    EQUIPMENT: 'Equipo',
    HARDWARE: 'Hardware',
    PRODUCT: 'Producto',
    SERVICE: 'Servicio',
    BUNDLE: 'Paquete',
  };
  const STATUS_LABELS = {
    DRAFT: 'Borrador',
    ACTIVE: 'Publicado',
    RESERVED: 'Reservado',
    SOLD: 'Vendido',
    OUT_OF_STOCK: 'Agotado',
    HIDDEN: 'Oculto',
    ARCHIVED: 'Archivado',
  };
  const CONDITION_LABELS = {
    NEW: 'Nuevo',
    USED: 'Usado',
    REFURBISHED: 'Reacondicionado',
    OPEN_BOX: 'Caja abierta',
    FOR_PARTS: 'Para refacciones',
    NOT_APPLICABLE: 'No aplica',
  };

  const root = document.getElementById('view-commerce-store');
  if (!root) return;

  const elements = {
    create: document.getElementById('commerce-create-item'),
    settings: document.getElementById('commerce-open-settings'),
    refresh: document.getElementById('commerce-refresh'),
    filters: document.getElementById('commerce-filters'),
    search: document.getElementById('commerce-search'),
    filterType: document.getElementById('commerce-filter-type'),
    filterStatus: document.getElementById('commerce-filter-status'),
    filterCategory: document.getElementById('commerce-filter-category'),
    filterKind: document.getElementById('commerce-filter-kind'),
    filterBrand: document.getElementById('commerce-filter-brand'),
    filterAvailability: document.getElementById('commerce-filter-availability'),
    filterMinPrice: document.getElementById('commerce-filter-min-price'),
    filterMaxPrice: document.getElementById('commerce-filter-max-price'),
    filterSort: document.getElementById('commerce-filter-sort'),
    clearFilters: document.getElementById('commerce-clear-filters'),
    summary: document.getElementById('commerce-list-summary'),
    tbody: document.getElementById('commerce-items-body'),
    mobileList: document.getElementById('commerce-mobile-list'),
    pagination: document.getElementById('commerce-pagination'),
    pagePrevious: document.getElementById('commerce-page-prev'),
    pageNext: document.getElementById('commerce-page-next'),
    pageLabel: document.getElementById('commerce-page-label'),
    metricTotal: document.getElementById('commerce-metric-total'),
    metricActive: document.getElementById('commerce-metric-active'),
    metricDraft: document.getElementById('commerce-metric-draft'),
    metricUnavailable: document.getElementById('commerce-metric-unavailable'),
    notice: document.getElementById('commerce-notice'),
    itemModal: document.getElementById('commerce-item-modal'),
    itemForm: document.getElementById('commerce-item-form'),
    itemMode: document.getElementById('commerce-item-mode'),
    itemTitle: document.getElementById('commerce-item-modal-title'),
    itemId: document.getElementById('commerce-item-id'),
    itemVersion: document.getElementById('commerce-item-version'),
    itemType: document.getElementById('commerce-item-type'),
    productKindCode: document.getElementById('commerce-product-kind-code'),
    productKind: document.getElementById('commerce-product-kind'),
    productKindOptions: document.getElementById('commerce-product-kind-options'),
    kindDescription: document.getElementById('commerce-kind-description'),
    typeError: document.getElementById('commerce-type-error'),
    stepBack: document.getElementById('commerce-step-back'),
    stepNext: document.getElementById('commerce-step-next'),
    saveItem: document.getElementById('commerce-save-item'),
    formMessage: document.getElementById('commerce-form-message'),
    categories: document.getElementById('commerce-category-options'),
    badges: document.getElementById('commerce-badge-options'),
    attributes: document.getElementById('commerce-attribute-fields'),
    mediaInput: document.getElementById('commerce-media'),
    fileList: document.getElementById('commerce-file-list'),
    existingMedia: document.getElementById('commerce-existing-media'),
    trackStock: document.getElementById('commerce-track-stock'),
    stockFields: document.getElementById('commerce-stock-fields'),
    settingsModal: document.getElementById('commerce-settings-modal'),
    resourceTabs: Array.from(document.querySelectorAll('[data-commerce-resource]')),
    resourceList: document.getElementById('commerce-resource-list'),
    resourceForm: document.getElementById('commerce-resource-form'),
    resourceId: document.getElementById('commerce-resource-id'),
    resourceTitle: document.getElementById('commerce-resource-form-title'),
    resourceFields: document.getElementById('commerce-resource-fields'),
    resourceMessage: document.getElementById('commerce-resource-message'),
    resourceReset: document.getElementById('commerce-resource-reset'),
  };

  const state = {
    initialized: false,
    resourcePromise: null,
    loading: false,
    listRequest: 0,
    page: 1,
    pages: 1,
    debounce: null,
    items: new Map(),
    categories: [],
    badges: [],
    attributes: [],
    productKinds: [],
    step: 1,
    files: [],
    resource: 'categories',
    lastFocused: null,
    modalCleanup: null,
    bundleItems: [],
    bundleCatalog: [],
  };

  function object(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  }

  function first() {
    for (const value of arguments) {
      if (value !== undefined && value !== null && value !== '') return value;
    }
    return null;
  }

  function arrayData(payload) {
    if (Array.isArray(payload?.data)) return payload.data;
    const data = object(payload?.data);
    return [data.items, data.results, data.categories, data.badges, data.attributes, data.kinds, data.productKinds]
      .find(Array.isArray) || [];
  }

  function itemData(payload) {
    const data = payload?.data;
    if (!data || typeof data !== 'object') return null;
    return data.item && typeof data.item === 'object' ? data.item : data;
  }

  function metaData(payload, itemCount) {
    const data = object(payload?.data);
    const meta = Object.keys(object(payload?.meta)).length ? object(payload.meta) : object(data.meta);
    const page = Number(first(meta.page, meta.current_page, state.page)) || 1;
    const pageSize = Number(first(meta.page_size, meta.pageSize, meta.limit, PAGE_SIZE)) || PAGE_SIZE;
    const totalValue = first(meta.total, meta.total_items, meta.count);
    const total = totalValue === null ? null : Number(totalValue);
    const pages = Number(first(meta.pages, meta.total_pages, meta.totalPages)) || (total === null ? (itemCount < pageSize ? page : page + 1) : Math.max(1, Math.ceil(total / pageSize)));
    return { page, pageSize, total, pages };
  }

  async function api(path, options) {
    const config = { credentials: 'include', ...(options || {}) };
    const headers = new Headers(config.headers || {});
    headers.set('Accept', 'application/json');
    if (config.body && typeof config.body === 'string') headers.set('Content-Type', 'application/json');
    if (config.method && config.method !== 'GET') headers.set('X-Requested-With', 'fetch');
    config.headers = headers;
    const response = await fetch(ROOT + path, config);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) {
      const error = object(payload.error);
      const thrown = new Error(String(first(error.message, payload.message, 'No fue posible completar la operación.')));
      thrown.code = first(error.code, 'REQUEST_ERROR');
      thrown.details = error.details;
      throw thrown;
    }
    return payload;
  }

  function node(tag, className, text) {
    const value = document.createElement(tag);
    if (className) value.className = className;
    if (text !== undefined && text !== null) value.textContent = String(text);
    return value;
  }

  function icon(parent, classes) {
    const value = node('i', classes);
    value.setAttribute('aria-hidden', 'true');
    parent.appendChild(value);
  }

  function normalizeItem(raw) {
    const item = object(raw);
    const pricing = object(item.pricing);
    const inventory = object(item.inventory);
    const media = Array.isArray(item.media) ? item.media : [];
    const categories = Array.isArray(item.categories) ? item.categories : [];
    const badges = Array.isArray(item.badges) ? item.badges : [];
    const attributes = Array.isArray(item.attributes) ? item.attributes : [];
    return {
      raw: item,
      id: item.id,
      version: Number(item.version || 1),
      slug: String(item.slug || ''),
      sku: item.sku ? String(item.sku) : '',
      name: String(item.name || 'Publicación sin nombre'),
      shortDescription: String(item.short_description || ''),
      description: String(item.description || ''),
      type: String(item.item_type || 'PRODUCT'),
      productKind: String(item.product_kind_code || ''),
      condition: String(first(item.condition, item.condition_code, 'NOT_APPLICABLE')),
      status: String(item.status || 'DRAFT'),
      brand: String(item.brand || ''),
      model: String(item.model || ''),
      internalCode: String(item.internal_code || ''),
      taxRate: String(item.tax_rate || '0'),
      physicalLocation: String(item.physical_location || ''),
      supplierName: String(item.supplier_name || ''),
      videoUrl: String(item.video_url || ''),
      basePrice: first(pricing.base_price, item.base_price),
      salePrice: first(pricing.sale_price, item.sale_price),
      currency: String(first(pricing.currency, item.currency, 'MXN')),
      cost: first(item.cost_reference, ''),
      trackStock: Boolean(first(inventory.tracked, item.track_stock, false)),
      stock: Number(first(inventory.stock_quantity, item.stock_quantity, 0)) || 0,
      reserved: Number(first(inventory.reserved_quantity, item.reserved_quantity, 0)) || 0,
      minimumStock: Number(first(inventory.minimum_stock, item.minimum_stock, 0)) || 0,
      featured: Boolean(item.featured),
      allowPurchase: Boolean(item.allow_purchase),
      allowQuote: Boolean(item.allow_quote),
      warranty: String(item.warranty_text || ''),
      seoTitle: String(object(item.seo).title || item.seo_title || ''),
      seoDescription: String(object(item.seo).description || item.seo_description || ''),
      seoKeywords: String(object(item.seo).keywords || item.seo_keywords || ''),
      seoCanonical: String(object(item.seo).canonical_url || item.seo_canonical_url || ''),
      soldDisplayMode: String(item.sold_display_mode || 'KEEP_VISIBLE'),
      categories,
      badges,
      attributes,
      media,
    };
  }

  function formatMoney(value, currency) {
    if (value === null || value === undefined || value === '') return 'Por definir';
    const number = Number(value);
    if (!Number.isFinite(number)) return 'Por definir';
    try {
      return new Intl.NumberFormat('es-MX', { style: 'currency', currency: currency || 'MXN' }).format(number);
    } catch (_) {
      return '$' + number.toFixed(2);
    }
  }

  function mediaUrl(item) {
    const primary = item.media.find((entry) => entry && entry.is_primary) || item.media[0];
    const candidate = primary && first(primary.url, primary.path);
    if (!candidate) return '';
    try {
      const parsed = new URL(String(candidate), window.location.origin);
      return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '';
    } catch (_) {
      return '';
    }
  }

  function showNotice(message, type) {
    elements.notice.textContent = String(message);
    elements.notice.classList.toggle('is-error', type === 'error');
    elements.notice.hidden = false;
    window.clearTimeout(showNotice.timer);
    showNotice.timer = window.setTimeout(() => { elements.notice.hidden = true; }, 5000);
  }

  function setTableState(message) {
    const row = document.createElement('tr');
    const cell = node('td', 'commerce-table-state', message);
    cell.colSpan = 6;
    row.appendChild(cell);
    elements.tbody.replaceChildren(row);
    elements.mobileList.replaceChildren(node('p', 'commerce-table-state', message));
  }

  function actionButton(action, item, label, iconClass) {
    const button = node('button');
    button.type = 'button';
    button.dataset.action = action;
    button.dataset.id = String(item.id);
    button.title = label;
    button.setAttribute('aria-label', label + ': ' + item.name);
    icon(button, iconClass);
    return button;
  }

  function createItemCell(item) {
    const wrapper = node('div', 'commerce-item-cell');
    const thumb = node('span', 'commerce-item-thumb');
    const imageUrl = mediaUrl(item);
    if (imageUrl) {
      const image = document.createElement('img');
      image.src = imageUrl;
      image.alt = '';
      image.loading = 'lazy';
      thumb.appendChild(image);
    } else {
      icon(thumb, item.type === 'SERVICE' ? 'fa-solid fa-screwdriver-wrench' : 'fa-solid fa-microchip');
    }
    wrapper.appendChild(thumb);
    const copy = node('span', 'commerce-item-copy');
    copy.appendChild(node('strong', '', item.name));
    copy.appendChild(node('small', '', item.sku || 'Sin SKU'));
    wrapper.appendChild(copy);
    return wrapper;
  }

  function createStatus(item) {
    const badge = node('span', 'commerce-status', STATUS_LABELS[item.status] || item.status);
    badge.dataset.status = item.status;
    return badge;
  }

  function createActions(item) {
    const actions = node('div', 'commerce-row-actions');
    actions.appendChild(actionButton('duplicate', item, 'Duplicar como borrador', 'fa-solid fa-copy'));
    if (item.slug) {
      const preview = document.createElement('a');
      preview.href = '/tienda/' + encodeURIComponent(item.slug);
      preview.target = '_blank'; preview.rel = 'noopener noreferrer'; preview.title = 'Vista previa publica';
      preview.setAttribute('aria-label', 'Vista previa publica: ' + item.name);
      icon(preview, 'fa-solid fa-eye'); actions.appendChild(preview);
    }
    actions.appendChild(actionButton('edit', item, 'Editar publicación', 'fa-solid fa-pen'));
    if (!['ACTIVE', 'ARCHIVED', 'SOLD', 'RESERVED'].includes(item.status)) {
      actions.appendChild(actionButton('publish', item, 'Publicar', 'fa-solid fa-arrow-up-right-from-square'));
    }
    if (item.status !== 'ARCHIVED') {
      actions.appendChild(actionButton('archive', item, 'Archivar', 'fa-solid fa-box-archive'));
    }
    if (['ACTIVE', 'OUT_OF_STOCK'].includes(item.status)) actions.appendChild(actionButton('hide', item, 'Desactivar', 'fa-solid fa-eye-slash'));
    if (['DRAFT', 'ARCHIVED'].includes(item.status)) actions.appendChild(actionButton('delete', item, 'Eliminar', 'fa-solid fa-trash'));
    return actions;
  }

  function renderRows(items) {
    const rows = [];
    const cards = [];
    items.forEach((item) => {
      const row = document.createElement('tr');
      const publication = document.createElement('td');
      publication.appendChild(createItemCell(item));
      row.appendChild(publication);
      row.appendChild(node('td', '', TYPE_LABELS[item.type] || item.type));
      row.appendChild(node('td', '', formatMoney(item.salePrice || item.basePrice, item.currency)));
      row.appendChild(node('td', '', item.trackStock ? String(Math.max(0, item.stock - item.reserved)) : 'No controlado'));
      const status = document.createElement('td');
      status.appendChild(createStatus(item));
      row.appendChild(status);
      const actionCell = document.createElement('td');
      actionCell.appendChild(createActions(item));
      row.appendChild(actionCell);
      rows.push(row);

      const card = node('article', 'commerce-mobile-card');
      card.appendChild(createItemCell(item));
      const meta = node('div', 'commerce-mobile-meta');
      meta.appendChild(node('span', '', (TYPE_LABELS[item.type] || item.type) + ' · ' + formatMoney(item.salePrice || item.basePrice, item.currency)));
      meta.appendChild(createStatus(item));
      card.appendChild(meta);
      card.appendChild(createActions(item));
      cards.push(card);
    });
    elements.tbody.replaceChildren(...rows);
    elements.mobileList.replaceChildren(...cards);
  }

  function currentListQuery(overrides) {
    const query = new URLSearchParams({ page: String(state.page), pageSize: String(PAGE_SIZE), sort: elements.filterSort.value || 'newest' });
    const values = {
      q: elements.search.value.trim(),
      type: elements.filterType.value,
      status: elements.filterStatus.value,
      category: elements.filterCategory.value,
      productKind: elements.filterKind.value,
      brand: elements.filterBrand.value.trim(),
      availability: elements.filterAvailability.value,
      minPrice: elements.filterMinPrice.value,
      maxPrice: elements.filterMaxPrice.value,
      ...(overrides || {}),
    };
    Object.entries(values).forEach(([key, value]) => {
      if (value) query.set(key, String(value));
      else query.delete(key);
    });
    return query;
  }

  async function loadItems() {
    const requestId = ++state.listRequest;
    state.loading = true;
    elements.refresh.disabled = true;
    elements.summary.textContent = 'Consultando publicaciones…';
    setTableState('Cargando publicaciones…');
    try {
      const payload = await api('/catalog?' + currentListQuery().toString());
      if (requestId !== state.listRequest) return;
      const items = arrayData(payload).map(normalizeItem);
      const meta = metaData(payload, items.length);
      state.items = new Map(items.map((item) => [String(item.id), item]));
      state.page = meta.page;
      state.pages = meta.pages;
      if (items.length) renderRows(items);
      else setTableState('No hay publicaciones con estos filtros.');
      const total = meta.total === null ? items.length : meta.total;
      elements.summary.textContent = total + (total === 1 ? ' publicación' : ' publicaciones');
      elements.pageLabel.textContent = 'Página ' + state.page + ' de ' + state.pages;
      elements.pagePrevious.disabled = state.page <= 1;
      elements.pageNext.disabled = state.page >= state.pages;
      elements.pagination.hidden = state.pages <= 1;
    } catch (error) {
      if (requestId !== state.listRequest) return;
      setTableState(error.message || 'No se pudo consultar el catálogo.');
      elements.summary.textContent = 'Error al consultar el catálogo';
      showNotice(error.message, 'error');
    } finally {
      if (requestId === state.listRequest) {
        state.loading = false;
        elements.refresh.disabled = false;
      }
    }
  }

  async function countFor(status) {
    const query = new URLSearchParams({ page: '1', pageSize: '1', sort: 'newest' });
    if (status) query.set('status', status);
    const payload = await api('/catalog?' + query.toString());
    return metaData(payload, arrayData(payload).length).total || 0;
  }

  async function loadMetrics() {
    try {
      const [total, active, draft, reserved, sold, out] = await Promise.all([
        countFor(''), countFor('ACTIVE'), countFor('DRAFT'), countFor('RESERVED'), countFor('SOLD'), countFor('OUT_OF_STOCK'),
      ]);
      elements.metricTotal.textContent = String(total);
      elements.metricActive.textContent = String(active);
      elements.metricDraft.textContent = String(draft);
      elements.metricUnavailable.textContent = String(reserved + sold + out);
    } catch (_) {
      [elements.metricTotal, elements.metricActive, elements.metricDraft, elements.metricUnavailable]
        .forEach((target) => { target.textContent = '—'; });
    }
  }

  async function loadResources() {
    const resources = await Promise.allSettled([
      api('/categories'), api('/badges'), api('/attribute-definitions'), api('/product-kinds'),
    ]);
    const value = (index) => resources[index]?.status === 'fulfilled' ? resources[index].value : null;
    state.categories = arrayData(value(0));
    state.badges = arrayData(value(1));
    state.attributes = arrayData(value(2));
    state.productKinds = arrayData(value(3));
    if (!state.productKinds.length) {
      elements.productKind.replaceChildren(new Option('No hay tipos disponibles; revisa permisos o migraciones', ''));
      elements.productKind.disabled = true;
      throw new Error('No se pudieron cargar los tipos de producto. Verifica permisos y migraciones de Commerce.');
    }
    elements.productKind.disabled = false;
    const kindOptions = [new Option('Todos', '')];
    const formKindOptions = [new Option('Selecciona el artículo que vas a administrar', '')];
    state.productKinds.forEach((kind) => {
      kindOptions.push(new Option(kind.name, kind.code));
      formKindOptions.push(new Option(kind.name, kind.code));
    });
    elements.filterKind.replaceChildren(...kindOptions);
    elements.productKind.replaceChildren(...formKindOptions);
    if (elements.productKindOptions) {
      elements.productKindOptions.replaceChildren(...state.productKinds.map((kind) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'commerce-kind-option';
        button.dataset.productKind = kind.code;
        button.setAttribute('role', 'option');
        button.setAttribute('aria-selected', 'false');
        const iconName = String(kind.icon || 'fa-box').replace(/[^a-z0-9-]/gi, '');
        const icon = document.createElement('i');
        icon.className = 'fa-solid ' + iconName;
        icon.setAttribute('aria-hidden', 'true');
        const title = document.createElement('strong');
        title.textContent = kind.name;
        const description = document.createElement('span');
        description.textContent = kind.description || 'Especificaciones adaptadas';
        button.append(icon, title, description);
        button.addEventListener('click', () => {
          elements.productKind.value = kind.code;
          selectProductKind(kind.code);
        });
        return button;
      }));
    }
    renderFilterCategories();
    renderRelations();
  }

  function sortedCategories() {
    const byParent = new Map();
    state.categories.forEach((category) => {
      const parent = String(category.parent_id || 'root');
      if (!byParent.has(parent)) byParent.set(parent, []);
      byParent.get(parent).push(category);
    });
    const output = [];
    const visit = (parent, depth, seen) => {
      const children = (byParent.get(String(parent)) || []).slice().sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0) || String(a.name).localeCompare(String(b.name), 'es'));
      children.forEach((category) => {
        if (seen.has(String(category.id))) return;
        const next = new Set(seen).add(String(category.id));
        output.push({ ...category, depth });
        visit(category.id, depth + 1, next);
      });
    };
    visit('root', 0, new Set());
    state.categories.forEach((category) => {
      if (!output.some((entry) => String(entry.id) === String(category.id))) output.push({ ...category, depth: 0 });
    });
    return output;
  }

  function renderFilterCategories() {
    const selected = elements.filterCategory.value;
    const options = [new Option('Todas', '')];
    sortedCategories().filter((category) => category.status !== 'ARCHIVED').forEach((category) => {
      options.push(new Option('— '.repeat(category.depth) + category.name, category.slug));
    });
    elements.filterCategory.replaceChildren(...options);
    if (Array.from(elements.filterCategory.options).some((option) => option.value === selected)) elements.filterCategory.value = selected;
  }

  function checkOption(name, value, label) {
    const wrapper = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.name = name;
    input.value = String(value);
    wrapper.appendChild(input);
    wrapper.appendChild(document.createTextNode(label));
    return wrapper;
  }

  function attributeControl(definition) {
    const label = document.createElement('label');
    const unit = definition.unit ? ' (' + definition.unit + ')' : '';
    label.appendChild(document.createTextNode(String(definition.label || definition.attribute_key || 'Atributo') + unit));
    let input;
    if (definition.data_type === 'BOOLEAN') {
      input = document.createElement('select');
      input.append(new Option('Sin especificar', ''), new Option('Sí', 'true'), new Option('No', 'false'));
    } else {
      input = document.createElement('input');
      input.type = ['INTEGER', 'DECIMAL'].includes(definition.data_type) ? 'number' : definition.data_type === 'DATE' ? 'date' : 'text';
      if (definition.data_type === 'INTEGER') input.step = '1';
      if (definition.data_type === 'DECIMAL') input.step = 'any';
    }
    input.dataset.attributeId = String(definition.id);
    input.dataset.attributeType = String(definition.data_type || 'TEXT');
    input.dataset.attributeRequired = String(Boolean(definition.required));
    input.required = Boolean(definition.required);
    label.appendChild(input);
    return label;
  }

  function currentAttributeValues() {
    return new Map(Array.from(elements.attributes.querySelectorAll('[data-attribute-id]')).map((input) => [
      input.dataset.attributeId,
      input.value,
    ]));
  }

  function applicableAttributeDefinitions() {
    const categoryIds = new Set(checkedIds('category_ids').map(String));
    const associatedIds = new Set();
    state.categories.forEach((category) => {
      if (!categoryIds.has(String(category.id))) return;
      const associations = Array.isArray(category.attributes) ? category.attributes : [];
      associations.forEach((association) => associatedIds.add(String(first(
        association.definition_id,
        association.attribute_definition_id,
        association.id
      ))));
    });
    const kind = state.productKinds.find((entry) => entry.code === elements.productKindCode.value);
    const kindAttributes = Array.isArray(kind?.attributes) ? kind.attributes : [];
    const kindById = new Map(kindAttributes.map((attribute) => [String(first(attribute.id, attribute.definition_id)), attribute]));
    return state.attributes.filter((attribute) => (
      attribute.status === 'ACTIVE'
      && (Boolean(attribute.required) || associatedIds.has(String(attribute.id)) || kindById.has(String(attribute.id)))
    )).map((attribute) => ({ ...attribute, ...(kindById.get(String(attribute.id)) || {}) }));
  }

  function renderAttributeControls({ preserve = true } = {}) {
    const values = preserve ? currentAttributeValues() : new Map();
    const definitions = applicableAttributeDefinitions();
    const sections = new Map();
    definitions.forEach((definition) => {
      const section = definition.section || 'Especificaciones adicionales';
      if (!sections.has(section)) sections.set(section, []);
      sections.get(section).push(definition);
    });
    const attributeNodes = [...sections.entries()].map(([section, entries]) => {
      const group = node('section', 'commerce-attribute-section');
      group.appendChild(node('h4', '', section));
      const grid = node('div', 'commerce-attribute-section-grid');
      entries.forEach((entry) => grid.appendChild(attributeControl(entry)));
      group.appendChild(grid);
      return group;
    });
    elements.attributes.replaceChildren(...(attributeNodes.length
      ? attributeNodes
      : [node('p', '', 'Asocia atributos a la categoría desde Configurar catálogo.')]
    ));
    elements.attributes.querySelectorAll('[data-attribute-id]').forEach((input) => {
      if (values.has(input.dataset.attributeId)) input.value = values.get(input.dataset.attributeId);
    });
  }

  function renderRelations() {
    const categoryNodes = sortedCategories()
      .filter((category) => category.status !== 'ARCHIVED')
      .map((category) => checkOption('category_ids', category.id, '— '.repeat(category.depth) + category.name));
    elements.categories.replaceChildren(...(categoryNodes.length ? categoryNodes : [node('p', '', 'Crea una categoría desde Configurar catálogo.') ]));
    const badgeNodes = state.badges
      .filter((badge) => badge.status !== 'ARCHIVED')
      .map((badge) => checkOption('badge_ids', badge.id, badge.label));
    elements.badges.replaceChildren(...(badgeNodes.length ? badgeNodes : [node('p', '', 'No hay etiquetas configuradas.') ]));
    renderAttributeControls();
  }

  function openModal(modal, trigger) {
    state.lastFocused = trigger || document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event) => {
      if (event.key !== 'Tab') return;
      const focusable = Array.from(modal.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'))
        .filter((entry) => !entry.hidden && entry.getClientRects().length > 0);
      if (!focusable.length) return;
      const firstFocusable = focusable[0];
      const lastFocusable = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable.focus();
      } else if (!event.shiftKey && document.activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable.focus();
      }
    };
    modal.addEventListener('keydown', onKeyDown);
    state.modalCleanup = () => modal.removeEventListener('keydown', onKeyDown);
    requestAnimationFrame(() => modal.querySelector('button, input, select, textarea, a')?.focus());
  }

  function closeModal(modal) {
    state.modalCleanup?.();
    state.modalCleanup = null;
    modal.hidden = true;
    if (elements.itemModal.hidden && elements.settingsModal.hidden) document.body.style.overflow = '';
    if (state.lastFocused && typeof state.lastFocused.focus === 'function') state.lastFocused.focus();
  }

  function setStep(nextStep) {
    state.step = Math.max(1, Math.min(6, nextStep));
    root.querySelectorAll('[data-commerce-step]').forEach((panel) => {
      const active = Number(panel.dataset.commerceStep) === state.step;
      panel.hidden = !active;
      panel.classList.toggle('is-active', active);
    });
    root.querySelectorAll('[data-commerce-step-indicator]').forEach((indicator) => {
      const step = Number(indicator.dataset.commerceStepIndicator);
      indicator.classList.toggle('is-active', step === state.step);
      indicator.classList.toggle('is-complete', step < state.step);
    });
    elements.stepBack.hidden = state.step === 1;
    elements.stepNext.hidden = state.step === 6;
    elements.saveItem.hidden = state.step !== 6;
    const titles = ['¿Qué deseas publicar?', 'Información comercial', 'Precio y rentabilidad', 'Inventario y composición', 'Multimedia y SEO', 'Vista previa'];
    elements.itemTitle.textContent = titles[state.step - 1];
    if (state.step === 6) updateItemPreview();
  }

  function clearForm() {
    elements.itemForm.reset();
    elements.itemId.value = '';
    elements.itemVersion.value = '';
    elements.itemType.value = '';
    elements.productKindCode.value = '';
    elements.productKind.value = '';
    elements.formMessage.hidden = true;
    elements.typeError.hidden = true;
    state.files = [];
    state.bundleItems = [];
    elements.fileList.replaceChildren();
    elements.existingMedia.replaceChildren();
    root.querySelectorAll('[data-commerce-type]').forEach((button) => button.classList.remove('is-selected'));
    renderRelations();
    elements.trackStock.checked = true;
    syncStockFields();
    renderBundleBuilder();
    setStep(1);
  }

  function selectType(type) {
    elements.itemType.value = type;
    elements.typeError.hidden = true;
    root.querySelectorAll('[data-commerce-type]').forEach((button) => {
      button.classList.toggle('is-selected', button.dataset.commerceType === type);
      button.setAttribute('aria-pressed', String(button.dataset.commerceType === type));
    });
    if (type === 'SERVICE') {
      document.getElementById('commerce-condition').value = 'NOT_APPLICABLE';
      elements.trackStock.checked = false;
      syncStockFields();
    }
    document.getElementById('commerce-bundle-builder').hidden = type !== 'BUNDLE';
    if (type === 'BUNDLE') loadBundleCatalog();
  }

  function selectProductKind(code) {
    const kind = state.productKinds.find((entry) => entry.code === code);
    elements.productKindOptions?.querySelectorAll('[data-product-kind]').forEach((button) => {
      const selected = button.dataset.productKind === code;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-selected', String(selected));
    });
    elements.productKindCode.value = kind?.code || '';
    elements.kindDescription.textContent = kind?.description || 'El formulario mostrará únicamente las especificaciones relacionadas con el producto.';
    selectType(kind?.item_type || '');
    renderAttributeControls();
  }

  async function loadBundleCatalog() {
    try {
      const payload = await api('/catalog?page=1&pageSize=100&sort=name');
      const currentId = Number(elements.itemId.value || 0);
      state.bundleCatalog = arrayData(payload).map(normalizeItem).filter((item) => item.id !== currentId && item.type !== 'BUNDLE');
      const select = document.getElementById('commerce-bundle-component');
      select.replaceChildren(new Option('Selecciona un componente', ''));
      state.bundleCatalog.forEach((item) => select.appendChild(new Option(item.name + ' · ' + formatMoney(item.salePrice || item.basePrice, item.currency), String(item.id))));
      renderBundleBuilder();
    } catch (error) { showFormError(error.message); }
  }

  function renderBundleBuilder() {
    const list = document.getElementById('commerce-bundle-list');
    if (!list) return;
    list.replaceChildren();
    let normal = 0;
    state.bundleItems.forEach((entry, index) => {
      const item = state.bundleCatalog.find((candidate) => Number(candidate.id) === Number(entry.catalog_item_id));
      const row = node('div', 'commerce-bundle-row');
      row.append(node('span', '', entry.quantity + ' × ' + (item?.name || 'Artículo #' + entry.catalog_item_id)), node('strong', '', item ? formatMoney((item.salePrice || item.basePrice) * entry.quantity, item.currency) : ''));
      const remove = node('button', '', 'Eliminar'); remove.type = 'button'; remove.addEventListener('click', () => { state.bundleItems.splice(index, 1); renderBundleBuilder(); }); row.appendChild(remove); list.appendChild(row);
      if (item) normal += Number(item.salePrice || item.basePrice || 0) * entry.quantity;
    });
    const packagePrice = Number(document.getElementById('commerce-sale-price').value || document.getElementById('commerce-base-price').value || 0);
    const currency = document.getElementById('commerce-currency').value || 'MXN';
    document.getElementById('commerce-bundle-normal').textContent = formatMoney(normal, currency);
    document.getElementById('commerce-bundle-price').textContent = formatMoney(packagePrice, currency);
    document.getElementById('commerce-bundle-saving').textContent = formatMoney(Math.max(0, normal - packagePrice), currency);
  }

  async function loadExistingBundle(itemId) {
    try {
      const payload = await api('/catalog/' + encodeURIComponent(itemId) + '/bundle-items');
      state.bundleItems = arrayData(payload).map((entry) => ({ catalog_item_id: Number(entry.catalog_item_id), quantity: Number(entry.quantity) }));
      await loadBundleCatalog();
    } catch (_) { state.bundleItems = []; renderBundleBuilder(); }
  }

  function syncStockFields() {
    elements.stockFields.hidden = !elements.trackStock.checked;
  }

  function updateProfitPreview() {
    const cost = Number(document.getElementById('commerce-cost').value || 0);
    const base = Number(document.getElementById('commerce-base-price').value || 0);
    const saleRaw = document.getElementById('commerce-sale-price').value;
    const sale = saleRaw === '' ? base : Number(saleRaw || 0);
    const currency = document.getElementById('commerce-currency').value || 'MXN';
    const profit = sale - cost;
    const margin = sale > 0 ? (profit / sale) * 100 : 0;
    document.getElementById('commerce-profit-cost').textContent = formatMoney(cost, currency);
    document.getElementById('commerce-profit-sale').textContent = formatMoney(sale, currency);
    document.getElementById('commerce-profit-amount').textContent = formatMoney(profit, currency);
    document.getElementById('commerce-profit-margin').textContent = margin.toFixed(1) + '%';
  }

  function updateItemPreview() {
    const base = Number(document.getElementById('commerce-base-price').value || 0);
    const saleRaw = document.getElementById('commerce-sale-price').value;
    const sale = saleRaw === '' ? base : Number(saleRaw || 0);
    const currency = document.getElementById('commerce-currency').value || 'MXN';
    const tracksStock = elements.trackStock.checked;
    document.getElementById('commerce-preview-name').textContent = document.getElementById('commerce-name').value.trim() || 'Nueva publicación';
    document.getElementById('commerce-preview-type').textContent = elements.itemType.value || '—';
    document.getElementById('commerce-preview-price').textContent = formatMoney(sale, currency) + (sale < base ? ' · antes ' + formatMoney(base, currency) : '');
    document.getElementById('commerce-preview-stock').textContent = tracksStock ? document.getElementById('commerce-stock').value + ' disponibles' : 'Sin inventario físico';
    document.getElementById('commerce-preview-purchase').textContent = document.getElementById('commerce-allow-purchase').checked ? 'Compra habilitada' : 'Sólo consulta/cotización';
    document.getElementById('commerce-preview-description').textContent = document.getElementById('commerce-short-description').value.trim() || 'Sin descripción corta.';
  }

  function validateCurrentStep() {
    elements.formMessage.hidden = true;
    if (state.step === 1 && !elements.itemType.value) {
      elements.typeError.hidden = false;
      elements.productKind.focus();
      return false;
    }
    if (state.step === 2) {
      const required = [document.getElementById('commerce-name')];
      for (const field of required) {
        if (!field.checkValidity()) {
          field.reportValidity();
          return false;
        }
      }
      if (!checkedIds('category_ids').length) {
        showFormError('Selecciona al menos una categoría.');
        elements.categories.querySelector('input')?.focus();
        return false;
      }
      const missingAttribute = elements.attributes.querySelector('[data-attribute-required="true"]:invalid, [data-attribute-required="true"][value=""]');
      if (missingAttribute) {
        showFormError('Completa las especificaciones obligatorias del tipo de producto.');
        missingAttribute.focus();
        return false;
      }
    }
    if (state.step === 3) {
      const price = document.getElementById('commerce-base-price');
      if (!price.checkValidity()) { price.reportValidity(); return false; }
      const base = Number(price.value);
      const saleRaw = document.getElementById('commerce-sale-price').value;
      if (saleRaw !== '' && Number(saleRaw) > base) {
        showFormError('El precio promocional no puede ser mayor al precio normal.');
        return false;
      }
    }
    if (state.step === 4 && elements.trackStock.checked) {
      const stock = document.getElementById('commerce-stock');
      if (!stock.checkValidity()) { stock.reportValidity(); return false; }
    }
    if (state.step === 4 && elements.itemType.value === 'BUNDLE' && !state.bundleItems.length) {
      showFormError('Agrega al menos un componente al paquete.');
      document.getElementById('commerce-bundle-component').focus();
      return false;
    }
    return true;
  }

  function checkedIds(name) {
    return Array.from(elements.itemForm.querySelectorAll('input[name="' + name + '"]:checked')).map((input) => Number(input.value));
  }

  function attributeValues() {
    return Array.from(elements.attributes.querySelectorAll('[data-attribute-id]')).flatMap((input, index) => {
      if (input.value === '') return [];
      let value = input.value;
      if (input.dataset.attributeType === 'BOOLEAN') value = input.value === 'true';
      if (input.dataset.attributeType === 'JSON') {
        try { value = JSON.parse(input.value); } catch (_) { value = input.value; }
      }
      return [{ definition_id: Number(input.dataset.attributeId), value, sort_order: index }];
    });
  }

  function optionalValue(id) {
    const value = document.getElementById(id).value.trim();
    return value === '' ? null : value;
  }

  function itemPayload() {
    return {
      name: document.getElementById('commerce-name').value.trim(),
      sku: optionalValue('commerce-sku'),
      internal_code: optionalValue('commerce-internal-code'),
      brand: optionalValue('commerce-brand'),
      model: optionalValue('commerce-model'),
      short_description: optionalValue('commerce-short-description'),
      description: optionalValue('commerce-description'),
      item_type: elements.itemType.value,
      product_kind_code: elements.productKindCode.value || null,
      condition_code: document.getElementById('commerce-condition').value,
      currency: document.getElementById('commerce-currency').value,
      tax_rate: document.getElementById('commerce-tax-rate').value || '0',
      base_price: document.getElementById('commerce-base-price').value,
      sale_price: optionalValue('commerce-sale-price'),
      cost_reference: optionalValue('commerce-cost'),
      warranty_text: optionalValue('commerce-warranty'),
      track_stock: elements.trackStock.checked,
      stock_quantity: elements.trackStock.checked ? Number(document.getElementById('commerce-stock').value || 0) : 0,
      minimum_stock: elements.trackStock.checked ? Number(document.getElementById('commerce-minimum-stock').value || 0) : 0,
      physical_location: optionalValue('commerce-location'),
      supplier_name: optionalValue('commerce-supplier'),
      featured: document.getElementById('commerce-featured').checked,
      allow_purchase: document.getElementById('commerce-allow-purchase').checked,
      allow_quote: document.getElementById('commerce-allow-quote').checked,
      seo_title: optionalValue('commerce-seo-title'),
      seo_description: optionalValue('commerce-seo-description'),
      seo_keywords: optionalValue('commerce-seo-keywords'),
      video_url: optionalValue('commerce-video-url'),
      seo_canonical_url: optionalValue('commerce-seo-canonical'),
      sold_display_mode: document.getElementById('commerce-sold-display').value,
    };
  }

  function showFormError(message) {
    elements.formMessage.textContent = String(message);
    elements.formMessage.hidden = false;
    elements.formMessage.scrollIntoView({ block: 'nearest' });
  }

  async function uploadFiles(itemId, itemName) {
    let hasPrimary = Boolean(elements.existingMedia.querySelector('[data-media-primary="true"]'));
    const existingSortOrders = Array.from(elements.existingMedia.querySelectorAll('[data-media-sort-order]'))
      .map((entry) => Number(entry.dataset.mediaSortOrder))
      .filter(Number.isFinite);
    const sortOffset = existingSortOrders.length ? Math.max(...existingSortOrders) + 1 : 0;
    for (let index = 0; index < state.files.length; index += 1) {
      const file = state.files[index];
      const makePrimary = !hasPrimary && index === 0;
      await api('/catalog/' + encodeURIComponent(itemId) + '/media', {
        method: 'POST',
        headers: {
          'Content-Type': file.type,
          'X-Requested-With': 'fetch',
          'X-Alt-Text': itemName,
          'X-Sort-Order': String(sortOffset + index),
          'X-Is-Primary': makePrimary ? 'true' : 'false',
        },
        body: file,
      });
      if (makePrimary) hasPrimary = true;
    }
  }

  async function saveItem(event) {
    event.preventDefault();
    if (!validateCurrentStep()) return;
    const categoryIds = checkedIds('category_ids');
    if (!categoryIds.length) {
      setStep(3);
      showFormError('Selecciona al menos una categoría.');
      return;
    }
    if (elements.itemType.value === 'BUNDLE' && !state.bundleItems.length) {
      setStep(3);
      showFormError('Agrega al menos un componente al paquete.');
      return;
    }
    elements.saveItem.disabled = true;
    elements.saveItem.textContent = 'Guardando…';
    elements.formMessage.hidden = true;
    try {
      const existingId = elements.itemId.value;
      const core = itemPayload();
      let saved;
      if (existingId) {
        const payload = {
          ...core,
          version: Number(elements.itemVersion.value),
          category_ids: categoryIds,
          badge_ids: checkedIds('badge_ids'),
          attributes: attributeValues(),
        };
        const response = await api('/catalog/' + encodeURIComponent(existingId), { method: 'PATCH', body: JSON.stringify(payload) });
        saved = itemData(response);
      } else {
        const response = await api('/catalog', {
          method: 'POST',
          body: JSON.stringify({ ...core, category_ids: categoryIds, badge_ids: checkedIds('badge_ids'), attributes: attributeValues() }),
        });
        saved = itemData(response);
      }
      const itemId = first(saved?.id, existingId);
      if (itemId) {
        elements.itemId.value = String(itemId);
        elements.itemVersion.value = String(saved?.version || elements.itemVersion.value || 1);
      }
      if (itemId && state.files.length) {
        try {
          await uploadFiles(itemId, core.name);
        } catch (mediaError) {
          state.files = [];
          elements.fileList.replaceChildren();
          const refreshed = await api('/catalog/' + encodeURIComponent(itemId));
          const refreshedItem = normalizeItem(itemData(refreshed));
          elements.itemVersion.value = String(refreshedItem.version);
          renderExistingMedia(refreshedItem);
          throw new Error('La publicación quedó guardada, pero una imagen no pudo cargarse. Vuelve a seleccionar únicamente las imágenes pendientes. ' + mediaError.message);
        }
      }
      if (itemId && core.item_type === 'BUNDLE') {
        await api('/catalog/' + encodeURIComponent(itemId) + '/bundle-items', {
          method: 'PUT',
          body: JSON.stringify({ items: state.bundleItems }),
        });
      }
      closeModal(elements.itemModal);
      await Promise.all([loadItems(), loadMetrics()]);
      showNotice(existingId ? 'Publicación actualizada.' : 'Borrador creado correctamente.');
    } catch (error) {
      showFormError(error.message || 'No fue posible guardar la publicación.');
      if (error.code === 'CONFLICT' && elements.itemId.value) {
        showFormError('Otra persona modificó esta publicación. Cierra el formulario y vuelve a abrirla para evitar sobrescribir cambios.');
      }
    } finally {
      elements.saveItem.disabled = false;
      elements.saveItem.textContent = elements.itemId.value ? 'Guardar cambios' : 'Guardar borrador';
    }
  }

  function renderExistingMedia(item) {
    const figures = item.media.map((media) => {
      const figure = document.createElement('figure');
      figure.dataset.mediaId = String(media.id);
      figure.dataset.mediaPrimary = String(Boolean(media.is_primary));
      figure.dataset.mediaSortOrder = String(Number(media.sort_order || 0));
      const image = document.createElement('img');
      image.src = String(media.url || '');
      image.alt = String(media.alt_text || item.name);
      figure.appendChild(image);
      const fields = document.createElement('div');
      fields.className = 'commerce-media-fields';
      const altLabel = document.createElement('label');
      altLabel.appendChild(document.createTextNode('Texto alternativo'));
      const alt = document.createElement('input');
      alt.type = 'text';
      alt.maxLength = 255;
      alt.value = String(media.alt_text || item.name);
      alt.dataset.mediaAlt = '';
      altLabel.appendChild(alt);
      const orderLabel = document.createElement('label');
      orderLabel.appendChild(document.createTextNode('Orden'));
      const order = document.createElement('input');
      order.type = 'number';
      order.min = '-32768';
      order.max = '32767';
      order.value = String(Number(media.sort_order || 0));
      order.dataset.mediaOrder = '';
      orderLabel.appendChild(order);
      const primaryLabel = document.createElement('label');
      primaryLabel.className = 'commerce-resource-check';
      const primary = document.createElement('input');
      primary.type = 'radio';
      primary.name = 'commerce-primary-media';
      primary.checked = Boolean(media.is_primary);
      primary.dataset.mediaPrimaryInput = '';
      primaryLabel.append(primary, document.createTextNode('Imagen principal'));
      fields.append(altLabel, orderLabel, primaryLabel);
      figure.appendChild(fields);
      const actions = document.createElement('div');
      actions.className = 'commerce-media-actions';
      const save = document.createElement('button');
      save.type = 'button';
      save.dataset.mediaAction = 'save';
      save.setAttribute('aria-label', 'Guardar datos de la imagen');
      icon(save, 'fa-solid fa-floppy-disk');
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.dataset.mediaAction = 'remove';
      remove.setAttribute('aria-label', 'Eliminar imagen');
      icon(remove, 'fa-solid fa-trash');
      actions.append(save, remove);
      figure.appendChild(actions);
      return figure;
    });
    elements.existingMedia.replaceChildren(...figures);
  }

  function populateItem(item) {
    clearForm();
    elements.itemMode.textContent = 'Editar publicación';
    elements.itemId.value = String(item.id);
    elements.itemVersion.value = String(item.version);
    elements.productKind.value = item.productKind;
    if (item.productKind) selectProductKind(item.productKind);
    else selectType(item.type);
    document.getElementById('commerce-name').value = item.name;
    document.getElementById('commerce-sku').value = item.sku;
    document.getElementById('commerce-internal-code').value = item.internalCode;
    document.getElementById('commerce-brand').value = item.brand;
    document.getElementById('commerce-model').value = item.model;
    document.getElementById('commerce-short-description').value = item.shortDescription;
    document.getElementById('commerce-description').value = item.description;
    document.getElementById('commerce-condition').value = item.condition;
    document.getElementById('commerce-currency').value = item.currency;
    document.getElementById('commerce-tax-rate').value = item.taxRate;
    document.getElementById('commerce-base-price').value = item.basePrice ?? '';
    document.getElementById('commerce-sale-price').value = item.salePrice ?? '';
    document.getElementById('commerce-cost').value = item.cost ?? '';
    document.getElementById('commerce-warranty').value = item.warranty;
    elements.trackStock.checked = item.trackStock;
    document.getElementById('commerce-stock').value = String(item.stock);
    document.getElementById('commerce-minimum-stock').value = String(item.minimumStock);
    document.getElementById('commerce-location').value = item.physicalLocation;
    document.getElementById('commerce-supplier').value = item.supplierName;
    document.getElementById('commerce-featured').checked = item.featured;
    document.getElementById('commerce-allow-purchase').checked = item.allowPurchase;
    document.getElementById('commerce-allow-quote').checked = item.allowQuote;
    document.getElementById('commerce-seo-title').value = item.seoTitle;
    document.getElementById('commerce-seo-description').value = item.seoDescription;
    document.getElementById('commerce-seo-keywords').value = item.seoKeywords;
    document.getElementById('commerce-video-url').value = item.videoUrl;
    document.getElementById('commerce-seo-canonical').value = item.seoCanonical;
    document.getElementById('commerce-sold-display').value = item.soldDisplayMode;
    const categorySet = new Set(item.categories.map((category) => String(category.id)));
    elements.categories.querySelectorAll('input[name="category_ids"]').forEach((input) => { input.checked = categorySet.has(input.value); });
    renderAttributeControls({ preserve: false });
    const badgeSet = new Set(item.badges.map((badge) => String(badge.id)));
    elements.badges.querySelectorAll('input[name="badge_ids"]').forEach((input) => { input.checked = badgeSet.has(input.value); });
    const values = new Map(item.attributes.map((attribute) => [String(first(attribute.definition_id, attribute.id)), attribute.value]));
    elements.attributes.querySelectorAll('[data-attribute-id]').forEach((input) => {
      const value = values.get(input.dataset.attributeId);
      input.value = value === undefined || value === null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
    });
    renderExistingMedia(item);
    syncStockFields();
    updateProfitPreview();
    if (item.type === 'BUNDLE') loadExistingBundle(item.id);
    setStep(2);
    elements.saveItem.textContent = 'Guardar cambios';
  }

  async function editItem(id, trigger) {
    try {
      const payload = await api('/catalog/' + encodeURIComponent(id));
      const item = normalizeItem(itemData(payload));
      populateItem(item);
      openModal(elements.itemModal, trigger);
    } catch (error) {
      showNotice(error.message, 'error');
    }
  }

  async function publishItem(id) {
    if (!window.confirm('¿Publicar esta entrada en la tienda? Se hará visible inmediatamente.')) return;
    try {
      await api('/catalog/' + encodeURIComponent(id) + '/publish', { method: 'POST' });
      await Promise.all([loadItems(), loadMetrics()]);
      showNotice('Publicación visible en la tienda.');
    } catch (error) {
      showNotice(error.message, 'error');
    }
  }

  async function archiveItem(id) {
    if (!window.confirm('¿Archivar esta publicación? Se conservará el historial y dejará de estar disponible públicamente.')) return;
    try {
      await api('/catalog/' + encodeURIComponent(id) + '/archive', { method: 'POST' });
      await Promise.all([loadItems(), loadMetrics()]);
      showNotice('Publicación archivada.');
    } catch (error) {
      showNotice(error.message, 'error');
    }
  }

  async function duplicateItem(id) {
    if (!window.confirm('¿Crear una copia en borrador? El stock y las imágenes no se duplicarán para evitar datos incorrectos.')) return;
    try {
      await api('/catalog/' + encodeURIComponent(id) + '/duplicate', { method: 'POST' });
      await Promise.all([loadItems(), loadMetrics()]);
      showNotice('Copia creada como borrador.');
    } catch (error) { showNotice(error.message, 'error'); }
  }

  async function hideItem(id) {
    if (!window.confirm('¿Desactivar esta publicación? Dejará de aceptar compras.')) return;
    try {
      await api('/catalog/' + encodeURIComponent(id) + '/hide', { method: 'POST' });
      await Promise.all([loadItems(), loadMetrics()]);
      showNotice('Publicación desactivada.');
    } catch (error) { showNotice(error.message, 'error'); }
  }

  async function deleteItem(id) {
    if (!window.confirm('¿Eliminar esta publicación? Solo se permite en borradores o archivados y la auditoría se conservará.')) return;
    try {
      await api('/catalog/' + encodeURIComponent(id), { method: 'DELETE' });
      await Promise.all([loadItems(), loadMetrics()]);
      showNotice('Publicación eliminada.');
    } catch (error) { showNotice(error.message, 'error'); }
  }

  function resourceConfig() {
    if (state.resource === 'badges') {
      return {
        path: '/badges',
        singular: 'etiqueta',
        label: (entry) => entry.label,
        secondary: (entry) => first(entry.badge_key, entry.key, ''),
      };
    }
    if (state.resource === 'attributes') {
      return {
        path: '/attribute-definitions',
        singular: 'atributo',
        label: (entry) => entry.label,
        secondary: (entry) => first(entry.attribute_key, entry.key, entry.data_type, ''),
      };
    }
    return {
      path: '/categories',
      singular: 'categoría',
      label: (entry) => entry.name,
      secondary: (entry) => entry.slug,
    };
  }

  function resourceCollection() {
    if (state.resource === 'badges') return state.badges;
    if (state.resource === 'attributes') return state.attributes;
    return sortedCategories();
  }

  function staticFields(html) {
    const template = document.createElement('template');
    template.innerHTML = html;
    return template.content;
  }

  function renderCategoryAttributeAssignments(category) {
    const associations = new Map((Array.isArray(category.attributes) ? category.attributes : []).map((entry) => [
      String(first(entry.definition_id, entry.attribute_definition_id, entry.id)),
      entry,
    ]));
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'commerce-category-attributes';
    const legend = document.createElement('legend');
    legend.textContent = 'Atributos de esta categoría';
    fieldset.appendChild(legend);
    const help = node('p', '', 'Solo estos atributos aparecerán al crear publicaciones de la categoría.');
    fieldset.appendChild(help);
    const activeAttributes = state.attributes.filter((attribute) => attribute.status === 'ACTIVE');
    if (!activeAttributes.length) {
      fieldset.appendChild(node('p', 'commerce-table-state', 'Primero crea una definición de atributo.'));
    }
    activeAttributes.forEach((attribute, index) => {
      const association = associations.get(String(attribute.id));
      const row = document.createElement('div');
      row.className = 'commerce-category-attribute-row';
      const enabledLabel = document.createElement('label');
      enabledLabel.className = 'commerce-resource-check';
      const enabled = document.createElement('input');
      enabled.type = 'checkbox';
      enabled.dataset.categoryAttributeEnabled = String(attribute.id);
      enabled.checked = Boolean(association);
      enabledLabel.append(enabled, document.createTextNode(String(attribute.label || attribute.attribute_key)));
      const requiredLabel = document.createElement('label');
      requiredLabel.className = 'commerce-resource-check';
      const required = document.createElement('input');
      required.type = 'checkbox';
      required.dataset.categoryAttributeRequired = String(attribute.id);
      required.checked = Boolean(association && first(association.required, association.is_required, false));
      required.disabled = !enabled.checked;
      requiredLabel.append(required, document.createTextNode('Obligatorio'));
      enabled.addEventListener('change', () => {
        required.disabled = !enabled.checked;
        if (!enabled.checked) required.checked = false;
      });
      row.dataset.sortOrder = String(first(association?.sort_order, index));
      row.append(enabledLabel, requiredLabel);
      fieldset.appendChild(row);
    });
    elements.resourceFields.appendChild(fieldset);
  }

  function renderResourceFields(entry) {
    const value = object(entry);
    if (state.resource === 'badges') {
      elements.resourceFields.replaceChildren(staticFields(
        '<label><span>Clave *</span><input name="key" maxlength="64" required placeholder="MEGA_OFERTA"></label>' +
        '<label><span>Texto *</span><input name="label" maxlength="100" required></label>' +
        '<label><span>Estilo</span><select name="style"><option value="INFO">Informativa</option><option value="SUCCESS">Disponible</option><option value="WARNING">Promoción</option><option value="DANGER">Urgente</option><option value="ACCENT">Destacada</option><option value="NEUTRAL">Neutral</option></select></label>' +
        '<label><span>Icono</span><input name="icon" maxlength="80" placeholder="fa-bolt"></label>' +
        '<label><span>Orden</span><input name="sort_order" type="number" min="-32768" max="32767" value="0"></label>' +
        '<label><span>Estado</span><select name="status"><option value="ACTIVE">Activa</option><option value="HIDDEN">Oculta</option><option value="ARCHIVED">Archivada</option></select></label>'
      ));
      elements.resourceForm.elements.key.value = first(value.badge_key, value.key, '');
      elements.resourceForm.elements.label.value = value.label || '';
      elements.resourceForm.elements.style.value = first(value.style_variant, value.style, '');
      elements.resourceForm.elements.icon.value = value.icon || '';
    } else if (state.resource === 'attributes') {
      elements.resourceFields.replaceChildren(staticFields(
        '<label><span>Clave *</span><input name="key" maxlength="64" required placeholder="ram"></label>' +
        '<label><span>Etiqueta *</span><input name="label" maxlength="100" required placeholder="Memoria RAM"></label>' +
        '<label><span>Tipo *</span><select name="data_type" required><option value="TEXT">Texto</option><option value="INTEGER">Entero</option><option value="DECIMAL">Decimal</option><option value="BOOLEAN">Sí/No</option><option value="DATE">Fecha</option><option value="JSON">Estructurado</option></select></label>' +
        '<label><span>Unidad</span><input name="unit" maxlength="32" placeholder="GB"></label>' +
        '<label class="commerce-resource-check"><input name="filterable" type="checkbox"> Filtrable</label>' +
        '<label class="commerce-resource-check"><input name="searchable" type="checkbox"> Buscable</label>' +
        '<label class="commerce-resource-check"><input name="required" type="checkbox"> Obligatorio</label>' +
        '<label><span>Orden</span><input name="sort_order" type="number" min="-32768" max="32767" value="0"></label>' +
        '<label><span>Estado</span><select name="status"><option value="ACTIVE">Activo</option><option value="ARCHIVED">Archivado</option></select></label>'
      ));
      elements.resourceForm.elements.key.value = first(value.attribute_key, value.key, '');
      elements.resourceForm.elements.label.value = value.label || '';
      elements.resourceForm.elements.data_type.value = value.data_type || 'TEXT';
      elements.resourceForm.elements.unit.value = value.unit || '';
      elements.resourceForm.elements.filterable.checked = Boolean(value.filterable);
      elements.resourceForm.elements.searchable.checked = Boolean(value.searchable);
      elements.resourceForm.elements.required.checked = Boolean(value.required);
    } else {
      elements.resourceFields.replaceChildren(staticFields(
        '<label><span>Nombre *</span><input name="name" maxlength="100" required></label>' +
        '<label><span>Slug</span><input name="slug" maxlength="200" placeholder="Se genera desde el nombre"></label>' +
        '<label><span>Categoría padre</span><select name="parent_id"><option value="">Sin categoría padre</option></select></label>' +
        '<label><span>Descripción</span><textarea name="description" maxlength="1000" rows="3"></textarea></label>' +
        '<label><span>Icono</span><input name="icon" maxlength="80" placeholder="fa-laptop"></label>' +
        '<label><span>Orden</span><input name="sort_order" type="number" min="-32768" max="32767" value="0"></label>' +
        '<label><span>Estado</span><select name="status"><option value="ACTIVE">Activa</option><option value="HIDDEN">Oculta</option><option value="ARCHIVED">Archivada</option></select></label>'
      ));
      const parentSelect = elements.resourceForm.elements.parent_id;
      sortedCategories().filter((category) => String(category.id) !== String(value.id) && category.status !== 'ARCHIVED').forEach((category) => {
        parentSelect.add(new Option('— '.repeat(category.depth) + category.name, String(category.id)));
      });
      elements.resourceForm.elements.name.value = value.name || '';
      elements.resourceForm.elements.slug.value = value.slug || '';
      elements.resourceForm.elements.parent_id.value = value.parent_id || '';
      elements.resourceForm.elements.description.value = value.description || '';
      elements.resourceForm.elements.icon.value = value.icon || '';
      renderCategoryAttributeAssignments(value);
    }
    if (elements.resourceForm.elements.sort_order) elements.resourceForm.elements.sort_order.value = String(value.sort_order || 0);
    if (elements.resourceForm.elements.status) elements.resourceForm.elements.status.value = value.status || 'ACTIVE';
  }

  function resetResourceForm() {
    const config = resourceConfig();
    elements.resourceId.value = '';
    elements.resourceTitle.textContent = 'Nueva ' + config.singular;
    elements.resourceMessage.hidden = true;
    renderResourceFields(null);
    elements.resourceList.querySelectorAll('.is-active').forEach((entry) => entry.classList.remove('is-active'));
  }

  function renderResourceList() {
    const config = resourceConfig();
    const entries = resourceCollection();
    const buttons = entries.map((entry) => {
      const button = node('button', 'commerce-resource-entry');
      button.type = 'button';
      button.dataset.resourceId = String(entry.id);
      button.appendChild(node('span', '', config.label(entry) || 'Sin nombre'));
      button.appendChild(node('small', '', config.secondary(entry) || entry.status || ''));
      return button;
    });
    elements.resourceList.replaceChildren(...(buttons.length ? buttons : [node('p', 'commerce-table-state', 'No hay registros todavía.') ]));
    resetResourceForm();
  }

  function selectResource(id) {
    const entry = resourceCollection().find((value) => String(value.id) === String(id));
    if (!entry) return;
    elements.resourceId.value = String(entry.id);
    elements.resourceTitle.textContent = 'Editar ' + resourceConfig().singular;
    elements.resourceMessage.hidden = true;
    renderResourceFields(entry);
    elements.resourceList.querySelectorAll('[data-resource-id]').forEach((button) => button.classList.toggle('is-active', button.dataset.resourceId === String(id)));
  }

  function resourcePayload() {
    const form = new FormData(elements.resourceForm);
    const payload = {};
    for (const [key, value] of form.entries()) payload[key] = typeof value === 'string' ? value.trim() : value;
    payload.sort_order = Number(payload.sort_order || 0);
    if (state.resource === 'categories') payload.parent_id = payload.parent_id ? Number(payload.parent_id) : null;
    if (state.resource === 'attributes') {
      payload.filterable = elements.resourceForm.elements.filterable.checked;
      payload.searchable = elements.resourceForm.elements.searchable.checked;
      payload.required = elements.resourceForm.elements.required.checked;
      payload.unit = payload.unit || null;
    }
    if (state.resource === 'badges') {
      payload.style = payload.style || null;
      payload.icon = payload.icon || null;
    }
    if (state.resource === 'categories') {
      payload.slug = payload.slug || payload.name;
      payload.description = payload.description || null;
      payload.icon = payload.icon || null;
    }
    return payload;
  }

  function categoryAttributesPayload() {
    return Array.from(elements.resourceFields.querySelectorAll('[data-category-attribute-enabled]:checked')).map((input, index) => {
      const definitionId = Number(input.dataset.categoryAttributeEnabled);
      const required = elements.resourceFields.querySelector('[data-category-attribute-required="' + definitionId + '"]');
      return {
        definition_id: definitionId,
        required: Boolean(required?.checked),
        sort_order: index,
      };
    });
  }

  async function saveResource(event) {
    event.preventDefault();
    if (!elements.resourceForm.reportValidity()) return;
    const config = resourceConfig();
    const id = elements.resourceId.value;
    const submit = elements.resourceForm.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      const response = await api(config.path + (id ? '/' + encodeURIComponent(id) : ''), {
        method: id ? 'PATCH' : 'POST',
        body: JSON.stringify(resourcePayload()),
      });
      const savedResource = itemData(response);
      const savedId = first(savedResource?.id, id);
      if (state.resource === 'categories' && savedId) {
        await api('/categories/' + encodeURIComponent(savedId) + '/attributes', {
          method: 'PUT',
          body: JSON.stringify({ attributes: categoryAttributesPayload() }),
        });
      }
      await loadResources();
      renderResourceList();
      showNotice((id ? 'Cambios guardados en ' : 'Nueva ') + config.singular + '.');
    } catch (error) {
      elements.resourceMessage.textContent = error.message;
      elements.resourceMessage.hidden = false;
    } finally {
      submit.disabled = false;
    }
  }

  async function removeMedia(button) {
    const itemId = elements.itemId.value;
    const figure = button.closest('[data-media-id]');
    const mediaId = figure?.dataset.mediaId;
    if (!itemId || !mediaId || !window.confirm('¿Eliminar esta imagen de la publicación?')) return;
    button.disabled = true;
    try {
      await api('/catalog/' + encodeURIComponent(itemId) + '/media/' + encodeURIComponent(mediaId), { method: 'DELETE' });
      const refreshed = await api('/catalog/' + encodeURIComponent(itemId));
      renderExistingMedia(normalizeItem(itemData(refreshed)));
      showNotice('Imagen eliminada.');
    } catch (error) {
      button.disabled = false;
      showNotice(error.message, 'error');
    }
  }

  async function saveMedia(button) {
    const itemId = elements.itemId.value;
    const figure = button.closest('[data-media-id]');
    const mediaId = figure?.dataset.mediaId;
    if (!itemId || !mediaId || !figure) return;
    const altText = figure.querySelector('[data-media-alt]')?.value.trim() || null;
    const sortOrder = Number(figure.querySelector('[data-media-order]')?.value || 0);
    const isPrimary = Boolean(figure.querySelector('[data-media-primary-input]')?.checked);
    button.disabled = true;
    try {
      await api('/catalog/' + encodeURIComponent(itemId) + '/media/' + encodeURIComponent(mediaId), {
        method: 'PATCH',
        body: JSON.stringify({ alt_text: altText, sort_order: sortOrder, ...(isPrimary ? { is_primary: true } : {}) }),
      });
      const refreshed = await api('/catalog/' + encodeURIComponent(itemId));
      renderExistingMedia(normalizeItem(itemData(refreshed)));
      showNotice('Datos de imagen actualizados.');
    } catch (error) {
      button.disabled = false;
      showNotice(error.message, 'error');
    }
  }

  async function initialize() {
    if (state.initialized) {
      await loadItems();
      return;
    }
    state.initialized = true;
    if (!state.resourcePromise) state.resourcePromise = loadResources().catch((error) => { showNotice(error.message, 'error'); return false; });
    await state.resourcePromise;
    await Promise.all([loadItems(), loadMetrics()]);
  }

  elements.create.addEventListener('click', () => {
    // Abrir el formulario nunca depende de que termine una petición. Antes se
    // esperaba la promesa de recursos y un click parecía no hacer nada.
    clearForm();
    elements.itemMode.textContent = 'Nueva publicación';
    elements.saveItem.textContent = 'Guardar borrador';
    openModal(elements.itemModal, elements.create);
    if (!state.productKinds.length) {
      elements.productKind.disabled = true;
      elements.productKind.replaceChildren(new Option('Cargando tipos de producto…', ''));
      elements.kindDescription.textContent = 'Estamos cargando los tipos disponibles desde Commerce.';
      if (!state.resourcePromise) {
        state.resourcePromise = loadResources().catch((error) => {
          showNotice(error.message, 'error');
          return false;
        });
      }
    }
  });
  elements.settings.addEventListener('click', () => {
    state.resource = 'categories';
    elements.resourceTabs.forEach((tab) => {
      const active = tab.dataset.commerceResource === state.resource;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    renderResourceList();
    openModal(elements.settingsModal, elements.settings);
  });
  root.querySelectorAll('[data-commerce-close]').forEach((button) => {
    button.addEventListener('click', () => closeModal(button.dataset.commerceClose === 'item' ? elements.itemModal : elements.settingsModal));
  });
  elements.productKind.addEventListener('change', () => selectProductKind(elements.productKind.value));
  elements.stepNext.addEventListener('click', () => { if (validateCurrentStep()) setStep(state.step + 1); });
  elements.stepBack.addEventListener('click', () => setStep(state.step - 1));
  elements.itemForm.addEventListener('submit', saveItem);
  elements.trackStock.addEventListener('change', syncStockFields);
  ['commerce-cost', 'commerce-base-price', 'commerce-sale-price', 'commerce-currency'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', updateProfitPreview);
    document.getElementById(id)?.addEventListener('change', updateProfitPreview);
  });
  document.getElementById('commerce-bundle-add')?.addEventListener('click', () => {
    const id = Number(document.getElementById('commerce-bundle-component').value);
    const quantity = Number(document.getElementById('commerce-bundle-quantity').value || 1);
    if (!id || !Number.isInteger(quantity) || quantity < 1) return;
    const existing = state.bundleItems.find((entry) => entry.catalog_item_id === id);
    if (existing) existing.quantity = Math.min(100, existing.quantity + quantity);
    else state.bundleItems.push({ catalog_item_id: id, quantity: Math.min(100, quantity) });
    renderBundleBuilder();
  });
  elements.categories.addEventListener('change', (event) => {
    if (event.target.matches('input[name="category_ids"]')) renderAttributeControls();
  });
  elements.mediaInput.addEventListener('change', () => {
    state.files = Array.from(elements.mediaInput.files || []);
    elements.fileList.replaceChildren(...state.files.map((file) => {
      const item = document.createElement('li');
      item.appendChild(node('span', '', file.name));
      item.appendChild(node('span', '', (file.size / 1024 / 1024).toFixed(2) + ' MB'));
      return item;
    }));
  });
  elements.existingMedia.addEventListener('click', (event) => {
    const button = event.target.closest('[data-media-action]');
    if (!button) return;
    if (button.dataset.mediaAction === 'save') saveMedia(button);
    if (button.dataset.mediaAction === 'remove') removeMedia(button);
  });
  elements.refresh.addEventListener('click', () => Promise.all([loadItems(), loadMetrics()]));
  elements.filters.addEventListener('submit', (event) => event.preventDefault());
  [elements.filterType, elements.filterStatus, elements.filterCategory, elements.filterKind, elements.filterAvailability, elements.filterSort].forEach((control) => control.addEventListener('change', () => { state.page = 1; loadItems(); }));
  [elements.filterBrand, elements.filterMinPrice, elements.filterMaxPrice].forEach((control) => control.addEventListener('input', () => {
    window.clearTimeout(state.debounce);
    state.debounce = window.setTimeout(() => { state.page = 1; loadItems(); }, 350);
  }));
  elements.search.addEventListener('input', () => {
    window.clearTimeout(state.debounce);
    state.debounce = window.setTimeout(() => { state.page = 1; loadItems(); }, 300);
  });
  elements.clearFilters.addEventListener('click', () => {
    elements.filters.reset();
    state.page = 1;
    loadItems();
  });
  elements.pagePrevious.addEventListener('click', () => { if (state.page > 1) { state.page -= 1; loadItems(); } });
  elements.pageNext.addEventListener('click', () => { if (state.page < state.pages) { state.page += 1; loadItems(); } });
  [elements.tbody, elements.mobileList].forEach((container) => container.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action][data-id]');
    if (!button) return;
    if (button.dataset.action === 'edit') editItem(button.dataset.id, button);
    if (button.dataset.action === 'publish') publishItem(button.dataset.id);
    if (button.dataset.action === 'archive') archiveItem(button.dataset.id);
    if (button.dataset.action === 'duplicate') duplicateItem(button.dataset.id);
    if (button.dataset.action === 'hide') hideItem(button.dataset.id);
    if (button.dataset.action === 'delete') deleteItem(button.dataset.id);
  }));
  elements.resourceTabs.forEach((tab) => tab.addEventListener('click', () => {
    state.resource = tab.dataset.commerceResource;
    elements.resourceTabs.forEach((candidate) => {
      const active = candidate === tab;
      candidate.classList.toggle('is-active', active);
      candidate.setAttribute('aria-selected', String(active));
      candidate.tabIndex = active ? 0 : -1;
    });
    renderResourceList();
  }));
  elements.resourceTabs.forEach((tab, index) => tab.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    let nextIndex = index;
    if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = elements.resourceTabs.length - 1;
    else if (event.key === 'ArrowRight') nextIndex = (index + 1) % elements.resourceTabs.length;
    else nextIndex = (index - 1 + elements.resourceTabs.length) % elements.resourceTabs.length;
    elements.resourceTabs[nextIndex].focus();
    elements.resourceTabs[nextIndex].click();
  }));
  elements.resourceList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-resource-id]');
    if (button) selectResource(button.dataset.resourceId);
  });
  elements.resourceReset.addEventListener('click', resetResourceForm);
  elements.resourceForm.addEventListener('submit', saveResource);
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (!elements.itemModal.hidden) closeModal(elements.itemModal);
    else if (!elements.settingsModal.hidden) closeModal(elements.settingsModal);
  });
  window.addEventListener('admin:switch-view', (event) => {
    if (event.detail?.view === 'commerce-store') initialize();
  });
  document.addEventListener('DOMContentLoaded', () => {
    // Precarga los tipos aunque la vista de Tienda empiece oculta; evita que
    // Nueva publicación abra antes de que termine la carga de Commerce.
    initialize();
  }, { once: true });
})();
