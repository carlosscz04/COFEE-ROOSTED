import { Router } from 'express';
import { query, withTx } from '../db.js';
import { asyncHandler, requerir, round2, HttpError } from '../utils/http.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { resumenTurno } from '../services/caja.js';

const router = Router();
router.use(requireAuth);

// Solo estos roles pueden abrir y cerrar caja
const ROLES_CAJA = requireRole('admin', 'gerente', 'cajero');

// Valida que el monto venga, sea un número y no sea negativo; lo devuelve redondeado
function validarMonto(valor, etiqueta) {
  requerir(
    valor !== undefined && valor !== null && String(valor).trim() !== '' &&
      Number.isFinite(Number(valor)) && Number(valor) >= 0,
    `${etiqueta} debe ser un monto válido mayor o igual a cero`
  );
  return round2(valor);
}

const turnoAbierto = async (client, usuarioId, bloquear = false) =>
  (await client.query(
    `SELECT * FROM turnos_caja WHERE usuario_id = $1 AND estado = 'abierto'
     ORDER BY apertura DESC LIMIT 1${bloquear ? ' FOR UPDATE' : ''}`,
    [usuarioId]
  )).rows[0];

// GET /api/caja/turno  
router.get('/turno', asyncHandler(async (req, res) => {
  const turno = await turnoAbierto({ query }, req.user.id);
  if (!turno) return res.json({ turno: null, resumen: null });
  res.json({ turno, resumen: await resumenTurno({ query }, turno) });
}));

// POST /api/caja/abrir
router.post('/abrir', ROLES_CAJA, asyncHandler(async (req, res) => {
  const monto = validarMonto(req.body.monto_inicial, 'El fondo inicial');
  const turno = await withTx(async (c) => {

    const usuario = (await c.query(
      'SELECT sucursal_id FROM usuarios WHERE id = $1 AND activo = TRUE FOR UPDATE',
      [req.user.id]
    )).rows[0];
    if (!usuario) throw new HttpError(401, 'El usuario ya no está activo');
    if (!usuario.sucursal_id) throw new HttpError(400, 'Tu usuario no tiene sucursal asignada');
    if (await turnoAbierto(c, req.user.id)) throw new HttpError(409, 'Ya tienes un turno abierto');
    const r = await c.query(
      'INSERT INTO turnos_caja (sucursal_id, usuario_id, monto_inicial) VALUES ($1,$2,$3) RETURNING *',
      [usuario.sucursal_id, req.user.id, monto]
    );
    return r.rows[0];
  });
  res.status(201).json(turno);
}));

// POST /api/caja/cerrar  -> cuadre de efectivo, tarjeta y pagos digitales
router.post('/cerrar', ROLES_CAJA, asyncHandler(async (req, res) => {
  const ef = validarMonto(req.body.contado_efectivo, 'El efectivo contado');
  const tj = validarMonto(req.body.contado_tarjeta, 'El monto contado de tarjeta');
  const dg = validarMonto(req.body.contado_digital, 'El monto contado digital');
  const observaciones = req.body.observaciones || null;
  requerir(
    observaciones === null || (typeof observaciones === 'string' && observaciones.length <= 250),
    'Las observaciones no pueden exceder 250 caracteres'
  );

  const cierre = await withTx(async (c) => {
    const turno = await turnoAbierto(c, req.user.id, true);
    if (!turno) throw new HttpError(404, 'No tienes un turno abierto');
    const r = await resumenTurno(c, turno);
    const diferencia = round2((ef - r.esperado_efectivo) + (tj - r.esperado_tarjeta) + (dg - r.esperado_digital));
    const up = await c.query(
      `UPDATE turnos_caja SET estado='cerrado', cierre=NOW(),
         esperado_efectivo=$1, esperado_tarjeta=$2, esperado_digital=$3,
         contado_efectivo=$4, contado_tarjeta=$5, contado_digital=$6, diferencia=$7, observaciones=$8
       WHERE id=$9 RETURNING *`,
      [r.esperado_efectivo, r.esperado_tarjeta, r.esperado_digital, ef, tj, dg, diferencia, observaciones, turno.id]
    );
    return { turno: up.rows[0], resumen: r };
  });
  res.json(cierre);
}));

// GET /api/caja/historial -> últimos turnos, abiertos y cerrados (admin y gerente)
router.get('/historial', requireRole('admin', 'gerente'), asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT t.*, u.nombre AS cajero, s.nombre AS sucursal FROM turnos_caja t
     JOIN usuarios u ON u.id = t.usuario_id JOIN sucursales s ON s.id = t.sucursal_id
     ORDER BY t.apertura DESC LIMIT 50`);
  res.json(rows);
}));

export default router;