#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { TextDecoder } = require('util');

const root = path.resolve(__dirname, '..');
const fixMode = process.argv.includes('--fix');

const skipDirs = new Set(['.git', '.astro', '.cache', '.playwright-mcp', '.sisyphus', 'dist', 'node_modules']);
const textExtensions = new Set(['.astro', '.css', '.html', '.js', '.json', '.md', '.mjs', '.cjs', '.ps1', '.sql', '.ts', '.txt', '.xml']);
const rootTextFiles = new Set(['.editorconfig', '.gitattributes', 'package.json', 'package-lock.json', 'README.md']);
const selfDocumentingFiles = new Set(['scripts/check-encoding.js', 'docs/encoding.md']);

const suspiciousPatterns = [
  /\u00c3/g,
  /\u00c2/g,
  /\ufffd/g,
  /@&/g,
  /Canc\u00c3/g,
  /reparaci\u00c3/g,
  /diagn\u00c3/g,
  /cotizaci\u00c3/g,
  /garant\u00c3/g,
  /configuraci\u00c3/g,
  /atenci\u00c3/g,
  /m\u00c3\u00b3vil/g,
  /p\u00c3\u00a1gina/g,
  /\u00c2\u00bf/g,
  /\u00c2\u00a1/g,
  /cu\?nto|corrosi\?n|l\?neas|deber\?a|h\?bitos|protecci\?n|documentaci\?n|m\?dulo|econ\?mico|refacci\?n|separaci\?n|peque\?as|alg\?n|m\?viles|todav\?a|recomendaci\?n|Conexi\?n|Alimentaci\?n|tecnolog\?a|Despu\?s|selecci\?n|m\?vil|t\?picas|presi\?n|Se\?ales|S\?ntomas|Extra\?os|Ingenier\?a|Informaci\?n|Metodolog\?a|Paqueter\?a|Optimizaci\?n|iluminaci\?n|torniller\?a|bater\?a|funci\?n/g,
  /autorizaci\?n/g,
  /[\u0018-\u001f]/g,
];

const wordFixes = [
  [/REPARACI[\uFFFD\u0018-\u001f0]+N/g, 'REPARACIÓN'],
  [/reparaci[\uFFFD\u0018-\u001f0]+n/g, 'reparación'],
  [/UBICACI[\uFFFD\u0018-\u001f0]+N/g, 'UBICACIÓN'],
  [/ubicaci[\uFFFD\u0018-\u001f0]+n/g, 'ubicación'],
  [/INFORMACI[\uFFFD\u0018-\u001f0]+N/g, 'INFORMACIÓN'],
  [/informaci[\uFFFD\u0018-\u001f0]+n/g, 'información'],
  [/OPTIMIZACI[\uFFFD\u0018-\u001f0]+N/g, 'OPTIMIZACIÓN'],
  [/optimizaci[\uFFFD\u0018-\u001f0]+n/g, 'optimización'],
  [/ACTUALIZACI[\uFFFD\u0018-\u001f0]+N/g, 'ACTUALIZACIÓN'],
  [/actualizaci[\uFFFD\u0018-\u001f0]+n/g, 'actualización'],
  [/PREVENCI[\uFFFD\u0018-\u001f0]+N/g, 'PREVENCIÓN'],
  [/prevenci[\uFFFD\u0018-\u001f0]+n/g, 'prevención'],
  [/DIAGN[\uFFFD\u0018-\u001f0]+STICO/g, 'DIAGNÓSTICO'],
  [/diagn[\uFFFD\u0018-\u001f0]+stico/g, 'diagnóstico'],
  [/T[\uFFFD\u0018-\u001f0]+CNICO/g, 'TÉCNICO'],
  [/t[\uFFFD\u0018-\u001f0]+cnico/g, 'técnico'],
  [/QU[\uFFFD\u0018-\u001f0]+/g, 'QUÉ'],
  [/qu[\uFFFD\u0018-\u001f0]+/g, 'qué'],
  [/DISE[\uFFFD\u0018-\u001f0]+O/g, 'DISEÑO'],
  [/dise[\uFFFD\u0018-\u001f0]+o/g, 'diseño'],
  [/DA[\uFFFD\u0018-\u001f0]+O/g, 'DAÑO'],
  [/da[\uFFFD\u0018-\u001f0]+o/g, 'daño'],
  [/SE[\uFFFD\u0018-\u001f0]+ALES/g, 'SEÑALES'],
  [/se[\uFFFD\u0018-\u001f0]+ales/g, 'señales'],
  [/ASIM[\uFFFD\u0018-\u001f0]+TRICAS/g, 'ASIMÉTRICAS'],
  [/asim[\uFFFD\u0018-\u001f0]+tricas/g, 'asimétricas'],
  [/COM[\uFFFD\u0018-\u001f0]+N/g, 'COMÚN'],
  [/com[\uFFFD\u0018-\u001f0]+n/g, 'común'],
  [/P[\uFFFD]gina/g, 'Página'],
  [/p[\uFFFD]gina/g, 'página'],
  [/autorizaci\?n/g, 'autorización'],
  [/cu\?nto/g, 'cuánto'],
  [/Cu\?nto/g, 'Cuánto'],
  [/corrosi\?n/g, 'corrosión'],
  [/l\?neas/g, 'líneas'],
  [/deber\?a/g, 'debería'],
  [/h\?bitos/g, 'hábitos'],
  [/protecci\?n/g, 'protección'],
  [/documentaci\?n/g, 'documentación'],
  [/m\?dulo/g, 'módulo'],
  [/econ\?mico/g, 'económico'],
  [/refacci\?n/g, 'refacción'],
  [/separaci\?n/g, 'separación'],
  [/peque\?as/g, 'pequeñas'],
  [/alg\?n/g, 'algún'],
  [/m\?viles/g, 'móviles'],
  [/s\? puede/g, 'sí puede'],
  [/todav\?a/g, 'todavía'],
  [/recomendaci\?n/g, 'recomendación'],
  [/Conexi\?n/g, 'Conexión'],
  [/Alimentaci\?n/g, 'Alimentación'],
  [/tecnolog\?a/g, 'tecnología'],
  [/Despu\?s/g, 'Después'],
  [/selecci\?n/g, 'selección'],
  [/m\?vil/g, 'móvil'],
  [/t\?picas/g, 'típicas'],
  [/presi\?n/g, 'presión'],
  [/Se\?ales/g, 'Señales'],
  [/S\?ntomas/g, 'Síntomas'],
  [/Extra\?os/g, 'Extraños'],
  [/Ingenier\?a/g, 'Ingeniería'],
  [/Informaci\?n/g, 'Información'],
  [/Metodolog\?a/g, 'Metodología'],
  [/Paqueter\?a/g, 'Paquetería'],
  [/Optimizaci\?n/g, 'Optimización'],
  [/iluminaci\?n/g, 'iluminación'],
  [/torniller\?a/g, 'tornillería'],
  [/bater\?a/g, 'batería'],
  [/funci\?n/g, 'función'],
  [/INICIALIZACI\u00c3N/g, 'INICIALIZACIÓN'],
  [/AUTORIZACI\u00c3N/g, 'AUTORIZACIÓN'],
  [/ADMINISTRACI\u00c3N/g, 'ADMINISTRACIÓN'],
  [/P\u00c3aBLICA/g, 'PÚBLICA'],
  [/\u00c3atil/g, 'Útil'],
  [/QU\u00c30/g, 'QUÉ'],
  [/\u00e2"\u0090/g, '-'],
];

function bytesFromLatin1String(value) {
  return Buffer.from([...value].map((char) => char.charCodeAt(0) & 0xff));
}

function decodeLatin1Span(value) {
  return bytesFromLatin1String(value).toString('utf8');
}

function fixMojibake(content) {
  let next = content;

  next = next.replace(/[\u00c2-\u00c3][\u0080-\u00bf\u00a0-\u00bf]/g, decodeLatin1Span);
  next = next.replace(/\u00e2[\u0080-\u00bf\u00a0-\u00bf]{2}/g, decodeLatin1Span);

  for (const [pattern, replacement] of wordFixes) {
    next = next.replace(pattern, replacement);
  }

  next = next
    .replace(/\uFFFD\u0053&/g, '-')
    .replace(/\uFFFDa\uFFFD\uFE0F/g, 'Precaución:')
    .replace(/\uFFFD"\uFFFD\uFFFD"\uFFFD/g, '-')
    .replace(/\u2192\uFFFD/g, '->')
    .replace(/\uFFFD/g, '')
    .replace(/[\u0018-\u001f]/g, '');

  return next;
}

function isTextFile(filePath) {
  const rel = path.relative(root, filePath).replace(/\\/g, '/');
  return rootTextFiles.has(rel) || textExtensions.has(path.extname(filePath).toLowerCase());
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!skipDirs.has(entry.name)) walk(path.join(dir, entry.name), files);
      continue;
    }

    const filePath = path.join(dir, entry.name);
    if (isTextFile(filePath)) files.push(filePath);
  }
  return files;
}

function findIssues(filePath, content) {
  const issues = [];
  const rel = path.relative(root, filePath).replace(/\\/g, '/');
  if (selfDocumentingFiles.has(rel)) return issues;

  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (!suspiciousPatterns.some((pattern) => pattern.test(line))) return;
    suspiciousPatterns.forEach((pattern) => { pattern.lastIndex = 0; });
    issues.push({ file: rel, line: index + 1, text: line.trim().slice(0, 220) });
  });
  return issues;
}

const decoder = new TextDecoder('utf-8', { fatal: true });
const files = walk(root);
const issues = [];
let fixed = 0;

for (const file of files) {
  const raw = fs.readFileSync(file);
  let content;

  try {
    content = decoder.decode(raw);
  } catch (error) {
    if (!fixMode) {
      issues.push({
        file: path.relative(root, file),
        line: 0,
        text: `Archivo no decodifica como UTF-8: ${error.message}`,
      });
      continue;
    }

    content = fixMojibake(raw.toString('latin1'));
    fs.writeFileSync(file, content, 'utf8');
    fixed += 1;
  }

  if (fixMode) {
    const repaired = fixMojibake(content);
    if (repaired !== content) {
      fs.writeFileSync(file, repaired, 'utf8');
      content = repaired;
      fixed += 1;
    }
  }

  issues.push(...findIssues(file, content));
}

if (fixed) console.log(`Archivos corregidos: ${fixed}`);

if (issues.length) {
  console.error(`Encoding sospechoso encontrado (${issues.length} hallazgos):`);
  for (const issue of issues.slice(0, 200)) {
    console.error(`${issue.file}:${issue.line}: ${issue.text}`);
  }
  if (issues.length > 200) console.error(`... ${issues.length - 200} hallazgos adicionales omitidos.`);
  console.error('\nRevisa los textos o ejecuta: node scripts/check-encoding.js --fix');
  process.exit(1);
}

console.log(`Encoding OK: ${files.length} archivos UTF-8 revisados sin mojibake.`);
