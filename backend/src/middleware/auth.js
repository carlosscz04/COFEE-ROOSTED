import jwt from 'jsonwebtoken';
import { HttpError } from '../utils/http.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new HttpError(401, 'Sesión no iniciada'));
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'cambia_este_secreto');
    next();
  } catch {
    next(new HttpError(401, 'Sesión expirada o inválida'));
  }
}

// Restringe una ruta a ciertos roles: requireRole('admin', 'gerente')
export const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.rol) ? next() : next(new HttpError(403, 'No tienes permiso para esta acción'));
