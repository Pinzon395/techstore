import mysql from 'mysql2/promise';
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

function parseEnv(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[trimmed.slice(0, eqIdx).trim()] = val;
    }
  }
  return env;
}

async function testRestore() {
  console.log('═'.repeat(70));
  console.log('🔄 PIXON PC — TEST REAL DE RESTORE DE BACKUP DESDE R2');
  console.log('═'.repeat(70));

  const env = parseEnv('c:/Users/Usuario/techstore/.env');
  if (!env.TARGET_DATABASE_URL) throw new Error('TARGET_DATABASE_URL missing');

  // 1. Descargar schema-latest.sql desde R2
  console.log('\n[1/4] Descargando snapshot oficial desde Cloudflare R2 pixon-backups...');
  const tmpSqlPath = path.resolve('tmp/restore-test-schema.sql');
  fs.mkdirSync(path.dirname(tmpSqlPath), { recursive: true });

  execSync(`npx wrangler r2 object get pixon-backups/schema-latest.sql --file="${tmpSqlPath}" --remote`, {
    stdio: 'inherit'
  });

  const sqlContent = fs.readFileSync(tmpSqlPath, 'utf8');
  console.log(`✅ Snapshot descargado desde R2: ${(sqlContent.length / 1024).toFixed(1)} KB`);

  // 2. Conectar a Aiven MySQL
  console.log('\n[2/4] Conectando a Aiven MySQL para aprovisionar base de datos temporal...');
  const u = new URL(env.TARGET_DATABASE_URL);
  const conn = await mysql.createConnection({
    host: u.hostname,
    port: Number(u.port) || 13008,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    multipleStatements: true,
    ssl: { rejectUnauthorized: false }
  });

  const TEST_DB = 'pixon_restore_test';
  await conn.query(`DROP DATABASE IF EXISTS \`${TEST_DB}\``);
  await conn.query(`CREATE DATABASE \`${TEST_DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.query(`USE \`${TEST_DB}\``);
  console.log(`✅ Base de datos temporal \`${TEST_DB}\` creada.`);

  // 3. Ejecutar restauración del schema completo en TEST_DB
  console.log('\n[3/4] Ejecutando restauración de todas las tablas y constraints en base temporal...');
  await conn.query(sqlContent);

  // 4. Verificar tablas creadas
  const [tables] = await conn.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_type = 'BASE TABLE'",
    [TEST_DB]
  );
  console.log(`✅ Tablas restauradas exitosamente: ${tables.length} tablas`);

  if (tables.length < 98) {
    throw new Error(`Se esperaban al menos 98 tablas restauradas, pero se encontraron ${tables.length}`);
  }

  // Limpieza de entorno temporal
  console.log('\n[4/4] Limpiando base de datos temporal para preservar recursos...');
  await conn.query(`DROP DATABASE \`${TEST_DB}\``);
  await conn.end();

  // Eliminar archivo temporal local
  try { fs.unlinkSync(tmpSqlPath); } catch {}

  console.log('═'.repeat(70));
  console.log(`🎉 RESTORE TEST: 100% EXITOSO (${tables.length}/98 tablas verificadas)`);
  console.log('═'.repeat(70));
}

testRestore().catch(err => {
  console.error('❌ RESTORE TEST FAILED:', err);
  process.exit(1);
});
