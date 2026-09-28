/**
 * Pixon PC — Calendario de Disponibilidad Público
 * ZERO PII: sólo consulta /api/appointments/availability/month y /availability
 * Integra con el formulario público de tickets (service-ticket.js) precargando fecha/hora.
 */
'use strict';

(function () {
  /* ---------------------------------------------------------------
   * HELPERS
   * --------------------------------------------------------------- */
  function cancunTodayISO() {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Cancun',
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const m = Object.fromEntries(parts.map(p => [p.type, p.value]));
    return `${m.year}-${m.month}-${m.day}`;
  }

  function cancunMonthISO() {
    return cancunTodayISO().slice(0, 7);
  }

  function formatDateLabel(isoDate) {
    const [y, mo, d] = isoDate.split('-').map(Number);
    const dt = new Date(Date.UTC(y, mo - 1, d, 12));
    return dt.toLocaleDateString('es-MX', {
      weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Cancun'
    });
  }

  function formatMonthLabel(isoMonth) {
    const [y, mo] = isoMonth.split('-').map(Number);
    const dt = new Date(Date.UTC(y, mo - 1, 1, 12));
    const formatted = dt.toLocaleDateString('es-MX', {
      month: 'long', year: 'numeric', timeZone: 'America/Cancun'
    });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ---------------------------------------------------------------
   * PUBLIC AVAILABILITY MANAGER
   * --------------------------------------------------------------- */
  class PublicAvailabilityWidget {
    constructor(rootEl) {
      this.root = rootEl;
      this.currentMonth = cancunMonthISO();
      this.selectedDate = null;
      this.monthData = null;   // { days: [...] }
      this.daySlots = null;    // per-day slots
      this.loading = false;

      this._render();
      this._bindNav();
      this.loadMonth();
    }

    /* ── HTML skeleton ── */
    _render() {
      this.root.innerHTML = `
        <div class="pac-widget" role="region" aria-label="Disponibilidad de citas en tiempo real">
          <div class="pac-header">
            <button class="pac-nav-btn" id="pac-prev" aria-label="Mes anterior" type="button">
              <i class="fa-solid fa-chevron-left"></i>
            </button>
            <span class="pac-month-label" id="pac-month-label"></span>
            <button class="pac-nav-btn" id="pac-next" aria-label="Mes siguiente" type="button">
              <i class="fa-solid fa-chevron-right"></i>
            </button>
          </div>

          <div class="pac-week-labels" aria-hidden="true">
            <span>Dom</span><span>Lun</span><span>Mar</span>
            <span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span>
          </div>

          <div class="pac-month-grid" id="pac-month-grid">
            <div class="pac-loading-state" aria-live="polite">Cargando disponibilidad…</div>
          </div>

          <div class="pac-day-panel" id="pac-day-panel" hidden>
            <div class="pac-day-panel-header">
              <button class="pac-back-btn" id="pac-back" type="button" aria-label="Volver al mes">
                <i class="fa-solid fa-arrow-left"></i> Mes
              </button>
              <h3 class="pac-day-title" id="pac-day-title"></h3>
            </div>
            <div id="pac-slots-list"></div>
          </div>

          <div class="pac-legend" aria-label="Leyenda">
            <span class="pac-legend-dot pac-dot-avail"></span> Disponible
            <span class="pac-legend-dot pac-dot-limited"></span> Últimos espacios
            <span class="pac-legend-dot pac-dot-full"></span> Lleno
          </div>
        </div>
      `;

      this._monthLabel = this.root.querySelector('#pac-month-label');
      this._monthGrid = this.root.querySelector('#pac-month-grid');
      this._dayPanel = this.root.querySelector('#pac-day-panel');
      this._dayTitle = this.root.querySelector('#pac-day-title');
      this._slotsList = this.root.querySelector('#pac-slots-list');
    }

    _bindNav() {
      this.root.querySelector('#pac-prev').addEventListener('click', () => this._stepMonth(-1));
      this.root.querySelector('#pac-next').addEventListener('click', () => this._stepMonth(1));
      this.root.querySelector('#pac-back').addEventListener('click', () => this._showMonth());
    }

    _stepMonth(dir) {
      const [y, m] = this.currentMonth.split('-').map(Number);
      const dt = new Date(Date.UTC(y, m - 1 + dir, 1, 12));
      this.currentMonth = dt.toISOString().slice(0, 7);
      this.selectedDate = null;
      this._showMonth();
      this.loadMonth();
    }

    /* ── Network ── */
    async loadMonth() {
      this.loading = true;
      if (this._monthLabel) this._monthLabel.textContent = formatMonthLabel(this.currentMonth);
      this._monthGrid.innerHTML = '<div class="pac-loading-state" aria-live="polite">Cargando…</div>';

      try {
        const res = await fetch(`/api/appointments/availability/month?month=${this.currentMonth}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('fail');
        const data = await res.json();
        this.monthData = data;
        this._renderMonthGrid(data.days || []);
      } catch (_) {
        this._monthGrid.innerHTML = '<div class="pac-loading-state">No se pudo cargar la disponibilidad.</div>';
      } finally {
        this.loading = false;
      }
    }

    async loadDay(dateStr) {
      this._slotsList.innerHTML = '<div class="pac-loading-state">Cargando horarios…</div>';
      try {
        const res = await fetch(`/api/appointments/availability?date=${dateStr}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('fail');
        const data = await res.json();
        this.daySlots = data;
        this._renderDaySlots(dateStr, data);
      } catch (_) {
        this._slotsList.innerHTML = '<div class="pac-loading-state">No se pudieron cargar los horarios.</div>';
      }
    }

    /* ── Renders ── */
    _renderMonthGrid(days) {
      const todayISO = cancunTodayISO();
      const [y, mo] = this.currentMonth.split('-').map(Number);
      const firstDay = new Date(Date.UTC(y, mo - 1, 1, 12)).getUTCDay();

      let html = '';
      // Empty cells before first day
      for (let i = 0; i < firstDay; i++) {
        html += '<div class="pac-cell pac-cell-empty" aria-hidden="true"></div>';
      }

      days.forEach(day => {
        const isPast = day.date < todayISO;
        const isToday = day.date === todayISO;
        const d = parseInt(day.date.slice(8), 10);

        let statusClass = 'pac-cell-closed';
        let label = 'Cerrado';
        let ariaLabel = `${day.date}: cerrado`;
        let clickable = false;

        if (!isPast && day.status !== 'CLOSED') {
          clickable = true;
          if (day.status === 'FULL') {
            statusClass = 'pac-cell-full';
            label = 'Lleno';
            clickable = false;
          } else if (day.status === 'LIMITED') {
            statusClass = 'pac-cell-limited';
            label = 'Último espacio';
          } else {
            statusClass = 'pac-cell-avail';
            label = 'Disponible';
          }
          ariaLabel = `${day.date}: ${label}`;
        } else if (isPast) {
          statusClass = 'pac-cell-past';
          label = '';
          ariaLabel = `${day.date}: pasado`;
        }

        html += `
          <div
            class="pac-cell ${statusClass}${isToday ? ' pac-cell-today' : ''}${this.selectedDate === day.date ? ' pac-cell-selected' : ''}"
            data-date="${day.date}"
            ${clickable ? `tabindex="0" role="button" aria-label="${escapeHtml(ariaLabel)}"` : `aria-label="${escapeHtml(ariaLabel)}" aria-disabled="true"`}
          >
            <span class="pac-cell-num">${d}</span>
            ${label ? `<span class="pac-cell-status">${escapeHtml(label)}</span>` : ''}
          </div>
        `;
      });

      this._monthGrid.innerHTML = html;

      // Delegate clicks
      this._monthGrid.querySelectorAll('.pac-cell[data-date][tabindex="0"]').forEach(cell => {
        cell.addEventListener('click', () => this._selectDay(cell.dataset.date));
        cell.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this._selectDay(cell.dataset.date); }
        });
      });
    }

    _renderDaySlots(dateStr, data) {
      if (!data.is_open) {
        this._slotsList.innerHTML = `
          <div class="pac-no-slots">
            <i class="fa-solid fa-lock"></i>
            ${escapeHtml(data.message || 'Este día no tiene horarios disponibles.')}
          </div>
        `;
        return;
      }

      const slots = (data.slots || []).filter(s => s.available);

      if (!slots.length) {
        this._slotsList.innerHTML = `
          <div class="pac-no-slots">
            <i class="fa-solid fa-calendar-xmark"></i>
            Este día está completamente lleno. Selecciona otro día.
          </div>
        `;
        return;
      }

      this._slotsList.innerHTML = `
        <p class="pac-slot-intro">Selecciona un horario disponible para agendar tu servicio.</p>
        <div class="pac-slots-grid" role="list">
          ${slots.map(slot => {
            const remaining = slot.remaining_capacity ?? slot.remainingCapacity ?? 1;
            const isLimited = slot.state === 'PARTIAL';
            return `
              <button
                class="pac-slot-btn${isLimited ? ' pac-slot-limited' : ''}"
                data-time="${escapeHtml(slot.time)}"
                data-date="${escapeHtml(dateStr)}"
                type="button"
                role="listitem"
                aria-label="${slot.time}${isLimited ? `, ${remaining} espacio disponible` : ', disponible'}"
              >
                <span class="pac-slot-time">${escapeHtml(slot.time)}</span>
                ${isLimited ? `<span class="pac-slot-tag">Último espacio</span>` : '<span class="pac-slot-tag pac-tag-avail">Disponible</span>'}
              </button>
            `;
          }).join('')}
        </div>
      `;

      this._slotsList.querySelectorAll('.pac-slot-btn').forEach(btn => {
        btn.addEventListener('click', () => this._handleSlotClick(btn.dataset.date, btn.dataset.time));
      });
    }

    /* ── Interactions ── */
    _selectDay(dateStr) {
      this.selectedDate = dateStr;

      // Refresh selected state visually
      this._monthGrid.querySelectorAll('.pac-cell').forEach(c => {
        c.classList.toggle('pac-cell-selected', c.dataset.date === dateStr);
      });

      this._showDayPanel();
      this._dayTitle.textContent = formatDateLabel(dateStr);
      this.loadDay(dateStr);
    }

    _showDayPanel() {
      this._monthGrid.closest('.pac-widget').querySelector('.pac-month-grid').style.display = 'none';
      this._monthGrid.closest('.pac-widget').querySelector('.pac-week-labels').style.display = 'none';
      this._dayPanel.hidden = false;
    }

    _showMonth() {
      this._monthGrid.closest('.pac-widget').querySelector('.pac-month-grid').style.display = '';
      this._monthGrid.closest('.pac-widget').querySelector('.pac-week-labels').style.display = '';
      this._dayPanel.hidden = true;
      this.selectedDate = null;
    }

    /**
     * Prefills the public booking form (service-ticket.js targets)
     * then scrolls to it so the user lands on the form immediately.
     */
    _handleSlotClick(dateStr, timeStr) {
      // 1. Try the new appointment form (date + time inputs)
      const dateInput = document.getElementById('appointment_date') ||
                        document.getElementById('appointmentDate') ||
                        document.querySelector('input[name="appointment_date"]') ||
                        document.querySelector('input[type="date"]');
      const timeInput = document.getElementById('appointment_time') ||
                        document.getElementById('appointmentTime') ||
                        document.querySelector('select[name="appointment_time"]') ||
                        document.querySelector('select[id*="time"]');

      if (dateInput) {
        dateInput.value = dateStr;
        dateInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      if (timeInput) {
        // After date change, the availability script repopulates the select;
        // we store the intended time and set it after the fetch completes.
        const trySetTime = () => {
          const opts = Array.from(timeInput.options);
          const match = opts.find(o => o.value === timeStr || o.text.startsWith(timeStr));
          if (match) {
            timeInput.value = match.value;
            timeInput.dispatchEvent(new Event('change', { bubbles: true }));
          }
        };
        // First try immediately (if options already populated)
        trySetTime();
        // Also retry after a short delay for async option repopulation
        setTimeout(trySetTime, 800);
        setTimeout(trySetTime, 1500);
      }

      // 2. Scroll to the form
      const form = document.getElementById('service-ticket-form') ||
                   document.querySelector('form[data-ticket-form]') ||
                   document.querySelector('form');
      if (form) {
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      // 3. Friendly toast notification
      this._showToast(`Horario ${dateStr} ${timeStr} seleccionado. Completa el formulario para confirmar.`);
    }

    _showToast(msg) {
      const t = document.createElement('div');
      t.className = 'pac-toast';
      t.setAttribute('role', 'status');
      t.setAttribute('aria-live', 'polite');
      t.textContent = msg;
      document.body.appendChild(t);
      requestAnimationFrame(() => t.classList.add('pac-toast-visible'));
      setTimeout(() => { t.classList.remove('pac-toast-visible'); setTimeout(() => t.remove(), 350); }, 3500);
    }
  }

  /* ---------------------------------------------------------------
   * HERO WIDGET (compact — shows today's next available slots)
   * --------------------------------------------------------------- */
  function initHeroWidget(el) {
    const todayISO = cancunTodayISO();

    el.innerHTML = `
      <div class="pac-hero-widget" aria-label="Próximos horarios disponibles hoy">
        <div class="pac-hero-header">
          <i class="fa-solid fa-calendar-check" aria-hidden="true"></i>
          Disponibilidad en tiempo real
        </div>
        <div class="pac-hero-slots" id="pac-hero-slots-list" aria-live="polite">
          <span class="pac-hero-loading"><i class="fa-solid fa-spinner fa-spin"></i> Cargando…</span>
        </div>
        <button class="pac-hero-full-btn" id="pac-hero-expand" type="button">
          Ver calendario completo <i class="fa-solid fa-calendar-days"></i>
        </button>
      </div>
    `;

    const slotsEl = el.querySelector('#pac-hero-slots-list');
    const expandBtn = el.querySelector('#pac-hero-expand');

    // Load today
    fetch(`/api/appointments/availability?date=${todayISO}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        if (!data.is_open || !data.slots) {
          slotsEl.innerHTML = '<span class="pac-hero-note">Hoy sin disponibilidad. Ver calendario completo.</span>';
          return;
        }
        const available = (data.slots || []).filter(s => s.available).slice(0, 4);
        if (!available.length) {
          slotsEl.innerHTML = '<span class="pac-hero-note">Hoy lleno. Consulta otros días en el calendario.</span>';
          return;
        }
        slotsEl.innerHTML = `
          <span class="pac-hero-today-label">Hoy</span>
          ${available.map(s => `
            <button class="pac-hero-slot" data-date="${todayISO}" data-time="${escapeHtml(s.time)}" type="button">
              ${escapeHtml(s.time)}
              ${s.state === 'PARTIAL' ? '<small>Último</small>' : ''}
            </button>
          `).join('')}
        `;

        slotsEl.querySelectorAll('.pac-hero-slot').forEach(btn => {
          btn.addEventListener('click', () => _handleHeroSlot(btn.dataset.date, btn.dataset.time, el));
        });
      })
      .catch(() => {
        slotsEl.innerHTML = '<span class="pac-hero-note">No se pudo cargar disponibilidad.</span>';
      });

    // Full calendar expand: renders a modal overlay
    expandBtn.addEventListener('click', () => _openFullCalendarModal(el));
  }

  function _handleHeroSlot(dateStr, timeStr, heroEl) {
    _openFullCalendarModal(heroEl);
    // After modal opens, simulate date selection
    setTimeout(() => {
      const modal = document.getElementById('pac-full-calendar-modal');
      if (!modal) return;
      const widget = modal._pacWidget;
      if (!widget) return;
      widget._selectDay(dateStr);
      // Then after day loads, select the time slot
      setTimeout(() => {
        const btn = modal.querySelector(`.pac-slot-btn[data-time="${timeStr}"]`);
        if (btn) btn.click();
      }, 1000);
    }, 300);
  }

  function _openFullCalendarModal(triggerEl) {
    let modal = document.getElementById('pac-full-calendar-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'pac-full-calendar-modal';
      modal.className = 'pac-modal-overlay';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-label', 'Calendario de disponibilidad');
      modal.innerHTML = `
        <div class="pac-modal-box">
          <div class="pac-modal-top">
            <h2 class="pac-modal-title">
              <i class="fa-solid fa-calendar-days" aria-hidden="true"></i>
              Disponibilidad Pixon PC
            </h2>
            <button class="pac-modal-close" id="pac-modal-close-btn" type="button" aria-label="Cerrar">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div id="pac-modal-content"></div>
        </div>
      `;
      document.body.appendChild(modal);

      modal.querySelector('#pac-modal-close-btn').addEventListener('click', () => {
        modal.classList.remove('pac-modal-visible');
        setTimeout(() => modal.remove(), 250);
      });
      modal.addEventListener('click', e => {
        if (e.target === modal) {
          modal.classList.remove('pac-modal-visible');
          setTimeout(() => modal.remove(), 250);
        }
      });
      document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape' && document.getElementById('pac-full-calendar-modal')) {
          document.getElementById('pac-full-calendar-modal')?.remove();
          document.removeEventListener('keydown', escHandler);
        }
      });

      const contentEl = modal.querySelector('#pac-modal-content');
      modal._pacWidget = new PublicAvailabilityWidget(contentEl);
      requestAnimationFrame(() => modal.classList.add('pac-modal-visible'));
    } else {
      modal.classList.add('pac-modal-visible');
    }
  }

  /* ---------------------------------------------------------------
   * INIT
   * --------------------------------------------------------------- */
  function init() {
    // Full inline calendar (e.g. in a dedicated booking section)
    document.querySelectorAll('[data-pac-calendar]').forEach(el => {
      new PublicAvailabilityWidget(el);
    });

    // Hero compact widget
    document.querySelectorAll('[data-pac-hero]').forEach(el => {
      initHeroWidget(el);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
