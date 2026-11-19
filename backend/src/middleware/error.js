export function notFound(req, res) {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  if (status === 500) console.error(err);
  // 23505 = violación de UNIQUE en PostgreSQL
  if (err.code === '23505') return res.status(409).json({ error: 'El registro ya existe' });
  res.status(status).json({ error: status === 500 ? 'Error interno del servidor' : err.message });
}
