const fs = require('fs');
const path = require('path');

const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));

const unifiedFooter = `    <footer class="light-footer">
        <div class="container footer-content">
            <div class="footer-logo">
                <a href="/" class="logo text-dark">
                    <img src="assets/logos/Logo.svg" alt="Pixon PC Logo" height="35" class="brand-logo">
                </a>
                <p>Trabajos reales grabados desde el taller. Especialistas en <strong>reparación de computadoras Cancún</strong>.</p>
            </div>
            <div class="footer-links">
                <h4>Páginas</h4>
                <ul>
                    <li><a href="/">Inicio</a></li>
                    <li><a href="/paquetes">Paquetes</a></li>
                    <li><a href="/ensambles">Ensambles</a></li>
                    <li><a href="/comentarios">Reseñas</a></li>
                    <li><a href="/contacto">Contacto</a></li>
                </ul>
            </div>
            <div class="footer-links">
                <h4>Legal</h4>
                <ul>
                    <li><a href="/privacidad">Política de Privacidad</a></li>
                    <li><a href="/garantia">Política de Garantía</a></li>
                </ul>
            </div>
            <div class="footer-social">
                <h4>Síguenos</h4>
                <div class="social-icons">
                    <a href="javascript:void(0);" onclick="smartWaRedirect('https://wa.me/529986690777?text=Hola%2C%20ven%C3%ADa%20de%20la%20web%20y%20quiero%20informaci%C3%B3n')"
                        title="WhatsApp Pixon PC"><i class="fa-brands fa-whatsapp"></i></a>
                    <a href="https://www.facebook.com/people/Pixon-PC/61556271364935/" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-facebook-f"></i></a>
                    <a href="https://www.instagram.com/pixonpc/" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-instagram"></i></a>
                    <a href="https://www.tiktok.com/@pixonpc" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-tiktok"></i></a>
                </div>
            </div>
        </div>
        <div class="footer-bottom">
            <p>&copy; <span id="year"></span> Pixon PC. Todos los derechos reservados. |
                <a href="/privacidad" style="color:var(--text-muted);">Privacidad</a> ·
                <a href="/garantia" style="color:var(--text-muted);">Garantía</a>
            </p>
        </div>
    </footer>

    <a href="javascript:void(0);" onclick="smartWaRedirect('https://wa.me/529986690777?text=Hola%2C%20ven%C3%ADa%20de%20la%20web%20y%20quiero%20informaci%C3%B3n')"
        class="whatsapp-float" id="whatsapp-float" title="Contáctanos por WhatsApp">
        <i class="fa-brands fa-whatsapp"></i>
    </a>`;

// Script de WhatsApp que estandariza todo al final del body
const finalScripts = `<script type="module" src="/scripts/script.js"></script>
    <script type="module" src="/scripts/comments.js"></script>
    <script type="module" src="/scripts/user-menu.js"></script>
    <!-- ═══ Cookie Banner ═══ -->
    <script type="module" src="/components/cookies/CookieBanner.js"></script>
</body>`;

// Base template for nav
const getNavForPage = (pageName) => {
    // Determine active links
    let isInicio = pageName === 'index.html' ? 'active-link' : '';
    let isPaquetes = pageName === 'paquetes.html' ? 'active-link' : '';
    let isEnsambles = pageName === 'ensambles.html' ? 'active-link' : '';
    let isCatalogo = pageName === 'catalogo.html' ? 'active-link' : '';
    let isFAQ = pageName === 'preguntas-frecuentes.html' ? 'active-link' : '';
    let isContact = pageName === 'contacto.html' ? 'active-link' : '';

    return `    <nav class="navbar" id="navbar">
        <div class="nav-container">
            <a href="/" class="logo">
                <img src="assets/logos/Logo.svg" alt="Pixon PC Logo" style="height:60px;" id="navbar-logo"
                    class="brand-logo">
            </a>
            <div class="menu-toggle" id="mobile-menu">
                <span class="bar bar-dark"></span>
                <span class="bar bar-dark"></span>
                <span class="bar bar-dark"></span>
            </div>
            <ul class="nav-menu">
                <li><a href="/" class="nav-links ${isInicio}">Inicio</a></li>
                <li><a href="/paquetes" class="nav-links ${isPaquetes}">Paquetes</a></li>
                <li><a href="/ensambles" class="nav-links ${isEnsambles}">Ensambles PC</a></li>
                <li><a href="/catalogo" class="nav-links ${isCatalogo}">Catálogo Video</a></li>
                <li><a href="/preguntas-frecuentes" class="nav-links ${isFAQ}">FAQ</a></li>
                <li><a href="/contacto" class="nav-links ${isContact}">Contacto</a></li>
                <li class="nav-auth-mobile-li" id="nav-auth-mobile-li">
                    <div id="nav-auth-area-mobile"></div>
                </li>
            </ul>
            <div class="nav-actions">
                <div id="nav-auth-area"></div>
            </div>
        </div>
    </nav>`;
}

let changedFiles = 0;

files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    let original = content;

    // Replace navbar
    const navStart = content.indexOf('<nav class="navbar" id="navbar">');
    const navEnd = content.indexOf('</nav>', navStart) + 6;
    if (navStart !== -1 && navEnd !== -1) {
        content = content.substring(0, navStart) + getNavForPage(f) + content.substring(navEnd);
    }

    // Replace footer
    const footerStart = content.indexOf('<footer class="light-footer">');
    // Find the end of whatsapp float
    const floatEndIdx = content.indexOf('</a>', content.indexOf('id="whatsapp-float"')) + 4;
    
    if (footerStart !== -1 && floatEndIdx !== -1 && floatEndIdx > footerStart) {
         content = content.substring(0, footerStart) + unifiedFooter + content.substring(floatEndIdx);
    }

    // Replace Scripts (ensure only 1 copy of CookieBanner and script.js at the bottom)
    // We'll clean up just before </body>
    const scriptsStart = content.indexOf('<script type="module" src="/scripts/script.js"></script>');
    if (scriptsStart !== -1 && scriptsStart > content.lastIndexOf('</section>')) {
        content = content.substring(0, scriptsStart).trimEnd() + '\n    ' + finalScripts + '\n</html>';
        // wait html tag is separate. Better approach:
        const bodyEnd = content.indexOf('</body>');
        if (bodyEnd !== -1) {
            // Find scripts
            const pattern = /<script type="module" src="\/script\.js"><\/script>[\s\S]*?<\/body>/;
            content = content.replace(pattern, finalScripts);
        }
    }

    if (content !== original) {
        fs.writeFileSync(f, content);
        changedFiles++;
    }
});

console.log('Unificadas ' + changedFiles + ' vistas exitosamente.');
