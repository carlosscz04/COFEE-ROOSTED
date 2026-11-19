import { Navigate, Route, Routes } from 'react-router-dom';
import { Spinner } from 'reactstrap';
import { useAuth } from './auth/AuthContext.jsx';
import Login from './auth/Login.jsx';
import Layout from './components/Layout.jsx';

const modulos = import.meta.glob('./pages/*.jsx', { eager: true });
const paginas = Object.values(modulos)
  .filter((m) => m.meta && m.default)
  .map((m) => ({ ...m.meta, Componente: m.default }));

export default function App() {
  const { user, cargando } = useAuth();
  if (cargando) return <div className="text-center py-5"><Spinner color="primary" /></div>;

  const permitidas = user ? paginas.filter((p) => p.roles.includes(user.rol)).sort((a, b) => a.order - b.order) : [];
  const inicio = user?.rol === 'cajero' ? '/pos' : permitidas[0]?.path || '/login';

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={user ? <Layout paginas={paginas} /> : <Navigate to="/login" replace />}>
        <Route index element={<Navigate to={inicio} replace />} />
        {paginas.map(({ path, roles, Componente }) => (
          <Route key={path} path={path} element={roles.includes(user?.rol) ? <Componente /> : <Navigate to={inicio} replace />} />
        ))}
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}