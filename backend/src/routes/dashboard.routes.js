import { Router } from 'express';
import { query } from '../db.js';
import { asyncHandler, sucursalDe } from '../utils/http.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// GET /api/dashboard 
router.get('/', asyncHandler(async (req, res) => {
  const s = sucursalDe(req);
  const [hoy, metodos, top, semana, alertas, cxp, caja] = await Promise.all([
    query(`SELECT COUNT(*)::int AS tickets, COALESCE(SUM(total),0) AS total FROM ventas WHERE sucursal_id=$1 AND fecha::date = CURRENT_DATE`, [s]),
    query(`SELECT vp.metodo, SUM(vp.monto) AS monto FROM venta_pagos vp JOIN ventas v ON v.id = vp.venta_id
           WHERE v.sucursal_id=$1 AND v.fecha::date = CURRENT_DATE GROUP BY vp.metodo ORDER BY monto DESC`, [s]),
    query(`SELECT d.descripcion, SUM(d.cantidad)::int AS cantidad, SUM(d.total) AS total FROM venta_detalle d JOIN ventas v ON v.id = d.venta_id
           WHERE v.sucursal_id=$1 AND v.fecha >= date_trunc('month', CURRENT_DATE) GROUP BY d.descripcion ORDER BY cantidad DESC LIMIT 5`, [s]),
    query(`SELECT g::date AS dia, COALESCE(SUM(v.total),0) AS total FROM generate_series(CURRENT_DATE - 6, CURRENT_DATE, '1 day') g
           LEFT JOIN ventas v ON v.fecha::date = g::date AND v.sucursal_id = $1 GROUP BY g ORDER BY g`, [s]),
    query(`SELECT i.nombre, i.unidad, inv.stock, i.stock_minimo FROM inventario inv JOIN insumos i ON i.id = inv.insumo_id
           WHERE inv.sucursal_id=$1 AND inv.stock <= i.stock_minimo ORDER BY i.nombre`, [s]),
    query(`SELECT COALESCE(SUM(saldo),0) AS pendiente, COALESCE(SUM(saldo) FILTER (WHERE vencimiento < CURRENT_DATE),0) AS vencido
           FROM cuentas_por_pagar WHERE estado='pendiente'`),
    query(`SELECT t.id, t.apertura, u.nombre AS cajero FROM turnos_caja t JOIN usuarios u ON u.id = t.usuario_id
           WHERE t.sucursal_id=$1 AND t.estado='abierto'`, [s]),
  ]);
  res.json({
    hoy: hoy.rows[0], metodos: metodos.rows, top: top.rows, semana: semana.rows,
    alertas: alertas.rows, cxp: cxp.rows[0], turnos_abiertos: caja.rows,
  });
}));

export default router;