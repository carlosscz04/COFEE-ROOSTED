import { Alert, Spinner } from 'reactstrap';

export default function Cargando({ loading, error, children }) {
  if (loading) return <div className="text-center py-5"><Spinner color="primary" /></div>;
  if (error) return <Alert color="danger">{error}</Alert>;
  return children;
}