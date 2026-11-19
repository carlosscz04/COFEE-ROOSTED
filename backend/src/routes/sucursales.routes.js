import { Router } from 'express';
import { query, withTx } from '../config/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// GET /api/sucursales (existente)
router.get('/sucursales', requireAuth, async (_req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM sucursales ORDER BY id ASC');
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/sucursales - Crear sucursal con correlativos e inventario inicial en una transacción
router.post('/sucursales', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { nombre, direccion } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre de la sucursal es obligatorio.' });
    }

    const nombreLimpio = nombre.trim();
    const direccionLimpia = direccion ? direccion.trim() : null;

    // Validar que no exista otra sucursal con el mismo nombre
    const duplicada = await query(
      'SELECT id FROM sucursales WHERE LOWER(nombre) = LOWER($1)',
      [nombreLimpio]
    );
    if (duplicada.rows.length > 0) {
      return res.status(409).json({ error: 'Ya existe una sucursal registrada con ese nombre.' });
    }

    const nuevaSucursal = await withTx(async (client) => {
      // 1. Insertar sucursal
      const sucRes = await client.query(
        `INSERT INTO sucursales (nombre, direccion, activa)
         VALUES ($1, $2, TRUE)
         RETURNING id, nombre, direccion, activa`,
        [nombreLimpio, direccionLimpia]
      );
      const sucursal = sucRes.rows[0];
      const sufijoId = String(sucursal.id).padStart(2, '0');

      // 2. Insertar correlativos FCF y CCF (ej. FCF03, CCF03) con ultimo = 0
      await client.query(
        `INSERT INTO correlativos (sucursal_id, tipo_documento, serie, ultimo)
         VALUES 
           ($1, 'FCF', $2, 0),
           ($1, 'CCF', $3, 0)`,
        [sucursal.id, `FCF${sufijoId}`, `CCF${sufijoId}`]
      );

      // 3. Inicializar inventario en 0 para todos los insumos existentes
      await client.query(
        `INSERT INTO inventario (sucursal_id, insumo_id)
         SELECT $1, id FROM insumos`,
        [sucursal.id]
      );

      return sucursal;
    });

    return res.status(201).json(nuevaSucursal);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ya existe una sucursal registrada con ese nombre.' });
    }
    next(err);
  }
});

export default router;