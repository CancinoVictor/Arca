import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Gallery } from './pages/Gallery';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Trash } from './pages/Trash';
import { Upload } from './pages/Upload';
export function App() {
    return (_jsx(BrowserRouter, { children: _jsx(Routes, { children: _jsxs(Route, { element: _jsx(Layout, {}), children: [_jsx(Route, { path: "/login", element: _jsx(Login, {}) }), _jsx(Route, { path: "/register", element: _jsx(Register, {}) }), _jsxs(Route, { element: _jsx(ProtectedRoute, {}), children: [_jsx(Route, { path: "/", element: _jsx(Gallery, {}) }), _jsx(Route, { path: "/upload", element: _jsx(Upload, {}) }), _jsx(Route, { path: "/trash", element: _jsx(Trash, {}) })] })] }) }) }));
}
