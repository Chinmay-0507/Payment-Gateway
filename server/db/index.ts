import mysql, { Pool } from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

let pool: Pool | null = null;

export async function initDb() {
  if (pool) return pool;

  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'payment_gateway',
    waitForConnections: true,
    connectionLimit: 100,
    queueLimit: 0
  });

  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  await pool.query(schema);
  console.log('MySQL Database pool initialized and schema loaded.');
  
  return pool;
}

export async function getDb() {
  if (!pool) return await initDb();
  return pool;
}

export async function closeDb() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}