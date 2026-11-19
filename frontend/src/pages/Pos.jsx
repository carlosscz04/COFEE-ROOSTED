import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Card, CardBody, Input, Modal, ModalBody, ModalFooter, ModalHeader } from 'reactstrap';
import PageHeader from '../components/PageHeader.jsx';
import Cargando from '../components/Cargando.jsx';
import DocumentoVenta from '../components/DocumentoVenta.jsx';
import { useApi } from '../utils/useApi.js';
import { api } from '../utils/api.js';
import { money, METODOS } from '../utils/format.js';

export const meta = { path: '/pos', label: 'Punto de venta', icon: '🧾', order: 20, roles: ['admin', 'gerente', 'cajero'] };

export default function Pos() {
  const { data: productos, loading, error } = useApi('/productos');
  const { data: turno, reload: recargarTurno } = useApi('/caja/turno');
  const [categoria, setCategoria] = useState('Todos');
  const [busca, setBusca] = useState('');
  const [lineas, setLineas] = useState([]); // [{ producto, cantidad }]
  const [tipoDoc, setTipoDoc] = useState('FCF');
  const [cliente, setCliente] = useState({ nombre: '', nit: '', nrc: '', giro: '' });
  const [pagos, setPagos] = useState([{ metodo: 'efectivo', monto: '' }]);
  const [recibido, setRecibido] = useState('');
  const [msg, setMsg] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [emitida, setEmitida] = useState(null);

  const categorias = useMemo(() => ['Todos', ...new Set((productos || []).map((p) => p.categoria))], [productos]);
  const visibles = (productos || []).filter((p) => (categoria === 'Todos' || p.categoria === categoria) && p.nombre.toLowerCase().includes(busca.toLowerCase()));

  const total = Math.round(lineas.reduce((s, l) => s + l.producto.precio * l.cantidad, 0) * 100) / 100;
  const gravado = Math.round((total / 1.13) * 100) / 100;
  const iva = Math.round((total - gravado) * 100) / 100;
  // Con un solo medio de pago, el monto es el total; con pagos mixtos se usan los montos digitados
  const montoPago = (p) => (pagos.length === 1 ? total : Number(p.monto) || 0);
  const sumaPagos = Math.round(pagos.reduce((s, p) => s + montoPago(p), 0) * 100) / 100;
  const efectivo = pagos.filter((p) => p.metodo === 'efectivo').reduce((s, p) => s + montoPago(p), 0);
  const cambio = recibido !== '' ? Number(recibido) - efectivo : 0;

  const agregar = (producto) => setLineas((prev) => {
    const existe = prev.find((l) => l.producto.id === producto.id);
    return existe ? prev.map((l) => (l.producto.id === producto.id ? { ...l, cantidad: l.cantidad + 1 } : l)) : [...prev, { producto, cantidad: 1 }];
  });
  const cambiarCantidad = (id, delta) => setLineas((prev) => prev.map((l) => (l.producto.id === id ? { ...l, cantidad: l.cantidad + delta } : l)).filter((l) => l.cantidad > 0));
  const setPago = (idx, campo, valor) => setPagos(pagos.map((p, i) => (i === idx ? { ...p, [campo]: valor } : p)));

  const limpiar = () => { setLineas([]); setCliente({ nombre: '', nit: '', nrc: '', giro: '' }); setPagos([{ metodo: 'efectivo', monto: '' }]); setRecibido(''); setTipoDoc('FCF'); setMsg(''); };

  const cobrar = async () => {
    setEnviando(true);
    try {
      const creada = await api('/ventas', { method: 'POST', body: {
        tipo_doc: tipoDoc, cliente,
        items: lineas.map((l) => ({ producto_id: l.producto.id, cantidad: l.cantidad })),
        pagos: pagos.map((p) => ({ metodo: p.metodo, monto: montoPago(p) })) } });
      setEmitida(await api(`/ventas/${creada.id}`));
      limpiar(); recargarTurno();
    } catch (e) { setMsg(e.message); } finally { setEnviando(false); }
  };

  const sinTurno = turno && !turno.turno;
  const puedeCobrar = lineas.length > 0 && !sinTurno && sumaPagos === total && !enviando;

  return (
    <>
      <PageHeader titulo="Punto de venta" subtitulo="Toma de pedidos con facturación (FCF) y Crédito Fiscal (CCF) con IVA 13%" />
      {sinTurno && <Alert color="warning">Debes <Link to="/caja">abrir tu turno de caja</Link> antes de vender.</Alert>}
      <Cargando loading={loading} error={error}>
        <div className="pos-grid">
          <div>
            <div className="d-flex gap-2 flex-wrap mb-3 align-items-center">
              {categorias.map((c) => <button key={c} className={`chip ${categoria === c ? 'active' : ''}`} onClick={() => setCategoria(c)}>{c}</button>)}
              <Input style={{ maxWidth: 200 }} bsSize="sm" className="ms-auto" placeholder="Buscar…" value={busca} onChange={(e) => setBusca(e.target.value)} />
            </div>
            <div className="prod-grid">
              {visibles.map((p) => (
                <div key={p.id} className="prod-card" onClick={() => agregar(p)}>
                  <div className="prod-emoji">{p.emoji}</div>
                  <div className="prod-name">{p.nombre}</div>
                  <div className="prod-price">{money(p.precio)}</div>
                </div>
              ))}
            </div>
          </div>

          <Card className="ticket"><CardBody>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h5 className="mb-0">Pedido</h5>
              {lineas.length > 0 && <Button size="sm" color="link" className="text-danger p-0" onClick={limpiar}>Vaciar</Button>}
            </div>
            <div className="ticket-lines">
              {lineas.length === 0 && <p className="text-muted text-center py-4 mb-0">Toca un producto para agregarlo</p>}
              {lineas.map((l) => (
                <div key={l.producto.id} className="d-flex align-items-center gap-2 py-1 border-bottom">
                  <div className="flex-grow-1 small"><div className="fw-semibold">{l.producto.nombre}</div><div className="text-muted">{money(l.producto.precio)}</div></div>
                  <Button size="sm" color="light" onClick={() => cambiarCantidad(l.producto.id, -1)}>−</Button>
                  <strong>{l.cantidad}</strong>
                  <Button size="sm" color="light" onClick={() => cambiarCantidad(l.producto.id, 1)}>+</Button>
                  <div style={{ width: 62 }} className="text-end">{money(l.producto.precio * l.cantidad)}</div>
                </div>
              ))}
            </div>

            <div className="d-flex justify-content-between small text-muted mt-3"><span>Venta gravada</span><span>{money(gravado)}</span></div>
            <div className="d-flex justify-content-between small text-muted"><span>IVA 13%</span><span>{money(iva)}</span></div>
            <div className="d-flex justify-content-between align-items-center"><strong>TOTAL</strong><span className="ticket-total">{money(total)}</span></div>

            <div className="d-flex gap-2 my-3">
              {[['FCF', 'Consumidor final'], ['CCF', 'Crédito fiscal']].map(([k, t]) => (
                <Button key={k} size="sm" className="flex-fill" color={tipoDoc === k ? 'primary' : 'outline-primary'} onClick={() => setTipoDoc(k)}>{t}</Button>
              ))}
            </div>
            {tipoDoc === 'CCF' && (
              <div className="mb-3">
                <Input bsSize="sm" className="mb-1" placeholder="Razón social *" value={cliente.nombre} onChange={(e) => setCliente({ ...cliente, nombre: e.target.value })} />
                <div className="d-flex gap-1 mb-1">
                  <Input bsSize="sm" placeholder="NIT *" value={cliente.nit} onChange={(e) => setCliente({ ...cliente, nit: e.target.value })} />
                  <Input bsSize="sm" placeholder="NRC *" value={cliente.nrc} onChange={(e) => setCliente({ ...cliente, nrc: e.target.value })} />
                </div>
                <Input bsSize="sm" placeholder="Giro" value={cliente.giro} onChange={(e) => setCliente({ ...cliente, giro: e.target.value })} />
              </div>
            )}

            <div className="small fw-semibold mb-1">Forma de pago</div>
            {pagos.map((p, idx) => (
              <div className="d-flex gap-1 mb-1" key={idx}>
                <Input type="select" bsSize="sm" value={p.metodo} onChange={(e) => setPago(idx, 'metodo', e.target.value)}>
                  {Object.entries(METODOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Input>
                {pagos.length > 1 && <Input type="number" bsSize="sm" min="0" step="0.01" style={{ maxWidth: 100 }} value={p.monto} onChange={(e) => setPago(idx, 'monto', e.target.value)} />}
                {pagos.length > 1 && <Button size="sm" color="outline-danger" onClick={() => setPagos(pagos.filter((_, i) => i !== idx))}>✕</Button>}
              </div>
            ))}
            <Button size="sm" color="link" className="p-0" onClick={() => setPagos([...pagos, { metodo: 'tarjeta', monto: '' }])}>+ Dividir pago</Button>
            {pagos.length > 1 && sumaPagos !== total && <div className="small text-danger">Los pagos suman {money(sumaPagos)} y el total es {money(total)}</div>}
            {efectivo > 0 && (
              <div className="d-flex align-items-center gap-2 mt-2 small">
                <span>Efectivo recibido</span>
                <Input type="number" bsSize="sm" style={{ maxWidth: 100 }} value={recibido} onChange={(e) => setRecibido(e.target.value)} />
                {recibido !== '' && <strong className={cambio < 0 ? 'text-danger' : 'text-success'}>{cambio < 0 ? 'Falta ' : 'Vuelto '}{money(Math.abs(cambio))}</strong>}
              </div>
            )}

            {msg && <Alert color="danger" className="mt-3 mb-0 py-2">{msg}</Alert>}
            <Button color="primary" size="lg" block className="mt-3" disabled={!puedeCobrar} onClick={cobrar}>{enviando ? 'Procesando…' : `Cobrar ${money(total)}`}</Button>
          </CardBody></Card>
        </div>
      </Cargando>

      <Modal isOpen={!!emitida} toggle={() => setEmitida(null)}>
        <ModalHeader toggle={() => setEmitida(null)}>Venta registrada ✅</ModalHeader>
        <ModalBody>{emitida && <DocumentoVenta venta={emitida} />}</ModalBody>
        <ModalFooter>
          <Button color="outline-primary" onClick={() => window.print()}>🖨️ Imprimir</Button>
          <Button color="primary" onClick={() => setEmitida(null)}>Nueva venta</Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
