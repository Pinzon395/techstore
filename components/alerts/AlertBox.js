/**
 * components/alerts/AlertBox.js
 * Web Component para alertas con icono SVG inline.
 */
var ICONS = {
  warning: '<svg viewBox="0 0 512 512" width="14" height="14" fill="currentColor"><path d="M256 32c14.2 0 27.3 7.5 34.5 19.8l216 368c7.3 12.4 7.3 27.7 .2 40.1S489.9 480 475.7 480H36.3c-14.2 0-27.2-7.5-34.5-19.8s-7.1-27.8 .2-40.1l216-368C225.1 39.5 238.2 32 252.4 32h3.6zm0 128c-13.3 0-24 10.7-24 24V296c0 13.3 10.7 24 24 24s24-10.7 24-24V184c0-13.3-10.7-24-24-24zm32 224a32 32 0 1 0-64 0 32 32 0 1 0 64 0z"/></svg>',
  info: '<svg viewBox="0 0 512 512" width="14" height="14" fill="currentColor"><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM216 336h24V272H216c-13.3 0-24-10.7-24-24s10.7-24 24-24h48c13.3 0 24 10.7 24 24v88h8c13.3 0 24 10.7 24 24s-10.7 24-24 24H216c-13.3 0-24-10.7-24-24s10.7-24 24-24zm40-208a32 32 0 1 1 0 64 32 32 0 1 1 0-64z"/></svg>',
  success: '<svg viewBox="0 0 512 512" width="14" height="14" fill="currentColor"><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209L241 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L335 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z"/></svg>'
};

var ALERT_CONFIG = {
  warning: { bg: '#fffbeb', border: '#fcd34d', color: '#92400e', iconBg: '#fef3c7', iconColor: '#d97706' },
  info:    { bg: '#eff6ff', border: '#93c5fd', color: '#1e3a5f', iconBg: '#dbeafe', iconColor: '#2563eb' },
  success: { bg: '#ecfdf5', border: '#6ee7b7', color: '#065f46', iconBg: '#d1fae5', iconColor: '#10b981' },
};

class AlertBox extends HTMLElement {
  connectedCallback() {
    if (this.hasAttribute('rendered')) return;
    setTimeout(() => {
      if (this.hasAttribute('rendered')) return;
      this.setAttribute('rendered', 'true');
      var type = this.getAttribute('type') || 'info';
      var cfg = ALERT_CONFIG[type] || ALERT_CONFIG.info;
      var ico = ICONS[type] || ICONS.info;
      var originalText = this.innerHTML.trim();
      this.innerHTML =
        '<div style="display:flex;align-items:flex-start;gap:10px;background:'+cfg.bg+';border:1px solid '+cfg.border+';border-radius:10px;padding:10px 14px;margin-bottom:10px;font-size:0.83rem;color:'+cfg.color+';font-weight:600;line-height:1.5">' +
        '<span style="display:inline-flex;align-items:center;justify-content:center;background:'+cfg.iconBg+';border-radius:50%;width:26px;height:26px;min-width:26px;flex-shrink:0;margin-top:1px;color:'+cfg.iconColor+'">'+ico+'</span>' +
        '<span>'+originalText+'</span></div>';
    }, 0);
  }
}

customElements.define('alert-box', AlertBox);
