const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..', '..');
const skipDirs = new Set(['node_modules', 'dist', '.git', '.astro', '.playwright-mcp', '.sisyphus']);
const extensions = new Set(['.astro', '.js', '.ts', '.json', '.css', '.html', '.md', '.txt', '.xml']);

function hasDoubleEncoding(buffer) {
  try {
    const decoded = buffer.toString('utf8');
    let found = false;
    for (let i = 0; i < decoded.length - 1; i++) {
      if (decoded.charCodeAt(i) === 0xC3) {
        const next = decoded.charCodeAt(i + 1);
        // U+00C3 followed by continuation chars (U+0080-U+00BF) = double-encoded accent
        if (next >= 0x80 && next <= 0xBF) {
          found = true;
          // Show first 3 chars of context for debugging
          const ctx = decoded.substring(Math.max(0, i - 5), i + 8);
          return found;
        }
      }
    }
    return found;
  } catch {
    return false;
  }
}

function hasLeadingStrayByte(buffer) {
  return buffer.length > 0 && (buffer[0] === 0xFF || buffer[0] === 0xFE);
}

function fixFile(filePath) {
  let buf = fs.readFileSync(filePath);
  let changed = false;

  // Step 1: strip leading stray bytes (0xFF / 0xFE)
  if (hasLeadingStrayByte(buf)) {
    let start = 0;
    while (start < buf.length && (buf[start] === 0xFF || buf[start] === 0xFE)) start++;
    buf = buf.subarray(start);
    changed = true;
  }

  // Step 2: fix double-UTF-8 encoding
  if (hasDoubleEncoding(buf)) {
    const garbledStr = buf.toString('utf8');
    buf = Buffer.from(garbledStr, 'latin1');
    changed = true;
  }

  if (changed) fs.writeFileSync(filePath, buf);
  return changed;
}

function processDirectory(dir) {
  let fixed = 0, checked = 0, errors = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!skipDirs.has(entry.name)) {
        const sub = processDirectory(fullPath);
        fixed += sub.fixed; checked += sub.checked; errors += sub.errors;
      }
    } else if (extensions.has(path.extname(entry.name))) {
      checked++;
      try {
        if (fixFile(fullPath)) {
          console.log('FIXED: ' + path.relative(projectRoot, fullPath));
          fixed++;
        }
      } catch (err) {
        console.error('ERROR: ' + path.relative(projectRoot, fullPath) + ' - ' + err.message);
        errors++;
      }
    }
  }
  return { fixed, checked, errors };
}

console.log('Fixing double-UTF-8 encoding in text files...\n');
const r = processDirectory(projectRoot);
console.log('\nDone! Checked: ' + r.checked + ', Fixed: ' + r.fixed + ', Errors: ' + r.errors);
