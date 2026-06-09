import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const dist = path.join(process.cwd(), 'dist');
const assetDir = path.join(dist, 'assets', 'inline');
const eventPattern = /\s(on[a-z]+)=("([\s\S]*?)"|'([\s\S]*?)')/gi;
const scriptPattern = /<script([^>]*)>([\s\S]*?)<\/script>/gi;

const hash = (value) => crypto.createHash('sha256').update(value).digest('hex').slice(0, 16);
const decode = (value) => value
  .replaceAll('&quot;', '"').replaceAll('&#39;', "'")
  .replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');

async function walk(dir, out = []) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, out);
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

await fs.mkdir(assetDir, { recursive: true });
let handlers = 0;
let scripts = 0;

for (const file of await walk(dist)) {
  let html = await fs.readFile(file, 'utf8');
  const bindings = [];
  const scriptWrites = [];
  let id = 0;

  // Extract scripts first so strings containing HTML are not mistaken for
  // attributes in the page markup.
  html = html.replace(scriptPattern, (full, attrs, body) => {
    if (/\bsrc\s*=/.test(attrs) || /application\/ld\+json|application\/json|importmap/i.test(attrs)) return full;
    if (!body.trim()) return '';
    const isModule = /\btype=["']module["']/i.test(attrs);
    const cleanAttrs = attrs.replace(/\s*type=["']module["']/i, '').replace(/\s*is:inline/i, '');
    const name = `${hash(`${path.relative(dist, file)}:${body}`)}.js`;
    scriptWrites.push(fs.writeFile(path.join(assetDir, name), body.trim() + '\n', 'utf8'));
    scripts++;
    return `<script${cleanAttrs}${isModule ? ' type="module"' : ''} src="/assets/inline/${name}"></script>`;
  });

  html = html.replace(eventPattern, (_full, eventName, _quoted, doubleValue, singleValue) => {
    const code = decode(doubleValue ?? singleValue ?? '');
    const bindingId = `pixon-${hash(path.relative(dist, file))}-${id++}`;
    const event = eventName.slice(2).toLowerCase();
    bindings.push({ bindingId, event, code });
    handlers++;
    return ` data-pixon-event-id="${bindingId}"`;
  });

  if (bindings.length) {
    const source = `(() => {\n${bindings.map(({ bindingId, event, code }) => `  { const el = document.querySelector('[data-pixon-event-id="${bindingId}"]'); if (el) { const run = function(event) { ${code}\n }; const listener = function(event) { const result = run.call(el, event); if (result === false) { event.preventDefault(); event.stopPropagation(); } }; if ('${event}' === 'load' && el.tagName === 'LINK' && el.sheet) listener(new Event('load')); else el.addEventListener('${event}', listener); } }`).join('\n')}\n})();\n`;
    const name = `${hash(`${path.relative(dist, file)}:handlers:${source}`)}.js`;
    await fs.writeFile(path.join(assetDir, name), source, 'utf8');
    html = html.replace('</body>', `<script src="/assets/inline/${name}"></script></body>`);
  }

  await Promise.all(scriptWrites);

  await fs.writeFile(file, html, 'utf8');
}

console.log(`JavaScript inline externalizado: ${scripts} scripts y ${handlers} handlers.`);
