export const API_BASE = (import.meta.env.VITE_API_URL || 'https://bingo2019-production.up.railway.app').replace(/\/+$/, '');

/**
 * Drop-in fetch() wrapper that prepends the production API URL.
 * Usage: apiFetch('/api/game/buy-ticket', { method: 'POST', headers, body })
 */
export async function apiFetch(path, options = {}) {
  return fetch(`${API_BASE}${path}`, options);
}

/**
 * Socket.io server URL.
 */
export const SOCKET_URL = API_BASE;

