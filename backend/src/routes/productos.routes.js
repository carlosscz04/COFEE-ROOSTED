import { Router } from 'express';
import { query, withTx } from '../db.js';
import { asyncHandler, requerir, HttpError } from '../utils/http.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const SQL_PRODUCTOS = `
  SELECT p.*, 
    COALESCE(json_agg(json_build_object('insumo_id', i.id, 'insumo', i.nombre, 'unidad', i.unidad,
             'cantidad', r.cantidad) ORDER BY i.nombre) FILTER (WHERE i.id IS NOT NULL), '[]') AS receta,
    COALESCE(SUM(r.cantidad * i.costo_promedio), 0) AS costo
  FROM productos p
  LEFT JOIN recetas r ON r.producto_id = p.id
  LEFT JOIN insumos i ON i.id = r.insumo_id`;

// GET /api/productos  (?todos=1 incluye inactivos)
router.get('/', asyncHandler(async (req, res) => {
  const filtro = req.query.todos ? '' : 'WHERE p.activo';
  const { rows } = await query(`${SQL_PRODUCTOS} ${filtro} GROUP BY p.id ORDER BY p.categoria, p.nombre`);
  res.json(rows);
}));

function validar({ nombre, categoria, tipo, precio, receta }) {
  requerir(nombre?.trim() && categoria?.trim(), 'Nombre y categoría son obligatorios');
  requerir(['elaborado', 'reventa'].includes(tipo), 'Tipo inválido');
  requerir(Number(precio) > 0, 'El precio debe ser mayor a 0');
  requerir(Array.isArray(receta) && receta.length > 0, 'Todo producto necesita receta (insumos que descuenta)');
  requerir(tipo !== 'reventa' || receta.length === 1, 'Un producto de reventa descuenta un solo insumo');
  requerir(receta.every((r) => r.insumo_id && Number(r.cantidad) > 0), 'Cada línea de receta necesita insumo y cantidad > 0');
}

async function guardarReceta(c, productoId, receta) {
  await c.query('DELETE FROM recetas WHERE producto_id = $1', [productoId]);
  for (const r of receta) {
    await c.query('INSERT INTO recetas (producto_id, insumo_id, cantidad) VALUES ($1,$2,$3)', [productoId, r.insumo_id, r.cantidad]);
  }
}

// POST /api/productos
router.post('/', requireRole('admin', 'gerente'), asyncHandler(async (req, res) => {
  validar(req.body);
  const { nombre, categoria, tipo, precio, emoji = '🍽️', receta } = req.body;
  const producto = await withTx(async (c) => {
    const r = await c.query('INSERT INTO productos (nombre, categoria, tipo, precio, emoji) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [nombre.trim(), categoria.trim(), tipo, precio, emoji]);
    await guardarReceta(c, r.rows[0].id, receta);
    return r.rows[0];
  });
  res.status(201).json(producto);
}));

// PUT /api/productos/:id
router.put('/:id', requireRole('admin', 'gerente'), asyncHandler(async (req, res) => {
  validar(req.body);
  const { nombre, categoria, tipo, precio, emoji = '🍽️', activo = true, receta } = req.body;
  const producto = await withTx(async (c) => {
    const r = await c.query(
      'UPDATE productos SET nombre=$1, categoria=$2, tipo=$3, precio=$4, emoji=$5, activo=$6 WHERE id=$7 RETURNING *',
      [nombre.trim(), categoria.trim(), tipo, precio, emoji, activo, req.params.id]);
    if (!r.rows[0]) throw new HttpError(404, 'Producto no encontrado');
    await guardarReceta(c, r.rows[0].id, receta);
    return r.rows[0];
  });
  res.json(producto);
}));

// DELETE /api/productos/:id  -> desactiva (no borra, conserva historial de ventas)
router.delete('/:id', requireRole('admin', 'gerente'), asyncHandler(async (req, res) => {
  await query('UPDATE productos SET activo = FALSE WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
}));

export default router;

