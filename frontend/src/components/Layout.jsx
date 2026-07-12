import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../api/AuthContext';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/vehicles', label: 'Fleet' },
  { to: '/drivers', label: 'Drivers' },
  { to: '/trips', label: 'Trips' },
  { to: '/maintenance', label: 'Maintenance' },
  { to: '/fuel-expenses', label: 'Fuel & Expenses' },
  { to: '/analytics', label: 'Analytics' }
];

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="fp-app">
      <div className="fp-shell">
        <aside className="fp-sidebar">
          <div className="fp-logo">
            <span className="fp-logo-mark" />
            <span className="fp-logo-text">FleetPulse</span>
          </div>
          <nav className="fp-nav">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `fp-nav-link${isActive ? ' active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <header className="fp-topbar">
            <div className="fp-live">
              <span className="fp-live-dot" />
              Live ops
            </div>
            <div className="fp-user">
              <span className="fp-user-name">{user?.name}</span>
              <span className="fp-role-pill">{user?.role}</span>
              <button className="fp-logout" onClick={logout}>Log out</button>
            </div>
          </header>
          <div className="fp-content">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
