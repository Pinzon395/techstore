import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const required = ['package-lock.json', '.nvmrc', '.env.example', 'server/server.js'];
const failures = required.filter((file) => !existsSync(path.join(root, file)));

function directoryIsWritable(directory) {
  try {
    return statSync(directory).isDirectory();
  } catch {
    return false;
  }
}

const dataDir = path.resolve(process.env.DATA_DIR || path.join(root, 'server', 'storage'));
const requiredDirs = ['commerce-media', 'commerce-payment-proofs', 'cache', 'backups', 'tmp'];

const sourceExtensions = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.astro']);
const importExtensions = ['', '.js', '.mjs', '.cjs', '.ts', '.tsx', '.astro', '.json'];

function sourceFiles(directory) {
  let files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files = files.concat(sourceFiles(target));
    else if (sourceExtensions.has(path.extname(entry.name))) files.push(target);
  }
  return files;
}

function hasExactPath(target) {
  const parsed = path.parse(path.resolve(target));
  let current = parsed.root;
  for (const segment of path.relative(parsed.root, path.resolve(target)).split(path.sep).filter(Boolean)) {
    let entries;
    try { entries = readdirSync(current); } catch { return false; }
    if (!entries.includes(segment)) return false;
    current = path.join(current, segment);
  }
  return existsSync(current);
}

function resolvesWithExactCase(fromFile, specifier) {
  const base = path.resolve(path.dirname(fromFile), specifier.split(/[?#]/, 1)[0]);
  const candidates = [];
  for (const extension of importExtensions) candidates.push(`${base}${extension}`);
  for (const extension of importExtensions.slice(1)) candidates.push(path.join(base, `index${extension}`));
  return candidates.some(hasExactPath);
}

function findCaseIssues() {
  const expression = /(?:from\s*|require\s*\(|import\s*\()(['"])(\.[^'"]+)\1/g;
  const issues = [];
  for (const folder of ['server', 'src']) {
    const folderPath = path.join(root, folder);
    if (!existsSync(folderPath)) continue;
    for (const file of sourceFiles(folderPath)) {
      const source = readFileSync(file, 'utf8');
      let match;
      while ((match = expression.exec(source))) {
        if (!resolvesWithExactCase(file, match[2])) {
          issues.push(`${path.relative(root, file)} -> ${match[2]}`);
        }
      }
    }
  }
  return issues;
}

if (failures.length) {
  throw new Error(`Preflight Linux incompleto: faltan ${failures.join(', ')}`);
}

const caseIssues = findCaseIssues();
if (caseIssues.length) {
  throw new Error(`Imports incompatibles con filesystem case-sensitive:\n${caseIssues.join('\n')}`);
}

console.log(`Node ${process.version}; plataforma de verificacion: ${process.platform}`);
console.log(`DATA_DIR: ${dataDir}`);
console.log(`Lockfile: package-lock.json`);
console.log(`Persistencia esperada: ${requiredDirs.map((name) => path.join(dataDir, name)).join(', ')}`);

if (process.env.NODE_ENV === 'production' && !directoryIsWritable(dataDir)) {
  throw new Error(`DATA_DIR no existe o no es accesible: ${dataDir}`);
}

console.log('PASS preflight Linux: rutas portables, imports con case exacto y lockfile presentes.');
