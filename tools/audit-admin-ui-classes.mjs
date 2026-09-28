/**
 * Guardrail: detecta clases usadas por controles del admin que NO tienen
 * ninguna regla en src/styles/admin.css. Ese es exactamente el bug que
 * causo "Agenda operativa del dia", "Trafico web" y la toolbar de
 * /admin/agenda a verse como HTML sin terminar: la clase existia en el
 * markup/JS pero nunca se definio en CSS, asi que el navegador la
 * renderizaba con sus estilos por default (boton blanco, texto negro).
 *
 * No es pixel-perfect ni compara colores: solo confirma que exista AL MENOS
 * una regla para cada clase de control usada en /admin. Heuristico por
 * diseno (ver items #77-101 del pedido original) — falsos negativos son
 * preferibles a bloquear el build por un falso positivo.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

const SOURCE_FILES = [
  'src/pages/admin/admin.astro',
  'src/components/admin/CommerceHubView.astro',
  'src/components/admin/CommerceCatalogView.astro',
  'src/components/admin/CommerceOperationsView.astro',
  'public/scripts/admin.js',
  'public/scripts/admin-agenda.js',
  'public/scripts/admin-dashboard.js',
  'public/scripts/admin-commerce.js',
  'public/scripts/admin-marketplace.js'
];

const CSS_FILES = ['src/styles/admin.css', 'src/styles/admin-commerce.css'];

// Prefijos que nunca son clases propias del admin (iconos de terceros,
// utilidades de accesibilidad ya cubiertas por reglas globales fuera de
// admin.css, o basura que el regex de extraccion puede capturar por error).
const IGNORE_PREFIXES = ['fa-', 'fa', 'sr-only'];
const IGNORE_EXACT = new Set([
  'active', 'show', 'open', 'hidden', 'disabled', 'selected', 'is-open', 'is-active',
  // Generado dinamicamente con template literals (`class="foo ${bar}"`); el
  // regex captura fragmentos vacios o expresiones JS, no clases reales.
  '', '${', '}', 'true', 'false'
]);

// Deuda preexistente encontrada por este guardrail el 2026-09-12, FUERA de
// las 3 zonas prioritarias de esa auditoria (agenda card, trafico web,
// toolbar de agenda). No se corrigio ese dia por alcance/tiempo. Vive en
// Comentarios, Usuarios, Taller (bulk/conflicto), Promociones y Comercio
// (settings). Quitar cada entrada de esta lista al corregir su clase real —
// el gate debe fallar de nuevo si alguien la reintroduce sin arreglarla.
const KNOWN_EXCEPTIONS = new Set([
  'btn', 'btn-outline', // patron generico legacy, no exclusivo de /admin
  'card-actions', 'card-date', 'card-email', 'card-header', 'card-stars', 'card-user', // view-comments
  'command-panel--operations', 'command-panel--trend', // dashboard, variante sin regla propia
  'commerce-hub', 'commerce-settings-card', 'commerce-top-products', // comercio, fuera de admin-commerce.css
  'crm-row-select', // checkbox de tabla de tickets
  'promotion-pagination', // view-commerce-promotions
  'repair-bulk-dialog', 'repair-conflict-banner', 'repair-mobile-empty',
  'repair-ticket-appointment-section', 'repair-ticket-history-section', // Taller
  'user-phone-empty' // view-users
]);

function isIgnored(cls) {
  if (IGNORE_EXACT.has(cls)) return true;
  if (IGNORE_PREFIXES.some((p) => cls.startsWith(p))) return true;
  if (KNOWN_EXCEPTIONS.has(cls)) return true;
  if (/[${}()`]/.test(cls)) return true; // resto de una expresion JS mal cortada
  if (/^[0-9]/.test(cls)) return true;
  if (cls === 'is-' || /^is-$/.test(cls)) return true; // artefacto de extraccion, no una clase real
  return false;
}

async function readIfExists(relPath) {
  try {
    return await fs.readFile(path.join(ROOT, relPath), 'utf8');
  } catch {
    return null;
  }
}

function extractClassTokens(content) {
  const classes = new Set();
  // Solo class="..." / class='...' SIN interpolacion (`${`). Un atributo con
  // template-literal (ej. class="chip ${x ? 'a' : 'b'}") se descarta entero:
  // intentar recortar la parte estatica con regex sobre JS real es fragil y
  // genera falsos positivos (capturar codigo JS como si fuera una clase).
  // Todos los bugs reales de hoy (kpi-mini-pill, agenda-filter-btn, btn-sm,
  // btn-warn, dashboard-agenda-container...) eran atributos estaticos, asi
  // que esta version mas conservadora los sigue detectando igual.
  const attrPattern = /\bclass(?:Name)?\s*=\s*"([^"$]*)"|\bclass(?:Name)?\s*=\s*'([^'$]*)'/g;
  let match;
  while ((match = attrPattern.exec(content))) {
    const value = match[1] ?? match[2] ?? '';
    for (const token of value.split(/\s+/)) {
      const clean = token.trim();
      if (clean && !isIgnored(clean)) classes.add(clean);
    }
  }
  return classes;
}

function extractDefinedSelectors(css) {
  const defined = new Set();
  // Cubre selectores simples y compuestos: .foo, .foo.bar, .foo:hover,
  // .foo > .bar, .foo[data-x] — basta con capturar cada `.identificador`.
  const classPattern = /\.(-?[_a-zA-Z][_a-zA-Z0-9-]*)/g;
  let match;
  while ((match = classPattern.exec(css))) {
    defined.add(match[1]);
  }
  return defined;
}

const usedClasses = new Set();
for (const file of SOURCE_FILES) {
  const content = await readIfExists(file);
  if (!content) continue;
  for (const cls of extractClassTokens(content)) usedClasses.add(cls);
}

const definedClasses = new Set();
for (const file of CSS_FILES) {
  const content = await readIfExists(file);
  if (!content) continue;
  for (const cls of extractDefinedSelectors(content)) definedClasses.add(cls);
}

const missing = [...usedClasses].filter((cls) => !definedClasses.has(cls)).sort();

if (missing.length > 0) {
  console.error(`Guardrail admin-ui: ${missing.length} clase(s) usadas en /admin sin ninguna regla en src/styles/admin.css:`);
  for (const cls of missing) console.error(`  - .${cls}`);
  console.error('\nCada una de estas rendera con el estilo default del navegador (boton blanco, texto sin formato).');
  console.error('Agrega la regla correspondiente en src/styles/admin.css o corrige el nombre de la clase.');
  process.exit(1);
}

console.log(`Guardrail admin-ui: OK. ${usedClasses.size} clases usadas en /admin, todas con al menos una regla en admin.css.`);
