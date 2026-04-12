/**
 * components/buttons/WhatsAppBtn.js
 * Componente Web que genera un botón dinámico de WhatsApp.
 * Uso: <whatsapp-btn message="Hola, me interesa el paquete Elite" label="Elegir Elite"></whatsapp-btn>
 * Todos los botones usan el link corporativo fijo.
 */

const WA_URL = 'https://wa.me/message/E5K6UIFIIVXAI1';

class WhatsAppBtn extends HTMLElement {
    connectedCallback() {
        const label = this.getAttribute('label') || 'Contactar por WhatsApp';
        const message = this.getAttribute('message') || '';
        const variant = this.getAttribute('variant') || 'primary'; // primary | secondary | outline
        const fullWidth = this.hasAttribute('full-width');

        const btnClass = `btn btn-${variant}${fullWidth ? ' w-100' : ''}`;

        this.innerHTML = `
            <button 
                class="${btnClass}"
                onclick="window.open('${WA_URL}', '_blank', 'noopener')"
                title="${label}"
            >
                ${label} <i class="fa-brands fa-whatsapp"></i>
            </button>`;
    }
}

customElements.define('whatsapp-btn', WhatsAppBtn);

// También exportar función global para el HTML que no usa componentes
window.openWhatsApp = function() {
    window.open(WA_URL, '_blank', 'noopener');
};
