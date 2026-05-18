const fs = require('fs');
let content = fs.readFileSync('src/pages/mantenimiento-mac.astro', 'utf8');
content = content.replace(/\r\n/g, '\n');
const lines = content.split('\n');

const cleanFaqs = `const faqs = [
  { question: '¿Atienden Mac con chip M1, M2, M3?', answer: 'Sí. Mantenimiento preventivo (limpieza, pasta térmica) en MacBook Air/Pro M1, M2, M3 y modelos Intel desde 2015. Para reparaciones de placa lógica solo modelos Intel — los Apple Silicon llevan chips soldados sin servicio aún en México.' },
  { question: '¿Pueden reemplazar la batería de un MacBook?', answer: 'Sí, con baterías genuinas o de calidad equivalente certificada. Costo $1500-3500 según modelo. Incluye desarmado completo, reemplazo, calibración y prueba de ciclos. Garantía 6 meses.' },
  { question: '¿Cuánto tarda el mantenimiento Mac?', answer: 'Mantenimiento preventivo: 24-48 horas. Reparación de pantalla, teclado o placa: 3-7 días. Te enviamos fotos del antes/después y de cada componente revisado.' },
  { question: '¿Es más caro que mantenimiento Windows?', answer: 'Ligeramente, sí. Mac requiere herramientas especializadas y desarmado más complejo. <strong>Mantenimiento Mac desde $850 MXN</strong> vs $450 en Windows. Pero tu equipo gana 2-3 años de vida útil.' },
  { question: '¿Cada cuánto necesita mantenimiento mi Mac?', answer: 'En Cancún, por la humedad y el salitre, recomendamos cada 6 a 8 meses. En ambientes climatizados y secos puede estirarse hasta 12 meses.' },
  { question: '¿Reparan MacBooks con falla de placa en Cancún?', answer: 'Sí. Ofrecemos microsoldadura para equipos que Apple ya no atiende. Podemos reparar circuitos dañados por humedad, corrosión o sobrevoltaje.' },
  { question: '¿Cuánto cuesta el mantenimiento de un MacBook?', answer: 'El diagnóstico es gratuito. El costo varía según el modelo y servicio requerido. Contáctanos por WhatsApp para una cotización sin compromiso.' },
  { question: '¿Mi Mac se calienta mucho, es normal?', answer: 'No. El calentamiento excesivo indica que los ductos de ventilación están tapados o la pasta térmica se secó. Nuestro mantenimiento puede bajar la temperatura entre 15°C y 30°C.' }
];`;

lines.splice(9, 27, cleanFaqs);
fs.writeFileSync('src/pages/mantenimiento-mac.astro', lines.join('\n'));
