const fs = require('fs');

let html = fs.readFileSync('reparacion-controles.html', 'utf8');

// Agregar CSS de card-servicio justo antes de cerrar </style>
const cssToInject = `
        /* CSS proporcionado por el usuario para card-servicio */
        .card-servicio {
          background: rgba(255, 255, 255, 0.07);
          border: 1px solid rgba(0, 200, 255, 0.4);
          border-radius: 16px;
          padding: 26px 20px;
          color: #fff;
          text-decoration: none;
          display: block;
          animation: respiracion 3.5s ease-in-out infinite;
          transition: box-shadow 0.4s ease, border-color 0.4s ease;
          cursor: pointer;
        }

        @keyframes respiracion {
          0%, 100% {
            box-shadow: 0 0 18px rgba(0, 200, 255, 0.25);
            border-color: rgba(0, 200, 255, 0.4);
          }
          50% {
            box-shadow: 0 0 32px rgba(0, 200, 255, 0.55);
            border-color: rgba(0, 200, 255, 0.85);
          }
        }

        /* El texto NO se mueve nunca */
        .card-servicio *,
        .card-servicio h3,
        .card-servicio p,
        .card-servicio span,
        .card-servicio .card-content {
          animation: none !important;
          transform: none !important;
        }

        /* Hover: solo el contenedor reacciona, el texto queda quieto */
        .card-servicio:hover {
          box-shadow: 0 0 40px rgba(0, 200, 255, 0.8);
          border-color: rgba(0, 200, 255, 1);
        }
        .card-servicio:hover * {
          transform: none !important;
        }
`;

if (!html.includes('.card-servicio {')) {
  html = html.replace('</style>', cssToInject + '\n    </style>');
}

// Reemplazar "class=\"rel-card wave-card\"" por "class=\"card-servicio wave-card\"" en los enlaces del cross-sell
// Note: We'll just replace 'rel-card' with 'card-servicio' for those 6 links.
html = html.replace(/class="rel-card wave-card"/g, 'class="card-servicio wave-card"');

fs.writeFileSync('reparacion-controles.html', html);
console.log('CSS and classes injected for card-servicio.');
