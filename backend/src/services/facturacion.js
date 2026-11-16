
import { round2, requerir } from '../utils/http.js';

export const IVA = 0.13;

// Desglosa el IVA incluido en el precio de venta.
export function desglosarIva(total) {
  const subtotal = round2(total / (1 + IVA));

  return {
    subtotal,
    iva: round2(total - subtotal),
    total: round2(total)
  };
}

// Obtiene el siguiente correlativo de forma atómica.
export async function siguienteCorrelativo(client, tipo, sucursalId) {
  const { rows } = await client.query(
    `UPDATE correlativos
     SET ultimo = ultimo + 1
     WHERE tipo = $1 AND sucursal_id = $2
     RETURNING serie, ultimo`,
    [tipo, sucursalId]
  );

  requerir(
    rows[0],
    'No hay correlativo configurado para esta sucursal',
    500
  );

  return {
    serie: rows[0].serie,
    correlativo: rows[0].ultimo
  };
}
