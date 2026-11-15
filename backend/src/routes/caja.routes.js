import { Router } from 'express';
import { query, withTx } from '../db.js';
import { asyncHandler, requerir, round2, HttpError } from '../utils/http.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { resumenTurno } from '../services/caja.js';

const router = Router();
router.use(requireAuth);

const turnoAbierto = async (client, usuarioId) =>
  (await client.query("SELECT * FROM turnos_caja WHERE usuario_id = $1 AND estado = 'abierto'", [usuarioId])).rows[0];

// GET /api/caja/turno 
router.get('/turno', asyncHandler(async (req, res) => {
  const turno = await turnoAbierto({ query }, req.user.id);
  if (!turno) return res.json({ turno: null });
  res.json({ turno, resumen: await resumenTurno({ query }, turno) });
}));

// POST /api/caja/abrir
router.post('/abrir', asyncHandler(async (req, res) => {
  const monto = Number(req.body.monto_inicial);
  requerir(monto >= 0, 'El monto inicial debe ser 0 o mayor');
  requerir(req.user.sucursal_id, 'Tu usuario no tiene sucursal asignada');
  const turno = await withTx(async (c) => {
    if (await turnoAbierto(c, req.user.id)) throw new HttpError(409, 'Ya tienes un turno abierto');
    const r = await c.query('INSERT INTO turnos_caja (sucursal_id, usuario_id, monto_inicial) VALUES ($1,$2,$3) RETURNING *',
      [req.user.sucursal_id, req.user.id, monto]);
    return r.rows[0];
  });
  res.status(201).json(turno);
}));

// POST /api/caja/cerrar  
router.post('/cerrar', asyncHandler(async (req, res) => {
  const { contado_efectivo, contado_tarjeta, contado_digital, observaciones = '' } = req.body;
  const contados = [contado_efectivo, contado_tarjeta, contado_digital].map(Number);
  requerir(contados.every((n) => Number.isFinite(n) && n >= 0), 'Ingresa los tres montos contados (0 o mayor)');
  const cierre = await withTx(async (c) => {
    const turno = await turnoAbierto(c, req.user.id);
    if (!turno) throw new HttpError(404, 'No tienes un turno abierto');
    const r = await resumenTurno(c, turno);
    const [ef, tj, dg] = contados;
    const diferencia = round2((ef - r.esperado_efectivo) + (tj - r.esperado_tarjeta) + (dg - r.esperado_digital));
    const up = await c.query(
      `UPDATE turnos_caja SET estado='cerrado', cierre=NOW(),
         esperado_efectivo=$1, esperado_tarjeta=$2, esperado_digital=$3,
         contado_efectivo=$4, contado_tarjeta=$5, contado_digital=$6, diferencia=$7, observaciones=$8
       WHERE id=$9 RETURNING *`,
      [r.esperado_efectivo, r.esperado_tarjeta, r.esperado_digital, ef, tj, dg, diferencia, observaciones.slice(0, 250), turno.id]);
    return { turno: up.rows[0], resumen: r };
  });
  res.json(cierre);
}));

// GET /api/caja/historial 
router.get('/historial', requireRole('admin', 'gerente'), asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT t.*, u.nombre AS cajero, s.nombre AS sucursal FROM turnos_caja t
     JOIN usuarios u ON u.id = t.usuario_id JOIN sucursales s ON s.id = t.sucursal_id
     ORDER BY t.apertura DESC LIMIT 50`);
  res.json(rows);
}));

export default router;