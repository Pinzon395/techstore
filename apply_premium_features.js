const fs = require('fs');

// 1. ADD CSS FOR ANIMATIONS
let css = fs.readFileSync('style.css', 'utf8');
if (!css.includes('.reveal-on-scroll')) {
    const cssCode = `
/* ══════════════════════════════════════════════════════════════
   SCROLL REVEAL ANIMATIONS (Apple Style Fading)
══════════════════════════════════════════════════════════════ */
.reveal-on-scroll {
    opacity: 0;
    transform: translateY(35px);
    transition: opacity 0.8s cubic-bezier(0.25, 1, 0.5, 1), transform 0.8s cubic-bezier(0.25, 1, 0.5, 1);
    will-change: opacity, transform;
}
.reveal-on-scroll.reveal-active {
    opacity: 1;
    transform: translateY(0);
}
@media (prefers-reduced-motion: reduce) {
    .reveal-on-scroll {
        transition: none;
        opacity: 1;
        transform: none;
    }
}
`;
    // Append to end of style.css
    fs.writeFileSync('style.css', css + cssCode);
    console.log('CSS Animations injected.');
}

// 2. ADD JS FOR ANIMATIONS
let js = fs.readFileSync('script.js', 'utf8');
if (!js.includes('initScrollReveals')) {
    const jsCode = `
/* ══════════════════════════════════════════════════════════════
   9. SCROLL REVEALS (IntersectionObserver para fadeIn)
══════════════════════════════════════════════════════════════ */
function initScrollReveals() {
    const hiddenElements = document.querySelectorAll('.reveal-on-scroll');
    if (!hiddenElements.length || !('IntersectionObserver' in window)) {
        hiddenElements.forEach(el => el.classList.add('reveal-active'));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('reveal-active');
                // Opcional: Descomentar linea abajo si solo quieres que se anime la primera vez
                // observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1, // El 10% del elemento debe ser visible
        rootMargin: "0px 0px -50px 0px" // Trigger un poco antes de llegar
    });

    hiddenElements.forEach((el) => observer.observe(el));
}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', initScrollReveals);
} else {
    initScrollReveals();
}
`;
    fs.writeFileSync('script.js', js + jsCode);
    console.log('JS Animations observer injected.');
}

// 3. EDIT INDEX.HTML (Add animation classes and replace generic Schema with Full LocalBusiness Schema)
let html = fs.readFileSync('index.html', 'utf8');

// Add classes to cards
html = html.replace(/class="specialty-card"/g, 'class="specialty-card reveal-on-scroll"');
html = html.replace(/class="express-banner-card"/g, 'class="express-banner-card reveal-on-scroll"');
html = html.replace(/class="home-build-card"/g, 'class="home-build-card reveal-on-scroll"');
html = html.replace(/class="faq-item"/g, 'class="faq-item reveal-on-scroll"');
html = html.replace(/class="review-card"/g, 'class="review-card reveal-on-scroll"');
html = html.replace(/class="step-card"/g, 'class="step-card reveal-on-scroll"'); // How it works cards
html = html.replace(/class="pricing-card"/g, 'class="pricing-card reveal-on-scroll"'); 

// The Advanced LocalBusiness Schema
const existingSchemaStart = html.indexOf('<script type="application/ld+json">\n    {\n      "@context": "https://schema.org",\n      "@type": "LocalBusiness",');
// It might have spaces differently. Let's use Regex to find the whole LocalBusiness block
const schemaPattern = /<script type="application\/ld\+json">\s*\{\s*"@context":\s*"https:\/\/schema\.org",\s*"@type":\s*"LocalBusiness"[\s\S]*?<\/script>/i;

const advancedSchema = `<script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "name": "Pixon PC - Reparación de Laptops y PC Gamer en Cancún",
      "image": "https://pixon.com.mx/assets/logos/Logo.svg",
      "@id": "https://pixon.com.mx/#localbusiness",
      "url": "https://pixon.com.mx",
      "telephone": "+529986690777",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "Haciendas",
        "addressLocality": "Cancún",
        "addressRegion": "Quintana Roo",
        "postalCode": "77539",
        "addressCountry": "MX"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": 21.1375,
        "longitude": -86.8462
      },
      "areaServed": [
        "Zona Hotelera",
        "Avenida Huayacán",
        "Polígono Sur",
        "Puerto Juárez",
        "Alfredo V. Bonfil",
        "Cancún"
      ],
      "openingHoursSpecification": {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],
        "opens": "09:00",
        "closes": "19:00"
      },
      "sameAs": [
        "https://www.facebook.com/PixonPC",
        "https://www.instagram.com/pixonpc/",
        "https://www.tiktok.com/@pixonpc"
      ],
      "priceRange": "$$",
      "description": "Expertos en reparación de laptops, mantenimiento de Apple MacBook, optimización de PC Gamer y asistencia informática en Cancún. Servicio a domicilio y empresa disponible. Diagnósticos honestos y rápidos.",
      "hasMap": "https://goo.gl/maps", 
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "5.0",
        "reviewCount": "148"
      }
    }
    </script>`;

if (schemaPattern.test(html)) {
    html = html.replace(schemaPattern, advancedSchema);
    console.log('Advanced Schema JSON-LD embedded.');
} else {
    console.log('Could not find existing schema block to replace. Adding at head.');
    html = html.replace('</head>', advancedSchema + '\\n</head>');
}

fs.writeFileSync('index.html', html);
console.log('index.html Updated!');
