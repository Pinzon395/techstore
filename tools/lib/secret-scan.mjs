// Escáner de secretos compartido por production-preflight y build-release.
// Nunca imprime valores: solo archivo + tipo de secreto.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';

export const SECRET_PATTERNS = [
    ['PRIVATE_KEY', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
    ['GOOGLE_CLIENT_SECRET', /GOCSPX-[A-Za-z0-9_-]{20,}/],
    ['RESEND_API_KEY', /\bre_[A-Za-z0-9]{8,}_[A-Za-z0-9]{16,}/],
    ['STRIPE_LIVE_KEY', /\b(?:sk|rk)_live_[A-Za-z0-9]{16,}/],
    ['MERCADO_PAGO_TOKEN', /\bAPP_USR-\d{6,}-\d{6}-[a-f0-9]{20,}/],
    ['AWS_ACCESS_KEY', /\bAKIA[0-9A-Z]{16}\b/],
    ['GITHUB_TOKEN', /\b(?:ghp|gho|ghs|github_pat)_[A-Za-z0-9_]{30,}/],
    ['GOOGLE_API_KEY', /\bAIza[0-9A-Za-z_-]{35}\b/],
    ['ASSIGNED_DB_PASSWORD', /^[ \t]*DB_PASSWORD[ \t]*=[ \t]*[^\s#<$][^\s#]{5,}/m],
    ['ASSIGNED_SESSION_SECRET', /^[ \t]*SESSION_SECRET[ \t]*=[ \t]*[^\s#<$][^\s#]{15,}/m]
];

const SECRET_ENV_KEYS = /(PASSWORD|SECRET|TOKEN|API_KEY|PRIVATE|ACCESS_KEY)/;

// Valores reales de los .env locales (nunca versionados): si aparecen
// literalmente en un archivo publicado, es una fuga aunque no tenga patrón.
export function loadLocalSecretValues(root) {
    const values = new Set();
    for (const name of ['.env', '.env.production', '.env.hostinger.local', '.env.local']) {
        const file = path.join(root, name);
        if (!existsSync(file)) continue;
        for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
            const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
            if (!match || !SECRET_ENV_KEYS.test(match[1])) continue;
            const value = match[2].replace(/^['"]|['"]$/g, '').trim();
            if (value.length >= 8) values.add(value);
        }
    }
    return [...values];
}

const TEXT_EXT = /\.(m?[jt]sx?|cjs|astro|json|md|txt|env|example|ya?ml|toml|html?|css|sql|sh|ps1|bat|xml|ini|cfg|conf)$|^\.env/i;

export function listFiles(dir, base = dir, out = []) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name === 'node_modules' || entry.name === '.git') continue;
            listFiles(full, base, out);
        } else {
            out.push(path.relative(base, full).replace(/\\/g, '/'));
        }
    }
    return out;
}

export function scanFiles(root, files, { literalValues = [], ignore = [] } = {}) {
    const findings = [];
    for (const rel of files) {
        if (ignore.some((re) => re.test(rel))) continue;
        if (!TEXT_EXT.test(path.basename(rel))) continue;
        const full = path.join(root, rel);
        let text;
        try {
            if (statSync(full).size > 5 * 1024 * 1024) continue;
            text = readFileSync(full, 'utf8');
        } catch { continue; }
        // .env.example y docs pueden mostrar placeholders; los patrones exigen formato real.
        for (const [type, re] of SECRET_PATTERNS) {
            if (re.test(text)) findings.push({ file: rel, type });
        }
        for (const value of literalValues) {
            if (text.includes(value)) { findings.push({ file: rel, type: 'LOCAL_ENV_SECRET_VALUE' }); break; }
        }
    }
    return findings;
}
