import { Router } from 'express';
import { query, withTx } from '../db.js';
import { asyncHandler, requerir, round2, sucursalDe } from '../utils/http.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { IVA } from '../services/facturacion.js';

const router = Router();
router.use(requireAuth, requireRole('admin', 'gerente'));

// POST /api/compras
// clasificacion 'costo': items de insumos -> suma inventario y recalcula costo promedio ponderado
// clasificacion 'gasto': concepto + monto (servicios, alquiler...) -> no toca inventario
router.post('/', asyncHandler(async (req, res) => {
  const { proveedor_id, clasificacion, concepto, num_factura, fecha, condicion, items = [], monto_gasto } = req.body;
  requerir(proveedor_id && num_factura?.trim(), 'Proveedor y número de factura son obligatorios');
  requerir(['costo', 'gasto'].includes(clasificacion), 'Clasificación inválida');
  requerir(['contado', 'credito'].includes(condicion), 'Condición de pago inválida');
  if (clasificacion === 'costo') {
    requerir(items.length > 0 && items.every((i) => i.insumo_id && Number(i.cantidad) > 0 && Number(i.costo_unitario) > 0), 'Agrega insumos con cantidad y costo > 0');
  } else {
    requerir(concepto?.trim() && Number(monto_gasto) > 0, 'El gasto requiere concepto y monto');
  }
  const sucursalId = sucursalDe(req);

  const compra = await withTx(async (c) => {
    const subtotal = round2(clasificacion === 'costo'
      ? items.reduce((s, i) => s + i.cantidad * i.costo_unitario, 0) : monto_gasto);
    const iva = round2(subtotal * IVA);
    const total = round2(subtotal + iva);
    const comp = (await c.query(
      `INSERT INTO compras (sucursal_id, proveedor_id, clasificacion, concepto, num_factura, fecha, condicion, subtotal, iva, total, usuario_id)
       VALUES ($1,$2,$3,$4,$5,COALESCE($6::date, CURRENT_DATE),$7,$8,$9,$10,$11) RETURNING *`,
      [sucursalId, proveedor_id, clasificacion, concepto, num_factura.trim(), fecha || null, condicion, subtotal, iva, total, req.user.id])).rows[0];

    if (clasificacion === 'costo') {
      for (const i of items) {
        await c.query('INSERT INTO compra_detalle (compra_id, insumo_id, cantidad, costo_unitario) VALUES ($1,$2,$3,$4)',
          [comp.id, i.insumo_id, i.cantidad, i.costo_unitario]);
        // Costo promedio ponderado con el stock de todas las sucursales
        const { rows } = await c.query('SELECT i.costo_promedio, COALESCE(SUM(inv.stock),0) AS stock FROM insumos i LEFT JOIN inventario inv ON inv.insumo_id = i.id WHERE i.id=$1 GROUP BY i.id', [i.insumo_id]);
        const { costo_promedio, stock } = rows[0];
        const nuevo = (stock * costo_promedio + i.cantidad * i.costo_unitario) / (stock + Number(i.cantidad));
        await c.query('UPDATE insumos SET costo_promedio = $1 WHERE id = $2', [nuevo.toFixed(4), i.insumo_id]);
        await c.query(`INSERT INTO inventario (sucursal_id, insumo_id, stock) VALUES ($1,$2,$3)
                       ON CONFLICT (sucursal_id, insumo_id) DO UPDATE SET stock = inventario.stock + EXCLUDED.stock`, [sucursalId, i.insumo_id, i.cantidad]);
      }
    }
    if (condicion === 'credito') {
      await c.query(
        `INSERT INTO cuentas_por_pagar (compra_id, proveedor_id, monto, saldo, vencimiento)
         SELECT $1, $2, $3, $3, $4::date + p.dias_credito FROM proveedores p WHERE p.id = $2`,
        [comp.id, proveedor_id, total, comp.fecha]);
    }
    return comp;
  });
  res.status(201).json(compra);
}));

// GET /api/compras
router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT c.*, p.nombre AS proveedor FROM compras c JOIN proveedores p ON p.id = c.proveedor_id
     WHERE c.sucursal_id = $1 ORDER BY c.fecha DESC, c.id DESC LIMIT 100`, [sucursalDe(req)]);
  res.json(rows);
}));

export default router;