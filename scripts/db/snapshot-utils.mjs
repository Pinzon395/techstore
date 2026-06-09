import crypto from 'node:crypto';
import path from 'node:path';
import mysql from 'mysql2/promise';
import { SNAPSHOT_TABLES } from './snapshot-config.mjs';

export const SNAPSHOT_PATH = path.join(process.cwd(), 'server', 'db', 'snapshot', 'content.json');

export function createConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'pixon_app',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'pixon_db',
    charset: 'utf8mb4',
    dateStrings: true,
  });
}

function normalizeValue(value) {
  if (Buffer.isBuffer(value)) return { $binary: value.toString('base64') };
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, normalizeValue(value[key])]));
  }
  if (Array.isArray(value)) return value.map(normalizeValue);
  return value;
}

export function stableStringify(value) {
  return JSON.stringify(normalizeValue(value), null, 2) + '\n';
}

export function digestData(data) {
  return crypto.createHash('sha256').update(stableStringify(data)).digest('hex');
}

export async function readSnapshotData(connection) {
  const [availableRows] = await connection.query(
    'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()'
  );
  const available = new Set(availableRows.map((row) => row.TABLE_NAME));
  const data = {};

  for (const table of SNAPSHOT_TABLES) {
    if (!available.has(table)) {
      data[table] = [];
      continue;
    }
    const [rows] = await connection.query(`SELECT * FROM \`${table}\``);
    data[table] = rows
      .map(normalizeValue)
      .sort((a, b) => stableStringify(a).localeCompare(stableStringify(b)));
  }

  return data;
}

export function decodeValue(value) {
  if (value && typeof value === 'object' && '$binary' in value) {
    return Buffer.from(value.$binary, 'base64');
  }
  return value;
}
