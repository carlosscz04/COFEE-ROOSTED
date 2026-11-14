import { Fragment, useState } from 'react';
import { Alert, Badge, Button, Card, FormGroup, Input, Label, Modal, ModalBody, ModalFooter, ModalHeader, Table } from 'reactstrap';
import PageHeader from '../components/PageHeader.jsx';
import Cargando from '../components/Cargando.jsx';
import { useApi } from '../utils/useApi.js';
import { api } from '../utils/api.js';
import { money, num } from '../utils/format.js';

export const meta = { path: '/productos', label: 'Menú y recetas', icon: '🍽️', order: 60, roles: ['admin', 'gerente'] };

const NUEVO = { id: null, nombre: '', categoria: '', tipo: 'elaborado', precio: '', emoji: '🍽️', activo: true, receta: [{ insumo_id: '', cantidad: '' }] };

export default function Productos() {
  const { data, loading, error, reload } = useApi('/productos?todos=1');
  const { data: insumos } = useApi('/inventario');
  const [prod, setProd] = useState(null);
  const [abierto, setAbierto] = useState(null);
  const [msg, setMsg] = useState('');

  const abrir = (p) => {
    setMsg('');
    setProd(p ? { ...p, receta: p.receta.map((r) => ({ insumo_id: r.insumo_id, cantidad: r.cantidad })) } : { ...NUEVO, receta: [{ insumo_id: '', cantidad: '' }] });
  };
  const setLinea = (idx, campo, valor) => setProd({ ...prod, receta: prod.receta.map((r, i) => (i === idx ? { ...r, [campo]: valor } : r)) });
  const quitarLinea = (idx) => setProd({ ...prod, receta: prod.receta.filter((_, i) => i !== idx) });

  const cambiarTipo = (tipo) => setProd({ ...prod, tipo, receta: tipo === 'reventa' ? prod.receta.slice(0, 1) : prod.receta });

  const guardar = async () => {
    try {
      const body = { ...prod, precio: Number(prod.precio), receta: prod.receta.map((r) => ({ insumo_id: Number(r.insumo_id), cantidad: Number(r.cantidad) })) };
      if (prod.id) await api(`/productos/${prod.id}`, { method: 'PUT', body });
      else await api('/productos', { method: 'POST', body });
      setProd(null); reload();
    } catch (e) { setMsg(e.message); }
  };

  const desactivar = async (p) => {
    if (!window.confirm(`¿Desactivar "${p.nombre}" del menú?`)) return;
    try { await api(`/productos/${p.id}`, { method: 'DELETE' }); reload(); } catch (e) { setMsg(e.message); }
  };

  const costoLinea = (r) => (insumos || []).find((i) => i.id === Number(r.insumo_id))?.costo_promedio * Number(r.cantidad) || 0;
  const costoTotal = prod ? prod.receta.reduce((s, r) => s + costoLinea(r), 0) : 0;

  return (
    <>
      <PageHeader titulo="Menú y recetas" subtitulo="Productos elaborados (con receta) y de reventa. Cada venta descuenta sus insumos.">
        <Button color="primary" onClick={() => abrir(null)}>+ Nuevo producto</Button>
      </PageHeader>
      {msg && !prod && <Alert color="danger">{msg}</Alert>}
      <Card className="p-3">
        <Cargando loading={loading} error={error}>
          <div className="table-responsive">
            <Table hover className="mb-0">
              <thead><tr><th>Producto</th><th>Categoría</th><th>Tipo</th><th className="text-end">Precio</th><th className="text-end">Costo</th><th className="text-end">Margen</th><th></th></tr></thead>
              <tbody>
                {(data || []).map((p) => (
                  <Fragment key={p.id}>
                    <tr className={p.activo ? '' : 'text-muted'} style={{ cursor: 'pointer' }} onClick={() => setAbierto(abierto === p.id ? null : p.id)}>
                      <td className="fw-semibold">{p.emoji} {p.nombre} {!p.activo && <Badge color="secondary">Inactivo</Badge>}</td>
                      <td>{p.categoria}</td>
                      <td><Badge color={p.tipo === 'elaborado' ? 'primary' : 'info'}>{p.tipo}</Badge></td>
                      <td className="text-end">{money(p.precio)}</td>
                      <td className="text-end">{money(p.costo)}</td>
                      <td className="text-end">{p.precio > 0 ? `${(((p.precio / 1.13 - p.costo) / (p.precio / 1.13)) * 100).toFixed(0)}%` : '-'}</td>
                      <td className="text-end text-nowrap" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" color="light" className="me-1" onClick={() => abrir(p)}>Editar</Button>
                        {p.activo && <Button size="sm" color="outline-danger" onClick={() => desactivar(p)}>Quitar</Button>}
                      </td>
                    </tr>
                    {abierto === p.id && (
                      <tr><td colSpan={7} className="bg-light small">
                        <strong>Receta:</strong> {p.receta.map((r) => `${num(r.cantidad)} ${r.unidad} de ${r.insumo}`).join(' · ')}
                      </td></tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </Table>
          </div>
          <small className="text-muted">Margen calculado sobre el precio sin IVA. Haz clic en una fila para ver su receta.</small>
        </Cargando>
      </Card>

      <Modal isOpen={!!prod} toggle={() => setProd(null)} size="lg">
        <ModalHeader toggle={() => setProd(null)}>{prod?.id ? 'Editar producto' : 'Nuevo producto'}</ModalHeader>
        <ModalBody>
          {msg && <Alert color="danger">{msg}</Alert>}
          <div className="row">
            <FormGroup className="col-md-6"><Label>Nombre</Label><Input value={prod?.nombre || ''} onChange={(e) => setProd({ ...prod, nombre: e.target.value })} /></FormGroup>
            <FormGroup className="col-md-6"><Label>Categoría</Label><Input value={prod?.categoria || ''} onChange={(e) => setProd({ ...prod, categoria: e.target.value })} placeholder="Ej. Bebidas calientes" /></FormGroup>
            <FormGroup className="col-md-4"><Label>Tipo</Label>
              <Input type="select" value={prod?.tipo} onChange={(e) => cambiarTipo(e.target.value)}>
                <option value="elaborado">Elaborado (receta)</option><option value="reventa">Reventa (empacado)</option>
              </Input></FormGroup>
            <FormGroup className="col-md-4"><Label>Precio público (IVA incl.)</Label><Input type="number" min="0" step="0.01" value={prod?.precio} onChange={(e) => setProd({ ...prod, precio: e.target.value })} /></FormGroup>
            <FormGroup className="col-md-4"><Label>Emoji</Label><Input value={prod?.emoji || ''} maxLength={4} onChange={(e) => setProd({ ...prod, emoji: e.target.value })} /></FormGroup>
          </div>
          <h6 className="mt-2">{prod?.tipo === 'reventa' ? 'Insumo que se descuenta (1 unidad por venta)' : 'Receta: insumos que se descuentan por cada unidad vendida'}</h6>
          {prod?.receta.map((r, idx) => (
            <div className="d-flex gap-2 mb-2" key={idx}>
              <Input type="select" value={r.insumo_id} onChange={(e) => setLinea(idx, 'insumo_id', e.target.value)}>
                <option value="">Selecciona insumo…</option>
                {(insumos || []).map((i) => <option key={i.id} value={i.id}>{i.nombre} ({i.unidad})</option>)}
              </Input>
              <Input type="number" min="0" step="0.01" style={{ maxWidth: 130 }} placeholder="Cantidad" value={r.cantidad} onChange={(e) => setLinea(idx, 'cantidad', e.target.value)} />
              <Button color="outline-danger" disabled={prod.receta.length === 1} onClick={() => quitarLinea(idx)}>✕</Button>
            </div>
          ))}
          {prod?.tipo === 'elaborado' && (
            <Button size="sm" color="outline-primary" onClick={() => setProd({ ...prod, receta: [...prod.receta, { insumo_id: '', cantidad: '' }] })}>+ Agregar insumo</Button>
          )}
          <div className="mt-3 text-muted">Costo estimado de receta: <strong>{money(costoTotal)}</strong></div>
        </ModalBody>
        <ModalFooter><Button color="secondary" outline onClick={() => setProd(null)}>Cancelar</Button><Button color="primary" onClick={guardar}>Guardar</Button></ModalFooter>
      </Modal>
    </>
  );
}