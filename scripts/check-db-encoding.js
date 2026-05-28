#!/usr/bin/env node
'use strict';

require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: +(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'pixon_app',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'pixon',
    charset: 'utf8mb4',
  });

  try {
    const [vars] = await connection.query(`
      SELECT @@character_set_database AS character_set_database,
             @@collation_database AS collation_database,
             @@character_set_connection AS character_set_connection,
             @@collation_connection AS collation_connection
    `);

    const [columns] = await connection.query(`
      SELECT TABLE_NAME, COLUMN_NAME, CHARACTER_SET_NAME, COLLATION_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND CHARACTER_SET_NAME IS NOT NULL
        AND CHARACTER_SET_NAME <> 'utf8mb4'
      ORDER BY TABLE_NAME, COLUMN_NAME
    `);

    console.log(JSON.stringify({ variables: vars[0], nonUtf8mb4Columns: columns }, null, 2));

    if (vars[0].character_set_connection !== 'utf8mb4' || columns.length > 0) {
      process.exitCode = 1;
    }
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(`No se pudo auditar MariaDB: ${error.message}`);
  process.exit(1);
});
