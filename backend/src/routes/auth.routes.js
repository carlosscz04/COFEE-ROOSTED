import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';
import { asyncHandler, requerir } from '../utils/http.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/login
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  requerir(email && password, 'Correo y contraseña son obligatorios');
  const { rows } = await query(
    `SELECT u.*, s.nombre AS sucursal_nombre FROM usuarios u
     LEFT JOIN sucursales s ON s.id = u.sucursal_id WHERE u.email = $1 AND u.activo`, [email.toLowerCase().trim()]);
  const u = rows[0];
  if (!u || !bcrypt.compareSync(password, u.password_hash)) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }
  const user = { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol, sucursal_id: u.sucursal_id, sucursal_nombre: u.sucursal_nombre };
  const token = jwt.sign(user, process.env.JWT_SECRET || 'cambia_este_secreto', { expiresIn: '10h' });
  res.json({ token, user });
}));

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));

export default router;
