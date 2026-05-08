/**
 * components/alerts/AlertBox.js
 * Web Component reutilizable para alertas visuales tipo info, warning, success.
 * Uso: <alert-box type="warning">Texto aquí</alert-box>
 *
 * =========================================================================
 * 🔒 COMPONENTE PROTEGIDO - NO MODIFICAR DISEÑO NI ESTRUCTURA 🔒
 * =========================================================================
 * Este componente ha sido bloqueado explícitamente para mantener consistencia
 * visual en la sección de Paquetes Elite y futuras implementaciones.
 * - NO alterar colores, bordes, espaciados ni tipografía.
 * - NO modificar las reglas de flexbox ni márgenes.
 * - NO refactorizar ni eliminar la estructura de shadow/light DOM interno.
 * Cualquier cambio requiere confirmación explícita del propietario del sitio.
 * =========================================================================
 *
 * NOTA TÉCNICA: Los iconos usan SVG inline (no Font Awesome) para garantizar
 * su visibilidad independientemente del orden de carga de scripts externos.
 */

// SVG inline icons – no dependen de Font Awesome
const ALERT_ICONS = {
    warning: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="14" height="14" style="display:block;">
        <path fill-rule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clip-rule="evenodd"/>
    </svg>`,
    info: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="14" height="14" style="display:block;">
        <path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" clip-rule="evenodd"/>
    </svg>`,
    success: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="14" height="14" style="display:block;">
        <path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clip-rule="evenodd"/>
    </svg>`,
};

const ALERT_CONFIG = {
    warning: {
        bg: '#fffbeb',
        border: '#fcd34d',
        color: '#92400e',
        iconBg: '#fef3c7',
        iconColor: '#d97706',
    },
    info: {
        bg: '#eff6ff',
        border: '#93c5fd',
        color: '#1e3a5f',
        iconBg: '#dbeafe',
        iconColor: '#2563eb',
    },
    success: {
        bg: '#ecfdf5',
        border: '#6ee7b7',
        color: '#065f46',
        iconBg: '#d1fae5',
        iconColor: '#10b981',
    },
};

class AlertBox extends HTMLElement {
    connectedCallback() {
        if (this.hasAttribute('rendered')) return;

        // Wait a tick to ensure inner text is parsed if created dynamically
        setTimeout(() => {
            if (this.hasAttribute('rendered')) return;
            this.setAttribute('rendered', 'true');

            const type = this.getAttribute('type') || 'info';
            const cfg = ALERT_CONFIG[type] || ALERT_CONFIG.info;
            const svgIcon = ALERT_ICONS[type] || ALERT_ICONS.info;

            // Preserve original inner HTML (supports <strong>, etc.)
            const originalHTML = this.innerHTML.trim();

            this.innerHTML = `
                <div style="
                    display:flex;
                    align-items:flex-start;
                    gap:10px;
                    background:${cfg.bg};
                    border:1px solid ${cfg.border};
                    border-radius:10px;
                    padding:10px 14px;
                    margin-bottom:10px;
                    font-size:0.83rem;
                    color:${cfg.color};
                    font-weight:600;
                    line-height:1.5;
                ">
                    <span style="
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        background:${cfg.iconBg};
                        border-radius:50%;
                        width:26px;
                        height:26px;
                        flex-shrink:0;
                        margin-top:1px;
                        color:${cfg.iconColor};
                    ">${svgIcon}</span>
                    <span>${originalHTML}</span>
                </div>`;
        }, 0);
    }
}

customElements.define('alert-box', AlertBox);
