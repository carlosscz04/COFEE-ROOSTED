import { useState } from 'react';
import { Alert, Badge, Button, Card, FormGroup, Input, Label, Modal, ModalBody, ModalFooter, ModalHeader, Nav, NavItem, NavLink, Table, TabContent, TabPane } from 'reactstrap';
import PageHeader from '../components/PageHeader.jsx';
import Cargando from '../components/Cargando.jsx';
import SucursalSelect from '../components/SucursalSelect.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { useApi } from '../utils/useApi.js';
import { api } from '../utils/api.js';
import { money, fecha, hoyISO } from '../utils/format.js';

export const meta = { path: '/compras', label: 'Compras y CxP', icon: '🚚', order: 70, roles: ['admin', 'gerente'] };

export default function Compras() {
  const { user } = useAuth();
  const [tab, setTab] = useState('registrar');
  const [sucursal, setSucursal] = useState(user.sucursal_id);
  const tabs = [['registrar', 'Registrar compra'], ['historial', 'Historial'], ['cxp', 'Cuentas por pagar'], ['proveedores', 'Proveedores']];
  return (
    <>
      <PageHeader titulo="Compras y proveedores" subtitulo="Facturas de compra, afectación de inventario y cuentas por pagar">
        <SucursalSelect value={sucursal} onChange={setSucursal} />
      </PageHeader>
      <Nav tabs className="mb-3">
        {tabs.map(([k, t]) => <NavItem key={k}><NavLink active={tab === k} style={{ cursor: 'pointer' }} onClick={() => setTab(k)}>{t}</NavLink></NavItem>)}
      </Nav>
      <TabContent activeTab={tab}>
        <TabPane tabId="registrar">{tab === 'registrar' && <RegistrarCompra sucursal={sucursal} />}</TabPane>
        <TabPane tabId="historial">{tab === 'historial' && <Historial sucursal={sucursal} />}</TabPane>
        <TabPane tabId="cxp">{tab === 'cxp' && <CuentasPorPagar />}</TabPane>
        <TabPane tabId="proveedores">{tab === 'proveedores' && <Proveedores />}</TabPane>
      </TabContent>
    </>
  );
}

function RegistrarCompra({ sucursal }) {
  const { data: proveedores } = useApi('/proveedores');
  const { data: insumos } = useApi('/inventario');
  const [form, setForm] = useState({ proveedor_id: '', clasificacion: 'costo', concepto: '', num_factura: '', fecha: hoyISO(), condicion: 'contado', monto_gasto: '' });
  const [items, setItems] = useState([{ insumo_id: '', cantidad: '', costo_unitario: '' }]);
  const [msg, setMsg] = useState({ tipo: '', texto: '' });

  const setItem = (idx, campo, valor) => setItems(items.map((it, i) => (i === idx ? { ...it, [campo]: valor } : it)));
  const subtotal = form.clasificacion === 'costo' ? items.reduce((s, it) => s + (Number(it.cantidad) || 0) * (Number(it.costo_unitario) || 0), 0) : Number(form.monto_gasto) || 0;
  const iva = Math.round(subtotal * 0.13 * 100) / 100;

  const guardar = async () => {
    try {
      const body = { ...form, proveedor_id: Number(form.proveedor_id), sucursal_id: sucursal, monto_gasto: Number(form.monto_gasto),
        items: items.map((it) => ({ insumo_id: Number(it.insumo_id), cantidad: Number(it.cantidad), costo_unitario: Number(it.costo_unitario) })) };
      await api('/compras', { method: 'POST', body });
      setMsg({ tipo: 'success', texto: 'Compra registrada correctamente. El inventario y las cuentas por pagar fueron actualizados.' });
      setItems([{ insumo_id: '', cantidad: '', costo_unitario: '' }]); setForm({ ...form, num_factura: '', concepto: '', monto_gasto: '' });
    } catch (e) { setMsg({ tipo: 'danger', texto: e.message }); }
  };

  return (
    <Card className="p-3">
      {msg.texto && <Alert color={msg.tipo}>{msg.texto}</Alert>}
      <div className="row">
        <FormGroup className="col-md-4"><Label>Proveedor</Label>
          <Input type="select" value={form.proveedor_id} onChange={(e) => setForm({ ...form, proveedor_id: e.target.value })}>
            <option value="">Selecciona…</option>{(proveedores || []).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </Input></FormGroup>
        <FormGroup className="col-md-3"><Label>N.º de factura</Label><Input value={form.num_factura} onChange={(e) => setForm({ ...form, num_factura: e.target.value })} /></FormGroup>
        <FormGroup className="col-md-2"><Label>Fecha</Label><Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></FormGroup>
        <FormGroup className="col-md-3"><Label>Clasificación</Label>
          <Input type="select" value={form.clasificacion} onChange={(e) => setForm({ ...form, clasificacion: e.target.value })}>
            <option value="costo">Costo (insumos → inventario)</option><option value="gasto">Gasto (servicios, alquiler…)</option>
          </Input></FormGroup>
        <FormGroup className="col-md-3"><Label>Condición de pago</Label>
          <Input type="select" value={form.condicion} onChange={(e) => setForm({ ...form, condicion: e.target.value })}>
            <option value="contado">Contado</option><option value="credito">Crédito (genera cuenta por pagar)</option>
          </Input></FormGroup>
      </div>

      {form.clasificacion === 'costo' ? (
        <>
          <h6>Detalle de insumos (costos sin IVA)</h6>
          {items.map((it, idx) => (
            <div className="d-flex gap-2 mb-2" key={idx}>
              <Input type="select" value={it.insumo_id} onChange={(e) => setItem(idx, 'insumo_id', e.target.value)}>
                <option value="">Insumo…</option>{(insumos || []).map((i) => <option key={i.id} value={i.id}>{i.nombre} ({i.unidad})</option>)}
              </Input>
              <Input type="number" min="0" step="0.01" style={{ maxWidth: 130 }} placeholder="Cantidad" value={it.cantidad} onChange={(e) => setItem(idx, 'cantidad', e.target.value)} />
              <Input type="number" min="0" step="0.0001" style={{ maxWidth: 150 }} placeholder="Costo unit." value={it.costo_unitario} onChange={(e) => setItem(idx, 'costo_unitario', e.target.value)} />
              <Button color="outline-danger" disabled={items.length === 1} onClick={() => setItems(items.filter((_, i) => i !== idx))}>✕</Button>
            </div>
          ))}
          <Button size="sm" color="outline-primary" onClick={() => setItems([...items, { insumo_id: '', cantidad: '', costo_unitario: '' }])}>+ Agregar línea</Button>
        </>
      ) : (
        <div className="row">
          <FormGroup className="col-md-8"><Label>Concepto del gasto</Label><Input value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })} placeholder="Ej. Energía eléctrica octubre" /></FormGroup>
          <FormGroup className="col-md-4"><Label>Monto sin IVA ($)</Label><Input type="number" min="0" step="0.01" value={form.monto_gasto} onChange={(e) => setForm({ ...form, monto_gasto: e.target.value })} /></FormGroup>
        </div>
      )}

      <div className="text-end mt-3">
        <div>Subtotal: {money(subtotal)} · IVA 13%: {money(iva)}</div>
        <div className="fs-4 fw-bold">Total: {money(subtotal + iva)}</div>
        <Button color="primary" className="mt-2" disabled={!form.proveedor_id || !form.num_factura || subtotal <= 0} onClick={guardar}>Registrar compra</Button>
      </div>
    </Card>
  );
}

function Historial({ sucursal }) {
  const { data, loading, error } = useApi(`/compras?sucursal_id=${sucursal}`);
  return (
    <Card className="p-3"><Cargando loading={loading} error={error}>
      <div className="table-responsive"><Table hover className="mb-0">
        <thead><tr><th>Fecha</th><th>Factura</th><th>Proveedor</th><th>Tipo</th><th>Condición</th><th className="text-end">Total</th></tr></thead>
        <tbody>
          {(data || []).map((c) => (
            <tr key={c.id}><td>{fecha(c.fecha)}</td><td>{c.num_factura}</td><td>{c.proveedor}</td>
              <td><Badge color={c.clasificacion === 'costo' ? 'primary' : 'secondary'}>{c.clasificacion}</Badge> {c.concepto}</td>
              <td className="text-capitalize">{c.condicion}</td><td className="text-end">{money(c.total)}</td></tr>
          ))}
          {(data || []).length === 0 && <tr><td colSpan={6} className="text-center text-muted py-4">Aún no hay compras registradas</td></tr>}
        </tbody>
      </Table></div>
    </Cargando></Card>
  );
}

function CuentasPorPagar() {
  const { data, loading, error, reload } = useApi('/cxp');
  const [pago, setPago] = useState(null);
  const [msg, setMsg] = useState('');
  const pendiente = (data || []).filter((c) => c.estado === 'pendiente').reduce((s, c) => s + c.saldo, 0);

  const pagar = async () => {
    try { await api(`/cxp/${pago.id}/pagos`, { method: 'POST', body: { monto: Number(pago.monto) } }); setPago(null); setMsg(''); reload(); }
    catch (e) { setMsg(e.message); }
  };

  return (
    <Card className="p-3"><Cargando loading={loading} error={error}>
      <div className="mb-3">Saldo total pendiente: <strong className="fs-5">{money(pendiente)}</strong></div>
      <div className="table-responsive"><Table hover className="mb-0">
        <thead><tr><th>Proveedor</th><th>Factura</th><th>Vence</th><th className="text-end">Monto</th><th className="text-end">Saldo</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          {(data || []).map((c) => (
            <tr key={c.id}><td>{c.proveedor}</td><td>{c.num_factura}</td><td>{fecha(c.vencimiento)}</td>
              <td className="text-end">{money(c.monto)}</td><td className="text-end">{money(c.saldo)}</td>
              <td>{c.estado === 'pagada' ? <Badge color="success">Pagada</Badge> : c.vencida ? <Badge color="danger">Vencida</Badge> : <Badge color="warning">Pendiente</Badge>}</td>
              <td className="text-end">{c.estado === 'pendiente' && <Button size="sm" color="outline-primary" onClick={() => { setMsg(''); setPago({ id: c.id, saldo: c.saldo, monto: c.saldo }); }}>Pagar</Button>}</td></tr>
          ))}
          {(data || []).length === 0 && <tr><td colSpan={7} className="text-center text-muted py-4">No hay cuentas por pagar</td></tr>}
        </tbody>
      </Table></div>
      <Modal isOpen={!!pago} toggle={() => setPago(null)}>
        <ModalHeader toggle={() => setPago(null)}>Registrar pago / abono</ModalHeader>
        <ModalBody>
          {msg && <Alert color="danger">{msg}</Alert>}
          <Label>Monto (saldo {money(pago?.saldo)})</Label>
          <Input type="number" min="0" step="0.01" value={pago?.monto ?? ''} onChange={(e) => setPago({ ...pago, monto: e.target.value })} />
        </ModalBody>
        <ModalFooter><Button color="secondary" outline onClick={() => setPago(null)}>Cancelar</Button><Button color="primary" onClick={pagar}>Confirmar pago</Button></ModalFooter>
      </Modal>
    </Cargando></Card>
  );
}

function Proveedores() {
  const { data, loading, error, reload } = useApi('/proveedores');
  const [prov, setProv] = useState(null);
  const [msg, setMsg] = useState('');
  const guardar = async () => {
    try {
      const body = { ...prov, dias_credito: Number(prov.dias_credito) };
      if (prov.id) await api(`/proveedores/${prov.id}`, { method: 'PUT', body }); else await api('/proveedores', { method: 'POST', body });
      setProv(null); setMsg(''); reload();
    } catch (e) { setMsg(e.message); }
  };
  return (
    <Card className="p-3"><Cargando loading={loading} error={error}>
      <div className="text-end mb-3"><Button color="primary" onClick={() => { setMsg(''); setProv({ nombre: '', nit: '', telefono: '', email: '', dias_credito: 0 }); }}>+ Nuevo proveedor</Button></div>
      <div className="table-responsive"><Table hover className="mb-0">
        <thead><tr><th>Proveedor</th><th>NIT</th><th>Teléfono</th><th>Correo</th><th className="text-end">Días crédito</th><th></th></tr></thead>
        <tbody>{(data || []).map((p) => (
          <tr key={p.id}><td className="fw-semibold">{p.nombre}</td><td>{p.nit}</td><td>{p.telefono}</td><td>{p.email}</td><td className="text-end">{p.dias_credito}</td>
            <td className="text-end"><Button size="sm" color="light" onClick={() => { setMsg(''); setProv({ ...p }); }}>Editar</Button></td></tr>
        ))}</tbody>
      </Table></div>
      <Modal isOpen={!!prov} toggle={() => setProv(null)}>
        <ModalHeader toggle={() => setProv(null)}>{prov?.id ? 'Editar proveedor' : 'Nuevo proveedor'}</ModalHeader>
        <ModalBody>
          {msg && <Alert color="danger">{msg}</Alert>}
          {[['nombre', 'Nombre'], ['nit', 'NIT'], ['telefono', 'Teléfono'], ['email', 'Correo']].map(([k, l]) => (
            <FormGroup key={k}><Label>{l}</Label><Input value={prov?.[k] || ''} onChange={(e) => setProv({ ...prov, [k]: e.target.value })} /></FormGroup>
          ))}
          <FormGroup><Label>Días de crédito</Label><Input type="number" min="0" value={prov?.dias_credito ?? 0} onChange={(e) => setProv({ ...prov, dias_credito: e.target.value })} /></FormGroup>
        </ModalBody>
        <ModalFooter><Button color="secondary" outline onClick={() => setProv(null)}>Cancelar</Button><Button color="primary" onClick={guardar}>Guardar</Button></ModalFooter>
      </Modal>
    </Cargando></Card>
  );
}