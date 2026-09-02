import { io } from 'socket.io-client';

const BACKEND_URL = (import.meta.env.VITE_API_URL || 'https://bingo2019-production.up.railway.app').replace(/\/+$/, '');

export const socket = io(BACKEND_URL, {
  transports: ['websocket', 'polling'],
  path: '/socket.io'
});

export default socket;

