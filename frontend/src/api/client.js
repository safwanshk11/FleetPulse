// client.js — one axios instance shared by every page.
// Attaches the JWT from localStorage to every request automatically,
// so page components never have to think about auth headers.

import axios from 'axios';

const client = axios.create({ baseURL: '/api' });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('fleetpulse_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('fleetpulse_token');
      localStorage.removeItem('fleetpulse_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default client;
