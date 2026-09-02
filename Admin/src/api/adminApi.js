import { api } from './client';

export const adminApi = {
  // Auth
  login: async (username, password) => {
    const res = await api.post('/api/auth/admin-login', { username, password });
    return res.data;
  },

  changePassword: async (oldPassword, newPassword) => {
    const res = await api.post('/api/admin/change-password', { oldPassword, newPassword });
    return res.data;
  },

  // Dashboard & Analytics
  getMetrics: async () => {
    const res = await api.get('/api/admin/metrics');
    return res.data;
  },

  getAnalytics: async (period = '7d') => {
    const res = await api.get(`/api/admin/analytics?period=${period}`);
    return res.data;
  },

  // Users
  getUsers: async (search = '') => {
    const res = await api.get('/api/admin/users', { params: search ? { search } : {} });
    return res.data;
  },

  getUserDetails: async (userId) => {
    const res = await api.get(`/api/admin/users/${userId}`);
    return res.data;
  },

  updateUserBalance: async (userId, { action, amount }) => {
    const res = await api.post(`/api/admin/users/${userId}/balance`, { action, amount });
    return res.data;
  },

  toggleUserBan: async (userId) => {
    const res = await api.post(`/api/admin/users/${userId}/ban`);
    return res.data;
  },

  // Deposits
  getDeposits: async () => {
    const res = await api.get('/api/admin/deposits');
    return res.data;
  },

  approveDeposit: async (id) => {
    const res = await api.post(`/api/admin/deposits/${id}/approve`);
    return res.data;
  },

  rejectDeposit: async (id, reason = '') => {
    const res = await api.post(`/api/admin/deposits/${id}/reject`, { reason });
    return res.data;
  },

  deleteDeposit: async (id) => {
    const res = await api.delete(`/api/admin/deposits/${id}`);
    return res.data;
  },

  // Withdrawals
  getWithdrawals: async () => {
    const res = await api.get('/api/admin/withdrawals');
    return res.data;
  },

  approveWithdrawal: async (id) => {
    const res = await api.post(`/api/admin/withdrawals/${id}/approve`);
    return res.data;
  },

  rejectWithdrawal: async (id, reason = '') => {
    const res = await api.post(`/api/admin/withdrawals/${id}/reject`, { reason });
    return res.data;
  },

  deleteWithdrawal: async (id) => {
    const res = await api.delete(`/api/admin/withdrawals/${id}`);
    return res.data;
  },

  // Promo Codes
  getPromos: async () => {
    const res = await api.get('/api/admin/promo/list');
    return res.data;
  },

  createPromo: async ({ code, rewardAmount, maxUses, expiresAt, requireDeposit, minDepositAmount }) => {
    const res = await api.post('/api/admin/promo/create', {
      code,
      rewardAmount,
      maxUses,
      expiresAt,
      requireDeposit: !!requireDeposit,
      minDepositAmount: requireDeposit ? minDepositAmount : null,
    });
    return res.data;
  },

  togglePromo: async (id, isActive) => {
    const res = await api.post(`/api/admin/promo/${id}/toggle`, { isActive });
    return res.data;
  },

  deletePromo: async (id) => {
    const res = await api.delete(`/api/admin/promo/${id}`);
    return res.data;
  },

  // Broadcast
  sendBroadcast: async (target, message) => {
    const res = await api.post('/api/admin/broadcast', { target, message });
    return res.data;
  },

  // Dynamic Tasks
  getTasks: async () => {
    const res = await api.get('/api/admin/tasks');
    return res.data;
  },

  createTask: async ({ title, description, reward_amount, task_type, target_url, action_label, is_active }) => {
    const res = await api.post('/api/admin/tasks', {
      title,
      description,
      reward_amount,
      task_type,
      target_url,
      action_label,
      is_active
    });
    return res.data;
  },

  updateTask: async (id, fields) => {
    const res = await api.put(`/api/admin/tasks/${id}`, fields);
    return res.data;
  },

  deleteTask: async (id) => {
    const res = await api.delete(`/api/admin/tasks/${id}`);
    return res.data;
  },

  // Maintenance
  getMaintenance: async () => {
    const res = await api.get('/api/admin/maintenance');
    return res.data;
  },

  setMaintenance: async (enabled, message, password = '') => {
    const res = await api.post('/api/admin/maintenance', { enabled, message, password });
    return res.data;
  },
};
