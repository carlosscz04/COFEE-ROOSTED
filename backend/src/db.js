import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

// NUMERIC llega como string desde pg; lo convertimos a number
pg.types.setTypeParser(1700, (v) => parseFloat(v));
// DATE llega como texto 'YYYY-MM-DD' (evita desfases de zona horaria)
pg.types.setTypeParser(1082, (v) => v);

export const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'origenes_sv',
});

export const query = (text, params) => pool.query(text, params);

// Ejecuta una función dentro de una transacción (COMMIT / ROLLBACK automático)
export async function withTx(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
