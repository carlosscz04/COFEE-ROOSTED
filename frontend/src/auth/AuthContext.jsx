import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../utils/api.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem('token')) { setCargando(false); return; }
    api('/auth/me').then((d) => setUser(d.user)).catch(() => localStorage.removeItem('token')).finally(() => setCargando(false));
  }, []);

  const login = async (email, password) => {
    const d = await api('/auth/login', { method: 'POST', body: { email, password } });
    localStorage.setItem('token', d.token);
    setUser(d.user);
  };
  const logout = () => { localStorage.removeItem('token'); setUser(null); };

  return <AuthContext.Provider value={{ user, cargando, login, logout }}>{children}</AuthContext.Provider>;
}