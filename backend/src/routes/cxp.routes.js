import { Router } from 'express';
import { query, withTx } from '../db.js';
import { asyncHandler, requerir, round2, HttpError } from '../utils/http.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireRole('admin', 'gerente'));

// GET /api/cxp  -> cuentas por pagar (pendientes primero, marcando vencidas)
router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT x.*, p.nombre AS proveedor, c.num_factura, c.clasificacion, c.concepto,
            (x.estado = 'pendiente' AND x.vencimiento < CURRENT_DATE) AS vencida
     FROM cuentas_por_pagar x JOIN proveedores p ON p.id = x.proveedor_id JOIN compras c ON c.id = x.compra_id
     ORDER BY (x.estado = 'pagada'), x.vencimiento`);
  res.json(rows);
}));

// POST /api/cxp/:id/pagos  -> abono o pago total
router.post('/:id/pagos', asyncHandler(async (req, res) => {
  const monto = round2(req.body.monto);
  requerir(monto > 0, 'El monto del pago debe ser mayor a 0');
  const cuenta = await withTx(async (c) => {
    const x = (await c.query('SELECT * FROM cuentas_por_pagar WHERE id = $1 FOR UPDATE', [req.params.id])).rows[0];
    if (!x) throw new HttpError(404, 'Cuenta no encontrada');
    if (x.estado === 'pagada') throw new HttpError(409, 'La cuenta ya está pagada');
    if (monto > x.saldo) throw new HttpError(400, `El pago excede el saldo ($${x.saldo.toFixed(2)})`);
    await c.query('INSERT INTO pagos_cxp (cxp_id, monto) VALUES ($1,$2)', [x.id, monto]);
    const saldo = round2(x.saldo - monto);
    return (await c.query('UPDATE cuentas_por_pagar SET saldo=$1, estado=$2 WHERE id=$3 RETURNING *',
      [saldo, saldo === 0 ? 'pagada' : 'pendiente', x.id])).rows[0];
  });
  res.json(cuenta);
}));

export default router;