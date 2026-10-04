/**
 * Pixon PC — Agenda Operativa Profesional v2.5
 * Simplificada · Automatizada · Mobile-First · Cero Scrolls por Columna
 * Timezone: America/Cancun compliant (UTC-5)
 */

'use strict';

(function() {
  const API_BASE = '/api/admin/appointments';
  const CSRF_HEADER = { 'X-Requested-With': 'fetch' };
  const JSON_HEADERS = { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' };

  function cancunTodayISO() {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Cancun',
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const m = Object.fromEntries(parts.map(p => [p.type, p.value]));
    return `${m.year}-${m.month}-${m.day}`;
  }

  function cancunNowTime() {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Cancun',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(new Date());
    const m = Object.fromEntries(parts.map(p => [p.type, p.value]));
    return `${m.hour}:${m.minute}`;
  }

  function escapeHtml(str) {
    if (!str && str !== 0) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * CSP de este sitio usa script-src-attr 'none': un onclick="..." inyectado
   * vía innerHTML NUNCA se ejecuta. Todo botón generado dinámicamente debe
   * usar estos data-attributes + el listener delegado en bindEvents().
   */
  function actionAttrs(method, ...args) {
    return `data-agenda-action="${method}" data-agenda-args="${escapeHtml(JSON.stringify(args))}"`;
  }

  function paymentAmountLabel(apt) {
    const amount = apt && apt.price_amount_mxn;
    return amount ? `$${Number(amount).toLocaleString('es-MX')}` : 'Pago';
  }

  function paymentRequired(apt) {
    return !!apt && apt.payment_status !== 'NOT_REQUIRED';
  }

  function isPricePendingConfirmation(apt) {
    if (!apt) return false;
    return apt.appointment_type === 'LIQUID_DAMAGE' ||
           apt.service_type === 'Bañado / Mojado' ||
           apt.planned_service_summary === 'Bañado / Mojado' ||
           apt.price_mode === 'PENDING_CONFIRMATION' ||
           (!apt.price_amount_mxn && apt.price_mode !== 'CONFIRMED');
  }

  function paymentBadgeHtml(apt) {
    if (!apt || apt.payment_status === 'NOT_REQUIRED') return '';
    const isPaid = apt.payment_status === 'PAID';

    if (isPricePendingConfirmation(apt)) {
      if (isPaid) {
        const amt = apt.price_amount_mxn ? `$${Number(apt.price_amount_mxn).toLocaleString('es-MX')} ` : '';
        return `<span class="chip-badge badge-paid"><i class="fa-solid fa-check"></i> ${amt}Pagado</span>`;
      }
      return `<span class="chip-badge" style="background:var(--a-surface-2);color:var(--a-text-muted);border:1px solid var(--a-border);"><i class="fa-solid fa-tag"></i> Precio por confirmar</span>`;
    }

    if (isPaid) {
      return `<span class="chip-badge badge-paid"><i class="fa-solid fa-check"></i> ${paymentAmountLabel(apt)} Pagado</span>`;
    }
    return `<span class="chip-badge badge-pending"><i class="fa-solid fa-clock"></i> ${paymentAmountLabel(apt)} Pend.</span>`;
  }

  // Único generador de link de WhatsApp para citas: usado desde la card de
  // "Mi jornada" y desde el drawer de detalle, para no mantener el mismo
  // mensaje/formato duplicado en dos lugares (ver #8-9: "Contactar cliente"
  // debe llevar mensaje contextual, no un wa.me en blanco).
  function whatsAppLinkHtml(apt, { compact = false } = {}) {
    if (!apt || !apt.customer_phone) return '';
    const phoneDigits = String(apt.customer_phone).replace(/\D/g, '');
    if (!phoneDigits) return '';
    const dateLabel = apt.start_at ? String(apt.start_at).slice(0, 10) : '';
    const timeLabel = formatTime(apt.start_at);
    const typeLabel = TYPE_LABELS[apt.appointment_type] || 'tu cita';
    const name = apt.customer_name ? apt.customer_name.split(' ')[0] : '';
    const message = `Hola${name ? ' ' + name : ''}, te contactamos de Pixon PC sobre tu cita de ${typeLabel.toLowerCase()}` +
      (dateLabel ? ` del ${dateLabel}${timeLabel ? ' ' + timeLabel : ''}` : '') + '.';
    const href = `https://wa.me/52${phoneDigits}?text=${encodeURIComponent(message)}`;
    if (compact) {
      return `<a href="${href}" target="_blank" rel="noopener" class="timeline-wa-link" title="Contactar por WhatsApp">
        <i class="fa-brands fa-whatsapp"></i> ${escapeHtml(apt.customer_phone)}
      </a>`;
    }
    return `<a href="${href}" target="_blank" rel="noopener" class="btn-admin btn-sm btn-whatsapp">
      <i class="fa-brands fa-whatsapp"></i> Contactar por WhatsApp
    </a>`;
  }

  // Estados que ya no ocupan capacidad real del taller (ver #24: la
  // capacidad debe recalcularse tras cancelar/no-show, aunque el registro
  // se conserve para historial en la vista Lista).
  const INACTIVE_STATUSES = ['CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_ADMIN', 'NO_SHOW', 'EXPIRED', 'RESCHEDULED'];
  function isActiveAppt(apt) {
    return !INACTIVE_STATUSES.includes(apt.status);
  }

  function formatTime(isoOrTime) {
    if (!isoOrTime) return '';
    const str = String(isoOrTime);
    if (str.includes('T')) return str.slice(11, 16);
    if (str.includes(' ')) return str.split(' ')[1].slice(0, 5);
    return str.slice(0, 5);
  }

  const TYPE_LABELS = {
    DROP_OFF: 'Recepción',
    PICKUP: 'Entrega',
    DIAGNOSTIC: 'Diagnóstico',
    MAINTENANCE: 'Mantenimiento',
    REPAIR: 'Reparación',
    LIQUID_DAMAGE: 'Equipo mojado',
    ON_SITE: 'A Domicilio',
    BUSINESS: 'Empresa / B2B',
    REMOTE: 'Remoto',
    OTHER: 'Otro'
  };

  const TYPE_DURATIONS = {
    DROP_OFF: 20,
    PICKUP: 15,
    DIAGNOSTIC: 30,
    MAINTENANCE: 45,
    REPAIR: 60,
    LIQUID_DAMAGE: 30,
    ON_SITE: 120,
    BUSINESS: 60,
    REMOTE: 30,
    OTHER: 30
  };

  /**
   * Política de precios (espejo de solo lectura de server/modules/appointments/pricing.policy.js).
   * El servidor recalcula y guarda el snapshot real al crear la cita; esto solo
   * controla lo que se muestra en el modal ANTES de guardar.
   */
  const DIAGNOSTIC_STARTING_PRICE = 600;
  const MAINTENANCE_MIN_PRICE = 1000;
  const MAINTENANCE_REFERENCE_PERCENT = 0.15;

  function computeDisplayPricing(type, equipmentValue) {
    if (type === 'DIAGNOSTIC') {
      return {
        mode: 'PENDING_CONFIRMATION',
        text: `Diagnóstico técnico desde $${DIAGNOSTIC_STARTING_PRICE} MXN. El diagnóstico determina la causa de la falla.`,
        badge: 'DESDE $600 · POR CONFIRMAR'
      };
    }
    if (type === 'LIQUID_DAMAGE') {
      return {
        mode: 'PENDING_CONFIRMATION',
        text: 'En equipos con contacto con líquido, el servicio inicial consiste en limpieza técnica y descontaminación + inspección. Este procedimiento no garantiza que el equipo vuelva a encender ni elimina la posibilidad de daños adicionales por corrosión. Si tras la inspección quedan fallas, la reparación adicional se cotiza por separado.',
        badge: 'LIMPIEZA / DESCONTAMINACIÓN · PRECIO POR CONFIRMAR'
      };
    }
    if (type === 'MAINTENANCE') {
      const value = Number(equipmentValue);
      if (value > 0) {
        const suggested = Math.max(MAINTENANCE_MIN_PRICE, Math.round(value * MAINTENANCE_REFERENCE_PERCENT));
        return {
          mode: 'ESTIMATE',
          text: `Referencia aproximada según valor del equipo: $${suggested.toLocaleString('es-MX')} MXN. No es precio final; se confirma antes del servicio.`,
          badge: `ESTIMADO $${suggested.toLocaleString('es-MX')} · POR CONFIRMAR`
        };
      }
      return {
        mode: 'PENDING_CONFIRMATION',
        text: `Mantenimiento preventivo desde $${MAINTENANCE_MIN_PRICE.toLocaleString('es-MX')} MXN. Como referencia, el servicio puede calcularse alrededor del 15% del valor del equipo según complejidad, riesgo y materiales. El precio final se confirma antes de realizar el servicio.`,
        badge: 'DESDE $1,000 · POR CONFIRMAR'
      };
    }
    return null;
  }

  const STATUS_LABELS = {
    TEMPORARY_HOLD: 'Apartado temporal',
    PENDING_PAYMENT: 'Esperando pago de diagnóstico',
    CONFIRMED: 'Confirmada',
    CHECKED_IN: 'Cliente en taller',
    DEVICE_RECEIVED: 'Equipo recibido',
    IN_PROGRESS: 'En diagnóstico/taller',
    CUSTOMER_ARRIVED: 'Cliente para entrega',
    DEVICE_DELIVERED: 'Equipo entregado',
    COMPLETED: 'Completada',
    RESCHEDULED: 'Reprogramada',
    CANCELLED_BY_CUSTOMER: 'Cancelada por cliente',
    CANCELLED_BY_ADMIN: 'Cancelada por taller',
    NO_SHOW: 'No se presentó',
    EXPIRED: 'Apartado vencido'
  };

  const STATUS_ICONS = {
    CONFIRMED: 'fa-solid fa-circle-check',
    PENDING_PAYMENT: 'fa-solid fa-clock',
    CHECKED_IN: 'fa-solid fa-user-check',
    DEVICE_RECEIVED: 'fa-solid fa-box-archive',
    COMPLETED: 'fa-solid fa-check-double',
    RESCHEDULED: 'fa-solid fa-calendar-xmark',
    NO_SHOW: 'fa-solid fa-user-xmark',
    CANCELLED_BY_CUSTOMER: 'fa-solid fa-ban',
    CANCELLED_BY_ADMIN: 'fa-solid fa-ban',
    ON_SITE: 'fa-solid fa-house-laptop',
    LIQUID_DAMAGE: 'fa-solid fa-droplet'
  };

  class AgendaManager {
    constructor() {
      const urlParams = new URLSearchParams(window.location.search);
      const urlView = urlParams.get('view');
      const urlDate = urlParams.get('date');

      this.currentDate = (urlDate && /^\d{4}-\d{2}-\d{2}$/.test(urlDate)) ? urlDate : cancunTodayISO();
      // "TODAY" es la vista default operativa del admin: agenda de hoy -> slots -> acciones -> detalle.
      this.view = (urlView && ['today', 'week', 'day', 'month', 'list'].includes(urlView)) ? urlView : 'today';
      this.appointments = [];
      this.todayData = null;
      this.stats = null;
      this.blocks = [];
      this.config = null;
      this.alerts = [];
      this.filters = {
        type: 'ALL',
        status: 'ALL',
        location: 'ALL',
        search: ''
      };
      this.selectedAppointment = null;
      this.pollTimer = null;
      this.initialized = false;
    }

    updateUrlState() {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('view', this.view);
        if (this.view === 'day') {
          url.searchParams.set('date', this.currentDate);
        } else if (this.view === 'month') {
          url.searchParams.set('date', this.currentDate.slice(0, 7));
        } else {
          url.searchParams.delete('date');
        }
        window.history.replaceState({ agendaView: this.view, agendaDate: this.currentDate }, '', url.toString());
      } catch (_) {}
    }

    switchView(newView) {
      if (this.view === newView) return;
      this.view = newView;
      this.updateViewButtons();
      this.renderDateHeader();
      this.updateUrlState();
      this.refresh();
    }

    goToToday() {
      this.currentDate = cancunTodayISO();
      if (this.view === 'day' || this.view === 'today') {
        this.view = 'today';
      }
      this.updateViewButtons();
      this.renderDateHeader();
      this.updateUrlState();
      this.refresh();
    }

    stepDate(direction) {
      const activeDate = (this.view === 'today') ? cancunTodayISO() : this.currentDate;
      const [y, m, d] = activeDate.split('-').map(Number);
      const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));

      if (this.view === 'today' || this.view === 'day') {
        dt.setUTCDate(dt.getUTCDate() + direction);
        this.currentDate = dt.toISOString().slice(0, 10);
        this.view = 'day';
      } else if (this.view === 'week') {
        dt.setUTCDate(dt.getUTCDate() + (direction * 7));
        this.currentDate = dt.toISOString().slice(0, 10);
      } else if (this.view === 'month') {
        dt.setUTCMonth(dt.getUTCMonth() + direction);
        this.currentDate = dt.toISOString().slice(0, 10);
      } else {
        dt.setUTCDate(dt.getUTCDate() + (direction * 14));
        this.currentDate = dt.toISOString().slice(0, 10);
      }
      this.updateViewButtons();
      this.renderDateHeader();
      this.updateUrlState();
      this.refresh();
    }

    async init() {
      if (this.initialized) return this.refresh(true);
      this.initialized = true;
      this.bindEvents();
      this.bindKeyboardShortcuts();
      this.updateViewButtons();
      window.addEventListener('popstate', () => {
        try {
          const url = new URL(window.location.href);
          const v = url.searchParams.get('view');
          const d = url.searchParams.get('date');
          if (v && ['today', 'week', 'day', 'month', 'list'].includes(v)) {
            this.view = v;
          }
          if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
            this.currentDate = d;
          } else if (d && /^\d{4}-\d{2}$/.test(d)) {
            this.currentDate = `${d}-01`;
          }
          this.updateViewButtons();
          this.refresh();
        } catch (_) {}
      });
      await this.loadConfig();
      await this.refresh();
      this.startPolling();
    }

    startPolling() {
      if (this.pollTimer) clearInterval(this.pollTimer);
      this.pollTimer = setInterval(() => {
        const agendaSec = document.getElementById('view-agenda');
        const dashSec = document.getElementById('view-dashboard');
        const isVisible = (agendaSec && agendaSec.style.display !== 'none') ||
                          (dashSec && dashSec.style.display !== 'none');
        if (isVisible && document.visibilityState === 'visible') {
          this.refresh(true);
        }
      }, 30000);
    }

    async loadConfig() {
      try {
        const res = await fetch(`${API_BASE}/config`, { credentials: 'include' });
        if (res.ok) {
          this.config = await res.json();
        }
      } catch (e) {
        console.error('Error loading agenda config:', e);
      }
    }

    async refresh(silent = false) {
      if (!silent) this.setLoading(true);
      try {
        const { start, end } = this.getDateRangeForView();
        const [apptsRes, todayRes, statsRes, blocksRes] = await Promise.all([
          fetch(`${API_BASE}?from=${start}&to=${end}&wrap=1`, { credentials: 'include' }),
          fetch(`${API_BASE}/today`, { credentials: 'include' }),
          fetch(`${API_BASE}/stats`, { credentials: 'include' }),
          fetch(`${API_BASE}/blocks`, { credentials: 'include' })
        ]);

        if (apptsRes.ok) {
          const data = await apptsRes.json();
          this.appointments = Array.isArray(data) ? data : (data.appointments || []);
        }
        if (todayRes.ok) {
          const data = await todayRes.json();
          this.todayData = data.board || data;
        }
        if (statsRes.ok) {
          const data = await statsRes.json();
          this.stats = data.stats || data;
        }
        if (blocksRes.ok) {
          const data = await blocksRes.json();
          this.blocks = data.blocks || [];
        }

        this.computeAlerts();
        this.render();
      } catch (err) {
        console.error('Error refreshing agenda:', err);
      } finally {
        if (!silent) this.setLoading(false);
      }
    }

    setLoading(loading) {
      const el = document.getElementById('agenda-loading-indicator');
      if (el) el.style.display = loading ? 'inline-block' : 'none';
    }

    getDateRangeForView() {
      const activeDate = this.view === 'today' ? cancunTodayISO() : this.currentDate;
      const dt = new Date(`${activeDate}T12:00:00Z`);
      if (this.view === 'day' || this.view === 'today') {
        return { start: activeDate, end: activeDate };
      }
      if (this.view === 'week') {
        const day = dt.getUTCDay(); // 0 is Sun
        const diffToMon = day === 0 ? -6 : 1 - day;
        const monday = new Date(dt);
        monday.setUTCDate(dt.getUTCDate() + diffToMon);
        const sunday = new Date(monday);
        sunday.setUTCDate(monday.getUTCDate() + 6);
        return {
          start: monday.toISOString().slice(0, 10),
          end: sunday.toISOString().slice(0, 10)
        };
      }
      if (this.view === 'month') {
        const y = dt.getUTCFullYear();
        const m = dt.getUTCMonth();
        const first = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
        const last = new Date(Date.UTC(y, m + 1, 0)).toISOString().slice(0, 10);
        return { start: first, end: last };
      }
      // List view - 14 days
      const endDt = new Date(dt);
      endDt.setUTCDate(dt.getUTCDate() + 14);
      return { start: activeDate, end: endDt.toISOString().slice(0, 10) };
    }

    getFilteredAppointments() {
      let list = this.appointments;
      if (this.filters.type !== 'ALL') {
        if (this.filters.type === 'DROP_OFF') {
          list = list.filter(a => a.location_type === 'WORKSHOP' && a.appointment_type !== 'LIQUID_DAMAGE');
        } else if (this.filters.type === 'ON_SITE') {
          list = list.filter(a => a.location_type === 'ON_SITE');
        } else if (this.filters.type === 'LIQUID_DAMAGE') {
          list = list.filter(a => a.appointment_type === 'LIQUID_DAMAGE');
        } else {
          list = list.filter(a => a.appointment_type === this.filters.type);
        }
      }
      if (this.filters.status !== 'ALL') {
        list = list.filter(a => a.status === this.filters.status);
      }
      if (this.filters.search) {
        const q = this.filters.search.toLowerCase();
        list = list.filter(a =>
          (a.customer_name && a.customer_name.toLowerCase().includes(q)) ||
          (a.customer_phone && a.customer_phone.includes(q)) ||
          (a.customer_email && a.customer_email.toLowerCase().includes(q)) ||
          (a.ticket_code && a.ticket_code.toLowerCase().includes(q)) ||
          (a.device_summary && a.device_summary.toLowerCase().includes(q)) ||
          (a.planned_service_summary && a.planned_service_summary.toLowerCase().includes(q))
        );
      }
      return list;
    }

    /**
     * Motor de Alertas Inteligentes (Barra Condicional)
     */
    computeAlerts() {
      const todayISO = cancunTodayISO();
      const nowTime = cancunNowTime();
      const todayAppts = (this.todayData?.appointments || []).filter(a =>
        !['COMPLETED', 'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_ADMIN', 'NO_SHOW', 'EXPIRED', 'RESCHEDULED'].includes(a.status)
      );

      const alerts = [];

      // 1. Citas con pago pendiente hoy
      const unpaidToday = todayAppts.filter(a =>
        a.status === 'PENDING_PAYMENT' || a.payment_status === 'PENDING'
      );
      if (unpaidToday.length > 0) {
        alerts.push({
          type: 'warn',
          text: `⚠ ${unpaidToday.length} cita${unpaidToday.length > 1 ? 's' : ''} con pago pendiente (${paymentAmountLabel(unpaidToday[0])})`,
          action: () => this.openDetails(unpaidToday[0].id)
        });
      }

      // 2. Salida a domicilio próxima o activa
      const nowMin = parseInt(nowTime.slice(0, 2), 10) * 60 + parseInt(nowTime.slice(3, 5), 10);
      todayAppts.filter(a => a.location_type === 'ON_SITE').forEach(a => {
        const aptTime = formatTime(a.start_at);
        const aptMin = parseInt(aptTime.slice(0, 2), 10) * 60 + parseInt(aptTime.slice(3, 5), 10);
        const diff = aptMin - nowMin;
        if (diff > 0 && diff <= 60) {
          alerts.push({
            type: 'warn',
            text: `🚗 Salida a domicilio en ${diff} min (${aptTime} - ${a.customer_name})`,
            action: () => this.openDetails(a.id)
          });
        } else if (diff <= 0 && a.status === 'CONFIRMED') {
          alerts.push({
            type: 'warn',
            text: `🚗 Servicio a domicilio programado (${aptTime} - ${a.customer_name})`,
            action: () => this.openDetails(a.id)
          });
        }
      });

      // 3. Cliente esperando / retraso de llegada
      todayAppts.filter(a => a.status === 'CONFIRMED').forEach(a => {
        const aptTime = formatTime(a.start_at);
        const aptMin = parseInt(aptTime.slice(0, 2), 10) * 60 + parseInt(aptTime.slice(3, 5), 10);
        const diff = nowMin - aptMin;
        if (diff >= 15 && diff <= 120) {
          alerts.push({
            type: 'danger',
            text: `⚠ ${a.customer_name} (${aptTime}) lleva ${diff} min sin confirmar llegada`,
            action: () => this.openDetails(a.id)
          });
        }
      });

      // 4. Sobreocupación de capacidad en cualquier horario de hoy
      const slotCounts = {};
      todayAppts.forEach(a => {
        const t = formatTime(a.start_at);
        slotCounts[t] = (slotCounts[t] || 0) + (Number(a.capacity_units) || 1);
      });
      Object.entries(slotCounts).forEach(([time, cap]) => {
        if (cap > 3) {
          alerts.push({
            type: 'danger',
            text: `🚨 Sobreocupación hoy a las ${time} (${cap}/3 unidades)`,
            action: () => {
              this.view = 'today';
              this.updateViewButtons();
              this.render();
            }
          });
        }
      });

      this.alerts = alerts;
    }

    /**
     * Siguiente Acción Operativa Automática
     */
    computeNextAction(appts) {
      const active = (appts || []).filter(a =>
        !['COMPLETED', 'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_ADMIN', 'NO_SHOW', 'EXPIRED', 'RESCHEDULED'].includes(a.status)
      );
      if (!active.length) {
        return 'Taller libre · Capacidad disponible';
      }

      // Prioridad 1: Cliente ya llegó y está esperando atención
      const checkedIn = active.find(a => a.status === 'CHECKED_IN');
      if (checkedIn) {
        return `Recibir equipo de ${checkedIn.customer_name} (${checkedIn.device_summary || 'Equipo'})`;
      }

      // Prioridad 2: Equipo mojado recibido urgente
      const liquid = active.find(a => a.appointment_type === 'LIQUID_DAMAGE' && a.status === 'DEVICE_RECEIVED');
      if (liquid) {
        return `Urgente: Desconectar y baño ultrasónico (${liquid.customer_name})`;
      }

      // Prioridad 3: Próxima cita de hoy
      const nextApt = active[0];
      const time = formatTime(nextApt.start_at);
      if (nextApt.location_type === 'ON_SITE') {
        return `Preparar salida a domicilio — ${time} (${nextApt.customer_name})`;
      }
      if (nextApt.status === 'PENDING_PAYMENT') {
        return `Validar pago diagnóstico ${paymentAmountLabel(nextApt)} — ${time} (${nextApt.customer_name})`;
      }
      return `${nextApt.customer_name} — ${time} (${TYPE_LABELS[nextApt.appointment_type] || 'Recepción'})`;
    }

    render() {
      this.renderAlertBar();
      this.renderKPIs();
      this.renderDateHeader();
      this.renderCalendar();
      this.renderDashboardWidget();
    }

    renderAlertBar() {
      const bar = document.getElementById('agenda-smart-alert-bar') || document.getElementById('agenda-alert-bar');
      if (!bar) return;
      if (!this.alerts.length) {
        bar.style.display = 'none';
        bar.innerHTML = '';
        return;
      }

      bar.style.display = 'flex';
      bar.innerHTML = this.alerts.map((alt, idx) => `
        <button type="button" class="agenda-alert-pill alert-${alt.type}" ${actionAttrs('triggerAlertAction', idx)}>
          ${escapeHtml(alt.text)}
        </button>
      `).join('');
    }

    triggerAlertAction(idx) {
      if (this.alerts[idx] && typeof this.alerts[idx].action === 'function') {
        this.alerts[idx].action();
      }
    }

    renderKPIs() {
      const todayAppts = (this.todayData?.appointments || []).filter(isActiveAppt);
      const totalCount = todayAppts.length;
      const unpaidCount = todayAppts.filter(a => a.payment_status === 'PENDING' || a.status === 'PENDING_PAYMENT').length;
      const onsiteCount = todayAppts.filter(a => a.location_type === 'ON_SITE').length;

      // Capacidad calculada
      const usedUnits = todayAppts.reduce((sum, a) => sum + (Number(a.capacity_units) || 1), 0);
      const totalCapDay = 24 * 3; // aprox slots operativos

      // Elementos del DOM
      const todayCountEl = document.getElementById('agenda-kpi-today-count');
      if (todayCountEl) todayCountEl.textContent = `${totalCount} cita${totalCount !== 1 ? 's' : ''}`;

      const nextAptEl = document.getElementById('agenda-kpi-next-apt');
      if (nextAptEl) {
        const next = todayAppts.find(a => !['COMPLETED', 'CANCELLED_BY_ADMIN', 'NO_SHOW'].includes(a.status));
        if (next) {
          nextAptEl.innerHTML = `<strong>${formatTime(next.start_at)}</strong> · ${escapeHtml(next.customer_name || 'Cliente')}`;
        } else {
          nextAptEl.textContent = 'Sin citas pendientes';
        }
      }

      const capEl = document.getElementById('agenda-kpi-capacity-used');
      if (capEl) capEl.textContent = `${usedUnits} unid. en uso`;

      const unpaidEl = document.getElementById('agenda-kpi-unpaid-count');
      if (unpaidEl) unpaidEl.textContent = `${unpaidCount} por validar`;

      const onsiteEl = document.getElementById('agenda-kpi-onsite-count');
      if (onsiteEl) onsiteEl.textContent = `${onsiteCount} visita${onsiteCount !== 1 ? 's' : ''}`;

      const nextActionEl = document.getElementById('agenda-kpi-next-action-summary');
      if (nextActionEl) {
        nextActionEl.textContent = this.computeNextAction(todayAppts);
      }
    }

    renderDateHeader() {
      const rangeEl = document.getElementById('agenda-current-range-label');
      if (!rangeEl) return;

      const { start, end } = this.getDateRangeForView();
      if (this.view === 'today') {
        const [y, m, d] = cancunTodayISO().split('-').map(Number);
        const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
        const formatted = dt.toLocaleDateString('es-MX', {
          weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Cancun'
        });
        rangeEl.textContent = `Hoy — ${formatted.charAt(0).toUpperCase() + formatted.slice(1)}`;
      } else if (this.view === 'day') {
        const [y, m, d] = this.currentDate.split('-').map(Number);
        const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
        const formatted = dt.toLocaleDateString('es-MX', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Cancun'
        });
        rangeEl.textContent = `Día — ${formatted.charAt(0).toUpperCase() + formatted.slice(1)}`;
      } else if (this.view === 'week') {
        const [sy, sm, sd] = start.split('-').map(Number);
        const [ey, em, ed] = end.split('-').map(Number);
        const sdt = new Date(Date.UTC(sy, sm - 1, sd, 12, 0, 0));
        const edt = new Date(Date.UTC(ey, em - 1, ed, 12, 0, 0));
        const sMonth = sdt.toLocaleDateString('es-MX', { month: 'short', timeZone: 'America/Cancun' });
        const eMonth = edt.toLocaleDateString('es-MX', { month: 'short', timeZone: 'America/Cancun' });
        rangeEl.textContent = `Semana: ${sd} ${sMonth} — ${ed} ${eMonth} ${ey}`;
      } else if (this.view === 'month') {
        const [y, m] = start.split('-').map(Number);
        const dt = new Date(Date.UTC(y, m - 1, 1, 12, 0, 0));
        const formatted = dt.toLocaleDateString('es-MX', {
          month: 'long', year: 'numeric', timeZone: 'America/Cancun'
        });
        rangeEl.textContent = formatted.charAt(0).toUpperCase() + formatted.slice(1);
      } else {
        rangeEl.textContent = `Próximas citas (desde ${start})`;
      }
    }

    renderCalendar() {
      const container = document.getElementById('agenda-calendar-container');
      if (!container) return;

      const appts = this.getFilteredAppointments();

      if (this.view === 'today') {
        this.renderTodayBoard(container);
      } else if (this.view === 'week') {
        this.renderWeekView(container, appts.filter(isActiveAppt));
      } else if (this.view === 'day') {
        this.renderDayView(container, this.currentDate, appts.filter(isActiveAppt));
      } else if (this.view === 'month') {
        this.renderMonthView(container, appts.filter(isActiveAppt));
      } else {
        this.renderListView(container, appts);
      }

      this.autoScrollCurrentTime();
    }

    /**
     * 1. VISTA HOY OPERATIVO (TIMELINE DIRECTA CON SÍNTESIS OPERATIVA)
     */
    renderTodayBoard(container) {
      const todayISO = cancunTodayISO();
      const rawAppts = (this.todayData?.appointments?.length ? this.todayData.appointments : this.appointments) || [];
      const appts = rawAppts.filter(a => {
        if (String(a.start_at).slice(0, 10) !== todayISO) return false;
        if (this.filters.status === 'ALL' && !isActiveAppt(a)) return false;
        if (this.filters.type === 'DROP_OFF' && (a.location_type !== 'WORKSHOP' || a.appointment_type === 'LIQUID_DAMAGE')) return false;
        if (this.filters.type === 'ON_SITE' && a.location_type !== 'ON_SITE') return false;
        if (this.filters.type === 'LIQUID_DAMAGE' && a.appointment_type !== 'LIQUID_DAMAGE') return false;
        if (this.filters.status !== 'ALL' && a.status !== this.filters.status) return false;
        if (this.filters.search) {
          const q = this.filters.search.toLowerCase();
          const match = (a.customer_name && a.customer_name.toLowerCase().includes(q)) ||
                        (a.customer_phone && a.customer_phone.includes(q)) ||
                        (a.device_summary && a.device_summary.toLowerCase().includes(q)) ||
                        (a.planned_service_summary && a.planned_service_summary.toLowerCase().includes(q));
          if (!match) return false;
        }
        return true;
      });

      const [y, m, d] = todayISO.split('-').map(Number);
      const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
      const formattedDate = dt.toLocaleDateString('es-MX', {
        weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Cancun'
      });

      const nextActionText = this.computeNextAction(rawAppts);
      const nowTime = cancunNowTime();
      const nowMin = parseInt(nowTime.slice(0, 2), 10) * 60 + parseInt(nowTime.slice(3, 5), 10);

      const timeSlots = this.getTimeSlots([todayISO], appts);

      let nowInserted = false;
      const timelineHtml = timeSlots.map(time => {
        const slotMin = parseInt(time.slice(0, 2), 10) * 60 + parseInt(time.slice(3, 5), 10);
        const slotAppts = appts.filter(a => formatTime(a.start_at) === time);
        const usedCap = slotAppts.reduce((sum, a) => sum + (Number(a.capacity_units) || 1), 0);
        const isPast = slotMin < nowMin - 25;

        const hasLiquid = slotAppts.some(a => a.appointment_type === 'LIQUID_DAMAGE');
        const hasOnsite = slotAppts.some(a => a.location_type === 'ON_SITE');

        // Check if blocked
        const block = this.blocks.find(b => b.date === todayISO && (b.is_all_day || (b.start_time <= `${time}:00` && b.end_time > `${time}:00`)));

        let rowClasses = 'timeline-slot-row';
        if (slotAppts.length) rowClasses += ' has-appointments';
        if (hasLiquid) rowClasses += ' is-liquid';
        if (hasOnsite) rowClasses += ' is-onsite';
        if (block) rowClasses += ' is-blocked';
        if (isPast && !slotAppts.length) rowClasses += ' is-past';

        // Insert AHORA indicator when time crosses nowTime
        let nowLineHtml = '';
        if (!nowInserted && slotMin >= nowMin) {
          nowInserted = true;
          nowLineHtml = `
            <div class="agenda-now-marker-row" id="agenda-now-marker">
              <span class="agenda-now-badge"><span class="live-dot" style="background:#fff;"></span> AHORA · ${nowTime}</span>
              <div class="agenda-now-line"></div>
            </div>
          `;
        }

        return `
          ${nowLineHtml}
          <div class="${rowClasses}" data-time="${time}">
            <div class="timeline-time-col">
              <span class="timeline-time-val">${time}</span>
              <span class="timeline-cap-badge">${block ? 'Bloqueado' : `${usedCap}/3`}</span>
            </div>

            <div class="timeline-content-col">
              ${block ? `
                <div class="timeline-empty-slot" style="color:#94a3b8;cursor:pointer;" ${actionAttrs('openBlockDetails', block.id)} title="Click para ver detalle del bloqueo">
                  <span><i class="fa-solid fa-lock"></i> ${escapeHtml(block.reason || block.category || 'Horario bloqueado')}</span>
                </div>
              ` : slotAppts.length ? slotAppts.map(apt => this.renderTodaySlotCard(apt)).join('') : `
                <div class="timeline-empty-slot" style="cursor:pointer;" ${actionAttrs('openNewAppointmentModal', todayISO, time)} title="Click para agendar cita a las ${time}">
                  <span style="color:var(--a-text-muted);">Disponible (${usedCap}/3)</span>
                  <button type="button" class="btn-slot-quick-add" ${actionAttrs('openNewAppointmentModal', todayISO, time)}>
                    <i class="fa-solid fa-plus"></i> Agendar
                  </button>
                </div>
              `}
            </div>
          </div>
        `;
      }).join('');

      let emptyBanner = '';
      if (!appts.length) {
        emptyBanner = `
          <div class="agenda-empty-state">
            <i class="fa-solid fa-calendar-check" style="font-size:2.2rem;color:var(--a-cyan);margin-bottom:8px;"></i>
            <h3 style="margin:0 0 4px;font-size:1.05rem;">Hoy no tienes citas programadas</h3>
            <p style="margin:0 0 12px;color:var(--a-text-muted);font-size:0.82rem;">Capacidad disponible: 24/24 · Próximo horario libre: 08:30</p>
            <button class="btn-admin btn-approve" ${actionAttrs('openNewAppointmentModal', todayISO)}>
              <i class="fa-solid fa-plus"></i> + Nueva cita
            </button>
          </div>
        `;
      }

      container.innerHTML = `
        <div class="agenda-today-container">
          <div class="agenda-today-header-banner">
            <div class="agenda-today-title-group">
              <h2 class="agenda-today-h2">HOY — ${escapeHtml(formattedDate)}</h2>
            </div>
            <div class="agenda-today-next-action-pill is-interactive" style="cursor:pointer;" ${actionAttrs('openNextActionAppointment')} title="Siguiente acción operativa calculada automáticamente (Click para abrir)">
              <i class="fa-solid fa-bolt"></i>
              <span>${escapeHtml(nextActionText)}</span>
            </div>
          </div>
          ${emptyBanner}
          <div class="agenda-today-timeline" id="agenda-today-timeline-box">
            ${timelineHtml}
          </div>
        </div>
      `;
    }

    renderTodaySlotCard(apt) {
      const isLiquid = apt.appointment_type === 'LIQUID_DAMAGE';
      const isOnSite = apt.location_type === 'ON_SITE';

      return `
        <div class="timeline-card">
          <div class="timeline-card-main" role="button" tabindex="0" style="cursor:pointer;" ${actionAttrs('openDetails', apt.id)} title="Click para abrir detalle de la cita">
            <div class="timeline-card-header">
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                ${apt.ticket_code ? `<span class="agenda-folio-badge">#${escapeHtml(apt.ticket_code)}</span>` : ''}
                <span class="timeline-customer-name">${escapeHtml(apt.customer_name || 'Sin nombre')}</span>
              </div>
              ${whatsAppLinkHtml(apt, { compact: true })}
            </div>
            <div class="timeline-device-line">
              <strong>${escapeHtml(apt.device_summary || apt.device_type || 'Equipo')}</strong> · ${escapeHtml(apt.planned_service_summary || TYPE_LABELS[apt.appointment_type] || 'Revisión')}
              ${apt.ticket_code ? `· <span class="agenda-ticket-link" data-agenda-stop="1" ${actionAttrs('openTicket', apt.ticket_id)} title="Abrir expediente en Taller"><i class="fa-solid fa-screwdriver-wrench"></i> Ver en Taller</span>` : ''}
            </div>
            <div class="timeline-meta-badges">
              ${paymentBadgeHtml(apt)}
              ${isLiquid ? '<span class="chip-badge badge-liquid"><i class="fa-solid fa-droplet"></i> MOJADO</span>' : ''}
              ${isOnSite ? '<span class="chip-badge badge-onsite"><i class="fa-solid fa-house"></i> Domicilio</span>' : ''}
              <span class="chip-badge" style="background:var(--a-surface-2);color:var(--a-cyan);">
                <i class="${STATUS_ICONS[apt.status] || 'fa-solid fa-circle-info'}"></i>
                ${escapeHtml(STATUS_LABELS[apt.status] || apt.status)}
              </span>
            </div>
          </div>

          <div class="timeline-card-actions">
            ${apt.status === 'CONFIRMED' ? `
              <button type="button" class="btn-action-fast act-checkin" ${actionAttrs('updateStatus', apt.id, 'CHECKED_IN')}>
                <i class="fa-solid fa-user-check"></i> Llegó
              </button>
            ` : ''}
            ${apt.status === 'CHECKED_IN' && apt.appointment_type !== 'PICKUP' ? `
              <button type="button" class="btn-action-fast act-receive" ${actionAttrs('updateStatus', apt.id, 'DEVICE_RECEIVED')}>
                <i class="fa-solid fa-box-archive"></i> Recibir
              </button>
            ` : ''}
            ${apt.status === 'CHECKED_IN' && apt.appointment_type === 'PICKUP' ? `
              <button type="button" class="btn-action-fast act-complete" ${actionAttrs('updateStatus', apt.id, 'DEVICE_DELIVERED')}>
                <i class="fa-solid fa-handshake"></i> Entregado
              </button>
            ` : ''}
            ${['DEVICE_RECEIVED', 'IN_PROGRESS', 'CUSTOMER_ARRIVED'].includes(apt.status) ? `
              <button type="button" class="btn-action-fast act-complete" ${actionAttrs('updateStatus', apt.id, 'COMPLETED')}>
                <i class="fa-solid fa-check-double"></i> Completar
              </button>
            ` : ''}
            <button type="button" class="btn-action-fast" ${actionAttrs('openDetails', apt.id)} title="Ver detalles y acciones">
              <i class="fa-solid fa-ellipsis"></i> Detalle
            </button>
          </div>
        </div>
      `;
    }

    /**
     * 2. VISTA SEMANAL PROFESIONAL (TIMETABLE REJILLA UNIFICADA — UN SOLO SCROLL)
     */
    getTimeSlots(dates, appts) {
      const slots = new Set();
      const minutes = value => {
        const match = /^(\d{2}):(\d{2})/.exec(String(value || ''));
        return match ? Number(match[1]) * 60 + Number(match[2]) : null;
      };
      for (const date of dates) {
        const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
        const setting = this.config?.settings?.find(row => Number(row.weekday) === weekday);
        const exception = this.config?.exceptions?.find(row => String(row.date).slice(0, 10) === date);
        if (exception?.status === 'closed' || (!exception && setting && !Number(setting.is_open))) continue;
        const start = minutes(exception?.start_time || setting?.start_time);
        const end = minutes(exception?.end_time || setting?.end_time);
        const interval = Math.max(1, Number(exception?.slot_minutes || setting?.slot_minutes) || 30);
        if (start !== null && end !== null) {
          for (let minute = start; minute < end; minute += interval) {
            slots.add(`${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`);
          }
        }
      }
      // Overrides and appointments outside current opening hours must stay visible.
      for (const apt of appts) {
        const time = formatTime(apt.start_at);
        if (minutes(time) !== null) slots.add(time);
      }
      return [...slots].sort();
    }

    renderWeekView(container, appts) {
      const { start } = this.getDateRangeForView();
      const [y, m, d] = start.split('-').map(Number);
      const monday = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));

      const days = [];
      for (let i = 0; i < 7; i++) {
        const dt = new Date(monday);
        dt.setUTCDate(monday.getUTCDate() + i);
        days.push(dt.toISOString().slice(0, 10));
      }

      const todayISO = cancunTodayISO();
      const nowTime = cancunNowTime();

      const timeSlots = this.getTimeSlots(days, appts);

      // Header row
      let headersHtml = `<div class="agenda-tt-corner">Hora</div>`;
      days.forEach(dayStr => {
        const [dy, dm, dd] = dayStr.split('-').map(Number);
        const dayDt = new Date(Date.UTC(dy, dm - 1, dd, 12, 0, 0));
        const isToday = dayStr === todayISO;
        const dayLabel = dayDt.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', timeZone: 'America/Cancun' });
        const dayCount = appts.filter(a => String(a.start_at).slice(0, 10) === dayStr).length;

        headersHtml += `
          <div class="agenda-tt-day-header ${isToday ? 'is-today' : ''}" data-date="${dayStr}" ${actionAttrs('selectDay', dayStr)} title="Ver detalle de ${dayLabel}">
            <span class="agenda-tt-day-name">${escapeHtml(dayLabel)}</span>
            <span class="agenda-tt-day-count">${dayCount} citas</span>
          </div>
        `;
      });

      // Grid Rows (Hora + 7 Celdas)
      let rowsHtml = '';
      timeSlots.forEach(time => {
        rowsHtml += `<div class="agenda-tt-time-label" data-time="${time}">${time}</div>`;

        days.forEach(dayStr => {
          const isToday = dayStr === todayISO;
          const isPast = dayStr < todayISO || (isToday && time < nowTime);
          const cellAppts = appts.filter(a => String(a.start_at).slice(0, 10) === dayStr && formatTime(a.start_at) === time);
          const usedCap = cellAppts.reduce((sum, a) => sum + (Number(a.capacity_units) || 1), 0);

          // Check block
          const block = this.blocks.find(b => b.date === dayStr && (b.is_all_day || (b.start_time <= `${time}:00` && b.end_time > `${time}:00`)));

          let cellClass = 'agenda-tt-cell';
          if (isToday) cellClass += ' is-today';
          if (isPast && !cellAppts.length) cellClass += ' is-past';

          rowsHtml += `
            <div class="${cellClass}" data-date="${dayStr}" data-time="${time}">
              ${block ? `
                <div class="agenda-block-chip is-clickable" style="cursor:pointer;" ${actionAttrs('openBlockDetails', block.id)} title="${escapeHtml(block.reason || block.category || 'Bloqueado')} (Click para ver detalle)">
                  <i class="fa-solid fa-lock"></i> ${escapeHtml(block.category || 'Bloqueado')}
                </div>
              ` : cellAppts.length ? `
                <div class="agenda-tt-events-stack">
                  ${cellAppts.map(apt => this.renderWeekEventChip(apt, usedCap)).join('')}
                </div>
              ` : `
                <div class="agenda-tt-empty-hover" ${actionAttrs('openNewAppointmentModal', dayStr, time)}>
                  <button type="button" class="btn-slot-quick-add" title="Agendar en este horario">
                    + 0/3
                  </button>
                </div>
              `}
            </div>
          `;
        });
      });

      container.innerHTML = `
        <div class="agenda-week-timetable-wrapper" id="agenda-timetable-scroll">
          <div class="agenda-week-timetable">
            ${headersHtml}
            ${rowsHtml}
          </div>
        </div>
      `;
    }

    renderWeekEventChip(apt, usedCap) {
      const isLiquid = apt.appointment_type === 'LIQUID_DAMAGE';
      const isOnSite = apt.location_type === 'ON_SITE';
      const timeStr = formatTime(apt.start_at);

      let chipClass = 'agenda-event-chip';
      if (isLiquid) chipClass += ' is-liquid';
      if (isOnSite) chipClass += ' is-onsite';
      if (apt.payment_status === 'PENDING' || apt.status === 'PENDING_PAYMENT') chipClass += ' is-pending';

      return `
        <div class="${chipClass}" role="button" tabindex="0" data-agenda-stop="1" ${actionAttrs('openDetails', apt.id)} title="Click para ver detalle">
          <div class="chip-row-top">
            <span class="chip-time">${timeStr}</span>
            <span class="chip-cap-tag">${usedCap}/3</span>
          </div>
          <div class="chip-customer">
            ${apt.ticket_code ? `<span class="agenda-folio-badge" style="font-size:0.68rem;padding:1px 4px;margin-right:4px;">#${escapeHtml(apt.ticket_code)}</span>` : ''}
            ${escapeHtml(apt.customer_name || 'Sin nombre')}
          </div>
          <div class="chip-device">${escapeHtml(apt.device_summary || apt.device_type || 'Equipo')}</div>
          <div class="chip-badges">
            ${paymentBadgeHtml(apt)}
            ${isLiquid ? '<span class="chip-badge badge-liquid">💧 Mojado</span>' : ''}
            ${isOnSite ? '<span class="chip-badge badge-onsite">🚗 Domicilio</span>' : ''}
          </div>
        </div>
      `;
    }

    /**
     * 3. VISTA DÍA CON LANES DE CAPACIDAD (PLANIFICACIÓN DETALLADA)
     */
    renderDayView(container, dateStr, appts) {
      const dayAppts = appts.filter(a => String(a.start_at).slice(0, 10) === dateStr);
      const [y, m, d] = dateStr.split('-').map(Number);
      const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
      const formattedDate = dt.toLocaleDateString('es-MX', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Cancun'
      });

      const totalCap = dayAppts.reduce((sum, a) => sum + (Number(a.capacity_units) || 1), 0);
      const unpaidCount = dayAppts.filter(a => a.payment_status === 'PENDING' || a.status === 'PENDING_PAYMENT').length;
      const pendingArrivals = dayAppts.filter(a => a.status === 'CONFIRMED');
      const pendingArrivalCount = pendingArrivals.length;

      // Citas con acción pendiente o atención requerida en el día
      const pendingItems = dayAppts.filter(a =>
        !['COMPLETED', 'DEVICE_DELIVERED', 'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_ADMIN', 'NO_SHOW', 'EXPIRED', 'RESCHEDULED'].includes(a.status)
      );

      let pendingSectionHtml = '';
      if (pendingItems.length > 0) {
        pendingSectionHtml = `
          <div class="agenda-day-pending-box">
            <div class="agenda-day-pending-header">
              <span class="agenda-day-pending-title">
                <i class="fa-solid fa-clock-rotate-left" style="color:var(--a-cyan);"></i> PENDIENTES DEL DÍA (${pendingItems.length})
              </span>
              <span class="agenda-day-pending-subtitle">Click en cualquier pendiente para abrir la cita</span>
            </div>
            <div class="agenda-day-pending-grid">
              ${pendingItems.map(apt => {
                const isLiquid = apt.appointment_type === 'LIQUID_DAMAGE';
                const isUnpaid = apt.payment_status === 'PENDING' || apt.status === 'PENDING_PAYMENT';
                const timeStr = formatTime(apt.start_at);

                let reasonBadge = '';
                if (isLiquid) {
                  reasonBadge = '<span class="chip-badge badge-liquid"><i class="fa-solid fa-droplet"></i> Equipo mojado</span>';
                } else if (isUnpaid) {
                  reasonBadge = '<span class="chip-badge badge-pending"><i class="fa-solid fa-clock"></i> Pago pendiente</span>';
                } else if (apt.status === 'CONFIRMED') {
                  reasonBadge = '<span class="chip-badge" style="background:rgba(56,189,248,0.12);color:#38bdf8;border:1px solid rgba(56,189,248,0.3);"><i class="fa-solid fa-user-clock"></i> Pendiente de llegada</span>';
                } else if (apt.status === 'CHECKED_IN') {
                  reasonBadge = '<span class="chip-badge" style="background:rgba(16,185,129,0.12);color:#10b981;border:1px solid rgba(16,185,129,0.3);"><i class="fa-solid fa-user-check"></i> En taller</span>';
                } else if (apt.status === 'TEMPORARY_HOLD') {
                  reasonBadge = '<span class="chip-badge badge-pending"><i class="fa-solid fa-hourglass-half"></i> Pendiente confirmación</span>';
                } else {
                  reasonBadge = `<span class="chip-badge" style="background:var(--a-surface-2);color:var(--a-text);"><i class="fa-solid fa-circle-info"></i> ${escapeHtml(STATUS_LABELS[apt.status] || apt.status)}</span>`;
                }

                return `
                  <div class="agenda-pending-card is-interactive" role="button" tabindex="0" ${actionAttrs('openDetails', apt.id)} title="Abrir detalle de ${escapeHtml(apt.customer_name)}">
                    <div class="pending-card-top">
                      <span class="pending-card-time"><i class="fa-solid fa-clock"></i> ${timeStr}</span>
                      ${reasonBadge}
                    </div>
                    <div class="pending-card-name">
                      ${apt.ticket_code ? `<span class="agenda-folio-badge" style="font-size:0.75rem;padding:2px 6px;margin-right:6px;">#${escapeHtml(apt.ticket_code)}</span>` : ''}
                      ${escapeHtml(apt.customer_name || 'Cliente')}
                    </div>
                    <div class="pending-card-device">
                      ${escapeHtml(apt.device_summary || apt.device_type || 'Equipo')} · ${escapeHtml(apt.planned_service_summary || TYPE_LABELS[apt.appointment_type] || 'Revisión')}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      } else if (dayAppts.length === 0) {
        pendingSectionHtml = `
          <div class="agenda-day-empty-banner">
            <div style="display:flex;align-items:center;gap:10px;">
              <i class="fa-solid fa-calendar-check" style="font-size:1.3rem;color:var(--a-cyan);"></i>
              <div>
                <strong>No hay citas programadas para este día</strong>
                <div style="font-size:0.75rem;color:var(--a-text-muted);">Capacidad libre: 24/24 · Selecciona cualquier horario disponible abajo o pulsa [+ Nueva cita].</div>
              </div>
            </div>
            <button type="button" class="btn-admin btn-approve btn-sm" ${actionAttrs('openNewAppointmentModal', dateStr)}>
              <i class="fa-solid fa-plus"></i> + Nueva cita
            </button>
          </div>
        `;
      }

      const timeSlots = this.getTimeSlots([dateStr], dayAppts);

      const nowTime = cancunNowTime();
      const isToday = dateStr === cancunTodayISO();

      let rowsHtml = '';
      timeSlots.forEach(time => {
        const slotAppts = dayAppts.filter(a => formatTime(a.start_at) === time);
        const isPast = isToday && time < nowTime;
        const block = this.blocks.find(b => b.date === dateStr && (b.is_all_day || (b.start_time <= `${time}:00` && b.end_time > `${time}:00`)));
        const onsiteExclusive = slotAppts.find(a => a.location_type === 'ON_SITE');

        rowsHtml += `<div class="agenda-tt-time-label" data-time="${time}">${time}</div>`;

        if (block) {
          rowsHtml += `
            <div class="agenda-day-lane-cell is-onsite-exclusive is-blocked" style="background:rgba(71,85,105,0.2);border-left:3px solid #64748b;cursor:pointer;" ${actionAttrs('openBlockDetails', block.id)} title="Click para ver detalle del bloqueo">
              <span style="color:#cbd5e1;font-weight:700;font-size:0.8rem;">
                <i class="fa-solid fa-lock"></i> ${escapeHtml(block.reason || block.category || 'Taller Bloqueado')}
              </span>
            </div>
          `;
        } else if (onsiteExclusive) {
          rowsHtml += `
            <div class="agenda-day-lane-cell is-onsite-exclusive" role="button" tabindex="0" style="cursor:pointer;" ${actionAttrs('openDetails', onsiteExclusive.id)} title="Click para ver detalle">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-weight:800;color:#c4b5fd;font-size:0.82rem;">
                  <i class="fa-solid fa-house"></i> 🚗 SERVICIO A DOMICILIO — Fuera del taller (${escapeHtml(onsiteExclusive.customer_name)})
                </span>
                <span class="chip-badge badge-onsite">${formatTime(onsiteExclusive.start_at)}–${formatTime(onsiteExclusive.end_at)}</span>
              </div>
              <small style="color:#e2e8f0;margin-top:2px;">${escapeHtml(onsiteExclusive.device_summary || '')} · ${escapeHtml(onsiteExclusive.planned_service_summary || '')}</small>
            </div>
          `;
        } else {
          // 3 capacity lanes
          for (let laneIdx = 0; laneIdx < 3; laneIdx++) {
            const apt = slotAppts[laneIdx];
            if (apt) {
              const isLiquid = apt.appointment_type === 'LIQUID_DAMAGE';
              rowsHtml += `
                <div class="agenda-day-lane-cell ${isLiquid ? 'is-liquid' : ''}" role="button" tabindex="0" style="cursor:pointer;" ${actionAttrs('openDetails', apt.id)} title="Click para abrir detalle de la cita">
                  <div style="display:flex;justify-content:space-between;align-items:center;">
                    <strong style="font-size:0.82rem;color:var(--a-text);">
                      ${apt.ticket_code ? `<span class="agenda-folio-badge" style="font-size:0.68rem;padding:1px 4px;margin-right:4px;">#${escapeHtml(apt.ticket_code)}</span>` : ''}
                      ${escapeHtml(apt.customer_name)}
                    </strong>
                    ${paymentBadgeHtml(apt)}
                  </div>
                  <div style="font-size:0.72rem;color:var(--a-text-muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                    ${escapeHtml(apt.device_summary || '')} · ${escapeHtml(apt.planned_service_summary || TYPE_LABELS[apt.appointment_type] || '')}
                  </div>
                </div>
              `;
            } else {
              rowsHtml += `
                <div class="agenda-day-lane-cell ${isPast ? 'is-past' : ''}" role="button" tabindex="0" style="cursor:pointer;" ${actionAttrs('openNewAppointmentModal', dateStr, time)} title="Click para agendar en este espacio libre">
                  <div class="lane-empty-slot">
                    <span>Libre (${laneIdx + 1}/3)</span>
                    <button type="button" class="btn-slot-quick-add" title="Agendar"><i class="fa-solid fa-plus"></i></button>
                  </div>
                </div>
              `;
            }
          }
        }
      });

      container.innerHTML = `
        <div class="agenda-day-view-container">
          <div class="agenda-day-summary-bar">
            <div>
              <h2 style="margin:0 0 4px;font-size:1.15rem;font-weight:900;text-transform:uppercase;letter-spacing:0.5px;color:var(--a-text);">
                ${escapeHtml(formattedDate)}
              </h2>
              <div style="display:flex;gap:12px;font-size:0.78rem;color:var(--a-text-muted);font-weight:600;flex-wrap:wrap;">
                <span><i class="fa-solid fa-calendar-check" style="color:var(--a-cyan);"></i> ${dayAppts.length} citas</span>
                <span><i class="fa-solid fa-gauge" style="color:#10b981;"></i> ${totalCap}/24 capacidad utilizada</span>
                <span><i class="fa-solid fa-clock" style="color:#f59e0b;"></i> ${unpaidCount} pago${unpaidCount !== 1 ? 's' : ''} pendiente${unpaidCount !== 1 ? 's' : ''}</span>
                <span><i class="fa-solid fa-user-clock" style="color:#38bdf8;"></i> ${pendingArrivalCount} pendiente${pendingArrivalCount !== 1 ? 's' : ''} de llegada</span>
              </div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button type="button" class="btn-admin" ${actionAttrs('backToMonth')}>
                <i class="fa-solid fa-calendar-days"></i> ← Mes
              </button>
              <button class="btn-admin btn-approve" ${actionAttrs('openNewAppointmentModal', dateStr)}>
                <i class="fa-solid fa-plus"></i> + Nueva Cita
              </button>
              <button class="btn-admin btn-warn" ${actionAttrs('openBlockModal', dateStr)}>
                <i class="fa-solid fa-ban"></i> Bloquear horario
              </button>
            </div>
          </div>

          ${pendingSectionHtml}

          <div class="agenda-day-lanes-wrapper" id="agenda-timetable-scroll">
            <div class="agenda-day-lanes-timetable">
              <div class="agenda-lane-header" style="left:0;z-index:20;">Hora</div>
              <div class="agenda-lane-header">Espacio 1</div>
              <div class="agenda-lane-header">Espacio 2</div>
              <div class="agenda-lane-header">Espacio 3</div>
              ${rowsHtml}
            </div>
          </div>
        </div>
      `;
    }

    /**
     * 4. VISTA MES (RESUMEN DE CAPACIDAD POR DÍA)
     */
    renderMonthView(container, appts) {
      const [y, m] = this.currentDate.split('-').map(Number);
      const firstDayOfMonth = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
      const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
      const todayISO = cancunTodayISO();

      let cells = '';
      for (let i = 0; i < firstDayOfMonth; i++) {
        cells += '<div class="agenda-month-cell is-empty"></div>';
      }

      for (let d = 1; d <= daysInMonth; d++) {
        const dStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayAppts = appts.filter(a => String(a.start_at).slice(0, 10) === dStr);
        const isToday = dStr === todayISO;
        const totalCap = dayAppts.reduce((sum, a) => sum + (Number(a.capacity_units) || 1), 0);
        const capPct = Math.min(100, Math.round((totalCap / 24) * 100));

        cells += `
          <div class="agenda-month-cell ${isToday ? 'is-today' : ''}" role="button" tabindex="0" ${actionAttrs('selectDay', dStr)} title="Click para abrir Día ${dStr}">
            <div class="month-cell-header">
              <span class="month-cell-num">${d}</span>
              ${dayAppts.length ? `<span class="month-cell-count">${dayAppts.length}</span>` : ''}
            </div>
            <div class="month-cell-badges">
              ${dayAppts.length ? `
                <span class="month-cap-line">${capPct}% cap.</span>
                ${dayAppts.some(a => a.appointment_type === 'LIQUID_DAMAGE') ? '<span style="color:#ef4444;font-size:0.65rem;">💧 Mojado</span>' : ''}
                ${dayAppts.some(a => a.location_type === 'ON_SITE') ? '<span style="color:#a78bfa;font-size:0.65rem;">🚗 Domicilio</span>' : ''}
              ` : '<span style="color:var(--a-text-muted);font-size:0.65rem;">Libre</span>'}
            </div>
          </div>
        `;
      }

      container.innerHTML = `
        <div class="agenda-month-grid">
          <div class="month-grid-header"><span>Dom</span><span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span></div>
          <div class="month-grid-cells">${cells}</div>
        </div>
      `;
    }

    /**
     * 5. VISTA LISTA
     */
    renderListView(container, appts) {
      if (!appts.length) {
        container.innerHTML = `
          <div class="agenda-empty-state">
            <i class="fa-solid fa-magnifying-glass" style="font-size:2.2rem;color:var(--a-text-muted);margin-bottom:10px;"></i>
            <h3 style="margin:0 0 6px;">No se encontraron citas con los filtros activos</h3>
            <button class="btn-admin" ${actionAttrs('resetFilters')}>Limpiar filtros</button>
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <div class="agenda-list-view">
          <table class="agenda-list-table">
            <thead>
              <tr>
                <th>Folio</th>
                <th>Fecha / Hora</th>
                <th>Cliente</th>
                <th>Equipo</th>
                <th>Servicio</th>
                <th>Pago</th>
                <th>Estado</th>
                <th>Siguiente Acción</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${appts.map(apt => `
                <tr>
                  <td>
                    ${apt.ticket_code ? `
                      <span class="agenda-ticket-link" ${actionAttrs('openTicket', apt.ticket_id)} title="Abrir en Taller" style="font-weight:700;">
                        <span class="agenda-folio-badge">#${escapeHtml(apt.ticket_code)}</span>
                      </span>` : '<span style="color:var(--a-text-muted);font-size:0.75rem;">—</span>'}
                  </td>
                  <td><strong>${String(apt.start_at).slice(0, 10)}</strong><br/><small style="color:var(--a-cyan);">${formatTime(apt.start_at)}</small></td>
                  <td>
                    <strong>${escapeHtml(apt.customer_name || 'Sin nombre')}</strong>
                    ${apt.customer_phone ? `<br/><small style="color:var(--a-text-muted);">${escapeHtml(apt.customer_phone)}</small>` : ''}
                  </td>
                  <td>${escapeHtml(apt.device_summary || apt.device_type || 'Equipo')}</td>
                  <td>${escapeHtml(apt.planned_service_summary || TYPE_LABELS[apt.appointment_type] || 'Revisión')}</td>
                  <td>
                    ${paymentBadgeHtml(apt)}
                  </td>
                  <td>
                    <span class="chip-badge" style="background:var(--a-surface-2);color:var(--a-text);">
                      ${escapeHtml(STATUS_LABELS[apt.status] || apt.status)}
                    </span>
                  </td>
                  <td><small style="font-weight:700;">${escapeHtml(apt.next_action || 'Atender')}</small></td>
                  <td>
                    <div style="display:flex;gap:6px;align-items:center;">
                      <button type="button" class="btn-action-fast" ${actionAttrs('openDetails', apt.id)} title="Ver detalle de cita">
                        <i class="fa-solid fa-eye"></i> Detalle
                      </button>
                      ${apt.ticket_id ? `
                      <button type="button" class="btn-action-fast" ${actionAttrs('openTicket', apt.ticket_id)} title="Abrir en Taller" style="color:var(--a-cyan);">
                        <i class="fa-solid fa-screwdriver-wrench"></i> Taller
                      </button>` : ''}
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    /**
     * WIDGET MINI AGENDA EN DASHBOARD (Mi Jornada)
     */
    renderDashboardKpiPills() {
      const rawToday = this.todayData?.appointments || [];
      const active = rawToday.filter(isActiveAppt);
      const counts = {
        total: active.length,
        confirmed: active.filter(a => a.status === 'CONFIRMED').length,
        pending: active.filter(a => a.payment_status === 'PENDING' || a.status === 'PENDING_PAYMENT').length,
        onsite: active.filter(a => a.location_type === 'ON_SITE').length,
        liquid: active.filter(a => a.appointment_type === 'LIQUID_DAMAGE').length,
        noshow: rawToday.filter(a => a.status === 'NO_SHOW').length
      };
      Object.entries(counts).forEach(([key, value]) => {
        const numEl = document.getElementById(`agenda-kpi-${key}`);
        if (!numEl) return;
        numEl.textContent = String(value);
        numEl.closest('.kpi-mini-pill')?.classList.toggle('is-zero', value === 0);
      });
    }

    renderDashboardWidget() {
      this.renderDashboardKpiPills();
      const container = document.getElementById('dashboard-agenda-preview');
      if (!container) return;

      const todayAppts = (this.todayData?.appointments || []).filter(isActiveAppt);
      if (!todayAppts.length) {
        container.innerHTML = `
          <div class="journey-empty">
            <i class="fa-solid fa-calendar-check"></i>
            <strong>No hay citas agendadas para hoy.</strong>
            <span>El mostrador está libre para atención espontánea.</span>
            <button class="btn-admin btn-approve btn-sm" style="margin-top:8px;" ${actionAttrs('openNewAppointmentModal')}>
              <i class="fa-solid fa-plus"></i> Agendar cita
            </button>
          </div>
        `;
        return;
      }

      // Máximo 5 próximas citas
      const next5 = todayAppts.slice(0, 5);
      container.innerHTML = `
        ${next5.map(a => `
          <div class="agenda-preview-item" ${actionAttrs('openDetails', a.id)}>
            <time>${formatTime(a.start_at)}</time>
            <span class="agenda-preview-copy">
              <strong>${escapeHtml(a.customer_name)}</strong>
              <span>${escapeHtml(a.device_summary || 'Equipo')}</span>
            </span>
            ${paymentBadgeHtml(a)}
          </div>
        `).join('')}
        <div class="agenda-preview-footer">
          <button class="btn-admin btn-sm" ${actionAttrs('goToAgendaNav')}>
            Ver agenda completa (${todayAppts.length} hoy) <i class="fa-solid fa-arrow-right"></i>
          </button>
        </div>
      `;
    }

    /**
     * Auto-scroll cerca de la hora actual
     */
    autoScrollCurrentTime() {
      setTimeout(() => {
        if (this.view === 'today') {
          const marker = document.getElementById('agenda-now-marker');
          if (marker) {
            marker.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
          }
          const now = cancunNowTime();
          const currentHour = parseInt(now.slice(0, 2), 10);
          const targetHour = Math.max(8, Math.min(19, currentHour - 1));
          const targetSlot = document.querySelector(`.timeline-slot-row[data-time="${String(targetHour).padStart(2, '0')}:00"]`);
          if (targetSlot) {
            targetSlot.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          return;
        }

        const scrollBox = document.getElementById('agenda-timetable-scroll');
        if (!scrollBox) return;

        const now = cancunNowTime();
        const currentHour = parseInt(now.slice(0, 2), 10);
        const targetHour = Math.max(8, currentHour - 1);
        const targetLabel = document.querySelector(`.agenda-tt-time-label[data-time="${String(targetHour).padStart(2, '0')}:00"]`);
        if (targetLabel && scrollBox) {
          scrollBox.scrollTop = targetLabel.offsetTop - 50;
        }
      }, 60);
    }

    /**
     * DETALLES DE CITA EN DRAWER LATERAL DERECHO
     */
    openDetails(appointmentId) {
      const apt = this.appointments.find(a => a.id === appointmentId) ||
                  (this.todayData?.appointments?.find(a => a.id === appointmentId));
      if (!apt) return;
      this.selectedAppointment = apt;

      const modal = document.getElementById('agenda-details-drawer');
      const body = document.getElementById('agenda-drawer-content');
      if (!modal || !body) return;
      // El drawer vive dentro de <section id="view-agenda">: si se invoca desde
      // otra vista (p.ej. la preview del Dashboard), esa sección está
      // display:none y el drawer sería invisible aunque "abra".
      const agendaSection = document.getElementById('view-agenda');
      if (agendaSection && agendaSection.style.display === 'none') {
        this.goToAgendaNav();
      }

      const isPaid = apt.payment_status === 'PAID';
      const isLiquid = apt.appointment_type === 'LIQUID_DAMAGE';

      body.innerHTML = `
        <div class="drawer-detail-top">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;gap:8px;flex-wrap:wrap;">
            <span class="agenda-folio-badge" style="font-size:0.92rem;padding:4px 10px;display:inline-flex;align-items:center;gap:6px;">
              <i class="fa-solid fa-hashtag"></i> Folio #${escapeHtml(apt.ticket_code || 'ORDEN')}
            </span>
            <span class="drawer-status-badge" style="background:var(--a-surface-2);color:var(--a-cyan);border:1px solid var(--a-border);">
              <i class="${STATUS_ICONS[apt.status] || 'fa-solid fa-circle-info'}"></i>
              ${escapeHtml(STATUS_LABELS[apt.status] || apt.status)}
            </span>
          </div>
          <h3 class="drawer-customer-title">${escapeHtml(apt.customer_name || 'Cliente')}</h3>
          <p class="drawer-subtitle">${escapeHtml(String(apt.start_at).slice(0, 16))} (${apt.duration_minutes || 30} min · ${apt.capacity_units || 1} unid. capacidad)</p>
        </div>

        <div class="drawer-section" style="background:rgba(56,189,248,0.04);border:1px solid rgba(56,189,248,0.2);border-radius:8px;padding:12px;">
          <h4 style="color:var(--a-cyan);margin-top:0;"><i class="fa-solid fa-screwdriver-wrench"></i> Taller Operativo</h4>
          <div class="drawer-kv"><span>Folio de Orden:</span> <strong style="color:var(--a-cyan);">#${escapeHtml(apt.ticket_code || 'Sin folio')}</strong></div>
          <div class="drawer-kv"><span>Expediente de Taller:</span>
            ${apt.ticket_id ? `
              <button type="button" class="btn-admin btn-sm" ${actionAttrs('openTicket', apt.ticket_id)} style="background:rgba(56,189,248,0.15);color:#38bdf8;border:1px solid rgba(56,189,248,0.3);padding:4px 10px;cursor:pointer;">
                <i class="fa-solid fa-arrow-up-right-from-square"></i> Abrir en Taller (#${escapeHtml(apt.ticket_code || '')})
              </button>` : `<span style="color:var(--a-text-muted);">Sin orden asociada</span>`}
          </div>
        </div>

        <div class="drawer-section">
          <h4><i class="fa-solid fa-user"></i> Contacto</h4>
          <div class="drawer-kv"><span>Teléfono:</span> <strong>${escapeHtml(apt.customer_phone || 'N/A')}</strong></div>
          <div class="drawer-kv"><span>Correo:</span> <strong>${escapeHtml(apt.customer_email || 'N/A')}</strong></div>
          ${apt.customer_phone ? `
            <div style="margin-top:6px;">
              ${whatsAppLinkHtml(apt)}
            </div>
          ` : ''}
        </div>

        <div class="drawer-section">
          <h4><i class="fa-solid fa-laptop"></i> Equipo y Servicio</h4>
          <div class="drawer-kv"><span>Equipo:</span> <strong>${escapeHtml(apt.device_summary || apt.device_type || 'N/A')}</strong></div>
          <div class="drawer-kv"><span>Tipo de cita:</span> <strong>${escapeHtml(TYPE_LABELS[apt.appointment_type] || apt.appointment_type)}</strong></div>
          <div class="drawer-kv"><span>Servicio:</span> <strong>${escapeHtml(apt.planned_service_summary || apt.service_type || 'N/A')}</strong></div>
          <div class="drawer-kv"><span>Ubicación:</span> <strong>${apt.location_type === 'ON_SITE' ? 'Domicilio' : 'Taller'}</strong></div>
          ${apt.address_line ? `<div class="drawer-kv"><span>Dirección:</span> <strong>${escapeHtml(apt.address_line)}</strong></div>` : ''}
          ${isLiquid ? `
            <div style="background:rgba(220,38,38,0.15);border:1px solid #dc2626;color:#fca5a5;padding:8px 10px;border-radius:4px;font-size:0.75rem;margin-top:6px;">
              <i class="fa-solid fa-triangle-exclamation"></i> <strong>EQUIPO MOJADO:</strong> No conectar a corriente ni intentar encender. Servicio inicial: limpieza técnica y descontaminación + inspección. No garantiza que el equipo vuelva a encender ni elimina daños adicionales por corrosión.
            </div>
          ` : ''}
        </div>

        <div class="drawer-section">
          <h4><i class="fa-solid fa-receipt"></i> Precio y Pago</h4>
          ${apt.price_label ? `<div class="drawer-kv"><span>Precio:</span> <strong>${escapeHtml(apt.price_label)}</strong></div>` : ''}
          <div class="drawer-kv"><span>Estatus del precio:</span> <strong>${escapeHtml({
            CONFIRMED: 'Confirmado',
            ESTIMATE: 'Estimado',
            PENDING_CONFIRMATION: 'Por confirmar',
            NOT_APPLICABLE: 'No aplica'
          }[apt.price_mode] || (isPricePendingConfirmation(apt) ? 'Por confirmar' : (apt.price_mode || 'Por confirmar')))}</strong></div>
          ${apt.equipment_value_mxn ? `<div class="drawer-kv"><span>Valor del equipo:</span> <strong>$${Number(apt.equipment_value_mxn).toLocaleString('es-MX')} MXN</strong></div>` : ''}
          <div class="drawer-kv">
            <span>Estado de pago:</span>
            <strong>${isPaid ? '✓ PAGADO' : (apt.payment_status === 'NOT_REQUIRED' ? 'NO REQUERIDO' : '🟠 PENDIENTE DE PAGO')}</strong>
          </div>
          ${apt.diagnostic_payment_id ? `<div class="drawer-kv"><span>Comprobante:</span> <code>${escapeHtml(apt.diagnostic_payment_id)}</code></div>` : ''}
          ${!isPaid && (apt.status === 'PENDING_PAYMENT' || apt.payment_status === 'PENDING') && !isPricePendingConfirmation(apt) ? `
            <div style="margin-top:8px;">
              <button type="button" class="btn-admin btn-approve btn-sm" ${actionAttrs('confirmManualPayment', apt.id)}>
                <i class="fa-solid fa-check"></i> Validar pago recibido (${paymentAmountLabel(apt)} MXN)
              </button>
            </div>
          ` : ''}
        </div>

        ${apt.customer_notes ? `
          <div class="drawer-section">
            <h4><i class="fa-solid fa-comment"></i> Nota del Cliente</h4>
            <div class="drawer-notes-box">${escapeHtml(apt.customer_notes)}</div>
          </div>
        ` : ''}

        ${apt.private_notes ? `
          <div class="drawer-section">
            <h4><i class="fa-solid fa-lock"></i> Nota Interna de Taller</h4>
            <div class="drawer-notes-box drawer-notes-internal">${escapeHtml(apt.private_notes)}</div>
          </div>
        ` : ''}

        <div class="drawer-section">
          <h4><i class="fa-solid fa-clock-rotate-left"></i> Historial y Auditoría</h4>
          <div class="drawer-kv"><span>Creada:</span> <span>${escapeHtml(String(apt.created_at || '').slice(0, 16))}</span></div>
          ${apt.checked_in_at ? `<div class="drawer-kv"><span>Llegó:</span> <span>${escapeHtml(String(apt.checked_in_at).slice(0, 16))}</span></div>` : ''}
          ${apt.device_received_at ? `<div class="drawer-kv"><span>Recibido:</span> <span>${escapeHtml(String(apt.device_received_at).slice(0, 16))}</span></div>` : ''}
          ${apt.rescheduled_from_id ? `<div class="drawer-kv"><span>Reprogramada de:</span> <code>${escapeHtml(apt.rescheduled_from_id)}</code></div>` : ''}
        </div>

        <div class="drawer-quick-actions">
          ${apt.ticket_id ? `
            <button type="button" class="btn-admin btn-info" ${actionAttrs('openTicket', apt.ticket_id)}>
              <i class="fa-solid fa-screwdriver-wrench"></i> Abrir Expediente en Taller (#${escapeHtml(apt.ticket_code || '')})
            </button>
          ` : `
            <button type="button" class="btn-admin btn-info" ${actionAttrs('createTicketForAppointment', apt.id)}>
              <i class="fa-solid fa-plus"></i> Vincular / Crear Orden de Taller
            </button>
          `}
          ${apt.status === 'CONFIRMED' ? `
            <button type="button" class="btn-admin btn-approve" ${actionAttrs('updateStatus', apt.id, 'CHECKED_IN')}>
              <i class="fa-solid fa-user-check"></i> ✓ Cliente llegó (Check-in)
            </button>
          ` : ''}
          ${apt.status === 'CHECKED_IN' && apt.appointment_type !== 'PICKUP' ? `
            <button type="button" class="btn-admin btn-approve" ${actionAttrs('updateStatus', apt.id, 'DEVICE_RECEIVED')}>
              <i class="fa-solid fa-box-archive"></i> ✓ Equipo recibido a banco
            </button>
          ` : ''}
          ${apt.status === 'CHECKED_IN' && apt.appointment_type === 'PICKUP' ? `
            <button type="button" class="btn-admin btn-primary" ${actionAttrs('updateStatus', apt.id, 'DEVICE_DELIVERED')}>
              <i class="fa-solid fa-handshake"></i> ✓ Equipo entregado
            </button>
          ` : ''}
          ${['CHECKED_IN', 'DEVICE_RECEIVED', 'IN_PROGRESS'].includes(apt.status) ? `
            <button type="button" class="btn-admin btn-primary" ${actionAttrs('updateStatus', apt.id, 'COMPLETED')}>
              <i class="fa-solid fa-check-double"></i> ✓ Marcar cita completada
            </button>
          ` : ''}
          ${!['CANCELLED_BY_ADMIN', 'CANCELLED_BY_CUSTOMER', 'NO_SHOW', 'COMPLETED', 'DEVICE_DELIVERED', 'RESCHEDULED', 'EXPIRED'].includes(apt.status) ? `
          <button type="button" class="btn-admin" ${actionAttrs('openRescheduleModal', apt.id)}>
            <i class="fa-solid fa-calendar-days"></i> ↔ Reprogramar cita
          </button>
          ` : ''}
          ${!['CANCELLED_BY_ADMIN', 'CANCELLED_BY_CUSTOMER', 'NO_SHOW', 'COMPLETED', 'DEVICE_DELIVERED', 'RESCHEDULED', 'EXPIRED', 'CHECKED_IN', 'DEVICE_RECEIVED', 'IN_PROGRESS'].includes(apt.status) ? `
          <button type="button" class="btn-admin btn-warn" ${actionAttrs('openNoShowModal', apt.id)}>
            <i class="fa-solid fa-user-xmark"></i> ⚠ No se presentó (No-show)
          </button>
          ` : ''}
          ${!['CANCELLED_BY_ADMIN', 'CANCELLED_BY_CUSTOMER', 'NO_SHOW', 'COMPLETED', 'DEVICE_DELIVERED', 'RESCHEDULED', 'EXPIRED'].includes(apt.status) ? `
          <button type="button" class="btn-admin btn-danger" ${actionAttrs('openCancelModal', apt.id)}>
            <i class="fa-solid fa-ban"></i> ✕ Cancelar cita
          </button>
          ` : ''}
        </div>
      `;

      modal.style.display = 'flex';
    }

    closeDetails() {
      const modal = document.getElementById('agenda-details-drawer');
      if (modal) modal.style.display = 'none';
      this.selectedAppointment = null;
    }

    /**
     * Actualizar estado de cita con Toast feedback
     */
    async updateStatus(appointmentId, newStatus, reason = null) {
      try {
        const res = await fetch(`${API_BASE}/${appointmentId}/status`, {
          method: 'PATCH',
          headers: JSON_HEADERS,
          credentials: 'include',
          body: JSON.stringify({ status: newStatus, reason })
        });
        const data = await res.json();
        if (!res.ok) {
          this.showToast(data.message || 'Error al actualizar estado.', 'error');
          return;
        }

        this.showToast(`Cita actualizada a ${STATUS_LABELS[newStatus] || newStatus}`, 'success');
        this.closeDetails();
        await this.refresh();
      } catch (e) {
        console.error('Error updating status:', e);
        this.showToast('Error de conexión.', 'error');
      }
    }

    /**
     * Confirmar pago manual vía modal accesible (sin prompt())
     */
    confirmManualPayment(appointmentId) {
      const modal = document.getElementById('agenda-payment-modal');
      const apt = this.appointments.find(a => a.id === appointmentId) || this.selectedAppointment;
      const amountLabel = paymentAmountLabel(apt);
      if (!modal) {
        const paymentRef = prompt(`Ingresa referencia de pago o número de comprobante (${amountLabel} MXN):`, 'PAGO-MANUAL-' + Date.now());
        if (!paymentRef) return;
        this._executePayment(appointmentId, paymentRef);
        return;
      }
      const idInput = document.getElementById('payment-apt-id');
      if (idInput) idInput.value = appointmentId;
      const desc = document.getElementById('payment-apt-desc');
      if (desc && apt) {
        desc.textContent = `Validando pago para ${apt.customer_name || 'Cliente'}: ${amountLabel} MXN`;
      }
      const refInput = document.getElementById('payment-ref-input');
      if (refInput) refInput.value = 'PAGO-MANUAL-' + Date.now();
      modal.style.display = 'flex';
    }

    async submitManualPayment() {
      const aptId = document.getElementById('payment-apt-id')?.value;
      const refInput = document.getElementById('payment-ref-input');
      const paymentRef = refInput?.value.trim();
      if (!paymentRef) {
        this.showToast('Ingresa la referencia de pago o comprobante.', 'warn');
        return;
      }
      document.getElementById('agenda-payment-modal').style.display = 'none';
      await this._executePayment(aptId, paymentRef);
    }

    async _executePayment(appointmentId, paymentRef) {
      try {
        const res = await fetch(`/api/appointments/${appointmentId}/confirm-payment`, {
          method: 'POST',
          headers: JSON_HEADERS,
          credentials: 'include',
          body: JSON.stringify({ payment_id: paymentRef })
        });
        const data = await res.json();
        if (!res.ok) {
          this.showToast(data.message || 'Error al validar pago.', 'error');
          return;
        }

        this.showToast('Pago validado exitosamente. Cita confirmada.', 'success');
        this.closeDetails();
        await this.refresh();
      } catch (e) {
        console.error('Error confirming payment:', e);
        this.showToast('Error de conexión.', 'error');
      }
    }

    /**
     * Cancelar cita vía modal accesible (sin prompt())
     */
    openCancelModal(appointmentId) {
      const modal = document.getElementById('agenda-cancel-modal');
      const apt = this.appointments.find(a => a.id === appointmentId) || this.selectedAppointment;
      if (!modal) {
        const reason = prompt('Motivo de cancelación de la cita:');
        if (reason === null) return;
        this.updateStatus(appointmentId, 'CANCELLED_BY_ADMIN', reason || 'Cancelada por taller');
        return;
      }
      const idInput = document.getElementById('cancel-apt-id');
      if (idInput) idInput.value = appointmentId;
      const summaryBox = document.getElementById('cancel-apt-summary');
      if (summaryBox && apt) {
        summaryBox.innerHTML = `
          <div style="font-weight:700;color:var(--a-text);">${escapeHtml(apt.customer_name || 'Cliente')} · ${formatTime(apt.start_at)}</div>
          <div style="font-size:0.75rem;color:var(--a-text-muted);">${escapeHtml(apt.device_summary || '')} — ${escapeHtml(apt.planned_service_summary || '')}</div>
        `;
      }
      const reasonInput = document.getElementById('cancel-reason');
      if (reasonInput) reasonInput.value = '';
      modal.style.display = 'flex';
    }

    setCancelReason(reason) {
      const input = document.getElementById('cancel-reason');
      if (input) input.value = reason;
    }

    async submitCancel() {
      const aptId = document.getElementById('cancel-apt-id')?.value;
      const reason = document.getElementById('cancel-reason')?.value.trim() || 'Cancelada por taller';
      if (!aptId) return;
      document.getElementById('agenda-cancel-modal').style.display = 'none';
      await this.updateStatus(aptId, 'CANCELLED_BY_ADMIN', reason);
    }

    /**
     * Inasistencia No-Show vía modal accesible
     */
    openNoShowModal(appointmentId) {
      const modal = document.getElementById('agenda-noshow-modal');
      const apt = this.appointments.find(a => a.id === appointmentId) || this.selectedAppointment;
      if (!modal) {
        this.updateStatus(appointmentId, 'NO_SHOW', 'Cliente no se presentó');
        return;
      }
      const idInput = document.getElementById('noshow-apt-id');
      if (idInput) idInput.value = appointmentId;
      const desc = document.getElementById('noshow-apt-desc');
      if (desc && apt) {
        desc.textContent = `¿Marcar inasistencia (No-Show) para ${apt.customer_name || 'Cliente'} (${formatTime(apt.start_at)})?`;
      }
      modal.style.display = 'flex';
    }

    async submitNoShow() {
      const aptId = document.getElementById('noshow-apt-id')?.value;
      if (!aptId) return;
      document.getElementById('agenda-noshow-modal').style.display = 'none';
      await this.updateStatus(aptId, 'NO_SHOW', 'Cliente no se presentó a su cita');
    }

    /**
     * Detalle y desbloqueo de horario bloqueado
     */
    openBlockDetails(blockId) {
      const block = this.blocks.find(b => String(b.id) === String(blockId));
      if (!block) return;
      const modal = document.getElementById('agenda-block-detail-modal');
      const body = document.getElementById('agenda-block-detail-body');
      const unblockBtn = document.getElementById('btn-agenda-unblock');
      if (!modal || !body) return;
      body.innerHTML = `
        <div class="drawer-kv"><span>Fecha:</span> <strong>${escapeHtml(block.date)}</strong></div>
        <div class="drawer-kv"><span>Horario:</span> <strong>${block.is_all_day ? 'Día completo' : `${escapeHtml(block.start_time?.slice(0, 5))} – ${escapeHtml(block.end_time?.slice(0, 5))}`}</strong></div>
        <div class="drawer-kv"><span>Categoría:</span> <strong>${escapeHtml(block.category || 'Bloqueo')}</strong></div>
        <div class="drawer-kv"><span>Motivo:</span> <strong>${escapeHtml(block.reason || 'Sin motivo especificado')}</strong></div>
      `;
      if (unblockBtn) {
        unblockBtn.setAttribute('data-agenda-action', 'deleteBlock');
        unblockBtn.setAttribute('data-agenda-args', JSON.stringify([block.id]));
      }
      modal.style.display = 'flex';
    }

    async deleteBlock(blockId) {
      try {
        const res = await fetch(`${API_BASE}/blocks/${blockId}`, {
          method: 'DELETE',
          headers: JSON_HEADERS,
          credentials: 'include'
        });
        if (!res.ok) {
          const err = await res.json();
          this.showToast(err.message || 'Error al desbloquear horario.', 'error');
          return;
        }
        this.showToast('Horario desbloqueado correctamente.', 'success');
        document.getElementById('agenda-block-detail-modal').style.display = 'none';
        await this.refresh();
      } catch (e) {
        console.error('Error deleting block:', e);
        this.showToast('Error de conexión.', 'error');
      }
    }

    /**
     * Helpers de navegación y KPIs interactivos
     */
    backToMonth() {
      this.view = 'month';
      this.updateViewButtons();
      this.renderDateHeader();
      this.updateUrlState();
      this.render();
    }

    openNextAppointment() {
      const todayAppts = (this.todayData?.appointments || []).filter(isActiveAppt);
      const next = todayAppts.find(a => !['COMPLETED', 'CANCELLED_BY_ADMIN', 'NO_SHOW'].includes(a.status));
      if (next) {
        this.openDetails(next.id);
      } else {
        this.showToast('No hay citas pendientes para hoy.', 'info');
      }
    }

    openNextActionAppointment() {
      const todayAppts = (this.todayData?.appointments || []).filter(isActiveAppt);
      const next = todayAppts.find(a => a.status === 'CHECKED_IN') ||
                   todayAppts.find(a => a.appointment_type === 'LIQUID_DAMAGE' && a.status === 'DEVICE_RECEIVED') ||
                   todayAppts.find(a => !['COMPLETED', 'CANCELLED_BY_ADMIN', 'NO_SHOW'].includes(a.status));
      if (next) {
        this.openDetails(next.id);
      } else {
        this.goToToday();
      }
    }

    openTodayView() {
      this.goToToday();
    }

    filterUnpaid() {
      this.filters.status = 'PENDING_PAYMENT';
      this.render();
      this.showToast('Filtrando citas con pago pendiente.', 'info');
    }

    filterOnsite() {
      document.querySelectorAll('[data-agenda-filter-type]').forEach(b => b.classList.remove('active'));
      document.querySelector('[data-agenda-filter-type="ON_SITE"]')?.classList.add('active');
      this.filters.type = 'ON_SITE';
      this.renderCalendar();
      this.showToast('Filtrando servicios a domicilio.', 'info');
    }

    createTicketForAppointment(aptId) {
      const apt = this.appointments.find(a => a.id === aptId) || this.selectedAppointment;
      if (!apt) return;
      this.closeDetails();
      const repairsNav = document.querySelector('[data-view="repairs"]');
      if (repairsNav) repairsNav.click();
      if (typeof window.openRepairModal === 'function') {
        window.openRepairModal();
        if (apt.customer_name) {
          const custInput = document.getElementById('repairCustomer');
          if (custInput) custInput.value = apt.customer_name;
        }
        if (apt.customer_phone) {
          const phoneInput = document.getElementById('repairPhone');
          if (phoneInput) phoneInput.value = apt.customer_phone;
        }
        if (apt.customer_email) {
          const emailInput = document.getElementById('repairEmail');
          if (emailInput) emailInput.value = apt.customer_email;
        }
        if (apt.device_summary) {
          const issueInput = document.getElementById('repairIssue');
          if (issueInput) issueInput.value = `${apt.device_summary} - ${apt.planned_service_summary || ''}`;
        }
      }
    }

    /**
     * REPROGRAMAR CITA
     */
    openRescheduleModal(appointmentId) {
      const apt = this.appointments.find(a => a.id === appointmentId) || this.selectedAppointment;
      if (!apt) return;

      const modal = document.getElementById('agenda-reschedule-modal');
      if (!modal) return;

      document.getElementById('reschedule-apt-id').value = apt.id;
      document.getElementById('reschedule-date').value = cancunTodayISO();
      document.getElementById('reschedule-time').value = formatTime(apt.start_at) || '10:00';
      document.getElementById('reschedule-reason').value = '';

      modal.style.display = 'flex';
    }

    async submitReschedule() {
      const id = document.getElementById('reschedule-apt-id').value;
      const date = document.getElementById('reschedule-date').value;
      const time = document.getElementById('reschedule-time').value;
      const reason = document.getElementById('reschedule-reason').value;

      if (!date || !time) {
        this.showToast('Selecciona nueva fecha y hora.', 'warn');
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/${id}/reschedule`, {
          method: 'POST',
          headers: JSON_HEADERS,
          credentials: 'include',
          body: JSON.stringify({ date, time, reason })
        });
        const data = await res.json();
        if (!res.ok) {
          this.showToast(data.message || 'Error al reprogramar.', 'error');
          return;
        }

        this.showToast('Cita reprogramada con éxito. Historial y pago transferidos.', 'success');
        document.getElementById('agenda-reschedule-modal').style.display = 'none';
        this.closeDetails();
        await this.refresh();
      } catch (e) {
        console.error('Error in reschedule:', e);
        this.showToast('Error de conexión.', 'error');
      }
    }

    /**
     * NUEVA CITA CON ASISTENTE DE CAPACIDAD Y AUTO-DURACIÓN
     */
    openNewAppointmentModal(preDate = null, preTime = null) {
      const modal = document.getElementById('agenda-new-modal');
      if (!modal) return;

      const dInput = document.getElementById('new-apt-date');
      const tInput = document.getElementById('new-apt-time');
      dInput.value = preDate || this.currentDate || cancunTodayISO();
      tInput.value = preTime || '10:00';

      document.getElementById('new-apt-cust-search').value = '';
      document.getElementById('new-apt-name').value = '';
      document.getElementById('new-apt-phone').value = '';
      document.getElementById('new-apt-email').value = '';
      document.getElementById('new-apt-device').value = '';
      document.getElementById('new-apt-service').value = '';
      document.getElementById('new-apt-type').value = 'DROP_OFF';
      document.getElementById('new-apt-location').value = 'WORKSHOP';
      document.getElementById('new-apt-notes').value = '';
      document.getElementById('new-apt-private').value = '';
      document.getElementById('new-apt-override').checked = false;
      document.getElementById('new-apt-override-reason').value = '';
      document.getElementById('new-apt-override-reason-box').style.display = 'none';
      const equipInput = document.getElementById('new-apt-equipment-value');
      if (equipInput) equipInput.value = '';

      this.updateServiceHint('DROP_OFF');
      this.checkNewAptCapacity();

      modal.style.display = 'flex';
    }

    getTypeConfig(type) {
      return this.config?.types?.find(t => t.appointment_type === type) || null;
    }

    updateServiceHint(type) {
      const hintText = document.getElementById('new-apt-service-hint-text');
      const dur = Number(this.getTypeConfig(type)?.duration_minutes) || TYPE_DURATIONS[type] || 30;
      let extra = '';
      if (type === 'ON_SITE') extra = ' Servicio a domicilio: bloquea tiempo de taller y traslados en Cancún.';
      if (type === 'LIQUID_DAMAGE') extra = ' NO ENCENDER NI CARGAR el equipo.';
      if (hintText) hintText.textContent = `Duración estimada: ${dur} min.${extra}`;

      const equipValueGroup = document.getElementById('new-apt-equipment-value-group');
      if (equipValueGroup) equipValueGroup.style.display = type === 'MAINTENANCE' ? 'block' : 'none';
      if (type !== 'MAINTENANCE') {
        const equipInput = document.getElementById('new-apt-equipment-value');
        if (equipInput) equipInput.value = '';
      }

      this.updatePricingDisplay();
    }

    updatePricingDisplay() {
      const type = document.getElementById('new-apt-type')?.value;
      const equipValue = document.getElementById('new-apt-equipment-value')?.value;
      const box = document.getElementById('new-apt-price-box');
      if (!box) return;

      const pricing = computeDisplayPricing(type, equipValue);
      if (!pricing) {
        box.style.display = 'none';
        box.innerHTML = '';
        return;
      }

      box.style.display = 'flex';
      box.innerHTML = `
        <i class="fa-solid fa-tag"></i>
        <span>
          <strong>${escapeHtml(pricing.badge)}</strong><br/>
          ${escapeHtml(pricing.text)}
        </span>
      `;
    }

    checkNewAptCapacity() {
      const date = document.getElementById('new-apt-date')?.value;
      const time = document.getElementById('new-apt-time')?.value;
      const type = document.getElementById('new-apt-type')?.value;
      const indicator = document.getElementById('new-apt-capacity-indicator');
      if (!date || !time || !indicator) return;

      const reqUnits = Number(this.getTypeConfig(type)?.capacity_units) || (type === 'ON_SITE' ? 3 : 1);
      const existing = this.appointments.filter(a =>
        String(a.start_at).slice(0, 10) === date && formatTime(a.start_at) === time &&
        !['COMPLETED', 'CANCELLED_BY_ADMIN', 'CANCELLED_BY_CUSTOMER', 'NO_SHOW', 'RESCHEDULED'].includes(a.status)
      );
      const used = existing.reduce((sum, a) => sum + (Number(a.capacity_units) || 1), 0);
      const remaining = Math.max(0, 3 - used);

      if (used + reqUnits <= 3) {
        indicator.className = 'agenda-capacity-status-box status-avail';
        indicator.innerHTML = `
          <div><i class="fa-solid fa-circle-check"></i> Horario Disponible (${used}/3 espacios ocupados · Quedan ${remaining})</div>
        `;
      } else {
        // Horario lleno -> buscar alternativas automáticas
        const alternatives = this.findAlternativeSlots(date, time);
        indicator.className = 'agenda-capacity-status-box status-full';
        indicator.innerHTML = `
          <div><i class="fa-solid fa-triangle-exclamation"></i> Horario completo (${used}/3 espacios en uso).</div>
          ${alternatives.length ? `
            <div style="font-size:0.7rem;margin-top:2px;">Horarios cercanos disponibles hoy:</div>
            <div class="agenda-alt-chips">
              ${alternatives.map(t => `<button type="button" class="btn-alt-slot" ${actionAttrs('selectAltTime', t)}>${t}</button>`).join('')}
            </div>
          ` : '<div style="font-size:0.7rem;">No hay más espacios libres hoy. Puedes usar autorización manual abajo.</div>'}
        `;
      }
    }

    selectAltTime(time) {
      const tInput = document.getElementById('new-apt-time');
      if (tInput) {
        tInput.value = time;
        this.checkNewAptCapacity();
      }
    }

    findAlternativeSlots(date, requestedTime) {
      const slots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'];
      const avail = [];
      for (const t of slots) {
        if (t === requestedTime) continue;
        const count = this.appointments.filter(a =>
          String(a.start_at).slice(0, 10) === date && formatTime(a.start_at) === t &&
          !['COMPLETED', 'CANCELLED_BY_ADMIN', 'NO_SHOW'].includes(a.status)
        ).reduce((sum, a) => sum + (Number(a.capacity_units) || 1), 0);
        if (count < 3) {
          avail.push(t);
          if (avail.length >= 3) break;
        }
      }
      return avail;
    }

    async submitNewAppointment() {
      const name = document.getElementById('new-apt-name').value.trim();
      const phone = document.getElementById('new-apt-phone').value.trim();
      const email = document.getElementById('new-apt-email').value.trim();
      const date = document.getElementById('new-apt-date').value;
      const time = document.getElementById('new-apt-time').value;
      const type = document.getElementById('new-apt-type').value;
      const location = document.getElementById('new-apt-location').value;
      const device = document.getElementById('new-apt-device').value.trim();
      const service = document.getElementById('new-apt-service').value.trim();
      const equipmentValue = document.getElementById('new-apt-equipment-value')?.value.trim();
      const address = document.getElementById('new-apt-address')?.value.trim();
      const customerNotes = document.getElementById('new-apt-notes').value.trim();
      const privateNotes = document.getElementById('new-apt-private').value.trim();
      const override = document.getElementById('new-apt-override').checked;
      const overrideReason = document.getElementById('new-apt-override-reason').value.trim();

      if (!name || !phone || !date || !time) {
        this.showToast('Nombre, teléfono, fecha y hora son obligatorios.', 'warn');
        return;
      }

      if (override && !overrideReason) {
        this.showToast('Si activas sobrecupo (override), escribe el motivo obligatorio.', 'warn');
        return;
      }

      try {
        const res = await fetch(`${API_BASE}`, {
          method: 'POST',
          headers: JSON_HEADERS,
          credentials: 'include',
          body: JSON.stringify({
            customer_name: name,
            customer_phone: phone,
            customer_email: email || null,
            appointment_type: type,
            location_type: location,
            date,
            time,
            address_line: address || null,
            device_summary: device || null,
            planned_service_summary: service || null,
            equipment_value_mxn: (type === 'MAINTENANCE' && equipmentValue) ? Number(equipmentValue) : null,
            customer_notes: customerNotes || null,
            private_notes: privateNotes || null,
            admin_override: override,
            admin_override_reason: override ? overrideReason : null
          })
        });

        const data = await res.json();
        if (!res.ok) {
          this.showToast(data.message || 'No se pudo crear la cita.', 'error');
          return;
        }

        this.showToast('Cita creada exitosamente.', 'success');
        document.getElementById('agenda-new-modal').style.display = 'none';
        await this.refresh();
      } catch (e) {
        console.error('Error creating appointment:', e);
        this.showToast('Error de conexión.', 'error');
      }
    }

    /**
     * BLOQUEO DE HORARIO
     */
    openBlockModal() {
      const modal = document.getElementById('agenda-block-modal');
      if (!modal) return;
      document.getElementById('block-date').value = this.currentDate || cancunTodayISO();
      document.getElementById('block-start').value = '10:00';
      document.getElementById('block-end').value = '12:00';
      document.getElementById('block-all-day').checked = false;
      document.getElementById('block-category').value = 'UNAVAILABLE';
      document.getElementById('block-reason').value = '';
      modal.style.display = 'flex';
    }

    async submitBlock() {
      const date = document.getElementById('block-date').value;
      const isAllDay = document.getElementById('block-all-day').checked;
      const start = isAllDay ? '00:00:00' : (document.getElementById('block-start').value + ':00');
      const end = isAllDay ? '23:59:59' : (document.getElementById('block-end').value + ':00');
      const category = document.getElementById('block-category').value;
      const reason = document.getElementById('block-reason').value.trim();

      if (!date) {
        this.showToast('Selecciona una fecha.', 'warn');
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/blocks`, {
          method: 'POST',
          headers: JSON_HEADERS,
          credentials: 'include',
          body: JSON.stringify({
            date,
            start_time: start,
            end_time: end,
            is_all_day: isAllDay ? 1 : 0,
            category,
            reason
          })
        });

        if (!res.ok) {
          const err = await res.json();
          this.showToast(err.message || 'Error al bloquear horario.', 'error');
          return;
        }

        this.showToast('Horario bloqueado con éxito.', 'success');
        document.getElementById('agenda-block-modal').style.display = 'none';
        await this.refresh();
      } catch (e) {
        console.error('Error blocking slot:', e);
        this.showToast('Error de conexión.', 'error');
      }
    }

    /**
     * TOAST NOTIFICATIONS DISCRETAS
     */
    showToast(message, type = 'info') {
      const container = document.getElementById('agenda-toast-container');
      if (!container) {
        alert(message);
        return;
      }

      const toast = document.createElement('div');
      toast.className = `agenda-toast toast-${type}`;
      let icon = 'fa-solid fa-circle-info';
      if (type === 'success') icon = 'fa-solid fa-circle-check';
      if (type === 'warn') icon = 'fa-solid fa-triangle-exclamation';
      if (type === 'error') icon = 'fa-solid fa-circle-xmark';

      toast.innerHTML = `<i class="${icon}"></i> <span>${escapeHtml(message)}</span>`;
      container.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.25s ease';
        setTimeout(() => toast.remove(), 250);
      }, 3500);
    }

    selectDay(dateStr) {
      this.currentDate = dateStr;
      this.view = 'day';
      this.updateViewButtons();
      this.renderDateHeader();
      this.updateUrlState();
      this.refresh();
    }

    goToAgendaNav() {
      document.querySelector('[data-view="agenda"]')?.click();
    }

    openTicket(ticketId) {
      if (!ticketId) {
        this.showToast('Esta cita no tiene un ticket de taller asociado.', 'warn');
        return;
      }
      if (typeof window.switchAdminView === 'function') {
        window.switchAdminView('repairs');
      } else {
        document.querySelector('[data-view="repairs"]')?.click();
      }
      if (typeof window.openRepairTicket === 'function') {
        window.openRepairTicket(ticketId);
      } else {
        location.href = `/admin#repairs`;
      }
    }

    resetFilters() {
      this.filters = { type: 'ALL', status: 'ALL', location: 'ALL', search: '' };
      const sInput = document.getElementById('agenda-search-input');
      if (sInput) sInput.value = '';
      document.querySelectorAll('.agenda-filter-btn').forEach(b => b.classList.remove('active'));
      document.querySelector('.agenda-filter-btn[data-agenda-filter-type="ALL"]')?.classList.add('active');
      this.render();
    }

    updateViewButtons() {
      document.querySelectorAll('[data-agenda-view-tab]').forEach(btn => {
        const isAct = btn.dataset.agendaViewTab === this.view;
        btn.classList.toggle('active', isAct);
        btn.setAttribute('aria-selected', String(isAct));
      });
    }

    bindKeyboardShortcuts() {
      document.addEventListener('keydown', (e) => {
        // Soporte de accesibilidad para teclado: Enter o Space activa celdas/cards interactivas
        if (e.key === 'Enter' || e.key === ' ') {
          const actionEl = e.target.closest('[data-agenda-action]');
          if (actionEl && !['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
            e.preventDefault();
            actionEl.click();
            return;
          }
        }

        // Ignorar si el usuario está escribiendo en un input o modal
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
          if (e.key === 'Escape') e.target.blur();
          return;
        }

        if (e.key === 'n' || e.key === 'N') {
          e.preventDefault();
          this.openNewAppointmentModal();
        } else if (e.key === 't' || e.key === 'T') {
          e.preventDefault();
          this.goToToday();
        } else if (e.key === '/') {
          e.preventDefault();
          const s = document.getElementById('agenda-search-input');
          if (s) { s.focus(); s.select(); }
        } else if (e.key === 'Escape') {
          this.closeAllModals();
        }
      });
    }

    closeAllModals() {
      this.closeDetails();
      document.querySelectorAll('.agenda-modal-overlay').forEach(m => m.style.display = 'none');
    }

    bindEvents() {
      // Delegado único para todo botón/celda generado dinámicamente vía innerHTML
      // (CSP script-src-attr:none bloquea onclick="" inline, ver actionAttrs()).
      document.addEventListener('click', async (e) => {
        const el = e.target.closest('[data-agenda-action]');
        if (!el) return;
        if (el.dataset.agendaStop) e.stopPropagation();
        const method = el.dataset.agendaAction;
        let args = [];
        try { args = JSON.parse(el.dataset.agendaArgs || '[]'); } catch (_) {}
        if (typeof this[method] === 'function') {
          e.preventDefault();
          if (el.disabled) return;
          el.disabled = true;
          el.setAttribute('aria-busy', 'true');
          try { await this[method](...args); }
          finally { el.disabled = false; el.removeAttribute('aria-busy'); }
        }
      });

      // Pestañas de vista (Hoy, Semana, Día, Mes, Lista)
      document.querySelectorAll('[data-agenda-view-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
          this.switchView(btn.dataset.agendaViewTab);
        });
      });

      // Navegación de fechas
      document.getElementById('agenda-btn-prev')?.addEventListener('click', () => {
        this.stepDate(-1);
      });

      document.getElementById('agenda-btn-today')?.addEventListener('click', () => {
        this.goToToday();
      });

      document.getElementById('agenda-btn-next')?.addEventListener('click', () => {
        this.stepDate(1);
      });

      // Filtros rápidos
      document.querySelectorAll('[data-agenda-filter-type]').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('[data-agenda-filter-type]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.filters.type = btn.dataset.agendaFilterType;
          this.renderCalendar();
        });
      });

      // Buscador en tiempo real con contador
      const searchInput = document.getElementById('agenda-search-input');
      const searchCount = document.getElementById('agenda-search-count');
      if (searchInput) {
        let deb;
        searchInput.addEventListener('input', (e) => {
          clearTimeout(deb);
          deb = setTimeout(() => {
            this.filters.search = e.target.value.trim();
            this.renderCalendar();
            if (searchCount) {
              const resCount = this.getFilteredAppointments().length;
              searchCount.style.display = this.filters.search ? 'inline-block' : 'none';
              searchCount.textContent = `${resCount}`;
            }
          }, 200);
        });
      }

      // Toggle de leyenda
      document.getElementById('agenda-legend-toggle')?.addEventListener('click', () => {
        const leg = document.getElementById('agenda-legend-bar');
        if (leg) {
          const isHidden = leg.style.display === 'none';
          leg.style.display = isHidden ? 'flex' : 'none';
        }
      });

      // Botones superiores de acción
      document.getElementById('agenda-btn-new')?.addEventListener('click', () => this.openNewAppointmentModal());
      document.getElementById('agenda-btn-block')?.addEventListener('click', () => this.openBlockModal());
      document.getElementById('agenda-btn-refresh')?.addEventListener('click', () => this.refresh());

      // Tipo de cita en nuevo modal -> auto duración y capacidad
      document.getElementById('new-apt-type')?.addEventListener('change', (e) => {
        this.updateServiceHint(e.target.value);
        this.checkNewAptCapacity();
      });
      document.getElementById('new-apt-equipment-value')?.addEventListener('input', () => this.updatePricingDisplay());
      document.getElementById('new-apt-date')?.addEventListener('change', () => this.checkNewAptCapacity());
      document.getElementById('new-apt-time')?.addEventListener('change', () => this.checkNewAptCapacity());
      document.getElementById('new-apt-location')?.addEventListener('change', (e) => {
        const addrGroup = document.getElementById('new-apt-address-group');
        if (addrGroup) addrGroup.style.display = e.target.value === 'ON_SITE' ? 'block' : 'none';
      });

      // Override toggle
      document.getElementById('new-apt-override')?.addEventListener('change', (e) => {
        const box = document.getElementById('new-apt-override-reason-box');
        if (box) box.style.display = e.target.checked ? 'block' : 'none';
      });

      // Autocomplete clientes
      const custSearch = document.getElementById('new-apt-cust-search');
      if (custSearch) {
        let deb;
        custSearch.addEventListener('input', (e) => {
          clearTimeout(deb);
          const q = e.target.value.trim();
          if (q.length < 2) return;
          deb = setTimeout(async () => {
            try {
              const res = await fetch(`${API_BASE}/customers?q=${encodeURIComponent(q)}`, { credentials: 'include' });
              if (!res.ok) return;
              const { customers } = await res.json();
              const datalist = document.getElementById('new-apt-cust-results');
              if (datalist && customers) {
                datalist.innerHTML = customers.map(c =>
                  `<option value="${escapeHtml(c.name || '')}" data-phone="${escapeHtml(c.phone || '')}" data-email="${escapeHtml(c.email || '')}">${c.phone ? ' · ' + escapeHtml(c.phone) : ''}</option>`
                ).join('');
              }
            } catch (_) {}
          }, 250);
        });

        custSearch.addEventListener('change', (e) => {
          const val = e.target.value;
          const opt = document.querySelector(`#new-apt-cust-results option[value="${val}"]`);
          if (opt) {
            document.getElementById('new-apt-name').value = val;
            if (opt.dataset.phone) document.getElementById('new-apt-phone').value = opt.dataset.phone;
            if (opt.dataset.email) document.getElementById('new-apt-email').value = opt.dataset.email;
          }
        });
      }

      // Presets de bloqueo rápido
      document.querySelectorAll('.btn-preset[data-block-cat]').forEach(btn => {
        btn.addEventListener('click', () => {
          document.getElementById('block-category').value = btn.dataset.blockCat;
          document.getElementById('block-reason').value = btn.dataset.blockReason || '';
        });
      });

      // Bloquear día completo toggle
      document.getElementById('block-all-day')?.addEventListener('change', (e) => {
        const hoursRow = document.getElementById('block-hours-row');
        if (hoursRow) hoursRow.style.display = e.target.checked ? 'none' : 'grid';
      });

      // Botones de cierre de modal
      document.querySelectorAll('[data-close-agenda-modal]').forEach(b => {
        b.addEventListener('click', () => this.closeAllModals());
      });

      // Escuchar eventos de cambio de vista admin
      window.addEventListener('admin:switch-view', (e) => {
        if (e.detail?.view === 'agenda' || e.detail?.view === 'dashboard') {
          this.refresh();
        }
      });
    }
  }

  // Instanciar globalmente
  window.adminAgenda = new AgendaManager();
  window.agendaApp = window.adminAgenda;
  document.addEventListener('DOMContentLoaded', () => {
    window.adminAgenda.init();
  });
})();
