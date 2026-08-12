#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { TextDecoder } = require('util');

const root = process.env.ENCODING_PROJECT_ROOT
  ? path.resolve(process.env.ENCODING_PROJECT_ROOT)
  : path.resolve(__dirname, '..');
const fixMode = process.argv.includes('--fix');

const skipDirs = new Set([
  '.git', '.astro', '.cache', '.playwright-mcp', '.sisyphus', '.vs',
  'backups', 'dist', 'node_modules', 'test-results',
]);
const textExtensions = new Set([
  '.astro', '.bat', '.cjs', '.css', '.html', '.js', '.json', '.md', '.mjs',
  '.ps1', '.sql', '.ts', '.txt', '.xml', '.xsl', '.yaml', '.yml',
]);
const rootTextFiles = new Set([
  '.editorconfig', '.gitattributes', '.gitignore', 'AGENTS.md', 'package.json',
  'package-lock.json', 'pnpm-workspace.yaml', 'PRODUCT.md', 'README.md',
]);
const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
const windows1252Decoder = new TextDecoder('windows-1252');

const cp1252Bytes = new Map([
  [0x20ac, 0x80], [0x201a, 0x82], [0x0192, 0x83], [0x201e, 0x84],
  [0x2026, 0x85], [0x2020, 0x86], [0x2021, 0x87], [0x02c6, 0x88],
  [0x2030, 0x89], [0x0160, 0x8a], [0x2039, 0x8b], [0x0152, 0x8c],
  [0x017d, 0x8e], [0x2018, 0x91], [0x2019, 0x92], [0x201c, 0x93],
  [0x201d, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97],
  [0x02dc, 0x98], [0x2122, 0x99], [0x0161, 0x9a], [0x203a, 0x9b],
  [0x0153, 0x9c], [0x017e, 0x9e], [0x0178, 0x9f],
]);

function cp1252Byte(char) {
  const codePoint = char.codePointAt(0);
  if (codePoint <= 0x7f || (codePoint >= 0xa0 && codePoint <= 0xff)) return codePoint;
  if (codePoint >= 0x80 && codePoint <= 0x9f) return codePoint;
  return cp1252Bytes.get(codePoint);
}

function utf8SequenceLength(firstByte) {
  if (firstByte >= 0xc2 && firstByte <= 0xdf) return 2;
  if (firstByte >= 0xe0 && firstByte <= 0xef) return 3;
  if (firstByte >= 0xf0 && firstByte <= 0xf4) return 4;
  return 0;
}

function decodeMojibakeLayer(value) {
  const chars = [...value];
  let output = '';

  for (let index = 0; index < chars.length;) {
    const firstByte = cp1252Byte(chars[index]);
    const length = firstByte === undefined ? 0 : utf8SequenceLength(firstByte);

    if (!length || index + length > chars.length) {
      output += chars[index];
      index += 1;
      continue;
    }

    const bytes = [];
    let valid = true;
    for (let offset = 0; offset < length; offset += 1) {
      const byte = cp1252Byte(chars[index + offset]);
      if (byte === undefined || (offset > 0 && (byte < 0x80 || byte > 0xbf))) {
        valid = false;
        break;
      }
      bytes.push(byte);
    }

    if (!valid) {
      output += chars[index];
      index += 1;
      continue;
    }

    try {
      output += utf8Decoder.decode(Buffer.from(bytes));
      index += length;
    } catch {
      output += chars[index];
      index += 1;
    }
  }

  return output;
}

function repairMojibake(value) {
  let repaired = value;
  for (let pass = 0; pass < 4; pass += 1) {
    const next = decodeMojibakeLayer(repaired);
    if (next === repaired) break;
    repaired = next;
  }
  return repaired;
}

function isTextFile(filePath) {
  const relative = path.relative(root, filePath).replace(/\\/g, '/');
  return rootTextFiles.has(relative) || textExtensions.has(path.extname(filePath).toLowerCase());
}

function walk(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!skipDirs.has(entry.name)) walk(path.join(directory, entry.name), files);
      continue;
    }
    const filePath = path.join(directory, entry.name);
    if (isTextFile(filePath)) files.push(filePath);
  }
  return files;
}

function firstLineAfterHead(content, headEnd) {
  const lines = content.slice(headEnd).split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed) return trimmed;
  }
  return '';
}

function charsetIssues(relative, content) {
  const extension = path.extname(relative).toLowerCase();
  const inspectHeads = new Set(['.astro', '.html', '.xml', '.xsl']);
  if (!inspectHeads.has(extension) && relative !== 'server/server.js') return [];

  const issues = [];
  const requiredCharsetLine = extension === '.xsl'
    ? '<meta charset="UTF-8"/>'
    : '<meta charset="UTF-8">';
  const headPattern = /<head(?:\s[^>]*)?>/gi;
  let match;
  while ((match = headPattern.exec(content)) !== null) {
    const firstLine = firstLineAfterHead(content, match.index + match[0].length);
    if (firstLine !== requiredCharsetLine) {
      const line = content.slice(0, match.index).split(/\r?\n/).length;
      issues.push({ line, text: `La primera línea de <head> es: ${firstLine || '(vacía)'}` });
    }
  }

  const legacyPattern = /<meta\s+[^>]*(?:http-equiv\s*=\s*["']Content-Type["']|charset\s*=\s*["']?(?!UTF-8)[^\s"'>]+)[^>]*>/gi;
  for (const legacy of content.matchAll(legacyPattern)) {
    const line = content.slice(0, legacy.index).split(/\r?\n/).length;
    issues.push({ line, text: `Declaración de charset no permitida: ${legacy[0]}` });
  }
  return issues;
}

function contentIssues(relative, content) {
  const issues = [];
  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    const repairable = repairMojibake(line) !== line;
    const irreversible = /\uFFFD|[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]|[\u00c2\u00c3\u00e2\u00ef\u00f0]/u.test(line);
    if (repairable || irreversible) {
      issues.push({ line: index + 1, text: line.trim().slice(0, 220) });
    }
  });
  issues.push(...charsetIssues(relative, content));
  return issues;
}

const files = walk(root);
const issues = [];
const changedFiles = [];

for (const filePath of files) {
  const relative = path.relative(root, filePath).replace(/\\/g, '/');
  const raw = fs.readFileSync(filePath);
  let content;

  try {
    content = utf8Decoder.decode(raw);
  } catch (error) {
    if (!fixMode) {
      issues.push({ file: relative, line: 0, text: `No es UTF-8 válido: ${error.message}` });
      continue;
    }
    content = windows1252Decoder.decode(raw);
  }

  if (fixMode) {
    const repaired = repairMojibake(content);
    if (repaired !== content || !raw.equals(Buffer.from(repaired, 'utf8'))) {
      fs.writeFileSync(filePath, repaired, 'utf8');
      content = repaired;
      changedFiles.push(relative);
    }
  }

  for (const issue of contentIssues(relative, content)) issues.push({ file: relative, ...issue });
}

if (changedFiles.length) {
  console.log(`Archivos corregidos: ${changedFiles.length}`);
  for (const file of changedFiles) console.log(`  ${file}`);
}

if (issues.length) {
  console.error(`Encoding o charset incorrecto (${issues.length} hallazgos):`);
  for (const issue of issues.slice(0, 250)) {
    console.error(`${issue.file}:${issue.line}: ${issue.text}`);
  }
  if (issues.length > 250) console.error(`... ${issues.length - 250} hallazgos adicionales omitidos.`);
  console.error('\nCorrige los casos indicados o ejecuta: npm run fix:encoding');
  process.exit(1);
}

console.log(`Encoding OK: ${files.length} archivos UTF-8 revisados.`);
