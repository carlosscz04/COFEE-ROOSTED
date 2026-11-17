import { useState } from 'react';
import { Badge, Button, Card, Input, Modal, ModalBody, ModalFooter, ModalHeader, Table } from 'reactstrap';
import PageHeader from '../components/PageHeader.jsx';
import Cargando from '../components/Cargando.jsx';
import SucursalSelect from '../components/SucursalSelect.jsx';
import DocumentoVenta from '../components/DocumentoVenta.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { useApi } from '../utils/useApi.js';
import { api } from '../utils/api.js';
import { money, fechaHora } from '../utils/format.js';

export const meta = { path: '/facturas', label: 'Facturas emitidas', icon: '📄', order: 30, roles: ['admin', 'gerente', 'cajero'] };

export default function Facturas() {
  const { user } = useAuth();
  const [sucursal, setSucursal] = useState(user.sucursal_id);
  const [filtros, setFiltros] = useState({ desde: '', hasta: '', tipo: '' });
  const qs = new URLSearchParams({ sucursal_id: sucursal, ...Object.fromEntries(Object.entries(filtros).filter(([, v]) => v)) }).toString();
  const { data, loading, error } = useApi(`/ventas?${qs}`);
  const [doc, setDoc] = useState(null);

  const ver = async (id) => { try { setDoc(await api(`/ventas/${id}`)); } catch (e) { alert(e.message); } };
  const totalListado = (data || []).reduce((s, v) => s + v.total, 0);

  return (
    <>
      <PageHeader titulo="Facturas emitidas" subtitulo="Consumidor final (FCF) y Comprobantes de Crédito Fiscal (CCF)">
        <SucursalSelect value={sucursal} onChange={setSucursal} />
      </PageHeader>
      <Card className="p-3">
        <div className="d-flex gap-2 flex-wrap mb-3">
          <Input type="date" style={{ maxWidth: 170 }} value={filtros.desde} onChange={(e) => setFiltros({ ...filtros, desde: e.target.value })} />
          <Input type="date" style={{ maxWidth: 170 }} value={filtros.hasta} onChange={(e) => setFiltros({ ...filtros, hasta: e.target.value })} />
          <Input type="select" style={{ maxWidth: 170 }} value={filtros.tipo} onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}>
            <option value="">Todos los tipos</option><option value="FCF">Consumidor final</option><option value="CCF">Crédito fiscal</option>
          </Input>
          <div className="ms-auto align-self-center text-muted">{(data || []).length} documentos · <strong>{money(totalListado)}</strong></div>
        </div>
        <Cargando loading={loading} error={error}>
          <div className="table-responsive"><Table hover className="mb-0">
            <thead><tr><th>Documento</th><th>Tipo</th><th>Fecha</th><th>Cliente</th><th>Cajero</th><th className="text-end">IVA</th><th className="text-end">Total</th><th></th></tr></thead>
            <tbody>
              {(data || []).map((v) => (
                <tr key={v.id}>
                  <td className="fw-semibold">{v.serie}-{String(v.correlativo).padStart(6, '0')}</td>
                  <td><Badge color={v.tipo_doc === 'CCF' ? 'primary' : 'secondary'}>{v.tipo_doc}</Badge></td>
                  <td>{fechaHora(v.fecha)}</td><td>{v.cliente_nombre}</td><td>{v.cajero}</td>
                  <td className="text-end">{money(v.iva)}</td><td className="text-end">{money(v.total)}</td>
                  <td className="text-end"><Button size="sm" color="light" onClick={() => ver(v.id)}>Ver</Button></td>
                </tr>
              ))}
              {(data || []).length === 0 && <tr><td colSpan={8} className="text-center text-muted py-4">No hay documentos en el rango</td></tr>}
            </tbody>
          </Table></div>
        </Cargando>
      </Card>
      <Modal isOpen={!!doc} toggle={() => setDoc(null)}>
        <ModalHeader toggle={() => setDoc(null)}>Documento</ModalHeader>
        <ModalBody>{doc && <DocumentoVenta venta={doc} />}</ModalBody>
        <ModalFooter><Button color="outline-primary" onClick={() => window.print()}>🖨️ Imprimir</Button><Button color="secondary" onClick={() => setDoc(null)}>Cerrar</Button></ModalFooter>
      </Modal>
    </>
  );
}
