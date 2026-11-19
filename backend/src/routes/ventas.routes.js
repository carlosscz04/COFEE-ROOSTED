
import { Router } from 'express';
import { query, withTx } from '../db.js';
import {
  asyncHandler,
  requerir,
  round2,
  HttpError,
  sucursalDe
} from '../utils/http.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  desglosarIva,
  siguienteCorrelativo
} from '../services/facturacion.js';

const router = Router();

router.use(requireAuth);

const METODOS = ['efectivo', 'tarjeta', 'bitcoin', 'chivo'];

// POST /api/ventas
// Registra una venta, descuenta inventario y genera su documento.
router.post(
  '/',
  requireRole('admin', 'gerente', 'cajero'),
  asyncHandler(async (req, res) => {
    const {
      tipo_doc = 'FCF',
      cliente = {},
      items,
      pagos
    } = req.body;

    requerir(
      ['FCF', 'CCF'].includes(tipo_doc),
      'Tipo de documento inválido'
    );

    requerir(
      Array.isArray(items) && items.length > 0,
      'El pedido no tiene productos'
    );

    requerir(
      items.every((i) =>
        Number.isInteger(Number(i.producto_id)) &&
        Number(i.producto_id) > 0 &&
        Number.isInteger(Number(i.cantidad)) &&
        Number(i.cantidad) > 0
      ),
      'Cantidades o identificadores de productos inválidos'
    );

    requerir(
      Array.isArray(pagos) &&
      pagos.length > 0 &&
      pagos.every((p) =>
        METODOS.includes(p.metodo) &&
        Number.isFinite(Number(p.monto)) &&
        Number(p.monto) > 0
      ),
      'Formas de pago inválidas'
    );

    if (tipo_doc === 'CCF') {
      requerir(
        cliente.nombre?.trim() &&
        cliente.nit?.trim() &&
        cliente.nrc?.trim(),
        'El CCF requiere nombre, NIT y NRC del cliente'
      );
    }

    const venta = await withTx(async (c) => {
      // 1. Verificar que exista un turno abierto.
      const turno = (
        await c.query(
          `SELECT *
           FROM turnos_caja
           WHERE usuario_id = $1
             AND estado = 'abierto'
           FOR UPDATE`,
          [req.user.id]
        )
      ).rows[0];

      if (!turno) {
        throw new HttpError(
          409,
          'Debes abrir tu turno de caja antes de vender'
        );
      }

      // Normalizar los identificadores y cantidades.
      const productosSolicitados = items.map((i) => ({
        producto_id: Number(i.producto_id),
        cantidad: Number(i.cantidad)
      }));

      const ids = [
        ...new Set(productosSolicitados.map((i) => i.producto_id))
      ];

      // 2. Consultar los precios reales desde la base de datos.
      const prods = (
        await c.query(
          `SELECT id, nombre, precio
           FROM productos
           WHERE activo = TRUE
             AND id = ANY($1::int[])`,
          [ids]
        )
      ).rows;

      const lineas = productosSolicitados.map((i) => {
        const producto = prods.find(
          (p) => Number(p.id) === i.producto_id
        );

        if (!producto) {
          throw new HttpError(
            400,
            `Producto ${i.producto_id} no disponible`
          );
        }

        return {
          producto_id: i.producto_id,
          cantidad: i.cantidad,
          descripcion: producto.nombre,
          precio: Number(producto.precio),
          total: round2(Number(producto.precio) * i.cantidad)
        };
      });

      const total = round2(
        lineas.reduce((s, l) => s + l.total, 0)
      );

      const sumaPagos = round2(
        pagos.reduce((s, p) => s + Number(p.monto), 0)
      );

      // 3. Comprobar que los pagos cubran exactamente la venta.
      if (sumaPagos !== total) {
        throw new HttpError(
          400,
          `Los pagos ($${sumaPagos.toFixed(2)}) deben sumar el total ($${total.toFixed(2)})`
        );
      }

      // 4. Calcular el consumo de insumos según las recetas.
      const { rows: consumo } = await c.query(
        `SELECT
           r.insumo_id,
           i.nombre,
           SUM(r.cantidad * x.cantidad) AS requerido
         FROM recetas r
         JOIN insumos i ON i.id = r.insumo_id
         JOIN (
           SELECT *
           FROM json_to_recordset($1::json)
           AS t(producto_id int, cantidad int)
         ) x ON x.producto_id = r.producto_id
         GROUP BY r.insumo_id, i.nombre`,
        [JSON.stringify(productosSolicitados)]
      );

      // 5. Verificar y descontar el inventario.
      for (const ins of consumo) {
        const inv = (
          await c.query(
            `SELECT stock
             FROM inventario
             WHERE sucursal_id = $1
               AND insumo_id = $2
             FOR UPDATE`,
            [turno.sucursal_id, ins.insumo_id]
          )
        ).rows[0];

        const requerido = Number(ins.requerido);

        if (!inv || Number(inv.stock) < requerido) {
          throw new HttpError(
            409,
            `Stock insuficiente de "${ins.nombre}" (necesita ${requerido}, hay ${inv?.stock ?? 0})`
          );
        }

        await c.query(
          `UPDATE inventario
           SET stock = stock - $1
           WHERE sucursal_id = $2
             AND insumo_id = $3`,
          [requerido, turno.sucursal_id, ins.insumo_id]
        );
      }

      // 6. Generar serie y correlativo.
      const { serie, correlativo } =
        await siguienteCorrelativo(
          c,
          tipo_doc,
          turno.sucursal_id
        );

      // 7. Desglosar el IVA incluido en el precio.
      const { subtotal, iva } = desglosarIva(total);

      // 8. Registrar la venta.
      const v = (
        await c.query(
          `INSERT INTO ventas (
             sucursal_id,
             turno_id,
             usuario_id,
             tipo_doc,
             serie,
             correlativo,
             cliente_nombre,
             cliente_nit,
             cliente_nrc,
             cliente_giro,
             subtotal,
             iva,
             total
           )
           VALUES (
             $1, $2, $3, $4, $5, $6, $7,
             $8, $9, $10, $11, $12, $13
           )
           RETURNING *`,
          [
            turno.sucursal_id,
            turno.id,
            req.user.id,
            tipo_doc,
            serie,
            correlativo,
            cliente.nombre?.trim() || 'Consumidor final',
            cliente.nit || null,
            cliente.nrc || null,
            cliente.giro || null,
            subtotal,
            iva,
            total
          ]
        )
      ).rows[0];

      // 9. Guardar los detalles de la venta.
      for (const l of lineas) {
        await c.query(
          `INSERT INTO venta_detalle (
             venta_id,
             producto_id,
             descripcion,
             cantidad,
             precio_unitario,
             total
           )
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            v.id,
            l.producto_id,
            l.descripcion,
            l.cantidad,
            l.precio,
            l.total
          ]
        );
      }

      // 10. Registrar los pagos.
      for (const p of pagos) {
        await c.query(
          `INSERT INTO venta_pagos (
             venta_id,
             metodo,
             monto
           )
           VALUES ($1, $2, $3)`,
          [v.id, p.metodo, round2(Number(p.monto))]
        );
      }

      return v;
    });

    res.status(201).json(venta);
  })
);

// GET /api/ventas
// Consulta el historial de ventas de la sucursal.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { desde, hasta, tipo } = req.query;

    const { rows } = await query(
      `SELECT
         v.id,
         v.tipo_doc,
         v.serie,
         v.correlativo,
         v.fecha,
         v.cliente_nombre,
         v.subtotal,
         v.iva,
         v.total,
         u.nombre AS cajero
       FROM ventas v
       JOIN usuarios u ON u.id = v.usuario_id
       WHERE v.sucursal_id = $1
         AND v.fecha::date >= COALESCE(
           $2::date,
           CURRENT_DATE - 30
         )
         AND v.fecha::date <= COALESCE(
           $3::date,
           CURRENT_DATE
         )
         AND ($4::text IS NULL OR v.tipo_doc = $4)
       ORDER BY v.fecha DESC
       LIMIT 200`,
      [
        sucursalDe(req),
        desde || null,
        hasta || null,
        tipo || null
      ]
    );

    res.json(rows);
  })
);

// GET /api/ventas/:id
// Consulta el documento completo de una venta.
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const v = (
      await query(
        `SELECT
           v.*,
           u.nombre AS cajero,
           s.nombre AS sucursal,
           s.direccion
         FROM ventas v
         JOIN usuarios u ON u.id = v.usuario_id
         JOIN sucursales s ON s.id = v.sucursal_id
         WHERE v.id = $1
           AND v.sucursal_id = $2`,
        [req.params.id, sucursalDe(req)]
      )
    ).rows[0];

    requerir(v, 'Venta no encontrada', 404);

    v.detalle = (
      await query(
        `SELECT *
         FROM venta_detalle
         WHERE venta_id = $1
         ORDER BY id`,
        [v.id]
      )
    ).rows;

    v.pagos = (
      await query(
        `SELECT metodo, monto
         FROM venta_pagos
         WHERE venta_id = $1`,
        [v.id]
      )
    ).rows;

    res.json(v);
  })
);

export default router;
