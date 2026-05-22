/**
 * components/buttons/WhatsAppBtn.js
 * Componente Web que genera un botón dinámico de WhatsApp.
 * Uso: <whatsapp-btn message="Hola, me interesa el paquete Elite" label="Elegir Elite"></whatsapp-btn>
 * Todos los botones usan el link corporativo fijo.
 */

const WA_PHONE = '529986690777';

class WhatsAppBtn extends HTMLElement {
    connectedCallback() {
        const label = this.getAttribute('label') || 'Contactar por WhatsApp';
        const msg = this.getAttribute('message') || 'Hola, quiero información.';
        const variant = this.getAttribute('variant') || 'primary'; // primary | secondary | outline
        const fullWidth = this.hasAttribute('full-width');

        const btnClass = `btn btn-${variant}${fullWidth ? ' w-100' : ''}`;
        const url = `https://wa.me/${WA_PHONE}?text=${encodeURIComponent(msg)}`;

        this.innerHTML = `
            <button 
                class="${btnClass}"
                onclick="window.open('${url}', '_blank', 'noopener')"
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
