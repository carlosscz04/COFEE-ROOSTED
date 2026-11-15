import { round2 } from '../utils/http.js';

// Calcula lo que el sistema espera encontrar en caja para un turno
export async function resumenTurno(client, turno) {
  const { rows } = await client.query(
    `SELECT vp.metodo, COALESCE(SUM(vp.monto),0) AS monto, COUNT(DISTINCT v.id) AS ventas
     FROM ventas v JOIN venta_pagos vp ON vp.venta_id = v.id
     WHERE v.turno_id = $1 GROUP BY vp.metodo`, [turno.id]);
  const por = Object.fromEntries(rows.map((r) => [r.metodo, r.monto]));
  const digital = (por.bitcoin || 0) + (por.chivo || 0);
  const { rows: cnt } = await client.query('SELECT COUNT(*)::int AS n, COALESCE(SUM(total),0) AS total FROM ventas WHERE turno_id = $1', [turno.id]);
  return {
    turno_id: turno.id,
    monto_inicial: turno.monto_inicial,
    ventas_efectivo: round2(por.efectivo || 0),
    ventas_tarjeta: round2(por.tarjeta || 0),
    ventas_bitcoin: round2(por.bitcoin || 0),
    ventas_chivo: round2(por.chivo || 0),
    esperado_efectivo: round2(turno.monto_inicial + (por.efectivo || 0)),
    esperado_tarjeta: round2(por.tarjeta || 0),
    esperado_digital: round2(digital),
    cantidad_ventas: cnt[0].n,
    total_vendido: round2(cnt[0].total),
  };
}