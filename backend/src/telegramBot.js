/**
 * BingoX Telegram Bot
 *
 * Persistent reply keyboard (shown to every registered user):
 *   🎮 Play Bingo  |  💰 Balance / Wallet
 *   💳 Deposit     |  💸 Withdraw
 *              👥 Referral
 *
 * Commands:
 *   /start [ref_CODE]  — Welcome + show main menu
 *   /help              — Commands list
 *   <contact>          — Phone registration / account linking
 *
 * Game notifications (via gameEngine.emitter):
 *   countdown_start  → DM ticket holders "Game starts in 60s"
 *   drawing_start    → DM ticket holders "Drawing has begun!"
 *   round_end        → DM every player: winner 🏆 or loser 😔
 */
'use strict';

const BOT_TOKEN   = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
const WEB_APP_URL = (process.env.WEB_APP_URL || 'https://bingox2019.vercel.app').trim();

// ─── Safe no-op if token missing ─────────────────────────────
if (!BOT_TOKEN) {
  console.warn('[TelegramBot] TELEGRAM_BOT_TOKEN not set — bot disabled.');
  module.exports = {};
} else {
  _startBot();
}

// ─── Main bot init ────────────────────────────────────────────
function _startBot() {
  let bot;

  try {
    const TelegramBot = require('node-telegram-bot-api');
    bot = new TelegramBot(BOT_TOKEN, { polling: true });
    console.log('[TelegramBot] Bot started with polling.');
  } catch (err) {
    console.error('[TelegramBot] Failed to init:', err.message);
    module.exports = {};
    return;
  }

  const { get, supabase } = require('./db');
  const { normalizePhone, generateReferralCode } = require('./utils');
  const gameEngine = require('./gameEngine');

  // ─── Keyboard layouts ────────────────────────────────────────

  /**
   * Persistent 5-button reply keyboard — shown to every registered user.
   *
   * Layout:
   *   ┌──────────────────────────────────┐
   *   │         🎮 Play Bingo            │
   *   ├─────────────────┬────────────────┤
   *   │ 💰 Balance /    │  💳 Deposit    │
   *   │    Wallet       │                │
   *   ├─────────────────┼────────────────┤
   *   │ 💸 Withdraw     │  👥 Referral   │
   *   └─────────────────┴────────────────┘
   */
  const MAIN_KEYBOARD = {
    keyboard: [
      [{ text: '🎮 Play Bingo', web_app: { url: WEB_APP_URL } }],
      [{ text: '💰 Balance / Wallet' }, { text: '💳 Deposit' }],
      [{ text: '💸 Withdraw' },         { text: '👥 Referral' }],
    ],
    resize_keyboard: true,
    persistent: true,   // stays visible between messages
  };

  /** Reply options that ONLY show the main menu (no inline keyboard). */
  const MAIN_MENU_OPTS = {
    parse_mode: 'Markdown',
    reply_markup: MAIN_KEYBOARD,
  };

  /**
   * Reply options with an inline open-game WebApp button.
   */
  function withMenuAndBtn(label) {
    return {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{ text: label || '🎮 Open BingoX', web_app: { url: WEB_APP_URL } }]],
      },
    };
  }

  /**
   * One-time keyboard asking for phone number (unregistered users).
   */
  const PHONE_KEYBOARD_OPTS = {
    parse_mode: 'Markdown',
    reply_markup: {
      keyboard: [[{ text: '📱 Share Phone Number', request_contact: true }]],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  };

  /**
   * Inline-only open-game button (used in game notification DMs).
   */
  function inlineOnlyBtn(label) {
    return {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: label, web_app: { url: WEB_APP_URL } }]] },
    };
  }

  // ─── Helpers ─────────────────────────────────────────────────

  /** Send a message safely — never crash the process on Telegram errors. */
  function safeSend(chatId, text, opts) {
    return bot.sendMessage(chatId, text, opts || {}).catch(err => {
      console.warn('[TelegramBot] sendMessage to', chatId, 'failed:', err.message);
    });
  }

  /** Fetch a user's telegram_id (= Telegram chat ID) from Supabase by DB userId. */
  async function getTelegramId(userId) {
    try {
      const user = await get('SELECT * FROM users WHERE id = ?', [String(userId)]);
      return user?.telegram_id || null;
    } catch {
      return null;
    }
  }

  /**
   * Broadcast a personalised DM to a list of { userId, username } players.
   * Deduplicates and throttles to stay under Telegram's rate limit.
   */
  async function dmPlayers(players, textFn, opts) {
    const seen = new Set();
    for (const p of players) {
      const uid = String(p.userId);
      if (seen.has(uid)) continue;
      seen.add(uid);

      const chatId = await getTelegramId(uid);
      if (!chatId) continue;

      const text = typeof textFn === 'function' ? textFn(p) : textFn;
      await safeSend(chatId, text, opts);

      // 60 ms delay → well under Telegram's 30 msg/s cap
      await new Promise(r => setTimeout(r, 60));
    }
  }

  /**
   * Look up a registered user by telegram_id. Returns null if not found/registered.
   */
  async function getRegisteredUser(telegramId) {
    try {
      const user = await get('SELECT * FROM users WHERE telegram_id = ?', [String(telegramId)]);
      if (user && user.phone && !user.phone.startsWith('tg_')) return user;
      return null;
    } catch {
      return null;
    }
  }

  // ─── /start ──────────────────────────────────────────────────
  bot.onText(/\/start(.*)/, async (msg, match) => {
    const chatId     = msg.chat.id;
    const telegramId = String(msg.from.id);
    const param      = (match[1] || '').trim();
    const name       = msg.from.first_name || msg.from.username || 'there';

    const user = await getRegisteredUser(telegramId);

    if (user) {
      // Already registered — show main menu
      const welcome = param.startsWith('ref_')
        ? `🎁 *Welcome back, ${name}!*\n\nYour friend invited you — check your referral bonus in the game.\n\nUse the menu below to navigate BingoX 👇`
        : `🎯 *Welcome back, ${name}!*\n\nUse the menu below to navigate BingoX 👇`;

      await safeSend(chatId, welcome, MAIN_MENU_OPTS);
    } else {
      // Not registered — welcome + request phone
      const intro = param.startsWith('ref_')
        ? `🎁 *You were invited to BingoX!*\n\nWelcome, ${name}! Register now to claim your welcome bonus.\n\n📱 Please share your phone number to get started:`
        : `🎯 *Welcome to BingoX 2019, ${name}!*\n\nPlay Bingo live and win real ETB prizes every round.\n\n📱 Please share your phone number to register:`;

      await safeSend(chatId, intro, PHONE_KEYBOARD_OPTS);
    }
  });

  // ─── /help ───────────────────────────────────────────────────
  bot.onText(/\/help/, async (msg) => {
    await safeSend(msg.chat.id,
      `🆘 *BingoX Menu Guide*\n\n` +
      `🎮 *Play Bingo* — Open the live game, pick a cartela\n` +
      `💰 *Balance / Wallet* — See your total & withdrawable balance\n` +
      `💳 *Deposit* — Add ETB via TeleBirr or CBE\n` +
      `💸 *Withdraw* — Cash out your winnings\n` +
      `👥 *Referral* — Share your code, earn 5 ETB per friend\n\n` +
      `Need support? Contact us inside the game.`,
      MAIN_MENU_OPTS
    );
  });

  // ─── Contact (phone registration / linking) ──────────────────
  bot.on('contact', async (msg) => {
    const chatId     = msg.chat.id;
    const phone      = msg.contact?.phone_number;
    const telegramId = String(msg.from.id);
    const firstName  = msg.from.first_name || '';
    const username   = msg.from.username || firstName || ('user_' + telegramId);

    if (!phone) {
      await safeSend(chatId, '❌ Could not read your phone number. Please try again.', PHONE_KEYBOARD_OPTS);
      return;
    }

    try {
      const normalizedPhone = normalizePhone(phone);

      let user = await get('SELECT * FROM users WHERE telegram_id = ?', [telegramId]);
      if (!user) user = await get('SELECT * FROM users WHERE phone = ?', [normalizedPhone]);

      if (user) {
        // Link existing account
        await supabase.from('users').update({
          telegram_id: telegramId,
          phone:       normalizedPhone,
          first_name:  firstName || user.first_name,
          username:    user.username || username,
        }).eq('id', user.id);

        await safeSend(chatId,
          `✅ *Account linked, ${firstName || username}!*\n\n` +
          `Your phone has been verified. Use the menu to play! 🎮`,
          MAIN_MENU_OPTS
        );
      } else {
        // New registration
        const referralCode = generateReferralCode(telegramId);

        const { error } = await supabase.from('users').insert({
          telegram_id:          telegramId,
          phone:                normalizedPhone,
          username,
          first_name:           firstName,
          referral_code:        referralCode,
          balance:              0,
          withdrawable_balance: 0,
          has_deposited:        false,
          is_banned:            false,
        }).select('id').single();

        if (error) throw error;

        await safeSend(chatId,
          `🎉 *Welcome to BingoX, ${firstName || username}!*\n\n` +
          `Your account is ready to go.\n\n` +
          `🎁 Your referral code: \`${referralCode}\`\n` +
          `Invite friends and earn *5 ETB* per referral!\n\n` +
          `Use the menu below to start playing 👇`,
          MAIN_MENU_OPTS
        );
      }
    } catch (err) {
      console.error('[TelegramBot] Contact handler error:', err.message);
      await safeSend(chatId, '⚠️ Registration error. Please try again later.', PHONE_KEYBOARD_OPTS);
    }
  });

  // ─── Main Menu button handlers ───────────────────────────────
  bot.on('message', async (msg) => {
    if (!msg.text || msg.contact) return;
    if (msg.text.startsWith('/')) return;

    const chatId     = msg.chat.id;
    const telegramId = String(msg.from.id);
    const text       = msg.text.trim();

    const user = await getRegisteredUser(telegramId);

    // ── 🎮 Play Bingo ─────────────────────────────────────────
    if (text === '🎮 Play Bingo') {
      if (!user) { await promptRegister(chatId); return; }

      const state = require('./gameEngine').getPublicState();
      const statusLine = state.status === 'DRAWING'
        ? `🔴 *Game in progress!* ${state.calledNumbers.length}/75 balls drawn`
        : state.status === 'COUNTDOWN'
        ? `⏱ *Next round starts in ${state.secondsLeft}s* — ${state.purchasedTickets.length} cartela(s) sold`
        : `✅ *Lobby open* — be the first to pick a cartela!`;

      await safeSend(chatId,
        `🎮 *BingoX Live Game*\n\n` +
        `${statusLine}\n\n` +
        `💰 Ticket price: *10 ETB*\n` +
        `🏆 Prize: *80% of the pool*\n` +
        `🃏 Max 2 cartelas per round\n\n` +
        `Tap below to open the game and pick your cartela 👇`,
        withMenuAndBtn('🎮 Open Game & Play')
      );
      return;
    }

    // ── 💰 Balance / Wallet ───────────────────────────────────
    if (text === '💰 Balance / Wallet') {
      if (!user) { await promptRegister(chatId); return; }

      const bal   = parseFloat(user.balance) || 0;
      const withB = Math.min(parseFloat(user.withdrawable_balance) || 0, bal);
      const bonus = Math.max(0, bal - withB);

      await safeSend(chatId,
        `💰 *Your BingoX Wallet*\n\n` +
        `┌─────────────────────────\n` +
        `│ Total balance:    *${bal.toFixed(2)} ETB*\n` +
        `│ Withdrawable:     *${withB.toFixed(2)} ETB*\n` +
        `│ Bonus (play-only): *${bonus.toFixed(2)} ETB*\n` +
        `└─────────────────────────\n\n` +
        `Tap below to manage deposits & withdrawals in the app 👇`,
        withMenuAndBtn('💳 Open Wallet')
      );
      return;
    }

    // ── 💳 Deposit ────────────────────────────────────────────
    if (text === '💳 Deposit') {
      if (!user) { await promptRegister(chatId); return; }

      await safeSend(chatId,
        `💳 *Deposit Funds*\n\n` +
        `Minimum deposit: *10 ETB*\n\n` +
        `Accepted payment methods:\n` +
        `  📱 *TeleBirr* — 0979827836\n` +
        `  🏦 *CBE* — 100023456789\n\n` +
        `*How to deposit:*\n` +
        `1️⃣ Send ETB to the number/account above\n` +
        `2️⃣ Open the wallet in the game\n` +
        `3️⃣ Enter amount & your transaction reference\n` +
        `4️⃣ Admin approves within minutes ✅\n\n` +
        `Tap below to open the deposit form 👇`,
        withMenuAndBtn('💳 Deposit Now')
      );
      return;
    }

    // ── 💸 Withdraw ───────────────────────────────────────────
    if (text === '💸 Withdraw') {
      if (!user) { await promptRegister(chatId); return; }

      const bal   = parseFloat(user.balance) || 0;
      const withB = Math.min(parseFloat(user.withdrawable_balance) || 0, bal);

      await safeSend(chatId,
        `💸 *Withdraw Winnings*\n\n` +
        `Your withdrawable balance: *${withB.toFixed(2)} ETB*\n` +
        `Minimum withdrawal: *50 ETB*\n\n` +
        `Supported methods:\n` +
        `  📱 *TeleBirr*\n` +
        `  🏦 *CBE*\n\n` +
        `*How to withdraw:*\n` +
        `1️⃣ Open the wallet in the game\n` +
        `2️⃣ Enter amount & your account number\n` +
        `3️⃣ Submit — funds sent within minutes ✅\n\n` +
        `${withB < 50 ? `⚠️ You need at least *50 ETB* withdrawable. Play more to earn!\n\n` : ''}` +
        `Tap below to open the withdrawal form 👇`,
        withMenuAndBtn('💸 Withdraw Now')
      );
      return;
    }

    // ── 👥 Referral ───────────────────────────────────────────
    if (text === '👥 Referral') {
      if (!user) { await promptRegister(chatId); return; }

      const code       = user.referral_code || '—';
      const inviteLink = `https://t.me/bingox2019_bot?start=ref_${code}`;

      let total = 0;
      try {
        const { count } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('referral_code', code);
        total = count || 0;
      } catch {}

      await safeSend(chatId,
        `👥 *Your Referral Dashboard*\n\n` +
        `🔑 Your code: \`${code}\`\n\n` +
        `🔗 *Your invite link:*\n${inviteLink}\n\n` +
        `📊 Total referrals: *${total}*\n` +
        `💰 Total earned:    *${total * 5} ETB*\n\n` +
        `Share your link — earn *5 ETB* for every friend who registers and plays! 🎉`,
        withMenuAndBtn('👥 View Referrals in App')
      );
      return;
    }

    // ── Unrecognised text ─────────────────────────────────────
    if (!user) {
      await promptRegister(chatId);
    } else {
      await safeSend(chatId, 'Use the menu buttons below 👇', MAIN_MENU_OPTS);
    }
  });

  /** Ask unregistered user to share phone */
  async function promptRegister(chatId) {
    await safeSend(chatId,
      `📱 *One step to play!*\n\nShare your phone number to create your BingoX account:`,
      PHONE_KEYBOARD_OPTS
    );
  }

  // ─── Game event notifications ─────────────────────────────────

  /** countdown_start — DM ticket holders that the game is beginning */
  gameEngine.emitter.on('countdown_start', async ({ secondsLeft, ticketCount, prizePool, tickets }) => {
    if (!tickets || tickets.length === 0) return;
    const prizeStr = prizePool.toFixed(0);

    await dmPlayers(tickets, (p) =>
      `⏱ *Game starts in ${secondsLeft}s!*\n\n` +
      `You own Cartela *#${p.cartellaIndex}*.\n` +
      `🏆 Prize pool: *${prizeStr} ETB* | 👥 Players: *${ticketCount}*\n\n` +
      `Open the game to watch the draw live 👇`,
      inlineOnlyBtn('🎮 Watch Live')
    );
  });

  /** drawing_start — DM ticket holders that balls are being drawn */
  gameEngine.emitter.on('drawing_start', async ({ ticketCount, prizePool, tickets }) => {
    if (!tickets || tickets.length === 0) return;
    const prizeStr = prizePool.toFixed(0);

    await dmPlayers(tickets, (p) =>
      `🎱 *Drawing has started!*\n\n` +
      `Your Cartela *#${p.cartellaIndex}* is live.\n` +
      `🏆 Prize pool: *${prizeStr} ETB* | 👥 Players: *${ticketCount}*\n\n` +
      `Open the game NOW to watch your numbers get called 👇`,
      inlineOnlyBtn('🎮 Watch Live')
    );
  });

  /** round_end — personalised win 🏆 or loss 😔 DM to every player */
  gameEngine.emitter.on('round_end', async ({ winners, splitPrize, totalPrize, calledCount, allTickets }) => {
    if (!allTickets || allTickets.length === 0) return;
    const winnerIds = new Set(winners.map(w => String(w.userId)));

    await dmPlayers(allTickets, (p) => {
      if (winnerIds.has(String(p.userId))) {
        return (
          `🏆 *BINGO! You won!*\n\n` +
          `Congratulations *${p.username}*! 🎉\n` +
          `Cartela *#${p.cartellaIndex}* hit BINGO!\n\n` +
          `💰 *${splitPrize.toFixed(2)} ETB* credited to your wallet.\n\n` +
          `Open the game to see your balance or play again 👇`
        );
      }
      return (
        `😔 *Better luck next round!*\n\n` +
        `*${calledCount}* balls were drawn.\n` +
        `🏆 Total prize: *${totalPrize.toFixed(0)} ETB*\n\n` +
        `New round in ~8 seconds — grab your cartela early! 👇`
      );
    }, inlineOnlyBtn('🎮 Play Again'));
  });

  // Expose for optional external use
  module.exports = { bot, safeSend };
}
