import { Input } from 'reactstrap';
import { useAuth } from '../auth/AuthContext.jsx';
import { useApi } from '../utils/useApi.js';

export default function SucursalSelect({ value, onChange }) {
  const { user } = useAuth();
  const { data: sucursales } = useApi(user.rol !== 'cajero' ? '/sucursales' : null);
  if (user.rol === 'cajero' || !sucursales) return null;
  return (
    <Input type="select" bsSize="sm" style={{ width: 230 }} value={value} onChange={(e) => onChange(Number(e.target.value))}>
      {sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
    </Input>
  );
}