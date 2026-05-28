import { readFileSync } from 'node:fs';

const pages = [
  'dist/index.html',
  'dist/servicios/laptop/cambio-teclado.html',
  'dist/servicios/pc/formateo.html',
  'dist/servicios/laptop.html',
  'dist/servicios.html',
  'dist/contacto.html',
  'dist/preguntas-frecuentes.html',
  'dist/admin/admin.html',
];

const scriptPattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/g;

for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  const schemas = [...html.matchAll(scriptPattern)].map((match) => JSON.parse(match[1]));
  const types = schemas.map((schema) => {
    const type = schema['@type'];
    return Array.isArray(type) ? type.join('+') : type;
  });

  console.log(`${page} => ${types.join(', ') || '(sin JSON-LD)'} | AggregateRating=${html.includes('AggregateRating')}`);
}

const faqHtml = readFileSync('dist/preguntas-frecuentes.html', 'utf8');
const faqButtons = [...faqHtml.matchAll(/class="faq-question"/g)].length;
const faqAnswers = [...faqHtml.matchAll(/class="faq-answer-inner">([^<][\s\S]*?)<\/div>/g)]
  .map((match) => match[1].replace(/<[^>]*>/g, '').trim())
  .filter(Boolean).length;
const hasToggle = faqHtml.includes('function toggleFaq') || faqHtml.includes('window.toggleFaq');

console.log(`dist/preguntas-frecuentes.html FAQ => preguntas=${faqButtons}, respuestas=${faqAnswers}, toggle=${hasToggle}`);
