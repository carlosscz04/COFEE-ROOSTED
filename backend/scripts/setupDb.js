// Crea la base de datos (si no existe), aplica el esquema y carga los datos semilla.
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import * as seed from './seedData.js';

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const conn = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
};
const dbName = process.env.DB_NAME || 'origenes_sv';

async function crearBaseSiNoExiste() {
  const admin = new pg.Client({ ...conn, database: 'postgres' });
  await admin.connect();
  const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
  if (!rowCount) {
    await admin.query(`CREATE DATABASE "${dbName}"`);
    console.log(`Base de datos "${dbName}" creada`);
  }
  await admin.end();
}

async function main() {
  await crearBaseSiNoExiste();
  const db = new pg.Client({ ...conn, database: dbName });
  await db.connect();
  try {
    await db.query(fs.readFileSync(path.join(__dirname, '../../database/schema.sql'), 'utf8'));
    console.log('Esquema aplicado');

    const idsSucursal = [];
    for (const s of seed.sucursales) {
      const r = await db.query('INSERT INTO sucursales (nombre, direccion) VALUES ($1,$2) RETURNING id', [s.nombre, s.direccion]);
      idsSucursal.push(r.rows[0].id);
    }
    for (const [i, sid] of idsSucursal.entries()) {
      for (const tipo of ['FCF', 'CCF']) {
        await db.query('INSERT INTO correlativos (tipo, sucursal_id, serie) VALUES ($1,$2,$3)', [tipo, sid, `${tipo}${String(i + 1).padStart(2, '0')}`]);
      }
    }

    const insumoId = {};
    for (const [nombre, unidad, costo, minimo, inicial] of seed.insumos) {
      const r = await db.query('INSERT INTO insumos (nombre, unidad, costo_promedio, stock_minimo) VALUES ($1,$2,$3,$4) RETURNING id', [nombre, unidad, costo, minimo]);
      insumoId[nombre] = r.rows[0].id;
      for (const [i, sid] of idsSucursal.entries()) {
        // Para demostrar alertas: la sucursal 2 inicia con la Viñeta por debajo del mínimo
        const stock = i === 1 && nombre === 'Viñeta' ? 60 : inicial;
        await db.query('INSERT INTO inventario (sucursal_id, insumo_id, stock) VALUES ($1,$2,$3)', [sid, insumoId[nombre], stock]);
      }
    }

    for (const [nombre, categoria, tipo, precio, emoji, receta] of seed.productos) {
      const r = await db.query('INSERT INTO productos (nombre, categoria, tipo, precio, emoji) VALUES ($1,$2,$3,$4,$5) RETURNING id', [nombre, categoria, tipo, precio, emoji]);
      for (const [ins, cant] of receta) {
        await db.query('INSERT INTO recetas (producto_id, insumo_id, cantidad) VALUES ($1,$2,$3)', [r.rows[0].id, insumoId[ins], cant]);
      }
    }

    for (const p of seed.proveedores) {
      await db.query('INSERT INTO proveedores (nombre, nit, telefono, email, dias_credito) VALUES ($1,$2,$3,$4,$5)', p);
    }
    for (const [nombre, dui, nit, cargo, suc, salario] of seed.empleados) {
      await db.query('INSERT INTO empleados (nombre, dui, nit, cargo, sucursal_id, salario_mensual) VALUES ($1,$2,$3,$4,$5,$6)', [nombre, dui, nit, cargo, idsSucursal[suc - 1], salario]);
    }
    for (const [nombre, email, pass, rol, suc] of seed.usuarios) {
      await db.query('INSERT INTO usuarios (nombre, email, password_hash, rol, sucursal_id) VALUES ($1,$2,$3,$4,$5)', [nombre, email, bcrypt.hashSync(pass, 10), rol, idsSucursal[suc - 1]]);
    }
    console.log('Datos semilla cargados. Usuarios: admin@origenes.sv / admin123, gerente@origenes.sv / gerente123, cajero1@origenes.sv / cajero123');
  } finally {
    await db.end();
  }
}

main().catch((e) => { console.error('Error en db:setup:', e.message); process.exit(1); });
