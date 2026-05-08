/**
 * Genera páginas Astro a partir de archivos HTML existentes.
 * Uso: node scripts/generate-astro-pages.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const pagesDir = path.join(root, 'pages');
const astroPagesDir = path.join(root, 'src', 'pages');

// Mapping: source HTML → target Astro (flat routes)
const pageMappings = [
  // Spanish
  { src: 'servicios/reparaciones.html', dest: 'reparaciones.astro', canonical: 'reparaciones', image: '/assets/images/instalacion-windows-cancun.jpeg' },
  { src: 'servicios/optimizacion.html', dest: 'optimizacion.astro', canonical: 'optimizacion', image: '/assets/images/optimizacion-pc-cancun.png' },
  { src: 'servicios/ensambles.html', dest: 'ensambles.astro', canonical: 'ensambles', image: '/assets/images/pc-gamer-entrada.png' },
  { src: 'servicios/instalacion-windows.html', dest: 'instalacion-windows.astro', canonical: 'instalacion-windows', image: '/assets/images/formateo-windows-cancun.jpeg' },
  { src: 'servicios/mantenimiento-mac.html', dest: 'mantenimiento-mac.astro', canonical: 'mantenimiento-mac', image: '/assets/images/mantenimiento-mac-cancun.jpeg' },
  { src: 'servicios/reparacion-bisagras.html', dest: 'reparacion-bisagras.astro', canonical: 'reparacion-bisagras', image: '/assets/images/AntesBisagra.jpg' },
  { src: 'servicios/reparacion-controles.html', dest: 'reparacion-controles.astro', canonical: 'reparacion-controles', image: '/assets/images/reparacion-controles-cancun.jpeg' },
  { src: 'servicios/limpieza-laptop-liquido.html', dest: 'limpieza-laptop-liquido.astro', canonical: 'limpieza-laptop-liquido', image: '/assets/images/limpieza-liquido-laptop.jpeg' },
  { src: 'servicios/antisulfatacion.html', dest: 'antisulfatacion.astro', canonical: 'antisulfatacion', image: '/assets/images/reparacion-sulfatacion-cancun.jpeg' },
  { src: 'servicios/paquetes.html', dest: 'paquetes.astro', canonical: 'paquetes', image: '/LOGOCIRCULAR.png' },
  { src: 'servicios/b2b.html', dest: 'b2b.astro', canonical: 'b2b', image: '/LOGOCIRCULAR.png' },
  { src: 'info/contacto.html', dest: 'contacto.astro', canonical: 'contacto', image: '/LOGOCIRCULAR.png' },
  { src: 'info/comentarios.html', dest: 'comentarios.astro', canonical: 'comentarios', image: '/LOGOCIRCULAR.png' },
  { src: 'info/preguntas-frecuentes.html', dest: 'preguntas-frecuentes.astro', canonical: 'preguntas-frecuentes', image: '/LOGOCIRCULAR.png' },
  { src: 'info/catalogo.html', dest: 'catalogo.astro', canonical: 'catalogo', image: '/LOGOCIRCULAR.png' },
  { src: 'legal/privacidad.html', dest: 'privacidad.astro', canonical: 'privacidad', image: '/LOGOCIRCULAR.png' },
  { src: 'legal/garantia.html', dest: 'garantia.astro', canonical: 'garantia', image: '/LOGOCIRCULAR.png' },
  { src: 'admin/admin.html', dest: 'admin/admin.astro', canonical: 'admin', image: '/LOGOCIRCULAR.png' },
  { src: '../404.html', dest: '404.astro', canonical: '', image: '' },
  // English
  { src: 'servicios/reparaciones.html', dest: 'en/repairs.astro', canonical: 'en/repairs', image: '/assets/images/instalacion-windows-cancun.jpeg', lang: 'en' },
  { src: 'servicios/optimizacion.html', dest: 'en/optimization.astro', canonical: 'en/optimization', image: '/assets/images/optimizacion-pc-cancun.png', lang: 'en' },
  { src: 'servicios/ensambles.html', dest: 'en/pc-builds.astro', canonical: 'en/pc-builds', image: '/assets/images/pc-gamer-entrada.png', lang: 'en' },
  { src: 'servicios/instalacion-windows.html', dest: 'en/windows-install.astro', canonical: 'en/windows-install', image: '/assets/images/formateo-windows-cancun.jpeg', lang: 'en' },
  { src: 'servicios/mantenimiento-mac.html', dest: 'en/mac-maintenance.astro', canonical: 'en/mac-maintenance', image: '/assets/images/mantenimiento-mac-cancun.jpeg', lang: 'en' },
  { src: 'servicios/reparacion-bisagras.html', dest: 'en/hinge-repair.astro', canonical: 'en/hinge-repair', image: '/assets/images/AntesBisagra.jpg', lang: 'en' },
  { src: 'servicios/reparacion-controles.html', dest: 'en/controller-repair.astro', canonical: 'en/controller-repair', image: '/assets/images/reparacion-controles-cancun.jpeg', lang: 'en' },
  { src: 'servicios/limpieza-laptop-liquido.html', dest: 'en/liquid-damage.astro', canonical: 'en/liquid-damage', image: '/assets/images/limpieza-liquido-laptop.jpeg', lang: 'en' },
  { src: 'servicios/antisulfatacion.html', dest: 'en/anti-sulfatation.astro', canonical: 'en/anti-sulfatation', image: '/assets/images/reparacion-sulfatacion-cancun.jpeg', lang: 'en' },
  { src: 'servicios/paquetes.html', dest: 'en/packages.astro', canonical: 'en/packages', image: '/LOGOCIRCULAR.png', lang: 'en' },
  { src: 'servicios/b2b.html', dest: 'en/b2b.astro', canonical: 'en/b2b', image: '/LOGOCIRCULAR.png', lang: 'en' },
  { src: 'info/contacto.html', dest: 'en/contact.astro', canonical: 'en/contact', image: '/LOGOCIRCULAR.png', lang: 'en' },
  { src: 'info/comentarios.html', dest: 'en/reviews.astro', canonical: 'en/reviews', image: '/LOGOCIRCULAR.png', lang: 'en' },
  { src: 'info/preguntas-frecuentes.html', dest: 'en/faq.astro', canonical: 'en/faq', image: '/LOGOCIRCULAR.png', lang: 'en' },
  { src: 'info/catalogo.html', dest: 'en/catalog.astro', canonical: 'en/catalog', image: '/LOGOCIRCULAR.png', lang: 'en' },
  { src: 'legal/privacidad.html', dest: 'en/privacy.astro', canonical: 'en/privacy', image: '/LOGOCIRCULAR.png', lang: 'en' },
  { src: 'legal/garantia.html', dest: 'en/warranty.astro', canonical: 'en/warranty', image: '/LOGOCIRCULAR.png', lang: 'en' },
];

function extractMeta(html, filePath) {
  const titleMatch = html.match(/<title>(.*?)<\/title>/s);
  const descMatch = html.match(/<meta\s+name="description"\s+content="(.*?)"/s);
  const ogImageMatch = html.match(/<meta\s+property="og:image"\s+content="(.*?)"/s);
  
  // Extract schema blocks
  const schemas = [];
  const schemaRegex = /<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let m;
  while ((m = schemaRegex.exec(html)) !== null) {
    try {
      schemas.push(JSON.parse(m[1].trim()));
    } catch (e) {}
  }

  const title = titleMatch ? titleMatch[1].trim() : 'Pixon PC';
  const description = descMatch ? descMatch[1].trim() : '';
  const image = ogImageMatch ? ogImageMatch[1] : '/LOGOCIRCULAR.png';

  return { title, description, image, schemas };
}

function extractBody(html) {
  // Match only the actual <body> tag, not text containing '<body'
  // Uses word boundary and ensures it's an HTML tag (at line start or after >)
  const bodyMatch = html.match(/(^|>|\n)\s*<body[^>]*>([\s\S]*?)<\/body>/s);
  if (!bodyMatch) return '';

  let body = bodyMatch[2];

  // Remove nav-placeholder
  body = body.replace(/\s*<div\s+id="nav-placeholder">\s*<\/div>\s*/g, '\n  <Navbar />\n');

  // Remove footer (from <footer class="light-footer"> to </footer>)
  body = body.replace(/\s*<footer[\s\S]*?<\/footer>/, '\n  <Footer />\n');

  // Remove script type="module" src tags
  body = body.replace(/\s*<script\s+type="module"[^>]*><\/script>/g, '');

  // Remove cache-buster script
  body = body.replace(/\s*<script\s+defer\s+src="\/cache-buster\.js"><\/script>/g, '');

  // Remove CSP meta
  body = body.replace(/\s*<meta\s+http-equiv="Content-Security-Policy"[^>]*>/g, '');

  // Remove inline JSON-LD scripts (schema is handled by Base layout)
  body = body.replace(/\s*<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/g, '');

  return body.trim();
}

function getRelativeImportDepth(destPath) {
  const depth = destPath.split('/').length - 1;
  // Root-level pages (depth 0) need '../' to reach src/ from src/pages/
  // Subdirectory pages need one more level (e.g., en/foo.astro needs '../../')
  return '../'.repeat(depth + 1);
}

function getScriptsNeeded(srcHtml, destPath) {
  const scripts = [];
  const base = `  function smartWaRedirect(url: string) {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) { window.location.href = url; } else { window.open(url, '_blank'); }
  }\n`;

  scripts.push(base);

  if (srcHtml.includes('openTab')) {
    scripts.push(`  function openTab(evt: Event, tabId: string) {
    document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tabId)?.classList.add('active');
    (evt.currentTarget as Element)?.classList.add('active');
  }\n`);
  }

  if (srcHtml.includes('toggleFaq')) {
    scripts.push(`  function toggleFaq(button: Element) {
    const item = button.closest('.faq-item');
    const answer = item?.querySelector('.faq-answer');
    const isExpanded = button.getAttribute('aria-expanded') === 'true';
    document.querySelectorAll('.faq-item').forEach(i => {
      i.classList.remove('faq-item--open');
      const q = i.querySelector('.faq-question'); if (q) q.setAttribute('aria-expanded', 'false');
      const a = i.querySelector('.faq-answer'); if (a) (a as HTMLElement).style.maxHeight = '';
    });
    if (!isExpanded && item) {
      button.setAttribute('aria-expanded', 'true');
      item.classList.add('faq-item--open');
      if (answer) (answer as HTMLElement).style.maxHeight = answer.scrollHeight + 'px';
    }
  }\n`);
  }

  if (srcHtml.includes('.video-lazy-thumb')) {
    scripts.push(`  document.querySelectorAll('.video-lazy-thumb').forEach(thumb => {
    thumb.addEventListener('click', () => {
      const videoId = thumb.getAttribute('data-video-id');
      const wrapper = thumb.closest('.video-wrapper');
      if (!videoId || !wrapper) return;
      const iframe = document.createElement('iframe');
      iframe.src = \`https://www.youtube-nocookie.com/embed/\${videoId}?autoplay=1&mute=1&loop=1&playlist=\${videoId}&controls=0&rel=0&modestbranding=1\`;
      iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
      iframe.setAttribute('allowfullscreen', '');
      Object.assign(iframe.style, { position:'absolute', top:'0', left:'0', width:'100%', height:'100%', border:'none' });
      thumb.remove();
      wrapper.appendChild(iframe);
    });
  });\n`);
  }

  if (srcHtml.includes('addCommentForm')) {
    scripts.push(`  let selectedRating = 0;
  document.querySelectorAll('#star-rating .fa-star').forEach((star: Element) => {
    star.addEventListener('click', () => {
      selectedRating = parseInt((star as HTMLElement).dataset.val || '0');
      document.querySelectorAll('#star-rating .fa-star').forEach((s: Element, i: number) => {
        s.classList.toggle('active', i < selectedRating);
      });
    });
  });
  document.getElementById('addCommentForm')?.addEventListener('submit', async (e: Event) => {
    e.preventDefault();
    const name = (document.getElementById('commenterName') as HTMLInputElement)?.value;
    const text = (document.getElementById('commenterText') as HTMLTextAreaElement)?.value;
    if (!name || !text || selectedRating === 0) return;
    try {
      const res = await fetch('/api/comments', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'include', body: JSON.stringify({ name, text, rating: selectedRating }) });
      if (res.ok) { alert('¡Comentario enviado! Será revisado antes de publicarse.'); (e.target as HTMLFormElement).reset(); selectedRating = 0; document.querySelectorAll('#star-rating .fa-star').forEach(s => s.classList.remove('active')); }
    } catch (err) { console.error(err); }
  });\n`);
  }

  if (srcHtml.includes('?section=') || srcHtml.includes('hash')) {
    scripts.push(`  const params = new URLSearchParams(window.location.search);
  const section = params.get('section');
  if (section) { const target = document.getElementById(section); if (target) setTimeout(() => target.scrollIntoView({ behavior: 'smooth' }), 300); }
  if (window.location.hash) { const target = document.querySelector(window.location.hash); if (target) setTimeout(() => target.scrollIntoView({ behavior: 'smooth' }), 300); }\n`);
  }

  if (srcHtml.includes('animated-counter')) {
    scripts.push(`  const counters = document.querySelectorAll('.animated-counter');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const counter = entry.target as HTMLElement;
        const target = parseInt(counter.dataset.target || '0');
        let count = 0;
        const timer = setInterval(() => { count += target / 50; if (count >= target) { counter.textContent = target.toString(); clearInterval(timer); } else { counter.textContent = Math.floor(count).toString(); } }, 30);
        observer.unobserve(counter);
      }
    });
  }, { threshold: 0.5 });
  counters.forEach(c => observer.observe(c));\n`);
  }

  if (srcHtml.includes('hero-yt-wrapper')) {
    scripts.push(`  window.addEventListener('DOMContentLoaded', () => {
    const poster = document.getElementById('hero-poster');
    const wrapper = document.getElementById('hero-yt-wrapper');
    if (poster && wrapper && window.innerWidth >= 768) {
      setTimeout(() => {
        const iframe = document.createElement('iframe');
        iframe.src = 'https://www.youtube-nocookie.com/embed/cbKre_xAFlo?autoplay=1&mute=1&loop=1&playlist=cbKre_xAFlo&controls=0&rel=0&modestbranding=1';
        iframe.className = 'bg-video-iframe';
        iframe.style.opacity = '0';
        iframe.style.transition = 'opacity 0.8s ease-in-out';
        wrapper.appendChild(iframe);
        setTimeout(() => { iframe.style.opacity = '1'; poster.style.opacity = '0'; setTimeout(() => poster.remove(), 800); }, 2000);
      }, 1500);
    }
  });\n`);
  }

  if (srcHtml.includes('specialty-card')) {
    scripts.push(`  document.querySelectorAll('.specialty-card').forEach(card => {
    card.removeAttribute('onclick');
    card.addEventListener('click', function(e) {
      if (e.target.closest('button')) return;
      if (this.classList.contains('active')) { this.classList.remove('active'); return; }
      document.querySelectorAll('.specialty-card.active').forEach(c => c.classList.remove('active'));
      this.classList.add('active');
    });
  });\n`);
  }

  return scripts.join('\n');
}

function generateAstroPage(html, mapping) {
  const { src, dest, canonical, image: ogImage, lang = 'es' } = mapping;
  const srcPath = path.join(pagesDir, src);
  const srcHtml = fs.readFileSync(srcPath, 'utf-8');

  const { title, description, image: extractedImage, schemas } = extractMeta(srcHtml, src);
  const body = extractBody(srcHtml);
  const scripts = getScriptsNeeded(srcHtml, dest);
  const depth = getRelativeImportDepth(dest);
  const canonicalUrl = canonical ? `https://pixon.com.mx/${canonical}` : '';
  const imageUrl = ogImage || extractedImage;
  const langAttr = lang === 'en' ? '\n  lang="en"' : '';

  const schemaProp = schemas.length > 0 ? `\n  schema={${JSON.stringify(schemas, null, 4)}}` : '';

  return `---
import '${depth.replace(/\/$/, '') || '.'}/layouts/Base.astro';
import '${depth}components/Navbar.astro';
import '${depth}components/Footer.astro';
---

<Base
  title="${title.replace(/"/g, '\\"')}"
  description="${description.replace(/"/g, '\\"')}"${canonicalUrl ? `\n  canonical="${canonicalUrl}"` : ''}${imageUrl ? `\n  image="${imageUrl}"` : ''}${schemaProp}${langAttr}
>
  <Navbar${lang === 'en' ? ' lang="en"' : ''} />
${body}
</Base>

<script>
${scripts}
</script>
`;
}

// Run generation
let created = 0;
let errors = 0;

for (const mapping of pageMappings) {
  const srcPath = path.join(pagesDir, mapping.src);
  if (!fs.existsSync(srcPath)) {
    console.error(`⚠ Source not found: ${srcPath}`);
    errors++;
    continue;
  }

  const destPath = path.join(astroPagesDir, mapping.dest);
  const destDir = path.dirname(destPath);
  fs.mkdirSync(destDir, { recursive: true });

  try {
    const content = generateAstroPage(fs.readFileSync(srcPath, 'utf-8'), mapping);
    fs.writeFileSync(destPath, content, 'utf-8');
    console.log(`✓ ${mapping.src} → ${mapping.dest}`);
    created++;
  } catch (e) {
    console.error(`✗ Error generating ${mapping.dest}: ${e.message}`);
    errors++;
  }
}

console.log(`\nDone: ${created} created, ${errors} errors`);
