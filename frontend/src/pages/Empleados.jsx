import { useState } from 'react';
import { Alert, Badge, Button, Card, FormGroup, Input, Label, Modal, ModalBody, ModalFooter, ModalHeader, Table } from 'reactstrap';
import PageHeader from '../components/PageHeader.jsx';
import Cargando from '../components/Cargando.jsx';
import { useApi } from '../utils/useApi.js';
import { api } from '../utils/api.js';
import { money, fecha } from '../utils/format.js';

export const meta = { path: '/empleados', label: 'Empleados', icon: '👥', order: 80, roles: ['admin', 'gerente'] };

const NUEVO = { nombre: '', dui: '', nit: '', cargo: 'barista', sucursal_id: '', salario_mensual: '', activo: true };

export default function Empleados() {
  const { data, loading, error, reload } = useApi('/empleados');
  const { data: sucursales } = useApi('/sucursales');
  const [emp, setEmp] = useState(null);
  const [msg, setMsg] = useState('');

  const guardar = async () => {
    try {
      const body = { ...emp, salario_mensual: Number(emp.salario_mensual), sucursal_id: emp.sucursal_id ? Number(emp.sucursal_id) : null };
      if (emp.id) await api(`/empleados/${emp.id}`, { method: 'PUT', body }); else await api('/empleados', { method: 'POST', body });
      setEmp(null); setMsg(''); reload();
    } catch (e) { setMsg(e.message); }
  };
  const campo = (k, v) => setEmp({ ...emp, [k]: v });

  return (
    <>
      <PageHeader titulo="Empleados" subtitulo="Baristas, cajeros y gerentes de todas las sucursales">
        <Button color="primary" onClick={() => { setMsg(''); setEmp({ ...NUEVO }); }}>+ Nuevo empleado</Button>
      </PageHeader>
      <Card className="p-3"><Cargando loading={loading} error={error}>
        <div className="table-responsive"><Table hover className="mb-0">
          <thead><tr><th>Nombre</th><th>Cargo</th><th>Sucursal</th><th>DUI</th><th>Ingreso</th><th className="text-end">Salario mensual</th><th>Estado</th><th></th></tr></thead>
          <tbody>{(data || []).map((e) => (
            <tr key={e.id} className={e.activo ? '' : 'text-muted'}>
              <td className="fw-semibold">{e.nombre}</td><td className="text-capitalize">{e.cargo}</td><td>{e.sucursal}</td><td>{e.dui}</td><td>{fecha(e.fecha_ingreso)}</td>
              <td className="text-end">{money(e.salario_mensual)}</td>
              <td><Badge color={e.activo ? 'success' : 'secondary'}>{e.activo ? 'Activo' : 'Inactivo'}</Badge></td>
              <td className="text-end"><Button size="sm" color="light" onClick={() => { setMsg(''); setEmp({ ...e, sucursal_id: e.sucursal_id || '' }); }}>Editar</Button></td>
            </tr>
          ))}</tbody>
        </Table></div>
      </Cargando></Card>

      <Modal isOpen={!!emp} toggle={() => setEmp(null)}>
        <ModalHeader toggle={() => setEmp(null)}>{emp?.id ? 'Editar empleado' : 'Nuevo empleado'}</ModalHeader>
        <ModalBody>
          {msg && <Alert color="danger">{msg}</Alert>}
          <FormGroup><Label>Nombre completo</Label><Input value={emp?.nombre || ''} onChange={(e) => campo('nombre', e.target.value)} /></FormGroup>
          <div className="row">
            <FormGroup className="col"><Label>DUI</Label><Input value={emp?.dui || ''} onChange={(e) => campo('dui', e.target.value)} /></FormGroup>
            <FormGroup className="col"><Label>NIT</Label><Input value={emp?.nit || ''} onChange={(e) => campo('nit', e.target.value)} /></FormGroup>
          </div>
          <div className="row">
            <FormGroup className="col"><Label>Cargo</Label>
              <Input type="select" value={emp?.cargo} onChange={(e) => campo('cargo', e.target.value)}>
                <option value="barista">Barista</option><option value="cajero">Cajero</option><option value="gerente">Gerente</option>
              </Input></FormGroup>
            <FormGroup className="col"><Label>Sucursal</Label>
              <Input type="select" value={emp?.sucursal_id} onChange={(e) => campo('sucursal_id', e.target.value)}>
                <option value="">Sin asignar</option>{(sucursales || []).map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </Input></FormGroup>
          </div>
          <FormGroup><Label>Salario mensual ($)</Label><Input type="number" min="0" step="0.01" value={emp?.salario_mensual} onChange={(e) => campo('salario_mensual', e.target.value)} /></FormGroup>
          {emp?.id && <FormGroup check><Input type="checkbox" id="act" checked={emp.activo} onChange={(e) => campo('activo', e.target.checked)} /><Label check for="act">Empleado activo (entra en planilla)</Label></FormGroup>}
        </ModalBody>
        <ModalFooter><Button color="secondary" outline onClick={() => setEmp(null)}>Cancelar</Button><Button color="primary" onClick={guardar}>Guardar</Button></ModalFooter>
      </Modal>
    </>
  );
}