import { Router } from 'express';
import { query } from '../db.js';
import { asyncHandler } from '../utils/http.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT id, nombre, direccion FROM sucursales WHERE activa ORDER BY id');
  res.json(rows);
}));

export default router;