import { jsx as _jsx } from "react/jsx-runtime";
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useMe } from '../hooks/useAuth';
export function ProtectedRoute() {
    const { data, isLoading } = useMe();
    const location = useLocation();
    if (isLoading)
        return _jsx("div", { className: "loading", children: "cargando\u2026" });
    if (!data)
        return _jsx(Navigate, { to: "/login", state: { from: location.pathname }, replace: true });
    return _jsx(Outlet, {});
}
