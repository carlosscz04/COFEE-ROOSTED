import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Button } from 'reactstrap';
import { useAuth } from '../auth/AuthContext.jsx';

export default function Layout({ paginas }) {
  const { user, logout } = useAuth();
  const [abierto, setAbierto] = useState(false);
  const visibles = paginas.filter((p) => p.roles.includes(user.rol)).sort((a, b) => a.order - b.order);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${abierto ? 'open' : ''}`}>
        <div className="sidebar-brand">☕ Orígenes <span>SV</span></div>
        <nav>
          {visibles.map((p) => (
            <NavLink key={p.path} to={p.path} className="nav-item-side" onClick={() => setAbierto(false)}>
              <span className="nav-icon">{p.icon}</span>{p.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-user">
          <div className="fw-semibold">{user.nombre}</div>
          <small className="text-capitalize">{user.rol} · {user.sucursal_nombre}</small>
          <Button color="light" size="sm" outline className="mt-2 w-100" onClick={logout}>Cerrar sesión</Button>
        </div>
      </aside>
      <div className="main-area">
        <header className="topbar d-lg-none">
          <Button color="link" className="text-white fs-4 p-0" onClick={() => setAbierto(!abierto)}>☰</Button>
          <strong>Orígenes SV</strong>
        </header>
        <main className="content"><Outlet /></main>
      </div>
    </div>
  );
}