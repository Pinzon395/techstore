import 'dotenv/config';
import mysql from 'mysql2/promise';

const targetDb = process.env.PIXON_TEST_DB || 'test';
const isDestructive = process.argv.includes('--destructive') || process.env.PIXON_TEST_DESTRUCTIVE === '1';

if (process.env.NODE_ENV !== 'test') {
  throw new Error('setup-test-db requires NODE_ENV=test');
}

if (!/(^|[_-])test(?:[_-]|$)/i.test(targetDb)) {
  throw new Error(`Target database "${targetDb}" does not contain "test" in its name`);
}

if (!isDestructive) {
  throw new Error('setup-test-db requires destructive flag (--destructive or PIXON_TEST_DESTRUCTIVE=1)');
}

console.log(`Setting up isolated test database: ${targetDb}`);

const sourceConn = await mysql.createConnection({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'pixon_app',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'pixon_db'
});

const targetConn = await mysql.createConnection({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'pixon_app',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true
});

await targetConn.query(`CREATE DATABASE IF NOT EXISTS \`${targetDb}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci`);
await targetConn.query(`USE \`${targetDb}\``);

await targetConn.query('SET FOREIGN_KEY_CHECKS = 0');

// Drop existing tables in test DB
const [existingTables] = await targetConn.query('SHOW TABLES');
for (const row of existingTables) {
  const tableName = Object.values(row)[0];
  await targetConn.query(`DROP TABLE IF EXISTS \`${tableName}\``);
}

// Get all tables from source DB
const [sourceTables] = await sourceConn.query('SHOW TABLES');
console.log(`Cloning schema for ${sourceTables.length} tables...`);

for (const row of sourceTables) {
  const tableName = Object.values(row)[0];
  const [[createRow]] = await sourceConn.query(`SHOW CREATE TABLE \`${tableName}\``);
  const createSql = createRow['Create Table'];
  await targetConn.query(createSql);
}

// Seed essential lookup data: roles, catalog types/statuses/condition codes, and test admin
const tablesToSeed = [
  'roles',
  'permissions',
  'role_permissions',
  'catalog_item_types',
  'catalog_item_statuses',
  'catalog_condition_codes',
  'catalog_attribute_data_types',
  'catalog_media_types',
  'catalog_badges',
  'catalog_categories',
  'catalog_product_kinds',
  'catalog_attribute_definitions',
  'catalog_product_kind_attributes',
  'catalog_category_attribute_definitions',
  'commerce_settings',
  'commerce_payment_provider_configs',
  'commerce_counters',
  'schedule_resources',
  'appointment_type_configs',
  'appointment_settings',
  'schema_migrations'
];

for (const table of tablesToSeed) {
  try {
    const [rows] = await sourceConn.query(`SELECT * FROM \`${table}\``);
    if (rows.length) {
      for (const r of rows) {
        const keys = Object.keys(r);
        const values = Object.values(r);
        const placeholders = keys.map(() => '?').join(', ');
        const colNames = keys.map(k => `\`${k}\``).join(', ');
        await targetConn.query(
          `INSERT IGNORE INTO \`${table}\` (${colNames}) VALUES (${placeholders})`,
          values
        );
      }
    }
  } catch (err) {
    console.warn(`Note: could not seed ${table}: ${err.message}`);
  }
}

// Ensure test admin user exists
const [[admin]] = await targetConn.query(`SELECT id FROM users WHERE email = 'admin@pixon.com.mx' LIMIT 1`);
if (!admin) {
  await targetConn.query(`
    INSERT INTO users (id, google_id, email, name, role_id)
    VALUES ('e2e-admin-uuid-0000000000001', 'google-e2e-admin', 'admin@pixon.com.mx', 'Admin E2E', 1)
  `);
}

await targetConn.query('SET FOREIGN_KEY_CHECKS = 1');

await sourceConn.end();
await targetConn.end();

console.log(`Test database ${targetDb} successfully provisioned with full schema and seed!`);
