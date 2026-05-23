import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLogin, useMe, useRegister } from '../hooks/useAuth';
export function Register() {
    const { data: user } = useMe();
    const navigate = useNavigate();
    const register = useRegister();
    const login = useLogin();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    if (user) {
        navigate('/', { replace: true });
        return null;
    }
    async function onSubmit(e) {
        e.preventDefault();
        const trimmed = username.trim();
        await register.mutateAsync({ username: trimmed, password });
        await login.mutateAsync({ username: trimmed, password });
        navigate('/', { replace: true });
    }
    const busy = register.isPending || login.isPending;
    const error = (register.error ?? login.error);
    return (_jsxs("div", { className: "auth-card", children: [_jsx("h1", { children: "crear cuenta" }), _jsxs("form", { onSubmit: onSubmit, children: [_jsxs("label", { children: [_jsx("span", { children: "username" }), _jsx("input", { value: username, onChange: (e) => setUsername(e.target.value), autoComplete: "username", autoCapitalize: "off", minLength: 3, maxLength: 64, required: true })] }), _jsxs("label", { children: [_jsx("span", { children: "password (m\u00EDn. 8)" }), _jsx("input", { type: "password", value: password, onChange: (e) => setPassword(e.target.value), autoComplete: "new-password", minLength: 8, required: true })] }), _jsx("button", { type: "submit", disabled: busy, children: busy ? '…' : 'crear cuenta' }), error && _jsx("p", { className: "err", children: error.message })] }), _jsxs("p", { className: "footer-link", children: ["\u00BFya tienes cuenta? ", _jsx(Link, { to: "/login", children: "entrar" })] })] }));
}
