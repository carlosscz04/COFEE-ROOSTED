import { Router } from 'express';
import { query } from '../db.js';
import { asyncHandler, requerir } from '../utils/http.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireRole('admin', 'gerente'));

const CARGOS = ['barista', 'cajero', 'gerente'];
const validar = ({ nombre, cargo, salario_mensual }) => {
  requerir(nombre?.trim(), 'El nombre es obligatorio');
  requerir(CARGOS.includes(cargo), 'Cargo inválido (barista, cajero o gerente)');
  requerir(Number(salario_mensual) > 0, 'El salario debe ser mayor a 0');
};

router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT e.*, s.nombre AS sucursal FROM empleados e LEFT JOIN sucursales s ON s.id = e.sucursal_id
     ORDER BY e.activo DESC, e.nombre`);
  res.json(rows);
}));

router.post('/', asyncHandler(async (req, res) => {
  validar(req.body);
  const { nombre, dui, nit, cargo, sucursal_id, salario_mensual, fecha_ingreso } = req.body;
  const { rows } = await query(
    `INSERT INTO empleados (nombre, dui, nit, cargo, sucursal_id, salario_mensual, fecha_ingreso)
     VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7::date, CURRENT_DATE)) RETURNING *`,
    [nombre.trim(), dui, nit, cargo, sucursal_id || null, salario_mensual, fecha_ingreso || null]);
  res.status(201).json(rows[0]);
}));

router.put('/:id', asyncHandler(async (req, res) => {
  validar(req.body);
  const { nombre, dui, nit, cargo, sucursal_id, salario_mensual, activo = true } = req.body;
  const { rows } = await query(
    `UPDATE empleados SET nombre=$1, dui=$2, nit=$3, cargo=$4, sucursal_id=$5, salario_mensual=$6, activo=$7 WHERE id=$8 RETURNING *`,
    [nombre.trim(), dui, nit, cargo, sucursal_id || null, salario_mensual, activo, req.params.id]);
  requerir(rows[0], 'Empleado no encontrado', 404);
  res.json(rows[0]);
}));

export default router;