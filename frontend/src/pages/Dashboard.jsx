import { useState } from 'react';
import { Alert, Badge, Card, Table } from 'reactstrap';
import PageHeader from '../components/PageHeader.jsx';
import Cargando from '../components/Cargando.jsx';
import SucursalSelect from '../components/SucursalSelect.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { useApi } from '../utils/useApi.js';
import { money, num, fechaHora, METODOS } from '../utils/format.js';

export const meta = { path: '/dashboard', label: 'Panel general', icon: '📊', order: 10, roles: ['admin', 'gerente'] };

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

export default function Dashboard() {
  const { user } = useAuth();
  const [sucursal, setSucursal] = useState(user.sucursal_id);
  const { data, loading, error } = useApi(`/dashboard?sucursal_id=${sucursal}`);

  const max = Math.max(1, ...(data?.semana || []).map((d) => d.total));

  return (
    <>
      <PageHeader titulo="Panel general" subtitulo={`Hola, ${user.nombre.split(' ')[0]} 👋 Resumen de la operación de hoy`}>
        <SucursalSelect value={sucursal} onChange={setSucursal} />
      </PageHeader>
      <Cargando loading={loading} error={error}>
        {data && (
          <>
            <div className="row g-3 mb-3">
              {[
                ['Ventas de hoy', money(data.hoy.total)],
                ['Tickets emitidos', data.hoy.tickets],
                ['Ticket promedio', money(data.hoy.tickets ? data.hoy.total / data.hoy.tickets : 0)],
                ['Cuentas por pagar', money(data.cxp.pendiente)],
              ].map(([l, v]) => (
                <div className="col-6 col-xl-3" key={l}><Card className="kpi"><div className="kpi-label">{l}</div><div className="kpi-value">{v}</div></Card></div>
              ))}
            </div>
            {data.cxp.vencido > 0 && <Alert color="danger">Tienes {money(data.cxp.vencido)} en cuentas por pagar vencidas.</Alert>}

            <div className="row g-3">
              <div className="col-lg-7">
                <Card className="p-3 h-100">
                  <h6>Ventas de los últimos 7 días</h6>
                  <div className="bars mt-3">
                    {data.semana.map((d) => (
                      <div className="bar-col" key={d.dia} title={money(d.total)}>
                        <small className="text-muted">{d.total > 0 ? money(d.total) : ''}</small>
                        <div className="bar" style={{ height: `${(d.total / max) * 100}%` }} />
                        <small className="mt-1">{DIAS[new Date(`${d.dia}T00:00:00`).getDay()]}</small>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
              <div className="col-lg-5">
                <Card className="p-3 h-100">
                  <h6>Productos más vendidos del mes</h6>
                  <Table size="sm" className="mb-0"><tbody>
                    {data.top.map((p, i) => <tr key={p.descripcion}><td>{i + 1}. {p.descripcion}</td><td className="text-end">{p.cantidad} u</td><td className="text-end">{money(p.total)}</td></tr>)}
                    {data.top.length === 0 && <tr><td className="text-muted">Sin ventas este mes</td></tr>}
                  </tbody></Table>
                </Card>
              </div>
              <div className="col-lg-4">
                <Card className="p-3 h-100">
                  <h6>Ventas de hoy por forma de pago</h6>
                  {data.metodos.map((m) => <div key={m.metodo} className="d-flex justify-content-between py-1 border-bottom"><span>{METODOS[m.metodo]}</span><strong>{money(m.monto)}</strong></div>)}
                  {data.metodos.length === 0 && <span className="text-muted">Sin ventas hoy</span>}
                  <h6 className="mt-3">Turnos de caja abiertos</h6>
                  {data.turnos_abiertos.map((t) => <div key={t.id} className="small">🟢 {t.cajero} · desde {fechaHora(t.apertura)}</div>)}
                  {data.turnos_abiertos.length === 0 && <span className="text-muted small">Ninguno</span>}
                </Card>
              </div>
              <div className="col-lg-8">
                <Card className="p-3 h-100">
                  <h6>Alertas de stock mínimo <Badge color={data.alertas.length ? 'danger' : 'success'}>{data.alertas.length}</Badge></h6>
                  {data.alertas.length === 0 ? <span className="text-muted">Todo el inventario está por encima del mínimo ✅</span> : (
                    <Table size="sm" className="mb-0"><thead><tr><th>Insumo</th><th className="text-end">Stock</th><th className="text-end">Mínimo</th></tr></thead>
                      <tbody>{data.alertas.map((a) => <tr key={a.nombre}><td>{a.nombre}</td><td className="text-end text-danger fw-bold">{num(a.stock)} {a.unidad}</td><td className="text-end">{num(a.stock_minimo)}</td></tr>)}</tbody></Table>
                  )}
                </Card>
              </div>
            </div>
          </>
        )}
      </Cargando>
    </>
  );
}