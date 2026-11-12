import { Router } from 'express';
import { query, withTx } from '../db.js';
import { asyncHandler, requerir, sucursalDe } from '../utils/http.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const SQL_STOCK = `
  SELECT i.id, i.nombre, i.unidad, i.costo_promedio, i.stock_minimo,
         COALESCE(inv.stock, 0) AS stock,
         COALESCE(inv.stock, 0) <= i.stock_minimo AS bajo_minimo
  FROM insumos i
  LEFT JOIN inventario inv ON inv.insumo_id = i.id AND inv.sucursal_id = $1`;

// GET /api/inventario  -> stock por insumo de la sucursal
router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await query(`${SQL_STOCK} ORDER BY bajo_minimo DESC, i.nombre`, [sucursalDe(req)]);
  res.json(rows);
}));

// GET /api/inventario/alertas -> solo insumos en o bajo el stock mínimo
router.get('/alertas', asyncHandler(async (req, res) => {
  const { rows } = await query(`SELECT * FROM (${SQL_STOCK}) t WHERE bajo_minimo ORDER BY nombre`, [sucursalDe(req)]);
  res.json(rows);
}));

// POST /api/inventario/insumos  -> crea insumo y su fila de stock en cada sucursal
router.post('/insumos', requireRole('admin', 'gerente'), asyncHandler(async (req, res) => {
  const { nombre, unidad, costo_promedio = 0, stock_minimo = 0 } = req.body;
  requerir(nombre?.trim() && unidad?.trim(), 'Nombre y unidad son obligatorios');
  const insumo = await withTx(async (c) => {
    const r = await c.query('INSERT INTO insumos (nombre, unidad, costo_promedio, stock_minimo) VALUES ($1,$2,$3,$4) RETURNING *',
      [nombre.trim(), unidad.trim(), costo_promedio, stock_minimo]);
    await c.query('INSERT INTO inventario (sucursal_id, insumo_id) SELECT id, $1 FROM sucursales', [r.rows[0].id]);
    return r.rows[0];
  });
  res.status(201).json(insumo);
}));

// PUT /api/inventario/insumos/:id
router.put('/insumos/:id', requireRole('admin', 'gerente'), asyncHandler(async (req, res) => {
  const { nombre, unidad, stock_minimo } = req.body;
  requerir(nombre?.trim() && unidad?.trim() && stock_minimo >= 0, 'Datos de insumo inválidos');
  const { rows } = await query('UPDATE insumos SET nombre=$1, unidad=$2, stock_minimo=$3 WHERE id=$4 RETURNING *',
    [nombre.trim(), unidad.trim(), stock_minimo, req.params.id]);
  requerir(rows[0], 'Insumo no encontrado', 404);
  res.json(rows[0]);
}));

// POST /api/inventario/ajuste  -> fija el stock físico contado de un insumo
router.post('/ajuste', requireRole('admin', 'gerente'), asyncHandler(async (req, res) => {
  const { insumo_id, stock } = req.body;
  requerir(insumo_id && Number(stock) >= 0, 'Insumo y stock (>= 0) son obligatorios');
  await query(`INSERT INTO inventario (sucursal_id, insumo_id, stock) VALUES ($1,$2,$3)
               ON CONFLICT (sucursal_id, insumo_id) DO UPDATE SET stock = EXCLUDED.stock`, [sucursalDe(req), insumo_id, stock]);
  res.json({ ok: true });
}));

export default router;