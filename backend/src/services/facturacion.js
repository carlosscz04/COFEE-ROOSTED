const IVA = 0.13;

function desglosarIva(totalConIva) {
  const total = Number(totalConIva);

  if (!Number.isFinite(total) || total < 0) {
    throw new Error("El total debe ser un número válido y positivo");
  }

  const subtotal = Number((total / (1 + IVA)).toFixed(2));
  const iva = Number((total - subtotal).toFixed(2));

  return {
    subtotal,
    iva,
    total: Number(total.toFixed(2))
  };
}

async function siguienteCorrelativo(client, tipo, sucursalId) {
  const resultado = await client.query(
    `UPDATE correlativos
     SET ultimo = ultimo + 1
     WHERE tipo = $1 AND sucursal_id = $2
     RETURNING serie, ultimo`,
    [tipo, sucursalId]
  );

  if (resultado.rowCount === 0) {
    throw new Error("No existe un correlativo configurado para esta sucursal");
  }

  return {
    serie: resultado.rows[0].serie,
    correlativo: resultado.rows[0].ultimo
  };
}

module.exports = {
  IVA,
  desglosarIva,
  siguienteCorrelativo
};