import { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Col,
  Form,
  FormGroup,
  Input,
  Label,
  Row,
  Spinner,
  Table
} from 'reactstrap';
import PageHeader from '../components/PageHeader';
import { useApi } from '../utils/useApi.js';
import { api } from '../utils/api.js';

export const meta = {
  path: '/usuarios',
  label: 'Usuarios',
  icon: '🔐',
  order: 95,
  roles: ['admin']
};

export default function Usuarios() {
  const { data: usuarios, loading, error: loadError, reload } = useApi('/usuarios');
  const { data: sucursales } = useApi('/sucursales');

  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [contraseña, setContraseña] = useState('');
  const [rol, setRol] = useState('cajero');
  const [sucursalId, setSucursalId] = useState('');

  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [exitoMsg, setExitoMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setExitoMsg('');
    setGuardando(true);

    try {
      await api('/usuarios', {
        method: 'POST',
        body: {
          nombre,
          correo,
          contraseña,
          rol,
          sucursal_id: Number(sucursalId)
        }
      });
      setNombre('');
      setCorreo('');
      setContraseña('');
      setRol('cajero');
      setSucursalId('');
      setExitoMsg('Cuenta de usuario creada correctamente.');
      reload();
    } catch (err) {
      setErrorMsg(err.message || 'Error al crear la cuenta de usuario.');
    } finally {
      setGuardando(false);
    }
  };

  const colorRol = (r) => {
    if (r === 'admin') return 'danger';
    if (r === 'gerente') return 'warning';
    return 'info';
  };

  return (
    <div>
      <PageHeader
        titulo="Administración de Usuarios"
        subtitulo="Gestión de cuentas de acceso, roles y asignación por sucursal"
      />

      <Row className="g-4">
        <Col md={4}>
          <Card className="shadow-sm">
            <CardHeader className="fw-bold">Crear Cuenta de Acceso</CardHeader>
            <CardBody>
              {errorMsg && <Alert color="danger">{errorMsg}</Alert>}
              {exitoMsg && <Alert color="success">{exitoMsg}</Alert>}

              <Form onSubmit={handleSubmit}>
                <FormGroup>
                  <Label for="usr-nombre">Nombre Completo *</Label>
                  <Input
                    id="usr-nombre"
                    type="text"
                    placeholder="Ej. María López"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    required
                  />
                </FormGroup>

                <FormGroup>
                  <Label for="usr-correo">Correo Electrónico *</Label>
                  <Input
                    id="usr-correo"
                    type="email"
                    placeholder="usuario@origenes.sv"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    required
                  />
                </FormGroup>

                <FormGroup>
                  <Label for="usr-pass">Contraseña (mín. 8 caracteres) *</Label>
                  <Input
                    id="usr-pass"
                    type="password"
                    minLength={8}
                    placeholder="••••••••"
                    value={contraseña}
                    onChange={(e) => setContraseña(e.target.value)}
                    required
                  />
                </FormGroup>

                <FormGroup>
                  <Label for="usr-rol">Rol del Sistema *</Label>
                  <Input
                    id="usr-rol"
                    type="select"
                    value={rol}
                    onChange={(e) => setRol(e.target.value)}
                  >
                    <option value="cajero">Cajero</option>
                    <option value="gerente">Gerente</option>
                    <option value="admin">Administrador</option>
                  </Input>
                </FormGroup>

                <FormGroup>
                  <Label for="usr-sucursal">Sucursal Asignada *</Label>
                  <Input
                    id="usr-sucursal"
                    type="select"
                    value={sucursalId}
                    onChange={(e) => setSucursalId(e.target.value)}
                    required
                  >
                    <option value="">Seleccione una sucursal...</option>
                    {(sucursales || [])
                      .filter((s) => s.activa !== false)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nombre}
                        </option>
                      ))}
                  </Input>
                </FormGroup>

                <Button color="primary" type="submit" block disabled={guardando}>
                  {guardando ? 'Registrando...' : 'Crear Usuario'}
                </Button>
              </Form>
            </CardBody>
          </Card>
        </Col>

        <Col md={8}>
          <Card className="shadow-sm">
            <CardHeader className="fw-bold">Usuarios Activos</CardHeader>
            <CardBody>
              {loadError && <Alert color="danger">{loadError}</Alert>}
              {loading ? (
                <div className="text-center py-4">
                  <Spinner color="primary" />
                </div>
              ) : (
                <Table responsive hover striped className="align-middle mb-0">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nombre</th>
                      <th>Correo</th>
                      <th>Rol</th>
                      <th>Sucursal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(usuarios || []).map((u) => (
                      <tr key={u.id}>
                        <td>{u.id}</td>
                        <td className="fw-semibold">{u.nombre}</td>
                        <td>{u.correo}</td>
                        <td>
                          <Badge color={colorRol(u.rol)} className="text-uppercase">
                            {u.rol}
                          </Badge>
                        </td>
                        <td>{u.sucursal || 'Global'}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
