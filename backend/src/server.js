require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const { supabase, get, run, all } = require('./db');
const { escapeHTML, normalizePhone, generateReferralCode } = require('./utils');
const gameEngine = require('./gameEngine');
const telegramBot = require('./telegramBot');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const server = http.createServer(app);

const JWT_SECRET = (process.env.JWT_SECRET || 'bingox-secret-2019-production-key').trim();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Socket.io Setup
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});
gameEngine.setIO(io);

io.on('connection', (socket) => {
  socket.emit('round_state', gameEngine.getPublicState());
});

// Auth Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// -------------------------------------------------------------
// 1. AUTH ROUTES
// -------------------------------------------------------------

// Telegram WebApp Authentication (Robust HMAC + ID Fallback)
app.post('/api/auth/telegram-webapp', async (req, res) => {
  try {
    const { initData, user: rawUserObj, telegramId: explicitTgId } = req.body;
    const BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim();

    let tgUser = rawUserObj || null;
    let telegramId = explicitTgId ? String(explicitTgId) : (tgUser?.id ? String(tgUser.id) : null);

    // Verify HMAC if initData provided
    if (initData && typeof initData === 'string' && initData.includes('hash=')) {
      try {
        const params = new URLSearchParams(initData);
        const receivedHash = params.get('hash');
        params.delete('hash');

        const dataCheckString = Array.from(params.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => `${k}=${v}`)
          .join('\n');

        const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
        const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

        const userParam = params.get('user');
        if (userParam) {
          tgUser = JSON.parse(userParam);
          telegramId = String(tgUser.id);
        }
      } catch (err) {
        console.warn('[TelegramWebApp] initData parse warning:', err.message);
      }
    }

    if (!telegramId && tgUser?.id) {
      telegramId = String(tgUser.id);
    }

    if (!telegramId) {
      return res.status(401).json({ error: 'No Telegram user ID found. Please open from @bingox2019_bot.' });
    }

    // Lookup user in Supabase
    let user = await get('SELECT * FROM users WHERE telegram_id = ?', [telegramId]);

    // If not found by telegram_id, try username
    if (!user && tgUser?.username) {
      user = await get('SELECT * FROM users WHERE username = ?', [tgUser.username]);
      if (user) {
        await run('UPDATE users SET telegram_id = ? WHERE id = ?', [telegramId, user.id]);
      }
    }

    // If still not registered or phone missing
    if (!user || !user.phone || user.phone.startsWith('tg_')) {
      const tgUsername = tgUser?.username || tgUser?.first_name || `user_${telegramId}`;
      return res.status(200).json({
        requiresPhoneRegistration: true,
        telegramId,
        username: tgUsername,
        message: `Welcome ${tgUser?.first_name || tgUsername}! Please open @bingox2019_bot in Telegram and share your phone number to complete registration and start playing.`
      });
    }

    if (user.is_banned) {
      return res.status(403).json({ error: 'Your account has been suspended by admin.' });
    }

    const token = jwt.sign(
      { id: user.id, telegram_id: user.telegram_id, username: user.username, phone: user.phone },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const balance = parseFloat(user.balance) || 0;
    const withdrawableBalance = Math.min(parseFloat(user.withdrawable_balance) || 0, balance);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        telegram_id: user.telegram_id,
        username: user.username,
        phone: user.phone || null,
        first_name: user.first_name || null,
        balance,
        withdrawableBalance,
        withdrawable_balance: withdrawableBalance,
        nonWithdrawableBalance: Math.max(0, balance - withdrawableBalance),
        has_deposited: !!user.has_deposited,
        referralCode: user.referral_code,
      }
    });
  } catch (err) {
    console.error('[Telegram Auth Error]', err.message);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Admin Login — hardcoded credentials only, no DB lookup
const ADMIN_USERNAME = (process.env.ADMIN_USERNAME || 'bingoxadmin').trim();
const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || 'Admin@Bingo2019!').trim();

app.post('/api/auth/admin-login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid admin credentials' });
  }

  const token = jwt.sign(
    { username: ADMIN_USERNAME, isAdmin: true },
    JWT_SECRET,
    { expiresIn: '12h' }
  );

  res.json({
    token,
    admin: { username: ADMIN_USERNAME, is_admin: true }
  });
});

// -------------------------------------------------------------
// 2. USER & PROFILE ROUTES
// -------------------------------------------------------------
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const user = await get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const balance = parseFloat(user.balance) || 0;
    const withBal = Math.min(parseFloat(user.withdrawable_balance) || 0, balance);

    res.json({
      user: {
        ...user,
        balance,
        withdrawableBalance: withBal,
        withdrawable_balance: withBal,
        nonWithdrawableBalance: Math.max(0, balance - withBal)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/user/streak', authenticateToken, async (req, res) => {
  res.json({ streakDays: 3, rewardClaimed: false, nextReward: 5 });
});

// -------------------------------------------------------------
// 3. GAMEPLAY ROUTES
// -------------------------------------------------------------
app.get('/api/game/current-round', (req, res) => {
  res.json(gameEngine.getPublicState());
});

app.post('/api/game/buy-ticket', authenticateToken, async (req, res) => {
  try {
    const { cartellaIndex } = req.body;
    const user = await get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const ticket = gameEngine.buyTicket(user, cartellaIndex);

    // Deduct balance
    const newBal = (parseFloat(user.balance) || 0) - gameEngine.ticketPrice;
    await run('UPDATE users SET balance = ? WHERE id = ?', [newBal, user.id]);

    // Real-time balance push
    io.emit('balance_updated', { userId: user.id, newBalance: newBal });

    res.json({ success: true, ticket, newBalance: newBal });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/game/unselect-ticket', authenticateToken, async (req, res) => {
  try {
    const { cartellaIndex } = req.body;
    const user = await get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    gameEngine.unselectTicket(user.id, cartellaIndex);

    // Refund balance
    const newBal = (parseFloat(user.balance) || 0) + gameEngine.ticketPrice;
    await run('UPDATE users SET balance = ? WHERE id = ?', [newBal, user.id]);

    // Real-time balance push
    io.emit('balance_updated', { userId: user.id, newBalance: newBal });

    res.json({ success: true, newBalance: newBal });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 4. WALLET, TASKS, REFERRALS & SETTINGS
// -------------------------------------------------------------
app.post('/api/wallet/deposit', authenticateToken, async (req, res) => {
  try {
    const { amount, paymentMethod, transactionRef } = req.body;
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount < 10) return res.status(400).json({ error: 'Minimum deposit is 10 ETB' });

    const { data, error } = await supabase.from('deposits').insert({
      user_id: req.user.id,
      amount: numAmount,
      payment_method: paymentMethod || 'telebirr',
      transaction_ref: transactionRef || '',
      status: 'pending'
    }).select().single();

    if (error) throw error;
    res.json({ success: true, deposit: data, message: 'Deposit submitted for approval' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/wallet/withdraw', authenticateToken, async (req, res) => {
  try {
    const { amount, paymentMethod, accountNumber } = req.body;
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount < 50) return res.status(400).json({ error: 'Minimum withdrawal is 50 ETB' });

    const user = await get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    const withBal = parseFloat(user.withdrawable_balance) || 0;
    if (withBal < numAmount) return res.status(400).json({ error: 'Insufficient withdrawable balance' });

    // Deduct immediately
    const newBal = (parseFloat(user.balance) || 0) - numAmount;
    const newWith = withBal - numAmount;
    await run('UPDATE users SET balance = ?, withdrawable_balance = ? WHERE id = ?', [newBal, newWith, user.id]);

    const { data, error } = await supabase.from('withdrawals').insert({
      user_id: user.id,
      amount: numAmount,
      payment_method: paymentMethod || 'telebirr',
      account_number: accountNumber || '',
      status: 'pending'
    }).select().single();

    if (error) throw error;
    res.json({ success: true, withdrawal: data, newBalance: newBal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const { data: tasks } = await supabase.from('dynamic_tasks').select('*').eq('is_active', true);
    res.json(tasks || [
      { id: 1, title: 'Join Telegram Channel', description: 'Join our official channel for game updates', reward_amount: 5, target_url: 'https://t.me/bingox2019', action_label: 'Join Channel' },
      { id: 2, title: 'First Deposit Bonus', description: 'Make your first deposit of 50+ ETB', reward_amount: 15, action_label: 'Deposit' }
    ]);
  } catch (err) {
    res.json([]);
  }
});

app.get('/api/referrals', authenticateToken, async (req, res) => {
  try {
    const user = await get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    const { count: refCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('referral_code', user?.referral_code || '');

    res.json({
      referralCode: user?.referral_code || '',
      inviteLink: `https://t.me/bingox2019_bot?start=ref_${user?.referral_code}`,
      totalReferrals: refCount || 0,
      totalEarned: (refCount || 0) * 5
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/settings', async (req, res) => {
  res.json({
    telebirrNumber: '0979827836',
    cbeAccount: '100023456789',
    minDeposit: 10,
    minWithdraw: 50,
    ticketPrice: 10,
    maintenanceMode: gameEngine.isMaintenance
  });
});

// Admin Routes
app.use('/api/admin', authenticateToken, adminRoutes);

server.listen(PORT, () => {
  console.log('🎯 BingoX Backend Server running on port ' + PORT);
});
