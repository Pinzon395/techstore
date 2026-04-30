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
 */

const ALERT_CONFIG = {
    warning: {
        bg: '#fffbeb',
        border: '#fcd34d',
        color: '#92400e',
        iconBg: '#fef3c7',
        icon: 'fa-triangle-exclamation',
        iconColor: '#d97706',
    },
    info: {
        bg: '#eff6ff',
        border: '#93c5fd',
        color: '#1e3a5f',
        iconBg: '#dbeafe',
        icon: 'fa-circle-info',
        iconColor: '#2563eb',
    },
    success: {
        bg: '#ecfdf5',
        border: '#6ee7b7',
        color: '#065f46',
        iconBg: '#d1fae5',
        icon: 'fa-circle-check',
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
            
            // Get original text before replacing innerHTML
            const originalText = this.textContent.trim().replace(/\s+/g, ' ');

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
                    ">
                        <i class="fa-solid ${cfg.icon}" style="color:${cfg.iconColor}; font-size:0.8rem;"></i>
                    </span>
                    <span>${originalText}</span>
                </div>`;
        }, 0);
    }
}

customElements.define('alert-box', AlertBox);
