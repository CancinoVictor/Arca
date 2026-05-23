import { FormEvent, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useLogin, useMe } from '../hooks/useAuth';

type LocationState = { from?: string };

export function Login() {
  const { data: user, isLoading } = useMe();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const login = useLogin();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  if (isLoading) return <div className="loading">cargando…</div>;
  if (user) return <Navigate to={state?.from ?? '/'} replace />;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    login.mutate({ username: username.trim(), password });
  }

  return (
    <div className="auth-card">
      <h1>arca</h1>
      <p className="subtitle">tu bóveda de fotos y videos</p>
      <form onSubmit={onSubmit}>
        <label>
          <span>username</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoCapitalize="off"
            required
          />
        </label>
        <label>
          <span>password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <button type="submit" disabled={login.isPending}>
          {login.isPending ? '…' : 'sign in'}
        </button>
        {login.error && <p className="err">{(login.error as Error).message}</p>}
      </form>
      <p className="footer-link">¿sin cuenta? <Link to="/register">crear una</Link></p>
    </div>
  );
}
