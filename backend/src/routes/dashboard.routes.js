import { Router } from 'express';
import { query } from '../db.js';
import { asyncHandler, requerir, sucursalDe } from '../utils/http.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireRole('admin', 'gerente'));

router.get('/', asyncHandler(async (req, res) => {
  const sucursalId = sucursalDe(req);
  requerir(Number.isInteger(sucursalId) && sucursalId > 0, 'Sucursal inválida');

  const [hoy, cxp, semana, top, metodos, turnos, alertas] = await Promise.all([
    query(
      `SELECT COALESCE(SUM(total), 0) AS total, COUNT(*)::int AS tickets
       FROM ventas
       WHERE sucursal_id = $1 AND fecha >= CURRENT_DATE AND fecha < CURRENT_DATE + INTERVAL '1 day'`,
      [sucursalId]
    ),
    query(
      `SELECT COALESCE(SUM(x.saldo) FILTER (WHERE x.estado = 'pendiente'), 0) AS pendiente,
              COALESCE(SUM(x.saldo) FILTER (
                WHERE x.estado = 'pendiente' AND x.vencimiento < CURRENT_DATE
              ), 0) AS vencido
       FROM cuentas_por_pagar x
       JOIN compras c ON c.id = x.compra_id
       WHERE c.sucursal_id = $1`,
      [sucursalId]
    ),
    query(
      `WITH dias AS (
         SELECT generate_series(
           CURRENT_DATE - INTERVAL '6 days',
           CURRENT_DATE,
           INTERVAL '1 day'
         )::date AS dia
       ), ventas_dia AS (
         SELECT fecha::date AS dia, SUM(total) AS total
         FROM ventas
         WHERE sucursal_id = $1
           AND fecha >= CURRENT_DATE - INTERVAL '6 days'
           AND fecha < CURRENT_DATE + INTERVAL '1 day'
         GROUP BY fecha::date
       )
       SELECT TO_CHAR(d.dia, 'YYYY-MM-DD') AS dia, COALESCE(v.total, 0) AS total
       FROM dias d
       LEFT JOIN ventas_dia v ON v.dia = d.dia
       ORDER BY d.dia`,
      [sucursalId]
    ),
    query(
      `SELECT d.descripcion, SUM(d.cantidad)::int AS cantidad, SUM(d.total) AS total
       FROM venta_detalle d
       JOIN ventas v ON v.id = d.venta_id
       WHERE v.sucursal_id = $1
         AND v.fecha >= DATE_TRUNC('month', CURRENT_DATE)
         AND v.fecha < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
       GROUP BY d.descripcion
       ORDER BY cantidad DESC, total DESC
       LIMIT 5`,
      [sucursalId]
    ),
    query(
      `SELECT p.metodo, SUM(p.monto) AS monto
       FROM venta_pagos p
       JOIN ventas v ON v.id = p.venta_id
       WHERE v.sucursal_id = $1
         AND v.fecha >= CURRENT_DATE
         AND v.fecha < CURRENT_DATE + INTERVAL '1 day'
       GROUP BY p.metodo
       ORDER BY p.metodo`,
      [sucursalId]
    ),
    query(
      `SELECT t.id, t.apertura, u.nombre AS cajero
       FROM turnos_caja t
       JOIN usuarios u ON u.id = t.usuario_id
       WHERE t.sucursal_id = $1 AND t.estado = 'abierto'
       ORDER BY t.apertura`,
      [sucursalId]
    ),
    query(
      `SELECT i.nombre, i.unidad, i.stock_minimo, COALESCE(inv.stock, 0) AS stock
       FROM insumos i
       LEFT JOIN inventario inv
         ON inv.insumo_id = i.id AND inv.sucursal_id = $1
       WHERE COALESCE(inv.stock, 0) <= i.stock_minimo
       ORDER BY i.nombre`,
      [sucursalId]
    )
  ]);

  res.json({
    hoy: hoy.rows[0],
    cxp: cxp.rows[0],
    semana: semana.rows,
    top: top.rows,
    metodos: metodos.rows,
    turnos_abiertos: turnos.rows,
    alertas: alertas.rows
  });
}));

export default router;
