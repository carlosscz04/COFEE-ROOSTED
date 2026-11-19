import { money, fechaHora, METODOS } from '../utils/format.js';

// Factura de consumidor final (FCF) o Comprobante de Crédito Fiscal (CCF), listo para imprimir
export default function DocumentoVenta({ venta }) {
  const esCCF = venta.tipo_doc === 'CCF';
  return (
    <div className="doc-print">
      <div className="text-center">
        <strong>RESTAURANTE ORÍGENES SV</strong><br />
        {venta.sucursal}<br />{venta.direccion}<br />
        <strong>{esCCF ? 'COMPROBANTE DE CRÉDITO FISCAL' : 'FACTURA CONSUMIDOR FINAL'}</strong><br />
        N.º {venta.serie}-{String(venta.correlativo).padStart(6, '0')}
      </div>
      <hr />
      <div>Fecha: {fechaHora(venta.fecha)}</div>
      <div>Cajero: {venta.cajero}</div>
      <div>Cliente: {venta.cliente_nombre}</div>
      {esCCF && <><div>NIT: {venta.cliente_nit} · NRC: {venta.cliente_nrc}</div>{venta.cliente_giro && <div>Giro: {venta.cliente_giro}</div>}</>}
      <hr />
      <table className="w-100">
        <thead><tr><th>Cant</th><th>Descripción</th><th className="text-end">Total</th></tr></thead>
        <tbody>
          {venta.detalle.map((d) => (
            <tr key={d.id}><td>{d.cantidad}</td><td>{d.descripcion}</td><td className="text-end">{money(d.total)}</td></tr>
          ))}
        </tbody>
      </table>
      <hr />
      <div className="d-flex justify-content-between"><span>Venta gravada</span><span>{money(venta.subtotal)}</span></div>
      <div className="d-flex justify-content-between"><span>IVA 13%</span><span>{money(venta.iva)}</span></div>
      <div className="d-flex justify-content-between"><strong>TOTAL</strong><strong>{money(venta.total)}</strong></div>
      <hr />
      {venta.pagos.map((p, i) => <div key={i} className="d-flex justify-content-between"><span>{METODOS[p.metodo]}</span><span>{money(p.monto)}</span></div>)}
      <div className="text-center mt-2">¡Gracias por visitarnos!</div>
    </div>
  );
}
