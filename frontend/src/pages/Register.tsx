import { FormEvent, useState } from 'react';
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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = username.trim();
    await register.mutateAsync({ username: trimmed, password });
    await login.mutateAsync({ username: trimmed, password });
    navigate('/', { replace: true });
  }

  const busy = register.isPending || login.isPending;
  const error = (register.error ?? login.error) as Error | null;

  return (
    <div className="auth-card">
      <h1>crear cuenta</h1>
      <form onSubmit={onSubmit}>
        <label>
          <span>username</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoCapitalize="off"
            minLength={3}
            maxLength={64}
            required
          />
        </label>
        <label>
          <span>password (mín. 8)</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>
        <button type="submit" disabled={busy}>
          {busy ? '…' : 'crear cuenta'}
        </button>
        {error && <p className="err">{error.message}</p>}
      </form>
      <p className="footer-link">¿ya tienes cuenta? <Link to="/login">entrar</Link></p>
    </div>
  );
}
