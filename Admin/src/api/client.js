import axios from 'axios';

const rawURL = import.meta.env.VITE_API_URL || 'https://bingo2019-production.up.railway.app';
const baseURL = rawURL ? rawURL.replace(/\/+$/, '') : '';

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor to attach JWT admin token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('bingo_admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for automatic 401 handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('bingo_admin_token');
        localStorage.removeItem('bingo_admin_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
