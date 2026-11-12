// Utilidades HTTP compartidas por todas las rutas

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Evita repetir try/catch en cada ruta: los errores llegan al middleware de errores
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// Sucursal sobre la que opera la petición: el cajero solo la suya,
// admin/gerente pueden elegir con ?sucursal_id=
export function sucursalDe(req) {
  const elegida = Number(req.query.sucursal_id || req.body?.sucursal_id);
  if (req.user.rol !== 'cajero' && elegida) return elegida;
  return req.user.sucursal_id;
}

export function requerir(cond, mensaje, status = 400) {
  if (!cond) throw new HttpError(status, mensaje);
}
