import { useState } from 'react';
import { Alert, Badge, Button, Card, FormGroup, Input, Label, Modal, ModalBody, ModalFooter, ModalHeader, Table } from 'reactstrap';
import PageHeader from '../components/PageHeader.jsx';
import Cargando from '../components/Cargando.jsx';
import SucursalSelect from '../components/SucursalSelect.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { useApi } from '../utils/useApi.js';
import { api } from '../utils/api.js';
import { money, num } from '../utils/format.js';

export const meta = { path: '/inventario', label: 'Inventario', icon: '📦', order: 50, roles: ['admin', 'gerente'] };

const VACIO = { id: null, nombre: '', unidad: 'g', stock_minimo: 0, costo_promedio: 0 };

export default function Inventario() {
  const { user } = useAuth();
  const [sucursal, setSucursal] = useState(user.sucursal_id);
  const { data, loading, error, reload } = useApi(`/inventario?sucursal_id=${sucursal}`);
  const [filtro, setFiltro] = useState('');
  const [soloAlertas, setSoloAlertas] = useState(false);
  const [insumo, setInsumo] = useState(null);
  const [ajuste, setAjuste] = useState(null);
  const [msg, setMsg] = useState('');

  const lista = (data || []).filter((i) => i.nombre.toLowerCase().includes(filtro.toLowerCase()) && (!soloAlertas || i.bajo_minimo));
  const alertas = (data || []).filter((i) => i.bajo_minimo).length;

  const guardarInsumo = async () => {
    try {
      const body = { ...insumo, stock_minimo: Number(insumo.stock_minimo), costo_promedio: Number(insumo.costo_promedio) };
      if (insumo.id) await api(`/inventario/insumos/${insumo.id}`, { method: 'PUT', body });
      else await api('/inventario/insumos', { method: 'POST', body });
      setInsumo(null); setMsg(''); reload();
    } catch (e) { setMsg(e.message); }
  };

  const guardarAjuste = async () => {
    try {
      await api('/inventario/ajuste', { method: 'POST', body: { insumo_id: ajuste.id, stock: Number(ajuste.nuevo), sucursal_id: sucursal } });
      setAjuste(null); setMsg(''); reload();
    } catch (e) { setMsg(e.message); }
  };

  return (
    <>
      <PageHeader titulo="Inventario" subtitulo="Stock de insumos y productos de reventa por sucursal">
        <SucursalSelect value={sucursal} onChange={setSucursal} />
        <Button color="primary" onClick={() => { setMsg(''); setInsumo({ ...VACIO }); }}>+ Nuevo insumo</Button>
      </PageHeader>

      {alertas > 0 && <Alert color="warning">⚠️ {alertas} insumo(s) en o por debajo del stock mínimo. Programa una compra.</Alert>}

      <Card className="p-3">
        <div className="d-flex gap-3 mb-3 flex-wrap align-items-center">
          <Input style={{ maxWidth: 280 }} placeholder="Buscar insumo…" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
          <FormGroup check className="mb-0">
            <Input type="checkbox" id="soloAl" checked={soloAlertas} onChange={(e) => setSoloAlertas(e.target.checked)} />
            <Label check for="soloAl">Solo alertas</Label>
          </FormGroup>
        </div>
        <Cargando loading={loading} error={error}>
          <div className="table-responsive">
            <Table hover className="mb-0">
              <thead><tr><th>Insumo</th><th>Unidad</th><th className="text-end">Stock</th><th className="text-end">Mínimo</th><th className="text-end">Costo prom.</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {lista.map((i) => (
                  <tr key={i.id}>
                    <td className="fw-semibold">{i.nombre}</td>
                    <td>{i.unidad}</td>
                    <td className="text-end">{num(i.stock)}</td>
                    <td className="text-end">{num(i.stock_minimo)}</td>
                    <td className="text-end">{money(i.costo_promedio)}</td>
                    <td>{i.bajo_minimo ? <Badge color="danger">Stock bajo</Badge> : <Badge color="success">OK</Badge>}</td>
                    <td className="text-end text-nowrap">
                      <Button size="sm" color="outline-primary" className="me-1" onClick={() => { setMsg(''); setAjuste({ ...i, nuevo: i.stock }); }}>Ajustar</Button>
                      <Button size="sm" color="light" onClick={() => { setMsg(''); setInsumo({ ...i }); }}>Editar</Button>
                    </td>
                  </tr>
                ))}
                {lista.length === 0 && <tr><td colSpan={7} className="text-center text-muted py-4">Sin resultados</td></tr>}
              </tbody>
            </Table>
          </div>
        </Cargando>
      </Card>

      <Modal isOpen={!!insumo} toggle={() => setInsumo(null)}>
        <ModalHeader toggle={() => setInsumo(null)}>{insumo?.id ? 'Editar insumo' : 'Nuevo insumo'}</ModalHeader>
        <ModalBody>
          {msg && <Alert color="danger">{msg}</Alert>}
          <FormGroup><Label>Nombre</Label><Input value={insumo?.nombre || ''} onChange={(e) => setInsumo({ ...insumo, nombre: e.target.value })} /></FormGroup>
          <div className="row">
            <FormGroup className="col"><Label>Unidad</Label>
              <Input type="select" value={insumo?.unidad} onChange={(e) => setInsumo({ ...insumo, unidad: e.target.value })}>
                <option value="g">g</option><option value="ml">ml</option><option value="unidad">unidad</option>
              </Input></FormGroup>
            <FormGroup className="col"><Label>Stock mínimo</Label><Input type="number" min="0" value={insumo?.stock_minimo} onChange={(e) => setInsumo({ ...insumo, stock_minimo: e.target.value })} /></FormGroup>
          </div>
        </ModalBody>
        <ModalFooter><Button color="secondary" outline onClick={() => setInsumo(null)}>Cancelar</Button><Button color="primary" onClick={guardarInsumo}>Guardar</Button></ModalFooter>
      </Modal>

      <Modal isOpen={!!ajuste} toggle={() => setAjuste(null)}>
        <ModalHeader toggle={() => setAjuste(null)}>Ajustar stock · {ajuste?.nombre}</ModalHeader>
        <ModalBody>
          {msg && <Alert color="danger">{msg}</Alert>}
          <p className="text-muted">Ingresa la cantidad física contada ({ajuste?.unidad}). Sustituye el stock actual ({num(ajuste?.stock)}).</p>
          <Input type="number" min="0" value={ajuste?.nuevo ?? ''} onChange={(e) => setAjuste({ ...ajuste, nuevo: e.target.value })} />
        </ModalBody>
        <ModalFooter><Button color="secondary" outline onClick={() => setAjuste(null)}>Cancelar</Button><Button color="primary" onClick={guardarAjuste}>Aplicar ajuste</Button></ModalFooter>
      </Modal>
    </>
  );
}