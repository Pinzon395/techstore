#!/usr/bin/env node
// Genera el release de producción desde un commit (default HEAD = main):
//   node tools/build-release.mjs [ref]
// 1) exige árbol limpio  2) git archive → release/release-prod.zip
// 3) extrae y corre preflight + escaneo de secretos sobre el contenido real del ZIP
// 4) escribe release/release-manifest.json (SHA, timestamp, Node, hash del lockfile, SHA256 del ZIP)
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const ref = process.argv.slice(2).find((a) => !a.startsWith('--')) || 'HEAD';
const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8' }).trim();

const dirty = git('status', '--porcelain', '--untracked-files=no');
if (dirty && !process.argv.includes('--allow-dirty')) {
    console.error('El árbol tiene cambios sin commitear en archivos versionados; git archive no los incluiría:\n' + dirty);
    process.exit(1);
}
const sha = git('rev-parse', ref);
const outDir = path.join(root, 'release');
mkdirSync(outDir, { recursive: true });
const zipPath = path.join(outDir, 'release-prod.zip');
rmSync(zipPath, { force: true });
git('archive', '--format=zip', `--output=${zipPath}`, sha);

const extract = mkdtempSync(path.join(tmpdir(), 'pixon-release-'));
if (process.platform === 'win32') {
    // bsdtar de Windows lee ZIP; el tar GNU de Git Bash no.
    execFileSync(path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe'), ['-xf', zipPath, '-C', extract]);
} else {
    execFileSync('unzip', ['-q', zipPath, '-d', extract]);
}
const commitFile = readFileSync(path.join(extract, '.release-commit'), 'utf8').trim();
if (commitFile !== sha) { console.error(`.release-commit=${commitFile} no coincide con ${sha} (export-subst)`); process.exit(1); }

let preflightOk = true;
try {
    execFileSync(process.execPath, [path.join(root, 'tools', 'production-preflight.mjs'), '--dir', extract], { stdio: 'inherit' });
} catch { preflightOk = false; }

const zipSha = createHash('sha256').update(readFileSync(zipPath)).digest('hex');
const lockSha = createHash('sha256').update(readFileSync(path.join(extract, 'package-lock.json'))).digest('hex');
const pkg = JSON.parse(readFileSync(path.join(extract, 'package.json'), 'utf8'));
const manifest = {
    app: pkg.name,
    version: pkg.version,
    git_sha: sha,
    git_ref: ref,
    built_at: new Date().toISOString(),
    node_target: readFileSync(path.join(extract, '.nvmrc'), 'utf8').trim(),
    node_engines: pkg.engines?.node,
    install_command: 'npm ci',
    build_command: 'npm run build',
    start_command: 'npm start',
    entrypoint: 'server/server.js',
    output_dir: 'dist',
    package_lock_sha256: lockSha,
    zip_file: 'release-prod.zip',
    zip_sha256: zipSha,
    zip_bytes: readFileSync(zipPath).length,
    zip_secret_scan: preflightOk ? 'PASS' : 'FAIL'
};
writeFileSync(path.join(outDir, 'release-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
rmSync(extract, { recursive: true, force: true });
console.log(`\nZIP=${zipPath}\nSHA256=${zipSha}\nGIT_SHA=${sha}\nRELEASE=${preflightOk ? 'PASS' : 'FAIL'}`);
process.exit(preflightOk ? 0 : 1);
