// ============================================================
// socket.js — Real-time Socket.IO Client for Admin Portal
// Handles instant server pushes for deposits, withdrawals, users
// ============================================================

import { io } from 'socket.io-client';

const rawURL = import.meta.env.VITE_API_URL || 'https://bingo2019-production.up.railway.app';
const socketURL = rawURL ? rawURL.replace(/\/+$/, '') : (typeof window !== 'undefined' ? window.location.origin : '');

let socket = null;
let currentHandler = null;

export function initAdminSocket(onEvent) {
  currentHandler = onEvent;

  if (socket) {
    if (socket.connected && onEvent) {
      onEvent('connected', { socketId: socket.id });
    }
    return socket;
  }

  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('bingo_admin_token') : null;

  socket = io(socketURL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    auth: {
      token: token || ''
    }
  });

  socket.on('connect', () => {
    console.log('[AdminSocket] Connected with ID:', socket.id);
    if (currentHandler) currentHandler('connected', { socketId: socket.id });
  });

  socket.on('disconnect', (reason) => {
    console.log('[AdminSocket] Disconnected:', reason);
    if (currentHandler) currentHandler('disconnected', { reason });
  });

  socket.on('connect_error', (err) => {
    console.warn('[AdminSocket] Connection error:', err.message);
  });

  // Backend real-time admin events
  socket.on('admin_data_changed', (payload) => {
    if (currentHandler) currentHandler('admin_data_changed', payload);
  });

  socket.on('admin_new_deposit', (deposit) => {
    if (currentHandler) currentHandler('admin_new_deposit', deposit);
  });

  socket.on('admin_new_withdrawal', (withdrawal) => {
    if (currentHandler) currentHandler('admin_new_withdrawal', withdrawal);
  });

  socket.on('user_registered', (user) => {
    if (currentHandler) currentHandler('user_registered', user);
  });

  return socket;
}

export function getAdminSocket() {
  return socket;
}

export function disconnectAdminSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
