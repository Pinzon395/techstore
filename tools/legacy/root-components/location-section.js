/**
 * location-section.js — Sección de Ubicación compartida
 *
 * Inyecta una sección uniforme de Ubicación + Cobertura en cualquier página
 * que tenga <div id="location-placeholder"></div>.
 *
 * URL canónica del lugar: https://maps.app.goo.gl/aLrP9whG5R1Wn2kq9
 * Coordenadas reales: 21.157875, -86.896057 (Cancún, Q.R.)
 *
 * Uso:
 *   <div id="location-placeholder"></div>
 *   <script type="module" src="/components/location-section.js"></script>
 */

const PLACE_URL = 'https://maps.app.goo.gl/yRr626kNbtchtDTs6';
const EMBED_SRC = 'https://maps.google.com/maps?q=Pixon+PC,+Cancun&t=&z=15&ie=UTF8&iwloc=&output=embed';

const LOCATION_HTML = `
<div class="map-wrapper" style="border-radius:16px; overflow:hidden; border:1px solid #e2e8f0; margin-top:1rem; width:100%;">
    <iframe title="Mapa de ubicación Pixon PC Cancún"
        src="${EMBED_SRC}"
        width="100%" height="240" style="border:0;" allowfullscreen=""
        loading="lazy" referrerpolicy="no-referrer-when-downgrade">
    </iframe>
</div>
<a href="${PLACE_URL}" target="_blank" rel="noopener noreferrer"
    class="btn btn-primary" style="margin-top:14px; width:100%; justify-content:center;">
    <i class="fa-solid fa-map-location-dot"></i> Ver en Google Maps
</a>
`;

(function injectLocation() {
    const placeholder = document.getElementById('location-placeholder');
    if (!placeholder) return;
    placeholder.outerHTML = LOCATION_HTML;
})();
