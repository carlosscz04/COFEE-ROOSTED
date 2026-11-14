import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Alert, Button, Card, CardBody, Form, FormGroup, Input, Label } from 'reactstrap';
import { useAuth } from './AuthContext.jsx';

export default function Login() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const enviar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="login-wrap">
      <Card className="login-card shadow">
        <CardBody className="p-4">
          <div className="text-center mb-4">
            <div className="login-logo">☕</div>
            <h3 className="brand-title mb-0">Orígenes SV</h3>
            <small className="text-muted">ERP · POS · Restaurante de especialidad</small>
          </div>
          {error && <Alert color="danger" className="py-2">{error}</Alert>}
          <Form onSubmit={enviar}>
            <FormGroup>
              <Label for="email">Correo</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@origenes.sv" required autoFocus />
            </FormGroup>
            <FormGroup>
              <Label for="password">Contraseña</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </FormGroup>
            <Button color="primary" block disabled={enviando}>{enviando ? 'Ingresando…' : 'Ingresar'}</Button>
          </Form>
          <div className="demo-box mt-4">
            <strong>Usuarios de prueba</strong>
            <div>admin@origenes.sv / admin123</div>
            <div>gerente@origenes.sv / gerente123</div>
            <div>cajero1@origenes.sv / cajero123</div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
