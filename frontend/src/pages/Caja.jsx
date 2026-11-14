import { useState } from 'react';
import { Alert, Badge, Button, Card, CardBody, FormGroup, Input, Label, Table } from 'reactstrap';
import PageHeader from '../components/PageHeader.jsx';
import Cargando from '../components/Cargando.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { useApi } from '../utils/useApi.js';
import { api } from '../utils/api.js';
import { money, fechaHora } from '../utils/format.js';

export const meta = { path: '/caja', label: 'Caja y turnos', icon: '💵', order: 40, roles: ['admin', 'gerente', 'cajero'] };

export default function Caja() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useApi('/caja/turno');
  const { data: historial, reload: recargarHistorial } = useApi(user.rol !== 'cajero' ? '/caja/historial' : null);
  const [inicial, setInicial] = useState('');
  const [conteo, setConteo] = useState({ efectivo: '', tarjeta: '', digital: '', obs: '' });
  const [msg, setMsg] = useState('');
  const [cierre, setCierre] = useState(null); // resultado del último cierre

  const abrir = async () => {
    try {
      await api('/caja/abrir', { method: 'POST', body: { monto_inicial: Number(inicial) } });
      setInicial(''); setMsg(''); setCierre(null); reload(); recargarHistorial();
    } catch (e) { setMsg(e.message); }
  };

  const cerrar = async () => {
    try {
      const r = await api('/caja/cerrar', { method: 'POST', body: {
        contado_efectivo: Number(conteo.efectivo), contado_tarjeta: Number(conteo.tarjeta), contado_digital: Number(conteo.digital), observaciones: conteo.obs } });
      setCierre(r); setConteo({ efectivo: '', tarjeta: '', digital: '', obs: '' }); setMsg(''); reload(); recargarHistorial();
    } catch (e) { setMsg(e.message); }
  };

  const r = data?.resumen;
  const listo = ['efectivo', 'tarjeta', 'digital'].every((k) => conteo[k] !== '');
  const difPrevia = r && listo ? (Number(conteo.efectivo) - r.esperado_efectivo) + (Number(conteo.tarjeta) - r.esperado_tarjeta) + (Number(conteo.digital) - r.esperado_digital) : 0;

  return (
    <>
      <PageHeader titulo="Caja y turnos" subtitulo="Apertura, cierre y cuadre de efectivo, tarjetas y pagos digitales (Bitcoin / Chivo Wallet)" />
      {msg && <Alert color="danger">{msg}</Alert>}

      {cierre && (
        <Alert color={cierre.turno.diferencia === 0 ? 'success' : 'warning'}>
          <strong>Turno #{cierre.turno.id} cerrado.</strong>{' '}
          {cierre.turno.diferencia === 0 ? 'Cuadre perfecto ✅' : `Diferencia total: ${money(cierre.turno.diferencia)} (${cierre.turno.diferencia < 0 ? 'faltante' : 'sobrante'})`}
        </Alert>
      )}

      <Cargando loading={loading} error={error}>
        {!data?.turno ? (
          <Card style={{ maxWidth: 480 }}><CardBody>
            <h5>Abrir turno</h5>
            <p className="text-muted">Necesitas un turno abierto para vender en el POS.</p>
            <FormGroup><Label>Fondo inicial de caja ($)</Label>
              <Input type="number" min="0" step="0.01" value={inicial} onChange={(e) => setInicial(e.target.value)} placeholder="0.00" /></FormGroup>
            <Button color="primary" disabled={inicial === ''} onClick={abrir}>Abrir turno</Button>
          </CardBody></Card>
        ) : (
          <div className="row g-3">
            <div className="col-lg-6">
              <Card><CardBody>
                <div className="d-flex justify-content-between"><h5>Turno #{data.turno.id}</h5><Badge color="success">Abierto</Badge></div>
                <small className="text-muted">Desde {fechaHora(data.turno.apertura)} · {r.cantidad_ventas} ventas · {money(r.total_vendido)}</small>
                <Table size="sm" className="mt-3 mb-0">
                  <tbody>
                    <tr><td>Fondo inicial</td><td className="text-end">{money(r.monto_inicial)}</td></tr>
                    <tr><td>Ventas en efectivo</td><td className="text-end">{money(r.ventas_efectivo)}</td></tr>
                    <tr><td>Ventas con tarjeta</td><td className="text-end">{money(r.ventas_tarjeta)}</td></tr>
                    <tr><td>Ventas Bitcoin</td><td className="text-end">{money(r.ventas_bitcoin)}</td></tr>
                    <tr><td>Ventas Chivo Wallet</td><td className="text-end">{money(r.ventas_chivo)}</td></tr>
                  </tbody>
                </Table>
              </CardBody></Card>
            </div>
            <div className="col-lg-6">
              <Card><CardBody>
                <h5>Cerrar turno · conteo físico</h5>
                {[['efectivo', 'Efectivo contado', r.esperado_efectivo], ['tarjeta', 'Vouchers de tarjeta', r.esperado_tarjeta], ['digital', 'Bitcoin + Chivo Wallet', r.esperado_digital]].map(([k, etiqueta, esperado]) => (
                  <FormGroup key={k}>
                    <Label>{etiqueta} <small className="text-muted">(esperado {money(esperado)})</small></Label>
                    <Input type="number" min="0" step="0.01" value={conteo[k]} onChange={(e) => setConteo({ ...conteo, [k]: e.target.value })} />
                  </FormGroup>
                ))}
                <FormGroup><Label>Observaciones</Label><Input value={conteo.obs} maxLength={250} onChange={(e) => setConteo({ ...conteo, obs: e.target.value })} /></FormGroup>
                {listo && <Alert color={Math.abs(difPrevia) < 0.005 ? 'success' : 'warning'} className="py-2">
                  Diferencia: <strong>{money(difPrevia)}</strong> {Math.abs(difPrevia) < 0.005 ? '· cuadra' : difPrevia < 0 ? '· faltante' : '· sobrante'}</Alert>}
                <Button color="primary" disabled={!listo} onClick={cerrar}>Cerrar turno</Button>
              </CardBody></Card>
            </div>
          </div>
        )}
      </Cargando>

      {historial && (
        <Card className="p-3 mt-4">
          <h5>Historial de turnos</h5>
          <div className="table-responsive"><Table size="sm" hover className="mb-0">
            <thead><tr><th>#</th><th>Sucursal</th><th>Cajero</th><th>Apertura</th><th>Cierre</th><th className="text-end">Diferencia</th><th>Estado</th></tr></thead>
            <tbody>{historial.map((t) => (
              <tr key={t.id}><td>{t.id}</td><td>{t.sucursal}</td><td>{t.cajero}</td><td>{fechaHora(t.apertura)}</td><td>{fechaHora(t.cierre)}</td>
                <td className={`text-end ${t.diferencia < 0 ? 'text-danger' : ''}`}>{t.diferencia == null ? '-' : money(t.diferencia)}</td>
                <td><Badge color={t.estado === 'abierto' ? 'success' : 'secondary'}>{t.estado}</Badge></td></tr>
            ))}</tbody>
          </Table></div>
        </Card>
      )}
    </>
  );
}

