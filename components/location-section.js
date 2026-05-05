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

const PLACE_URL = 'https://maps.app.goo.gl/aLrP9whG5R1Wn2kq9';
const EMBED_SRC = 'https://maps.google.com/maps?q=21.157875,-86.896057&hl=es&z=16&output=embed';

const LOCATION_HTML = `
<section class="section-padding pixon-location" id="ubicacion" aria-label="Ubicación y cobertura">
    <div class="container">
        <div class="section-title text-center">
            <h2>Ubicación y Cobertura en Cancún</h2>
            <p>Recolección y entrega a domicilio en toda la ciudad.</p>
        </div>
        <div class="ubicacion-grid">
            <div>
                <div class="map-wrapper" style="border-radius:16px; overflow:hidden; border:1px solid #e2e8f0;">
                    <iframe title="Mapa de ubicación Pixon PC Cancún"
                        src="${EMBED_SRC}"
                        width="100%" height="320" style="border:0;" allowfullscreen=""
                        loading="lazy" referrerpolicy="no-referrer-when-downgrade">
                    </iframe>
                </div>
                <a href="${PLACE_URL}" target="_blank" rel="noopener noreferrer"
                    class="btn btn-primary" style="margin-top:14px; width:100%; justify-content:center;">
                    <i class="fa-solid fa-map-location-dot"></i> Ver en Google Maps
                </a>
            </div>
            <div>
                <div class="coverage-area">
                    <p style="font-weight:700; font-size:1.1rem; margin-bottom:12px;">
                        <i class="fa-solid fa-location-crosshairs"></i> Zonas que Cubrimos
                    </p>
                    <p style="color:#64748b; font-size:0.95rem; margin-bottom:16px;">
                        Recolección y entrega a tu puerta en Cancún y alrededores.
                    </p>
                    <div class="coverage-zones">
                        <span class="coverage-zone coverage-zone--primary"><i class="fa-solid fa-circle-check"></i> Zona Hotelera</span>
                        <span class="coverage-zone coverage-zone--primary"><i class="fa-solid fa-circle-check"></i> Haciendas</span>
                        <span class="coverage-zone coverage-zone--primary"><i class="fa-solid fa-circle-check"></i> Supermanzanas</span>
                        <span class="coverage-zone"><i class="fa-solid fa-circle-check"></i> Polígono Sur</span>
                        <span class="coverage-zone"><i class="fa-solid fa-circle-check"></i> Huayacán</span>
                        <span class="coverage-zone"><i class="fa-solid fa-circle-check"></i> Puerto Morelos</span>
                        <span class="coverage-zone coverage-zone--ask"><i class="fa-solid fa-circle-question"></i> ¿Otra zona? ¡Pregunta!</span>
                    </div>
                    <p style="font-weight:700; font-size:1rem; margin:18px 0 8px;">
                        <i class="fa-regular fa-clock"></i> Horario
                    </p>
                    <p style="color:#64748b; font-size:0.95rem; margin-bottom:16px;">
                        Lunes – Domingo · con cita previa
                    </p>
                    <button
                        onclick="window.smartWaRedirect ? window.smartWaRedirect('https://wa.me/529986690777?text=Quiero%20que%20recojan%20mi%20equipo%20a%20domicilio') : window.open('https://wa.me/529986690777?text=Quiero%20que%20recojan%20mi%20equipo%20a%20domicilio','_blank','noopener')"
                        class="btn btn-outline coverage-cta-btn">
                        <i class="fa-solid fa-truck"></i> Pedir Recolección a Domicilio
                    </button>
                </div>
            </div>
        </div>
    </div>
</section>
`;

(function injectLocation() {
    const placeholder = document.getElementById('location-placeholder');
    if (!placeholder) return;
    placeholder.outerHTML = LOCATION_HTML;
})();
