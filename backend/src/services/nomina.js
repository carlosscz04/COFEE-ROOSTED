import { round2 } from '../utils/http.js';

// Parámetros legales de El Salvador (verificar vigencia antes de la defensa/producción)
export const PARAM = {
  ISSS_EMPLEADO: 0.03, ISSS_PATRONAL: 0.075, ISSS_TOPE_QUINCENAL: 500, // base máxima $1,000 mensual
  AFP_EMPLEADO: 0.0725, AFP_PATRONAL: 0.0875,
};

// Tabla de retención de ISR QUINCENAL: [desde, hasta, tasa sobre excedente, exceso sobre, cuota fija]
export const TRAMOS_RENTA_QUINCENAL = [
  { desde: 0.01, hasta: 275.0, tasa: 0, exceso: 0, cuota: 0 },
  { desde: 275.01, hasta: 447.62, tasa: 0.1, exceso: 275.0, cuota: 8.83 },
  { desde: 447.63, hasta: 1019.05, tasa: 0.2, exceso: 447.62, cuota: 30.0 },
  { desde: 1019.06, hasta: Infinity, tasa: 0.3, exceso: 1019.05, cuota: 144.28 },
];

export function retencionRenta(baseGravada) {
  const t = TRAMOS_RENTA_QUINCENAL.find((x) => baseGravada >= x.desde && baseGravada <= x.hasta);
  if (!t || t.tasa === 0) return 0;
  return round2((baseGravada - t.exceso) * t.tasa + t.cuota);
}

export function calcularQuincena(salarioMensual) {
  const bruto = round2(salarioMensual / 2);
  const isss = round2(Math.min(bruto, PARAM.ISSS_TOPE_QUINCENAL) * PARAM.ISSS_EMPLEADO);
  const afp = round2(bruto * PARAM.AFP_EMPLEADO);
  const renta = retencionRenta(round2(bruto - isss - afp));
  return {
    salario_bruto: bruto, isss, afp, renta,
    neto: round2(bruto - isss - afp - renta),
    isss_patronal: round2(Math.min(bruto, PARAM.ISSS_TOPE_QUINCENAL) * PARAM.ISSS_PATRONAL),
    afp_patronal: round2(bruto * PARAM.AFP_PATRONAL),
  };
}