import { Router } from 'express';
import { query, withTx } from '../db.js';
import { asyncHandler, HttpError, requerir, round2 } from '../utils/http.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const ROLES_CAJA = requireRole('admin', 'gerente', 'cajero');

function validarMonto(valor, etiqueta) {
  requerir(
    valor !== undefined &&
      valor !== null &&
      String(valor).trim() !== '' &&
      Number.isFinite(Number(valor)) &&
      Number(valor) >= 0,
    `${etiqueta} debe ser un monto válido mayor o igual a cero`
  );
  return round2(valor);
}

async function obtenerTurnoAbierto(usuarioId) {
  const { rows } = await query(
    `SELECT t.*,
            COALESCE(v.cantidad_ventas, 0)::int AS cantidad_ventas,
            COALESCE(v.total_vendido, 0) AS total_vendido,
            COALESCE(p.ventas_efectivo, 0) AS ventas_efectivo,
            COALESCE(p.ventas_tarjeta, 0) AS ventas_tarjeta,
            COALESCE(p.ventas_bitcoin, 0) AS ventas_bitcoin,
            COALESCE(p.ventas_chivo, 0) AS ventas_chivo
     FROM turnos_caja t
     LEFT JOIN (
       SELECT turno_id, COUNT(*)::int AS cantidad_ventas, SUM(total) AS total_vendido
       FROM ventas
       GROUP BY turno_id
     ) v ON v.turno_id = t.id
     LEFT JOIN (
       SELECT v.turno_id,
              SUM(p.monto) FILTER (WHERE p.metodo = 'efectivo') AS ventas_efectivo,
              SUM(p.monto) FILTER (WHERE p.metodo = 'tarjeta') AS ventas_tarjeta,
              SUM(p.monto) FILTER (WHERE p.metodo = 'bitcoin') AS ventas_bitcoin,
              SUM(p.monto) FILTER (WHERE p.metodo = 'chivo') AS ventas_chivo
       FROM ventas v
       JOIN venta_pagos p ON p.venta_id = v.id
       GROUP BY v.turno_id
     ) p ON p.turno_id = t.id
     WHERE t.usuario_id = $1 AND t.estado = 'abierto'
     ORDER BY t.apertura DESC
     LIMIT 1`,
    [usuarioId]
  );
  const turno = rows[0];
  if (!turno) return null;

  turno.esperado_efectivo = round2(Number(turno.monto_inicial) + Number(turno.ventas_efectivo));
  turno.esperado_tarjeta = round2(turno.ventas_tarjeta);
  turno.esperado_digital = round2(Number(turno.ventas_bitcoin) + Number(turno.ventas_chivo));
  return turno;
}

router.get('/turno', asyncHandler(async (req, res) => {
  const turno = await obtenerTurnoAbierto(req.user.id);
  if (!turno) return res.json({ turno: null, resumen: null });

  const {
    cantidad_ventas,
    total_vendido,
    monto_inicial,
    ventas_efectivo,
    ventas_tarjeta,
    ventas_bitcoin,
    ventas_chivo,
    esperado_efectivo,
    esperado_tarjeta,
    esperado_digital
  } = turno;

  res.json({
    turno: {
      id: turno.id,
      apertura: turno.apertura
    },
    resumen: {
      cantidad_ventas,
      total_vendido,
      monto_inicial,
      ventas_efectivo,
      ventas_tarjeta,
      ventas_bitcoin,
      ventas_chivo,
      esperado_efectivo,
      esperado_tarjeta,
      esperado_digital
    }
  });
}));

router.get('/historial', requireRole('admin', 'gerente'), asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT t.id, s.nombre AS sucursal, u.nombre AS cajero, t.apertura, t.cierre,
            t.diferencia, t.estado
     FROM turnos_caja t
     JOIN sucursales s ON s.id = t.sucursal_id
     JOIN usuarios u ON u.id = t.usuario_id
     ORDER BY t.apertura DESC
     LIMIT 200`
  );
  res.json(rows);
}));

router.post('/abrir', ROLES_CAJA, asyncHandler(async (req, res) => {
  const montoInicial = validarMonto(req.body.monto_inicial, 'El fondo inicial');
  const turno = await withTx(async (client) => {
    const usuario = (
      await client.query(
        'SELECT sucursal_id FROM usuarios WHERE id = $1 AND activo = TRUE FOR UPDATE',
        [req.user.id]
      )
    ).rows[0];

    if (!usuario) throw new HttpError(401, 'El usuario ya no está activo');
    if (!usuario.sucursal_id) throw new HttpError(400, 'El usuario no tiene una sucursal asignada');

    const abierto = (
      await client.query(
        `SELECT id FROM turnos_caja WHERE usuario_id = $1 AND estado = 'abierto' LIMIT 1`,
        [req.user.id]
      )
    ).rows[0];
    if (abierto) throw new HttpError(409, 'Ya tienes un turno de caja abierto');

    return (
      await client.query(
        `INSERT INTO turnos_caja (sucursal_id, usuario_id, monto_inicial)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [usuario.sucursal_id, req.user.id, montoInicial]
      )
    ).rows[0];
  });

  res.status(201).json(turno);
}));

router.post('/cerrar', ROLES_CAJA, asyncHandler(async (req, res) => {
  const contadoEfectivo = validarMonto(req.body.contado_efectivo, 'El efectivo contado');
  const contadoTarjeta = validarMonto(req.body.contado_tarjeta, 'El monto contado de tarjeta');
  const contadoDigital = validarMonto(req.body.contado_digital, 'El monto contado digital');
  const observaciones = req.body.observaciones || null;
  requerir(
    observaciones === null || (typeof observaciones === 'string' && observaciones.length <= 250),
    'Las observaciones no pueden exceder 250 caracteres'
  );

  const resultado = await withTx(async (client) => {
    const turno = (
      await client.query(
        `SELECT * FROM turnos_caja
         WHERE usuario_id = $1 AND estado = 'abierto'
         ORDER BY apertura DESC
         LIMIT 1
         FOR UPDATE`,
        [req.user.id]
      )
    ).rows[0];
    if (!turno) throw new HttpError(409, 'No tienes un turno de caja abierto');

    const pagos = (
      await client.query(
        `SELECT COALESCE(SUM(p.monto) FILTER (WHERE p.metodo = 'efectivo'), 0) AS efectivo,
                COALESCE(SUM(p.monto) FILTER (WHERE p.metodo = 'tarjeta'), 0) AS tarjeta,
                COALESCE(SUM(p.monto) FILTER (WHERE p.metodo IN ('bitcoin', 'chivo')), 0) AS digital
         FROM ventas v
         LEFT JOIN venta_pagos p ON p.venta_id = v.id
         WHERE v.turno_id = $1`,
        [turno.id]
      )
    ).rows[0];
    const esperadoEfectivo = round2(Number(turno.monto_inicial) + Number(pagos.efectivo));
    const esperadoTarjeta = round2(pagos.tarjeta);
    const esperadoDigital = round2(pagos.digital);
    const diferencia = round2(
      contadoEfectivo - esperadoEfectivo +
      contadoTarjeta - esperadoTarjeta +
      contadoDigital - esperadoDigital
    );

    const cerrado = (
      await client.query(
        `UPDATE turnos_caja
         SET cierre = NOW(), estado = 'cerrado',
             esperado_efectivo = $1, esperado_tarjeta = $2, esperado_digital = $3,
             contado_efectivo = $4, contado_tarjeta = $5, contado_digital = $6,
             diferencia = $7, observaciones = $8
         WHERE id = $9
         RETURNING *`,
        [
          esperadoEfectivo,
          esperadoTarjeta,
          esperadoDigital,
          contadoEfectivo,
          contadoTarjeta,
          contadoDigital,
          diferencia,
          observaciones,
          turno.id
        ]
      )
    ).rows[0];

    return {
      turno: cerrado,
      resumen: {
        esperado_efectivo: esperadoEfectivo,
        esperado_tarjeta: esperadoTarjeta,
        esperado_digital: esperadoDigital
      }
    };
  });

  res.json(resultado);
}));

export default router;
