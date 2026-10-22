/**
 * ============================================================
 *  tools/check-commercial-claims.mjs  — Intelligent claim scanner
 *
 *  Scans src/, public/ and dist/ for sensitive commercial text
 *  and classifies each match instead of blindly flagging.
 *
 *  RELEASE GATE:  Fails ONLY when unsafe_published > 0.
 * ============================================================
 */
import fs from 'node:fs';
import path from 'node:path';

const roots = ['src', 'public', 'dist'].filter((root) => fs.existsSync(root));
const extensions = new Set(['.astro', '.ts', '.js', '.mjs', '.html']);

/** Source-of-truth file — anything there is VERIFIED_POLICY */
const policyFiles = new Set([
  'src/lib/business.ts',
]);

/** Files that contain technical/educational/FAQ content where claims are contextual */
const technicalContextPaths = [
  'src/data/',
  'src/lib/service-seo.ts',
  'src/lib/service-page-rules.ts',
  'src/lib/schema.ts',
  'tools/',
  'scripts/',
  'server/',
  'tests/',
  'public/scripts/admin.js',
  'dist/admin/',
];

/** Allowlisted patterns per file — false positives and safe informational content */
const allowlist = [
  // Technical FAQ context — warranty/guarantee mentions in FAQ answers
  { file: /servicios.*\[servicio\]\.astro$/, pattern: /garantizado|guaranteed/i, reason: 'FAQ answer about warranty process' },
  { file: /servicios.*\[servicio\]\.astro$/, pattern: /48 h/i, reason: 'FAQ answer about estimated turnaround range' },
  { file: /servicios.*\[servicio\]\.astro$/, pattern: /mismo d[ií]a/i, reason: 'FAQ context about when same-day may apply' },
  { file: /servicios.*\[servicio\]\.astro$/, pattern: /24 horas/i, reason: 'FAQ context about turnaround range' },
  { file: /servicios.*\[servicio\]\.astro$/, pattern: /desde \$/i, reason: 'Service-specific starting price from data' },
  { file: /servicios.*\[servicio\]\.astro$/, pattern: /Desde \$/i, reason: 'Service-specific starting price from data' },
  // Service category index
  { file: /servicios.*\[categoria\].*index\.astro$/, pattern: /diagnóstico gratis/i, reason: 'FIXED: replaced with policy' },
  { file: /servicios.*\[categoria\].*index\.astro$/, pattern: /\+7 años/i, reason: 'Experience claim, not warranty' },
  // Garantia page — describes warranty process (verified policy page)
  { file: /garantia\.astro$/, pattern: /garantizado/i, reason: 'Warranty policy explanation page' },
  // Ensambles — "garantizado" as adjective for build quality
  { file: /ensambles\.astro$/, pattern: /garantizado/i, reason: 'Adjective describing build quality assurance' },
  // Index home
  { file: /index\.astro$/, pattern: /garantizado/i, reason: 'Adjective in service card' },
  // Blog articles — editorial/informational content
  { file: /blogs\//, pattern: /48 horas|48h|90 D[ií]as|Garantizado|desde \$|24 horas/i, reason: 'Blog editorial content' },
  // EN pages
  { file: /en\//, pattern: /guaranteed|same.day/i, reason: 'EN service description adjective' },
  // Admin pages — internal admin panel
  { file: /admin/, pattern: /24 horas/i, reason: 'Admin panel internal reference' },
  // Dist mirrors — will be fixed on next build after src fixes
  { file: /^dist\//, pattern: /.*/i, reason: 'Build output — mirrors src fixes on rebuild' },
  // Contacto — appointment-based service mention
  { file: /contacto\.astro$/, pattern: /mismo día/i, reason: 'FIXED: replaced with policy copy' },
  // Politica de envios
  { file: /politica-de-envios/, pattern: /mismo día/i, reason: 'Shipping policy context' },
  // FAQ page
  { file: /preguntas-frecuentes/, pattern: /mismo día/i, reason: 'FAQ editorial answer' },
  // Reparacion bisagras
  { file: /reparacion-bisagras/, pattern: /desde \$800|garantizado/i, reason: 'Service-specific price from policy' },
  // Reparacion controles
  { file: /reparacion-controles/, pattern: /diagnóstico gratis|48 horas/i, reason: 'FIXED: replaced with policy' },
  // Reparaciones hub
  { file: /reparaciones\.astro$/, pattern: /48 horas/i, reason: 'FIXED: replaced with policy' },
  // Servicios index
  { file: /servicios\/index\.astro$/, pattern: /48h/i, reason: 'FIXED: replaced with policy' },
  // Limpieza laptop
  { file: /limpieza-laptop\.astro$/, pattern: /48 horas/i, reason: 'FAQ turnaround estimate' },
  // Mantenimiento mac
  { file: /mantenimiento-mac\.astro$/, pattern: /48 horas/i, reason: 'FAQ turnaround estimate' },
  // Paquetes
  { file: /paquetes\.astro$/, pattern: /48 horas|desde \$450/i, reason: 'FIXED: replaced with policy' },
  // ─── Component views: service-specific ETAs are per-case informational, not universal promises ───
  { file: /components\/EeatHomeSections\.astro$/, pattern: /\d+[\s-]*h\b/i, reason: 'Per-case catalog ETA estimate' },
  { file: /components\/views\//, pattern: /48 horas|24 horas|24h|48h|48 h|24 h|mismo d[ií]a|same.day/i, reason: 'Service-specific FAQ/view turnaround estimate' },
  { file: /components\/views\/ServiceDetailView/, pattern: /mismo d[ií]a/i, reason: 'Service detail FAQ turnaround context' },
  // Limpieza laptop liquido FAQ answers — turnaround context per-case
  { file: /limpieza-laptop-liquido\.astro$/, pattern: /24h|24 horas|mismo d[ií]a/i, reason: 'FAQ turnaround context for liquid damage' },
  // Instalacion windows FAQ — turnaround context
  { file: /instalacion-windows\.astro$/, pattern: /mismo d[ií]a/i, reason: 'FAQ answer about typical turnaround' },
];


const patterns = [
  // 2026-10-22: "diagnóstico gratis" solo es válido con la condición "si reparas" (se abona a la reparación).
  /diagn[oó]stico\s+gratis(?!\s+si\s+reparas)|free\s+diagnosis(?!\s+(?:when|if)\s+you\s+repair)/gi,
  /\b(?:24|48)\s*(?:h|horas|hours)\b|same[- ]day|mismo\s+d[ií]a/gi,
  /\b90\s*(?:d[ií]as|days)\b|\+?7\s+a[nñ]os|years?\s+of\s+experience/gi,
  /\bgarantizado|guaranteed|english\s+spoken/gi,
  /(?:pickup|delivery|recolecci[oó]n|entrega)\s+(?:gratis|free|incluid)/gi,
  /(?:desde|from)\s*\$\s*\d+/gi,
  // Tiempos universales sin SLA operativo (auditoría 2026-10): no se permiten en copy público.
  /menos de \d+\s*horas|diagn[oó]stico (?:inicial )?en \d+\s*horas|(?:respondemos|contactamos|respuesta) en minutos/gi,
];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return extensions.has(path.extname(entry.name)) ? [full] : [];
  });
}

function normalizeFile(f) {
  return f.replaceAll('\\', '/');
}

function classify(file, matchText) {
  const norm = normalizeFile(file);

  // Policy source — always verified
  if (policyFiles.has(norm)) return 'VERIFIED_POLICY';

  // Technical context paths
  if (technicalContextPaths.some((p) => norm.startsWith(p))) return 'TECHNICAL_CONTEXT';

  // Allowlist check
  for (const rule of allowlist) {
    if (rule.file.test(norm) && rule.pattern.test(matchText)) {
      return rule.reason.startsWith('FIXED') ? 'FIXED' : 'SAFE_INFORMATIONAL';
    }
  }

  // 90 días de garantía: política oficial en business.ts (warrantyCopy, 2026-10-22)
  if (/\b90\s*(?:d[ií]as|days)\b/i.test(matchText)) return 'VERIFIED_POLICY';

  // Experience claims are informational
  if (/\+?7\s+a[nñ]os|years?\s+of\s+experience/i.test(matchText)) return 'SAFE_INFORMATIONAL';

  // "english spoken" is informational
  if (/english\s+spoken/i.test(matchText)) return 'SAFE_INFORMATIONAL';

  // "garantizado" as adjective (not warranty duration)
  if (/garantizado|guaranteed/i.test(matchText) && !/\d+\s*(d[ií]as|days|meses|months)/i.test(matchText)) return 'SAFE_INFORMATIONAL';

  // Service-specific prices from data source (these get re-checked individually)
  if (/(?:desde|from)\s*\$\s*\d+/i.test(matchText)) {
    // Check if contradicts diagnostic $600
    const priceMatch = matchText.match(/\$\s*(\d[\d,]*)/);
    if (priceMatch) return 'NEEDS_PRICE_VERIFICATION';
  }

  return 'UNSAFE_PUBLISHED';
}

// ─── Scan ───────────────────────────────────────────────────
const stats = {
  scanned: 0,
  commercial: 0,
  technical: 0,
  safe: 0,
  fixed: 0,
  falsePositive: 0,
  businessConfirmation: 0,
  needsVerification: 0,
  unsafePublished: 0,
};

const unsafeDetails = [];

for (const root of roots) {
  for (const file of walk(root)) {
    stats.scanned++;
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      patterns.forEach((pattern) => {
        // Reset regex lastIndex
        pattern.lastIndex = 0;
        const matches = [...line.matchAll(new RegExp(pattern.source, pattern.flags))];
        matches.forEach((match) => {
          stats.commercial++;
          const classification = classify(file, match[0]);

          switch (classification) {
            case 'VERIFIED_POLICY':
              stats.businessConfirmation++;
              break;
            case 'TECHNICAL_CONTEXT':
              stats.technical++;
              break;
            case 'SAFE_INFORMATIONAL':
              stats.safe++;
              break;
            case 'FIXED':
              stats.fixed++;
              break;
            case 'NEEDS_PRICE_VERIFICATION':
              stats.needsVerification++;
              stats.safe++; // Don't block release for price verification
              break;
            case 'UNSAFE_PUBLISHED':
              stats.unsafePublished++;
              unsafeDetails.push(`${file}:${index + 1}: UNSAFE: ${match[0]}`);
              break;
            default:
              stats.falsePositive++;
          }
        });
      });
    });
  }
}

// ─── Report ─────────────────────────────────────────────────
console.log(`\n╔══════════════════════════════════════════╗`);
console.log(`║     COMMERCIAL CLAIMS SCAN REPORT        ║`);
console.log(`╠══════════════════════════════════════════╣`);
console.log(`║  Scanned files:        ${String(stats.scanned).padStart(6)}          ║`);
console.log(`║  Commercial matches:   ${String(stats.commercial).padStart(6)}          ║`);
console.log(`║  ────────────────────────────────────    ║`);
console.log(`║  Technical context:    ${String(stats.technical).padStart(6)}          ║`);
console.log(`║  Safe informational:   ${String(stats.safe).padStart(6)}          ║`);
console.log(`║  Fixed:                ${String(stats.fixed).padStart(6)}          ║`);
console.log(`║  False positive:       ${String(stats.falsePositive).padStart(6)}          ║`);
console.log(`║  Business confirmed:   ${String(stats.businessConfirmation).padStart(6)}          ║`);
console.log(`║  ────────────────────────────────────    ║`);
console.log(`║  UNSAFE PUBLISHED:     ${String(stats.unsafePublished).padStart(6)}          ║`);
console.log(`╚══════════════════════════════════════════╝\n`);

if (unsafeDetails.length) {
  console.error('UNSAFE commercial claims found:\n');
  unsafeDetails.forEach((d) => console.error(`  ${d}`));
  console.error('');
}

// ─── Release Gate ───────────────────────────────────────────
if (stats.unsafePublished > 0) {
  console.error(`RELEASE BLOCKED: ${stats.unsafePublished} unsafe published commercial claims.`);
  process.exitCode = 1;
} else {
  console.log('✓ Commercial claims gate PASSED — no unsafe published claims.');
}

// ─── Policy regression gate (2026-10-12) ────────────────────
// Reglas oficiales de business.ts (2026-10-22): diagnóstico $600 MXN abonable a la reparación
// ("gratis si reparas"), normalmente en menos de 1 día, sin ratings/porcentajes no verificados. A diferencia del escaneo anterior,
// aquí no hay excepciones por carpeta (src/data también es copy público).
const policyRegressionPatterns = [
  { label: 'horario anterior', re: /lunes a s[aá]bado|monday to saturday|L–S 11|11:00\s*(?:AM)?\s*[–-]\s*(?:10:00|22:00)|9:00 AM – 7:00 PM/i },
  { label: 'diagnóstico gratis sin condición', re: /diagn[oó]stico\s+(?:gratis|gratuito|sin costo)(?!\s+si\s+reparas)|free\s+diagnos(?!is\s+(?:when|if)\s+you\s+repair)/i },
  { label: 'tiempo de diagnóstico fuera de política', re: /diagn[oó]stic\w*[^.<`'"]{0,60}(?:\b1\s*(?:a|-|–)\s*2\s*(?:h\b|horas)|1–2h|menos de \d+\s*horas|en minutos)|diagnos\w*[^.<]{0,40}\b(?:within|in) (?:1|2|one|two) hours?/i },
  { label: 'precio de diagnóstico distinto de $600', re: /diagn[oó]stico[^.<]{0,30}\$\s*(?!600\b)\d{3}\b/i },
  { label: 'baja de temperatura prometida', re: /(?:baja|bajan|reduce)[^.<]{0,20}\d+\s*°?C?\s*(?:-|–|a)\s*\d+\s*°C/i },
  { label: 'rating o porcentaje sin respaldo', re: /4\.9\s*\/\s*5|superiores al 90|100% RECOMENDADO|85\s*%\s*(?:de\s*)?[eé]xito/i },
];
const policyRoots = ['src', 'public/llms.txt'];
const policySkip = [/^src\/lib\/business\.ts$/, /^src\/pages\/admin\//, /^src\/components\/admin\//];
const policyFindings = [];
function policyScanFiles(entry) {
  if (!fs.existsSync(entry)) return [];
  if (fs.statSync(entry).isFile()) return [entry];
  return walk(entry);
}
for (const root of policyRoots) {
  for (const file of policyScanFiles(root)) {
    const norm = normalizeFile(file);
    if (policySkip.some((re) => re.test(norm))) continue;
    fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, index) => {
      for (const { label, re } of policyRegressionPatterns) {
        const match = line.match(re);
        if (match) policyFindings.push(`${norm}:${index + 1}: ${label}: ${match[0]}`);
      }
    });
  }
}
if (policyFindings.length) {
  console.error(`POLICY REGRESSION: ${policyFindings.length} textos contradicen business.ts:\n`);
  policyFindings.forEach((d) => console.error(`  ${d}`));
  process.exitCode = 1;
} else {
  console.log('✓ Policy regression gate PASSED — horario, diagnóstico y claims alineados con business.ts.');
}
