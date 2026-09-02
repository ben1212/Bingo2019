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

    bot.on('polling_error', (error) => {
      if (error?.message?.includes('409 Conflict')) {
        console.warn('[TelegramBot] Polling conflict (another instance active), will retry...');
      } else {
        console.warn('[TelegramBot] Polling error:', error.message);
      }
    });

    bot.on('error', (error) => {
      console.warn('[TelegramBot] General error:', error.message);
    });
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

  // ─── Conversation state tracking for multi-step prompts ──────
  const userStates = new Map(); // chatId -> { action: 'DEPOSIT'|'WITHDRAW', method: 'telebirr'|'cbe' }

  // ─── Main Menu button handlers ───────────────────────────────
  bot.on('message', async (msg) => {
    if (msg.contact) return;
    if (msg.text && msg.text.startsWith('/')) return;

    const chatId     = msg.chat.id;
    const telegramId = String(msg.from.id);
    const text       = (msg.text || '').trim();

    const user = await getRegisteredUser(telegramId);
    if (!user) {
      await promptRegister(chatId);
      return;
    }

    // Check if user is in an active conversational step (Deposit / Withdraw input)
    const activeState = userStates.get(chatId);
    if (activeState) {
      // 1. DEPOSIT STEP: User sent payment SMS / transaction reference
      if (activeState.action === 'DEPOSIT') {
        userStates.delete(chatId);

        try {
          // Parse amount if present in text, otherwise 0 pending admin review
          const amountMatch = text.match(/(?:ETB|Birr|birr|\$)?\s*(\d+(?:\.\d+)?)/);
          const parsedAmount = amountMatch ? parseFloat(amountMatch[1]) : 0;

          await supabase.from('deposits').insert({
            user_id:         user.id,
            amount:          parsedAmount,
            payment_method:  activeState.method,
            transaction_ref: text,
            status:          'pending',
          });

          await safeSend(chatId,
            `✅ *Deposit Submitted!*\n\n` +
            `Your payment reference has been sent to admin for verification.\n` +
            `Your balance will be credited within minutes. 🎮`,
            {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [[{ text: '🎮 Play Bingo', web_app: { url: WEB_APP_URL } }]],
              },
            }
          );
        } catch (err) {
          console.error('[TelegramBot] Deposit submission error:', err.message);
          await safeSend(chatId, '⚠️ Error submitting deposit. Please try again later.', MAIN_MENU_OPTS);
        }
        return;
      }

      // 2. WITHDRAW STEP: User sent "Amount AccountNumber"
      if (activeState.action === 'WITHDRAW') {
        const parts = text.split(/\s+/);
        const reqAmount = parseFloat(parts[0]);
        const accountNumber = parts.slice(1).join(' ').trim();

        const freshUser = await get('SELECT * FROM users WHERE id = ?', [user.id]);
        const bal   = parseFloat(freshUser?.balance) || 0;
        const withB = Math.min(parseFloat(freshUser?.withdrawable_balance) || 0, bal);

        if (isNaN(reqAmount) || reqAmount < 50 || !accountNumber) {
          await safeSend(chatId,
            `❌ *Invalid format.*\n\n` +
            `Please provide the amount (min 50 ETB) and your account number.\n\n` +
            `*Example:* \`100 0912345678\`\n\n` +
            `Or tap Cancel below:`,
            {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [[{ text: '❌ Cancel', callback_data: 'cancel_action' }]],
              },
            }
          );
          return;
        }

        if (reqAmount > withB) {
          userStates.delete(chatId);
          await safeSend(chatId,
            `❌ *Insufficient withdrawable balance.*\n\n` +
            `Requested: *${reqAmount.toFixed(2)} ETB*\n` +
            `Available: *${withB.toFixed(2)} ETB*\n\n` +
            `Keep playing and win more! 🎮`,
            MAIN_MENU_OPTS
          );
          return;
        }

        userStates.delete(chatId);

        try {
          // Deduct from user balance
          const newBal  = bal - reqAmount;
          const newWith = withB - reqAmount;
          await supabase.from('users').update({
            balance:              newBal,
            withdrawable_balance: newWith,
          }).eq('id', user.id);

          await supabase.from('withdrawals').insert({
            user_id:        user.id,
            amount:         reqAmount,
            payment_method: activeState.method,
            account_number: accountNumber,
            status:         'pending',
          });

          // Socket push
          if (gameEngine.io) {
            gameEngine.io.emit('balance_updated', {
              userId:              user.id,
              newBalance:          newBal,
              withdrawableBalance: newWith,
            });
          }

          await safeSend(chatId,
            `✅ *Withdrawal Request Submitted!*\n\n` +
            `*Amount:* ${reqAmount.toFixed(2)} ETB\n` +
            `*Account:* \`${accountNumber}\` (${activeState.method.toUpperCase()})\n\n` +
            `Your request is being processed by admin. 💸`,
            MAIN_MENU_OPTS
          );
        } catch (err) {
          console.error('[TelegramBot] Withdrawal submit error:', err.message);
          await safeSend(chatId, '⚠️ Error processing withdrawal. Please try again.', MAIN_MENU_OPTS);
        }
        return;
      }
    }

    // ── 🎮 Play Bingo (Fallback text handler) ─────────────────
    if (text === '🎮 Play Bingo') {
      await safeSend(chatId,
        `🎮 *BingoX Live Game*\n\n` +
        `Tap the button below to launch the live Bingo lobby and pick your cartelas 👇`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[{ text: '🎮 Play Now', web_app: { url: WEB_APP_URL } }]],
          },
        }
      );
      return;
    }

    // ── 💰 Balance / Wallet ───────────────────────────────────
    if (text === '💰 Balance / Wallet' || text === '/balance') {
      const freshUser = await get('SELECT * FROM users WHERE id = ?', [user.id]);
      const bal   = parseFloat(freshUser?.balance) || 0;
      const withB = Math.min(parseFloat(freshUser?.withdrawable_balance) || 0, bal);

      await safeSend(chatId,
        `💰 *Balance*\n\n` +
        `*Total Balance:* ${bal.toFixed(2)} ETB\n` +
        `*Withdrawable:* ${withB.toFixed(2)} ETB\n\n` +
        `Choose an option:`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '💳 Deposit',  callback_data: 'menu_deposit' },
                { text: '💸 Withdraw', callback_data: 'menu_withdraw' },
              ]
            ],
          },
        }
      );
      return;
    }

    // ── 💳 Deposit ────────────────────────────────────────────
    if (text === '💳 Deposit' || text === '/deposit') {
      await sendDepositMenu(chatId);
      return;
    }

    // ── 💸 Withdraw ───────────────────────────────────────────
    if (text === '💸 Withdraw' || text === '/withdraw') {
      await sendWithdrawMenu(chatId, user);
      return;
    }

    // ── 👥 Referral ───────────────────────────────────────────
    if (text === '👥 Referral' || text === '/referral') {
      await sendReferralMenu(chatId, user);
      return;
    }

    // ── Unrecognised text ─────────────────────────────────────
    await safeSend(chatId, 'Use the menu buttons below 👇', MAIN_MENU_OPTS);
  });

  // ─── Inline Callback Query Router ────────────────────────────
  bot.on('callback_query', async (query) => {
    const chatId     = query.message?.chat?.id;
    const telegramId = String(query.from.id);
    const data       = query.data;

    try {
      await bot.answerCallbackQuery(query.id);
    } catch {}

    if (!chatId) return;

    const user = await getRegisteredUser(telegramId);
    if (!user) {
      await promptRegister(chatId);
      return;
    }

    // 1. Menu shortcuts
    if (data === 'menu_deposit') {
      await sendDepositMenu(chatId);
      return;
    }
    if (data === 'menu_withdraw') {
      await sendWithdrawMenu(chatId, user);
      return;
    }

    // 2. Deposit Method Selection
    if (data === 'deposit_telebirr') {
      userStates.set(chatId, { action: 'DEPOSIT', method: 'telebirr' });
      await safeSend(chatId,
        `💳 *TELEBIRR DEPOSIT*\n` +
        `Minimum deposit: 10 ETB\n\n` +
        `Send your payment to:\n` +
        `📱 \`0979827836\`\n\n` +
        `Then send your payment SMS or transaction reference here.`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[{ text: '❌ Cancel', callback_data: 'cancel_action' }]],
          },
        }
      );
      return;
    }

    if (data === 'deposit_cbe') {
      userStates.set(chatId, { action: 'DEPOSIT', method: 'cbe' });
      await safeSend(chatId,
        `💳 *CBE BIRR DEPOSIT*\n` +
        `Minimum deposit: 10 ETB\n\n` +
        `Send your payment to:\n` +
        `🏦 \`100023456789\`\n\n` +
        `Then send your payment SMS or transaction reference here.`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[{ text: '❌ Cancel', callback_data: 'cancel_action' }]],
          },
        }
      );
      return;
    }

    // 3. Withdraw Method Selection
    if (data === 'withdraw_telebirr' || data === 'withdraw_cbe') {
      const method = data === 'withdraw_telebirr' ? 'telebirr' : 'cbe';
      const freshUser = await get('SELECT * FROM users WHERE id = ?', [user.id]);
      const bal   = parseFloat(freshUser?.balance) || 0;
      const withB = Math.min(parseFloat(freshUser?.withdrawable_balance) || 0, bal);

      if (withB < 50) {
        await safeSend(chatId,
          `❌ *Insufficient balance.*\n\n` +
          `Your balance: *${withB.toFixed(2)} ETB*\n` +
          `Minimum amount: *50 ETB*\n` +
          `Keep playing and win more! 🎮`,
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [[{ text: '🎮 Play Bingo', web_app: { url: WEB_APP_URL } }]],
            },
          }
        );
        return;
      }

      userStates.set(chatId, { action: 'WITHDRAW', method });
      const methodLabel = method === 'telebirr' ? 'TELEBIRR' : 'CBE BIRR';

      await safeSend(chatId,
        `💸 *${methodLabel} WITHDRAWAL*\n\n` +
        `Available to withdraw: *${withB.toFixed(2)} ETB*\n` +
        `Minimum withdrawal: *50 ETB*\n\n` +
        `Please send the **amount** and your **account/phone number**:\n` +
        `Format: \`Amount AccountNumber\`\n` +
        `Example: \`100 0912345678\``,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[{ text: '❌ Cancel', callback_data: 'cancel_action' }]],
          },
        }
      );
      return;
    }

    // 4. Cancel Action
    if (data === 'cancel_action') {
      userStates.delete(chatId);
      await safeSend(chatId, '❌ Action cancelled.', MAIN_MENU_OPTS);
      return;
    }
  });

  // ─── Menu Helpers ─────────────────────────────────────────────

  async function sendDepositMenu(chatId) {
    await safeSend(chatId,
      `💳 *Deposit*\n\nChoose your payment method:`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📱 Telebirr',  callback_data: 'deposit_telebirr' },
              { text: '🏦 CBE Birr',  callback_data: 'deposit_cbe' },
            ],
            [{ text: '❌ Cancel', callback_data: 'cancel_action' }]
          ],
        },
      }
    );
  }

  async function sendWithdrawMenu(chatId, user) {
    const freshUser = await get('SELECT * FROM users WHERE id = ?', [user.id]);
    const bal   = parseFloat(freshUser?.balance) || 0;
    const withB = Math.min(parseFloat(freshUser?.withdrawable_balance) || 0, bal);
    const minWithdraw = 50;

    if (withB < minWithdraw) {
      await safeSend(chatId,
        `❌ *Insufficient balance.*\n\n` +
        `*Your balance:* ${withB.toFixed(2)} ETB\n` +
        `*Minimum amount:* ${minWithdraw} ETB\n` +
        `Keep playing and win more! 🎮`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[{ text: '🎮 Play Now', web_app: { url: WEB_APP_URL } }]],
          },
        }
      );
      return;
    }

    await safeSend(chatId,
      `💸 *Withdraw*\n\n` +
      `Available to withdraw:\n*${withB.toFixed(2)} ETB*\n` +
      `Minimum withdrawal: *${minWithdraw} ETB*\n\n` +
      `Choose payment method:`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📱 Telebirr', callback_data: 'withdraw_telebirr' },
              { text: '🏦 CBE Birr', callback_data: 'withdraw_cbe' },
            ],
            [{ text: '❌ Cancel', callback_data: 'cancel_action' }]
          ],
        },
      }
    );
  }

  async function sendReferralMenu(chatId, user) {
    const code = user.referral_code || '—';
    const inviteLink = `https://t.me/bingox2019_bot?start=ref_${code}`;

    let total = 0;
    try {
      const { count } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('referral_code', code);
      total = count || 0;
    } catch {}

    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent('🎮 Join me on BingoX and win real ETB prizes! 🎯')}`;

    await safeSend(chatId,
      `👥 *REFERRAL*\n\n` +
      `Invite your friends and earn rewards! 🔥\n` +
      `*Friends invited:* ${total}\n` +
      `*Total earned:* ${total * 5} ETB\n\n` +
      `Share your link 👇\n\`${inviteLink}\``,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔗 SHARE REFERRAL LINK', url: shareUrl }],
            [{ text: '🎮 Play Bingo', web_app: { url: WEB_APP_URL } }]
          ],
        },
      }
    );
  }

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
