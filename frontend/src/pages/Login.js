import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useLogin, useMe } from '../hooks/useAuth';
export function Login() {
    const { data: user, isLoading } = useMe();
    const location = useLocation();
    const state = location.state;
    const login = useLogin();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    if (isLoading)
        return _jsx("div", { className: "loading", children: "cargando\u2026" });
    if (user)
        return _jsx(Navigate, { to: state?.from ?? '/', replace: true });
    function onSubmit(e) {
        e.preventDefault();
        login.mutate({ username: username.trim(), password });
    }
    return (_jsxs("div", { className: "auth-card", children: [_jsx("h1", { children: "arca" }), _jsx("p", { className: "subtitle", children: "tu b\u00F3veda de fotos y videos" }), _jsxs("form", { onSubmit: onSubmit, children: [_jsxs("label", { children: [_jsx("span", { children: "username" }), _jsx("input", { value: username, onChange: (e) => setUsername(e.target.value), autoComplete: "username", autoCapitalize: "off", required: true })] }), _jsxs("label", { children: [_jsx("span", { children: "password" }), _jsx("input", { type: "password", value: password, onChange: (e) => setPassword(e.target.value), autoComplete: "current-password", required: true })] }), _jsx("button", { type: "submit", disabled: login.isPending, children: login.isPending ? '…' : 'sign in' }), login.error && _jsx("p", { className: "err", children: login.error.message })] }), _jsxs("p", { className: "footer-link", children: ["\u00BFsin cuenta? ", _jsx(Link, { to: "/register", children: "crear una" })] })] }));
}
