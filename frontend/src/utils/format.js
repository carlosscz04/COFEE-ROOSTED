export const money = (n) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const num = (n) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
export const fecha = (s) => (s ? new Date(s.length === 10 ? `${s}T00:00:00` : s).toLocaleDateString('es-SV') : '');
export const fechaHora = (s) => (s ? new Date(s).toLocaleString('es-SV', { dateStyle: 'short', timeStyle: 'short' }) : '');
export const hoyISO = () => new Date().toISOString().slice(0, 10);
export const METODOS = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', bitcoin: 'Bitcoin', chivo: 'Chivo Wallet' };