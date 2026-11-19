import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
const ROLES_VALIDOS = ['admin', 'gerente', 'cajero'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// GET /api/usuarios - Listar todas las cuentas de acceso (solo admin)
router.get('/usuarios', requireAuth, requireRole('admin'), async (_req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT 
        u.id,
        u.nombre,
        u.correo,
        u.rol,
        u.activo,
        u.sucursal_id,
        s.nombre AS sucursal
      FROM usuarios u
      LEFT JOIN sucursales s ON s.id = u.sucursal_id
      ORDER BY u.id ASC
    `);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/usuarios - Crear cuenta de usuario (solo admin)
router.post('/usuarios', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { nombre, correo, contraseña, password, rol, sucursal_id } = req.body;
    const clavePlana = contraseña || password;

    // 1. Validaciones obligatorias
    if (!nombre || !nombre.trim() || !correo || !clavePlana) {
      return res.status(400).json({ error: 'Nombre, correo y contraseña son obligatorios.' });
    }

    const correoLimpio = correo.trim().toLowerCase();
    if (!EMAIL_REGEX.test(correoLimpio)) {
      return res.status(400).json({ error: 'El formato del correo electrónico no es válido.' });
    }

    if (String(clavePlana).length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
    }

    if (!ROLES_VALIDOS.includes(rol)) {
      return res.status(400).json({ error: 'Rol inválido. Debe ser admin, gerente o cajero.' });
    }

    const sucursalIdNum = Number(sucursal_id);
    if (!Number.isInteger(sucursalIdNum) || sucursalIdNum <= 0) {
      return res.status(400).json({ error: 'Debe seleccionar una sucursal válida.' });
    }

    // 2. Verificar que la sucursal exista y esté activa
    const sucRes = await query(
      'SELECT id, nombre FROM sucursales WHERE id = $1 AND activa = TRUE',
      [sucursalIdNum]
    );
    if (sucRes.rows.length === 0) {
      return res.status(400).json({ error: 'La sucursal indicada no existe o está inactiva.' });
    }

    // 3. Verificar unicidad de correo (409 Conflict)
    const existeRes = await query('SELECT id FROM usuarios WHERE LOWER(correo) = $1', [correoLimpio]);
    if (existeRes.rows.length > 0) {
      return res.status(409).json({ error: 'Ese correo ya está registrado' });
    }

    // 4. Hashear contraseña e insertar
    const passwordHash = bcrypt.hashSync(String(clavePlana), 10);
    const insertRes = await query(
      `INSERT INTO usuarios (nombre, correo, password_hash, rol, sucursal_id, activo)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       RETURNING id, nombre, correo, rol, sucursal_id`,
      [nombre.trim(), correoLimpio, passwordHash, rol, sucursalIdNum]
    );

    const usuarioCreado = {
      ...insertRes.rows[0],
      sucursal: sucRes.rows[0].nombre
    };

    return res.status(201).json(usuarioCreado);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ese correo ya está registrado' });
    }
    next(err);
  }
});

export default router;
