import { Link, NavLink, Outlet } from 'react-router-dom';
import { useLogout, useMe } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { Icon } from './Icon';

export function Layout() {
  const { data: user } = useMe();
  const logout = useLogout();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className={user ? 'app has-bottombar' : 'app'}>
      <header className="topbar">
        <div className="topbar__left">
          <Link to="/" className="brand">arca</Link>
        </div>

        <div className="topbar__right">
          <button
            type="button"
            className="theme-switch"
            role="switch"
            aria-checked={theme === 'dark'}
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            onClick={toggleTheme}
          >
            <span className="theme-switch__track" aria-hidden="true">
              <span className="theme-switch__thumb" aria-hidden="true" />
            </span>
          </button>

          {user ? (
            <>
              <nav className="topnav" aria-label="Navegación">
                <NavLink to="/" end className={({ isActive }) => isActive ? 'topnav__link active' : 'topnav__link'}>
                  biblioteca
                </NavLink>
                <NavLink to="/upload" className={({ isActive }) => isActive ? 'topnav__link active' : 'topnav__link'}>
                  subir
                </NavLink>
                <NavLink to="/trash" className={({ isActive }) => isActive ? 'topnav__link active' : 'topnav__link'}>
                  papelera
                </NavLink>
              </nav>

              <span className="user-chip" title={user.username}>{user.username}</span>
              <button
                className="icon-btn"
                onClick={() => logout.mutate()}
                disabled={logout.isPending}
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
                type="button"
              >
                {logout.isPending ? '…' : 'salir'}
              </button>
            </>
          ) : (
            <Link to="/login" className="btn">entrar</Link>
          )}
        </div>
      </header>

      <main className="content"><Outlet /></main>

      {user && (
        <nav className="bottombar" aria-label="Navegación principal">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'bottombar__item active' : 'bottombar__item'}>
            {({ isActive }) => (
              <>
                <Icon name="library" size={24} style={{ opacity: isActive ? 1 : 0.85 }} />
                <span>biblioteca</span>
              </>
            )}
          </NavLink>
          <NavLink to="/upload" className={({ isActive }) => isActive ? 'bottombar__item active' : 'bottombar__item'}>
            {({ isActive }) => (
              <>
                <Icon name="upload" size={24} style={{ opacity: isActive ? 1 : 0.85 }} />
                <span>subir</span>
              </>
            )}
          </NavLink>
          <NavLink to="/trash" className={({ isActive }) => isActive ? 'bottombar__item active' : 'bottombar__item'}>
            {({ isActive }) => (
              <>
                <Icon name="trash" size={24} style={{ opacity: isActive ? 1 : 0.85 }} />
                <span>papelera</span>
              </>
            )}
          </NavLink>
        </nav>
      )}
    </div>
  );
}
