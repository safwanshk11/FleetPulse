// AuthContext.jsx — holds the logged-in user + role app-wide.
// Any component can read the current role with useAuth() to decide
// what to show, e.g. hiding "Add Vehicle" unless role === 'FleetManager'.

import { createContext, useContext, useState } from 'react';
import client from './client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('fleetpulse_user');
    return raw ? JSON.parse(raw) : null;
  });

  async function login(email, password) {
    const res = await client.post('/auth/login', { email, password });
    localStorage.setItem('fleetpulse_token', res.data.token);
    localStorage.setItem('fleetpulse_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  }

  function logout() {
    localStorage.removeItem('fleetpulse_token');
    localStorage.removeItem('fleetpulse_user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
