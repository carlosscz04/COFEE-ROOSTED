import { Router } from 'express';
import { query } from '../db.js';
import { asyncHandler, requerir } from '../utils/http.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireRole('admin', 'gerente'));

router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM proveedores WHERE activo ORDER BY nombre');
  res.json(rows);
}));

router.post('/', asyncHandler(async (req, res) => {
  const { nombre, nit, telefono, email, dias_credito = 0 } = req.body;
  requerir(nombre?.trim(), 'El nombre del proveedor es obligatorio');
  requerir(Number(dias_credito) >= 0, 'Días de crédito inválidos');
  const { rows } = await query('INSERT INTO proveedores (nombre, nit, telefono, email, dias_credito) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [nombre.trim(), nit, telefono, email, dias_credito]);
  res.status(201).json(rows[0]);
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const { nombre, nit, telefono, email, dias_credito = 0 } = req.body;
  requerir(nombre?.trim(), 'El nombre del proveedor es obligatorio');
  const { rows } = await query('UPDATE proveedores SET nombre=$1, nit=$2, telefono=$3, email=$4, dias_credito=$5 WHERE id=$6 RETURNING *',
    [nombre.trim(), nit, telefono, email, dias_credito, req.params.id]);
  requerir(rows[0], 'Proveedor no encontrado', 404);
  res.json(rows[0]);
}));

export default router;