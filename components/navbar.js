/**
 * navbar.js — Componente de Navbar Compartido (canónico)
 *
 * Fuente del diseño: pages/servicios/reparaciones.html (navbar original).
 * Única diferencia respecto al original: se agrega el botón B2B premium
 * que ya tenía la home (index.html), justo después de "Contacto".
 *
 * Uso en cualquier página:
 *   <body class="light-theme">
 *     <div id="nav-placeholder"></div>
 *     ...
 *     <script type="module" src="/components/navbar.js"></script>
 */

const NAVBAR_HTML = `
<nav class="navbar" id="navbar">
    <div class="nav-container">
        <a href="/" class="logo">
            <img src="/assets/logos/Logo.svg?v=2" alt="Pixon PC Logo" style="height:60px;" id="navbar-logo"
                class="brand-logo">
        </a>
        <div class="menu-toggle" id="mobile-menu">
            <span class="bar bar-dark"></span>
            <span class="bar bar-dark"></span>
            <span class="bar bar-dark"></span>
        </div>
        <ul class="nav-menu">
            <li><a href="/" class="nav-links">Inicio</a></li>
            <li class="has-dropdown">
                <a href="#" class="nav-links">Servicios <i class="fa-solid fa-chevron-down dropdown-arrow"></i></a>
                <ul class="dropdown-menu">
                    <li><a href="/reparaciones">Reparación General</a></li>
                    <li><a href="/optimizacion">Optimización del Sistema</a></li>
                    <li><a href="/reparaciones?section=consolas">Limpieza de Consolas</a></li>
                    <li><a href="/paquetes?section=paquetes">Mantenimiento Preventivo</a></li>
                    <li><a href="/reparacion-bisagras">Reparación Bisagras</a></li>
                    <li><a href="/reparacion-controles">Reparación Controles</a></li>
                    <li><a href="/instalacion-windows">Instalación de Windows</a></li>
                    <li><a href="/mantenimiento-mac">Mantenimiento Mac</a></li>
                    <li><a href="/ensambles">Ensambles PC Gamer</a></li>
                </ul>
            </li>
            <li class="has-dropdown">
                <a href="#" class="nav-links">Paquetes <i class="fa-solid fa-chevron-down dropdown-arrow"></i></a>
                <ul class="dropdown-menu">
                    <li><a href="/paquetes">Todos los Paquetes</a></li>
                    <li><a href="/paquetes?section=paquetes">Mantenimiento Preventivo</a></li>
                    <li><a href="/optimizacion?section=paquetes-optimizacion">Optimización del Sistema</a></li>
                </ul>
            </li>
            <li class="has-dropdown">
                <a href="#" class="nav-links">Información <i
                        class="fa-solid fa-chevron-down dropdown-arrow"></i></a>
                <ul class="dropdown-menu">
                    <li><a href="/preguntas-frecuentes">Preguntas Frecuentes</a></li>
                    <li><a href="/comentarios">Reseñas de Clientes</a></li>
                    <li><a href="/catalogo">Catálogo de Videos</a></li>
                </ul>
            </li>
            <li><a href="/contacto" class="nav-links">Contacto</a></li>
            <li>
                <a href="/b2b" class="nav-links b2b-btn-premium">
                    <i class="fa-solid fa-building-shield"></i> B2B
                </a>
            </li>
            <li class="nav-auth-mobile-li" id="nav-auth-mobile-li">
                <div id="nav-auth-area-mobile"></div>
            </li>
        </ul>
        <div class="nav-actions">
            <div id="nav-auth-area"></div>
        </div>
    </div>
</nav>
`;

(function injectNavbar() {
    function tryInject() {
        const placeholder = document.getElementById('nav-placeholder');
        if (placeholder) {
            placeholder.outerHTML = NAVBAR_HTML;
        } else {
            // Fallback: si la página no trae placeholder, lo inserta al inicio del body
            document.body.insertAdjacentHTML('afterbegin', NAVBAR_HTML);
        }
    }

    // Si el DOM aún no está listo, esperar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryInject);
    } else {
        tryInject();
    }
})();
