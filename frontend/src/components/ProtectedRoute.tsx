import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useMe } from '../hooks/useAuth';

export function ProtectedRoute() {
  const { data, isLoading } = useMe();
  const location = useLocation();
  if (isLoading) return <div className="loading">cargando…</div>;
  if (!data) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return <Outlet />;
}
