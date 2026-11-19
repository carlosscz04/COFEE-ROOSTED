import { useState } from 'react';
import { Alert, Button, Card, Input, Table } from 'reactstrap';
import PageHeader from '../components/PageHeader.jsx';
import Cargando from '../components/Cargando.jsx';
import { useApi } from '../utils/useApi.js';
import { api } from '../utils/api.js';
import { money, fechaHora } from '../utils/format.js';

export const meta = { path: '/planilla', label: 'Planilla', icon: '🧮', order: 90, roles: ['admin', 'gerente'] };

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export default function Planilla() {
  const hoy = new Date();
  const { data: planillas, loading, error, reload } = useApi('/planilla');
  const [periodo, setPeriodo] = useState({ anio: hoy.getFullYear(), mes: hoy.getMonth() + 1, quincena: hoy.getDate() <= 15 ? 1 : 2 });
  const [detalle, setDetalle] = useState(null);
  const [msg, setMsg] = useState('');

  const generar = async () => {
    try {
      const r = await api('/planilla/generar', { method: 'POST', body: { anio: Number(periodo.anio), mes: Number(periodo.mes), quincena: Number(periodo.quincena) } });
      setMsg(''); await reload(); abrir(r.id);
    } catch (e) { setMsg(e.message); }
  };
  const abrir = async (id) => { try { setDetalle(await api(`/planilla/${id}`)); } catch (e) { setMsg(e.message); } };

  const t = detalle?.detalle.reduce((a, d) => ({
    bruto: a.bruto + d.salario_bruto, isss: a.isss + d.isss, afp: a.afp + d.afp, renta: a.renta + d.renta, neto: a.neto + d.neto,
    patronal: a.patronal + d.isss_patronal + d.afp_patronal }), { bruto: 0, isss: 0, afp: 0, renta: 0, neto: 0, patronal: 0 });

  return (
    <>
      <PageHeader titulo="Planilla quincenal" subtitulo="Deducciones de ley: ISSS 3%, AFP 7.25% y retención de Impuesto sobre la Renta" />
      {msg && <Alert color="danger">{msg}</Alert>}
      <div className="row g-3">
        <div className="col-lg-4">
          <Card className="p-3 mb-3">
            <h6>Generar planilla</h6>
            <div className="d-flex gap-2 mb-2">
              <Input type="select" value={periodo.mes} onChange={(e) => setPeriodo({ ...periodo, mes: e.target.value })}>
                {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </Input>
              <Input type="number" style={{ maxWidth: 100 }} value={periodo.anio} onChange={(e) => setPeriodo({ ...periodo, anio: e.target.value })} />
            </div>
            <Input type="select" className="mb-3" value={periodo.quincena} onChange={(e) => setPeriodo({ ...periodo, quincena: e.target.value })}>
              <option value={1}>1.ª quincena (1–15)</option><option value={2}>2.ª quincena (16–fin de mes)</option>
            </Input>
            <Button color="primary" onClick={generar}>Calcular y guardar planilla</Button>
          </Card>
          <Card className="p-3">
            <h6>Planillas generadas</h6>
            <Cargando loading={loading} error={error}>
              {(planillas || []).map((p) => (
                <button key={p.id} className={`chip text-start mb-2 ${detalle?.planilla.id === p.id ? 'active' : ''}`} style={{ borderRadius: 10 }} onClick={() => abrir(p.id)}>
                  {MESES[p.mes - 1]} {p.anio} · {p.quincena}.ª quincena<br /><small>Neto {money(p.total_neto)} · {fechaHora(p.generada)}</small>
                </button>
              ))}
              {(planillas || []).length === 0 && <p className="text-muted mb-0">Aún no hay planillas.</p>}
            </Cargando>
          </Card>
        </div>

        <div className="col-lg-8">
          {detalle ? (
            <Card className="p-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="mb-0">{MESES[detalle.planilla.mes - 1]} {detalle.planilla.anio} · {detalle.planilla.quincena}.ª quincena</h6>
                <Button size="sm" color="outline-primary" onClick={() => window.print()}>🖨️ Imprimir</Button>
              </div>
              <div className="table-responsive doc-print"><Table size="sm" className="mb-0" style={{ fontFamily: 'inherit' }}>
                <thead><tr><th>Empleado</th><th>Cargo</th><th className="text-end">Bruto</th><th className="text-end">ISSS</th><th className="text-end">AFP</th><th className="text-end">Renta</th><th className="text-end">Neto</th></tr></thead>
                <tbody>
                  {detalle.detalle.map((d) => (
                    <tr key={d.id}><td>{d.nombre}</td><td className="text-capitalize">{d.cargo}</td><td className="text-end">{money(d.salario_bruto)}</td>
                      <td className="text-end">{money(d.isss)}</td><td className="text-end">{money(d.afp)}</td><td className="text-end">{money(d.renta)}</td><td className="text-end fw-semibold">{money(d.neto)}</td></tr>
                  ))}
                  <tr className="table-light fw-bold"><td colSpan={2}>TOTALES</td><td className="text-end">{money(t.bruto)}</td><td className="text-end">{money(t.isss)}</td>
                    <td className="text-end">{money(t.afp)}</td><td className="text-end">{money(t.renta)}</td><td className="text-end">{money(t.neto)}</td></tr>
                </tbody>
              </Table></div>
              <small className="text-muted mt-2">Aporte patronal de la quincena (ISSS 7.5% + AFP 8.75%): <strong>{money(t.patronal)}</strong></small>
            </Card>
          ) : <Card className="p-5 text-center text-muted">Selecciona o genera una planilla para ver su detalle.</Card>}
        </div>
      </div>
    </>
  );
}