import { Router } from 'express';
import { query, withTx } from '../db.js';
import { asyncHandler, requerir, round2, HttpError } from '../utils/http.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { calcularQuincena } from '../services/nomina.js';

const router = Router();
router.use(requireAuth, requireRole('admin', 'gerente'));

// GET /api/planilla -> planillas generadas
router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM planillas ORDER BY anio DESC, mes DESC, quincena DESC');
  res.json(rows);
}));

// POST /api/planilla/generar {anio, mes, quincena}
router.post('/generar', asyncHandler(async (req, res) => {
  const { anio, mes, quincena } = req.body;
  requerir(Number(anio) >= 2020 && mes >= 1 && mes <= 12 && [1, 2].includes(Number(quincena)), 'Período inválido');
  const id = await withTx(async (c) => {
    const empleados = (await c.query('SELECT id, salario_mensual FROM empleados WHERE activo')).rows;
    if (!empleados.length) throw new HttpError(400, 'No hay empleados activos');
    const existe = (await c.query('SELECT 1 FROM planillas WHERE anio=$1 AND mes=$2 AND quincena=$3', [anio, mes, quincena])).rowCount;
    if (existe) throw new HttpError(409, 'Ya existe la planilla de ese período');
    const p = (await c.query('INSERT INTO planillas (anio, mes, quincena) VALUES ($1,$2,$3) RETURNING id', [anio, mes, quincena])).rows[0];
    let totalNeto = 0;
    for (const e of empleados) {
      const r = calcularQuincena(e.salario_mensual);
      totalNeto += r.neto;
      await c.query(
        `INSERT INTO planilla_detalle (planilla_id, empleado_id, salario_bruto, isss, afp, renta, neto, isss_patronal, afp_patronal)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [p.id, e.id, r.salario_bruto, r.isss, r.afp, r.renta, r.neto, r.isss_patronal, r.afp_patronal]);
    }
    await c.query('UPDATE planillas SET total_neto = $1 WHERE id = $2', [round2(totalNeto), p.id]);
    return p.id;
  });
  res.status(201).json({ id });
}));

// GET /api/planilla/:id -> detalle (boleta por empleado)
router.get('/:id', asyncHandler(async (req, res) => {
  const planilla = (await query('SELECT * FROM planillas WHERE id = $1', [req.params.id])).rows[0];
  requerir(planilla, 'Planilla no encontrada', 404);
  const { rows } = await query(
    `SELECT d.*, e.nombre, e.cargo, e.dui FROM planilla_detalle d JOIN empleados e ON e.id = d.empleado_id
     WHERE d.planilla_id = $1 ORDER BY e.nombre`, [req.params.id]);
  res.json({ planilla, detalle: rows });
}));

export default router;