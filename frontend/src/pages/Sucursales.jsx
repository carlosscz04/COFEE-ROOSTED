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
  path: '/sucursales',
  label: 'Sucursales',
  icon: '🏪',
  order: 96,
  roles: ['admin']
};

export default function Sucursales() {
  const { data: sucursales, loading, error: loadError, reload } = useApi('/sucursales');
  const [nombre, setNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [exitoMsg, setExitoMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setExitoMsg('');
    setGuardando(true);

    try {
      await api('/sucursales', {
        method: 'POST',
        body: { nombre, direccion }
      });
      setNombre('');
      setDireccion('');
      setExitoMsg('Sucursal creada exitosamente con sus correlativos e inventario inicial.');
      reload();
    } catch (err) {
      setErrorMsg(err.message || 'No se pudo crear la sucursal.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div>
      <PageHeader
        titulo="Administración de Sucursales"
        subtitulo="Registro de puntos de venta, inicialización de correlativos fiscales e inventario base"
      />

      <Row className="g-4">
        <Col md={4}>
          <Card className="shadow-sm">
            <CardHeader className="fw-bold">Nueva Sucursal</CardHeader>
            <CardBody>
              {errorMsg && <Alert color="danger">{errorMsg}</Alert>}
              {exitoMsg && <Alert color="success">{exitoMsg}</Alert>}

              <Form onSubmit={handleSubmit}>
                <FormGroup>
                  <Label for="suc-nombre">Nombre de Sucursal *</Label>
                  <Input
                    id="suc-nombre"
                    type="text"
                    placeholder="Ej. Sucursal Santa Tecla"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    required
                  />
                </FormGroup>

                <FormGroup>
                  <Label for="suc-direccion">Dirección</Label>
                  <Input
                    id="suc-direccion"
                    type="text"
                    placeholder="Ej. Paseo El Carmen, Local 4"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                  />
                </FormGroup>

                <Button color="primary" type="submit" block disabled={guardando}>
                  {guardando ? 'Guardando...' : 'Crear Sucursal'}
                </Button>
              </Form>
            </CardBody>
          </Card>
        </Col>

        <Col md={8}>
          <Card className="shadow-sm">
            <CardHeader className="fw-bold">Sucursales Registradas</CardHeader>
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
                      <th>Dirección</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(sucursales || []).map((suc) => (
                      <tr key={suc.id}>
                        <td>{suc.id}</td>
                        <td className="fw-semibold">{suc.nombre}</td>
                        <td>{suc.direccion || '—'}</td>
                        <td>
                          <Badge color={suc.activa !== false ? 'success' : 'secondary'}>
                            {suc.activa !== false ? 'Activa' : 'Inactiva'}
                          </Badge>
                        </td>
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
