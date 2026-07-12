import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../api/AuthContext';

const FEATURES = [
  ['Real-time', 'Dispatch tracking'],
  ['Automated', 'Business rules'],
  ['Role-based', 'Access control']
];

const ROLES = [
  ['Fleet Manager', 'Fleet, Maintenance'],
  ['Dispatcher', 'Dashboard, Trips'],
  ['Safety Officer', 'Drivers, Compliance'],
  ['Financial Analyst', 'Fuel & Expenses, Analytics']
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.brandPanel}>
        <svg viewBox="0 0 400 500" style={styles.routeSvg} aria-hidden="true">
          <path
            className="fp-route-path"
            d="M60,60 C130,90 150,130 220,170 S 80,250 120,300 S 250,340 300,380"
            fill="none"
            stroke="var(--border-strong)"
            strokeWidth="1.5"
            strokeDasharray="6 6"
            strokeLinecap="round"
          />
          <circle cx="60" cy="60" r="4.5" fill="var(--accent)" />
          <circle cx="220" cy="170" r="4.5" fill="var(--status-ontrip)" />
          <circle cx="120" cy="300" r="4.5" fill="var(--status-available)" />
          <circle cx="300" cy="380" r="4.5" fill="var(--accent)" />
        </svg>

        <div style={styles.liveBadge}>
          <span className="fp-live-dot" />
          <span>Live ops</span>
        </div>

        <div style={styles.brandContent}>
          <div style={styles.brandMark}>
            <span style={styles.brandDot} />
            <span style={styles.brandWord}>FleetPulse</span>
          </div>
          <p style={styles.brandTag}>Smart transport operations platform</p>

          <div style={styles.statStrip}>
            {FEATURES.map(([value, label], i) => (
              <div key={label} style={{ ...styles.statItem, borderLeft: i === 0 ? 'none' : '1px solid var(--border)' }}>
                <div style={styles.statValue}>{value}</div>
                <div style={styles.statLabel}>{label}</div>
              </div>
            ))}
          </div>

          <div style={styles.roleMap}>
            <div style={styles.roleMapLabel}>One login &middot; four roles</div>
            {ROLES.map(([role, access]) => (
              <div key={role} style={styles.roleRow}>
                <span style={styles.roleName}>{role}</span>
                <span style={styles.roleAccess}>{access}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.brandFooter}>FleetPulse &copy; 2026 &middot; RBAC enabled</div>
      </div>

      <div style={styles.formPanel}>
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formHeader}>Sign in</div>
          <p style={styles.formSub}>Enter your credentials to access the dispatch board.</p>

          <label style={styles.label}>Email</label>
          <input
            className="fp-input"
            style={styles.input}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label style={styles.label}>Password</label>
          <input
            className="fp-input"
            style={styles.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <p className="fp-error" style={{ marginTop: 4 }}>{error}</p>}

          <button className="fp-btn fp-btn-primary" style={styles.submitBtn} type="submit">
            Sign in
          </button>

          <p style={styles.hint} className="fp-mono">
            Demo — fleetmanager@fleetpulse.in / password123
          </p>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', background: 'var(--bg)' },
  brandPanel: {
    flex: '0 0 46%',
    position: 'relative',
    borderRight: '1px solid var(--border)',
    background: 'var(--surface)',
    backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)',
    backgroundSize: '22px 22px',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center'
  },
  routeSvg: { position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.35 },
  liveBadge: {
    position: 'absolute', top: 24, right: 28, zIndex: 1,
    display: 'flex', alignItems: 'center', gap: 8,
    fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)',
    textTransform: 'uppercase', letterSpacing: '0.08em'
  },
  brandFooter: {
    position: 'absolute', bottom: 24, left: 48, zIndex: 1,
    fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-muted)'
  },
  brandContent: { position: 'relative', padding: '0 48px', zIndex: 1, width: '100%' },
  brandMark: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  brandDot: { width: 11, height: 11, borderRadius: 2, background: 'var(--accent)', display: 'inline-block' },
  brandWord: {
    fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 32,
    letterSpacing: '0.02em', textTransform: 'uppercase', color: 'var(--text-primary)'
  },
  brandTag: { color: 'var(--text-secondary)', fontSize: 13.5, marginTop: 0, marginBottom: 28 },

  statStrip: { display: 'flex', marginBottom: 28 },
  statItem: { flex: 1, paddingLeft: 16, paddingRight: 16 },
  statValue: {
    fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15.5,
    letterSpacing: '0.01em', color: 'var(--accent-strong)', lineHeight: 1.3
  },
  statLabel: {
    fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase',
    letterSpacing: '0.04em', color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4
  },

  roleMap: { borderTop: '1px solid var(--border)', paddingTop: 18 },
  roleMapLabel: {
    fontFamily: 'var(--font-mono)', fontSize: 10.5, textTransform: 'uppercase',
    letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 12
  },
  roleRow: { display: 'grid', gridTemplateColumns: '148px 1fr', columnGap: 16, padding: '6px 0', fontSize: 12.5 },
  roleName: { color: 'var(--text-primary)' },
  roleAccess: { color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 11.5, textAlign: 'right' },

  formPanel: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  form: { width: 320, display: 'flex', flexDirection: 'column' },
  formHeader: {
    fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--text-primary)'
  },
  formSub: { color: 'var(--text-secondary)', fontSize: 13, marginTop: 6, marginBottom: 28 },
  label: {
    fontFamily: 'var(--font-mono)', fontSize: 10.5, textTransform: 'uppercase',
    letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 6, marginTop: 16
  },
  input: { width: '100%' },
  submitBtn: { marginTop: 24, width: '100%', padding: '11px 0', fontSize: 13.5 },
  hint: { marginTop: 24, fontSize: 11, color: 'var(--text-muted)' }
};
