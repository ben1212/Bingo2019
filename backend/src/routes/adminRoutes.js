const express = require('express');
const router = express.Router();
const { get, run, all, supabase } = require('../db');

// Middleware to verify admin token
function requireAdmin(req, res, next) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: 'Access denied. Admin rights required.' });
  }
  next();
}

// 1. Change Password (admin credentials are environmental / in-memory)
router.post('/change-password', requireAdmin, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const currentAdminPass = (process.env.ADMIN_PASSWORD || 'Admin@Bingo2019!').trim();
    if (oldPassword !== currentAdminPass) {
      return res.status(400).json({ error: 'Current password incorrect' });
    }

    process.env.ADMIN_PASSWORD = newPassword;
    res.json({ success: true, message: 'Admin password updated successfully for the session' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Dashboard Metrics
router.get('/metrics', requireAdmin, async (req, res) => {
  try {
    const { count: totalUsers } = await supabase.from('users').select('*', { count: 'exact', head: true });
    const { count: pendingDeposits } = await supabase.from('deposits').select('*', { count: 'exact', head: true }).eq('status', 'pending');
    const { count: pendingWithdrawals } = await supabase.from('withdrawals').select('*', { count: 'exact', head: true }).eq('status', 'pending');
    const { count: totalRounds } = await supabase.from('game_rounds').select('*', { count: 'exact', head: true });

    const { data: depositSums } = await supabase.from('deposits').select('amount').eq('status', 'approved');
    const totalDeposited = (depositSums || []).reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);

    const { data: withdrawSums } = await supabase.from('withdrawals').select('amount').eq('status', 'approved');
    const totalWithdrawn = (withdrawSums || []).reduce((sum, w) => sum + (parseFloat(w.amount) || 0), 0);

    res.json({
      totalUsers: totalUsers || 0,
      activeUsers: Math.max(1, Math.floor((totalUsers || 0) * 0.4)),
      totalDeposited,
      totalWithdrawn,
      pendingDeposits: pendingDeposits || 0,
      pendingWithdrawals: pendingWithdrawals || 0,
      totalRounds: totalRounds || 0,
      houseRevenue: Math.max(0, totalDeposited - totalWithdrawn)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Analytics Chart Data
router.get('/analytics', requireAdmin, async (req, res) => {
  try {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const chartData = days.map((day, i) => ({
      name: day,
      deposits: Math.floor(Math.random() * 5000) + 1000,
      withdrawals: Math.floor(Math.random() * 3000) + 500,
      revenue: Math.floor(Math.random() * 2000) + 500
    }));
    res.json(chartData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Users List & Search
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const search = req.query.search ? String(req.query.search).trim() : '';
    let query = supabase.from('users').select('*').order('id', { ascending: false }).limit(100);

    if (search) {
      query = query.or(`username.ilike.%${search}%,phone.ilike.%${search}%,telegram_id.ilike.%${search}%`);
    }

    const { data: users, error } = await query;
    if (error) throw error;
    res.json(users || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. User Details
router.get('/users/:id', requireAdmin, async (req, res) => {
  try {
    const user = await get('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { data: deposits } = await supabase.from('deposits').select('*').eq('user_id', user.id).order('id', { ascending: false }).limit(10);
    const { data: withdrawals } = await supabase.from('withdrawals').select('*').eq('user_id', user.id).order('id', { ascending: false }).limit(10);

    res.json({
      user,
      deposits: deposits || [],
      withdrawals: withdrawals || []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Update User Balance (Credit / Debit)
router.post('/users/:id/balance', requireAdmin, async (req, res) => {
  try {
    const { action, amount } = req.body;
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return res.status(400).json({ error: 'Valid amount required' });

    const user = await get('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let currentBal = parseFloat(user.balance) || 0;
    let currentWith = parseFloat(user.withdrawable_balance) || 0;

    if (action === 'credit') {
      currentBal += numAmount;
      currentWith += numAmount;
    } else if (action === 'debit') {
      if (currentBal < numAmount) return res.status(400).json({ error: 'Insufficient balance to deduct' });
      currentBal -= numAmount;
      currentWith = Math.max(0, currentWith - numAmount);
    } else {
      return res.status(400).json({ error: 'Invalid action (must be credit or debit)' });
    }

    await run('UPDATE users SET balance = ?, withdrawable_balance = ? WHERE id = ?', [currentBal, currentWith, user.id]);
    res.json({ success: true, balance: currentBal, withdrawableBalance: currentWith });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Toggle User Ban
router.post('/users/:id/ban', requireAdmin, async (req, res) => {
  try {
    const user = await get('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const newBanStatus = !user.is_banned;
    await run('UPDATE users SET is_banned = ? WHERE id = ?', [newBanStatus, user.id]);
    res.json({ success: true, is_banned: newBanStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Deposits Management
router.get('/deposits', requireAdmin, async (req, res) => {
  try {
    const { data: deposits, error } = await supabase.from('deposits').select('*, users(username, phone)').order('id', { ascending: false }).limit(100);
    if (error) throw error;
    res.json(deposits || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/deposits/:id/approve', requireAdmin, async (req, res) => {
  try {
    const deposit = await get('SELECT * FROM deposits WHERE id = ?', [req.params.id]);
    if (!deposit) return res.status(404).json({ error: 'Deposit record not found' });
    if (deposit.status === 'approved') return res.status(400).json({ error: 'Deposit is already approved' });

    const amount = parseFloat(deposit.amount) || 0;
    const user = await get('SELECT * FROM users WHERE id = ?', [deposit.user_id]);

    if (user) {
      const newBal = (parseFloat(user.balance) || 0) + amount;
      const newWith = (parseFloat(user.withdrawable_balance) || 0) + amount;
      await run('UPDATE users SET balance = ?, withdrawable_balance = ?, has_deposited = ? WHERE id = ?', [newBal, newWith, true, user.id]);
    }

    await supabase.from('deposits').update({ status: 'approved', updated_at: new Date().toISOString() }).eq('id', deposit.id);
    res.json({ success: true, message: 'Deposit approved successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/deposits/:id/reject', requireAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    await supabase.from('deposits').update({ status: 'rejected', reject_reason: reason || 'Deposit rejected by admin', updated_at: new Date().toISOString() }).eq('id', req.params.id);
    res.json({ success: true, message: 'Deposit rejected' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/deposits/:id', requireAdmin, async (req, res) => {
  try {
    await supabase.from('deposits').delete().eq('id', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Withdrawals Management
router.get('/withdrawals', requireAdmin, async (req, res) => {
  try {
    const { data: withdrawals, error } = await supabase.from('withdrawals').select('*, users(username, phone)').order('id', { ascending: false }).limit(100);
    if (error) throw error;
    res.json(withdrawals || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/withdrawals/:id/approve', requireAdmin, async (req, res) => {
  try {
    await supabase.from('withdrawals').update({ status: 'approved', updated_at: new Date().toISOString() }).eq('id', req.params.id);
    res.json({ success: true, message: 'Withdrawal approved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/withdrawals/:id/reject', requireAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const withdrawal = await get('SELECT * FROM withdrawals WHERE id = ?', [req.params.id]);
    if (!withdrawal) return res.status(404).json({ error: 'Withdrawal not found' });

    // Refund funds back to user
    const amount = parseFloat(withdrawal.amount) || 0;
    const user = await get('SELECT * FROM users WHERE id = ?', [withdrawal.user_id]);
    if (user) {
      const newBal = (parseFloat(user.balance) || 0) + amount;
      const newWith = (parseFloat(user.withdrawable_balance) || 0) + amount;
      await run('UPDATE users SET balance = ?, withdrawable_balance = ? WHERE id = ?', [newBal, newWith, user.id]);
    }

    await supabase.from('withdrawals').update({ status: 'rejected', reject_reason: reason || 'Rejected by admin', updated_at: new Date().toISOString() }).eq('id', withdrawal.id);
    res.json({ success: true, message: 'Withdrawal rejected and refunded' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/withdrawals/:id', requireAdmin, async (req, res) => {
  try {
    await supabase.from('withdrawals').delete().eq('id', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Promo Codes
router.get('/promo/list', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase.from('promo_codes').select('*').order('id', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/promo/create', requireAdmin, async (req, res) => {
  try {
    const { code, rewardAmount, maxUses, expiresAt } = req.body;
    if (!code || !rewardAmount) return res.status(400).json({ error: 'Code and reward amount required' });

    const { data, error } = await supabase.from('promo_codes').insert({
      code: String(code).trim().toUpperCase(),
      reward_amount: parseFloat(rewardAmount),
      max_uses: parseInt(maxUses) || 100,
      times_used: 0,
      expires_at: expiresAt || null,
      is_active: true
    }).select().single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/promo/:id/toggle', requireAdmin, async (req, res) => {
  try {
    const { isActive } = req.body;
    await supabase.from('promo_codes').update({ is_active: !!isActive }).eq('id', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/promo/:id', requireAdmin, async (req, res) => {
  try {
    await supabase.from('promo_codes').delete().eq('id', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 11. Broadcast
router.post('/broadcast', requireAdmin, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });

    const gameEngine = require('../gameEngine');
    if (gameEngine.io) {
      gameEngine.io.emit('broadcast_message', { message });
    }
    res.json({ success: true, message: 'Broadcast sent successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 12. Maintenance Mode
router.get('/maintenance', requireAdmin, async (req, res) => {
  const gameEngine = require('../gameEngine');
  res.json({
    enabled: gameEngine.isMaintenance,
    message: gameEngine.maintenanceMessage
  });
});

router.post('/maintenance', requireAdmin, async (req, res) => {
  try {
    const { enabled, message } = req.body;
    const gameEngine = require('../gameEngine');
    gameEngine.isMaintenance = !!enabled;
    gameEngine.maintenanceMessage = message || '';

    if (gameEngine.io) {
      if (enabled) {
        gameEngine.io.emit('maintenance_on', { message });
      } else {
        gameEngine.io.emit('maintenance_off');
      }
      gameEngine.broadcastState();
    }
    res.json({ success: true, enabled: gameEngine.isMaintenance, message: gameEngine.maintenanceMessage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
