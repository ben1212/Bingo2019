/**
 * BingoX Game Engine
 * Manages the full round lifecycle:
 *   WAITING → COUNTDOWN → DRAWING → (back to WAITING)
 *
 * Exposed API (used by server.js, adminRoutes.js, telegramBot.js):
 *   gameEngine.setIO(io)
 *   gameEngine.getPublicState()
 *   gameEngine.buyTicket(user, cartellaIndex)   → { cartellaIndex, grid, userId, username }
 *   gameEngine.unselectTicket(userId, cartellaIndex) → true | throws
 *   gameEngine.broadcastState()
 *   gameEngine.ticketPrice          (number, ETB)
 *   gameEngine.isMaintenance        (boolean, r/w)
 *   gameEngine.maintenanceMessage   (string,  r/w)
 *   gameEngine.io                   (Socket.io server instance)
 */

'use strict';

const EventEmitter = require('events');
const { generateCartellaNumbers } = require('./utils');
const { supabase, get, run } = require('./db');

// Internal event emitter — telegramBot subscribes to these events
const emitter = new EventEmitter();
module.exports.emitter = emitter;

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const TICKET_PRICE      = 10;        // ETB per cartela
const HOUSE_CUT         = 0.20;      // 20% house edge
const MAX_CARTELLAS     = 200;       // lobby grid size (1–200)
const MAX_PER_USER      = 2;         // max cartelas a single user may hold
const COUNTDOWN_SECONDS = 60;        // seconds between rounds
const BALL_INTERVAL_MS  = 3000;      // ms between each drawn number

// ─────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────
let _io = null;

let state = {
  status: 'WAITING',      // 'WAITING' | 'COUNTDOWN' | 'DRAWING'
  roundId: null,
  roundNumber: 0,
  purchasedTickets: [],   // [{ cartellaIndex, grid, userId, username }]
  calledNumbers: [],
  lastCalledBall: null,
  prizePool: 0,
  ticketPrice: TICKET_PRICE,
  totalTickets: 0,
  secondsLeft: null,
  maintenanceMode: false,
  maintenanceMessage: '',
};

let _countdownTimer = null;
let _ballTimer      = null;

// ─────────────────────────────────────────────────────────────
// Public properties (r/w from admin routes)
// ─────────────────────────────────────────────────────────────
Object.defineProperty(module.exports, 'isMaintenance', {
  get: () => state.maintenanceMode,
  set: (v) => { state.maintenanceMode = !!v; },
});

Object.defineProperty(module.exports, 'maintenanceMessage', {
  get: () => state.maintenanceMessage,
  set: (v) => { state.maintenanceMessage = String(v || ''); },
});

Object.defineProperty(module.exports, 'ticketPrice', {
  get: () => TICKET_PRICE,
});

Object.defineProperty(module.exports, 'io', {
  get: () => _io,
});

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildBallPool() {
  return shuffle(Array.from({ length: 75 }, (_, i) => i + 1));
}

function calcPrizePool(ticketCount) {
  return ticketCount * TICKET_PRICE * (1 - HOUSE_CUT);
}

function getLetter(num) {
  if (num <= 15) return 'B';
  if (num <= 30) return 'I';
  if (num <= 45) return 'N';
  if (num <= 60) return 'G';
  return 'O';
}

/**
 * Check if a 5x5 cartela grid has BINGO given the set of called numbers.
 * Winning patterns: any full row, column, or either diagonal.
 * FREE cell (center [2][2]) is always called.
 */
function checkBingo(grid, calledSet) {
  function isCalled(cell) {
    if (cell === 'FREE' || cell === 0) return true;
    return calledSet.has(Number(cell));
  }

  const SIZE = 5;

  for (let r = 0; r < SIZE; r++) {
    if (grid[r].every(cell => isCalled(cell))) return true;
  }

  for (let c = 0; c < SIZE; c++) {
    let win = true;
    for (let r = 0; r < SIZE; r++) {
      if (!isCalled(grid[r][c])) { win = false; break; }
    }
    if (win) return true;
  }

  // Main diagonal
  {
    let win = true;
    for (let i = 0; i < SIZE; i++) {
      if (!isCalled(grid[i][i])) { win = false; break; }
    }
    if (win) return true;
  }

  // Anti-diagonal
  {
    let win = true;
    for (let i = 0; i < SIZE; i++) {
      if (!isCalled(grid[i][SIZE - 1 - i])) { win = false; break; }
    }
    if (win) return true;
  }

  return false;
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────
function setIO(io) {
  _io = io;
  startWaiting();
}

function getPublicState() {
  return {
    status:          state.status,
    roundId:         state.roundId,
    roundNumber:     state.roundNumber,
    purchasedTickets: state.purchasedTickets.map(t => ({
      cartellaIndex: t.cartellaIndex,
      userId:        t.userId,
      username:      t.username,
      grid:          t.grid,
    })),
    calledNumbers:      state.calledNumbers,
    lastCalledBall:     state.lastCalledBall,
    prizePool:          state.prizePool,
    ticketPrice:        TICKET_PRICE,
    totalTickets:       state.purchasedTickets.length,
    secondsLeft:        state.secondsLeft,
    maintenanceMode:    state.maintenanceMode,
    maintenanceMessage: state.maintenanceMessage,
  };
}

function broadcastState() {
  if (_io) _io.emit('round_state', getPublicState());
}

function buyTicket(user, cartellaIndex) {
  if (state.status === 'DRAWING') {
    throw new Error('Cannot buy tickets while the round is in progress.');
  }
  if (state.maintenanceMode) {
    throw new Error('Game is under maintenance. Please try again later.');
  }

  // Support legacy call style: buyTicket(user) where cartellaIndex comes from user
  const idx = Number(cartellaIndex) || Number(user.cartellaIndex) || null;
  if (!idx || idx < 1 || idx > MAX_CARTELLAS) {
    throw new Error('Invalid cartela number. Must be 1–' + MAX_CARTELLAS + '.');
  }

  const existing = state.purchasedTickets.find(t => t.cartellaIndex === idx);
  if (existing) {
    if (String(existing.userId) === String(user.id)) {
      throw new Error('You already own Cartela #' + idx + '.');
    }
    throw new Error('Cartela #' + idx + ' is already taken.');
  }

  const userTickets = state.purchasedTickets.filter(t => String(t.userId) === String(user.id));
  if (userTickets.length >= MAX_PER_USER) {
    throw new Error('You can only hold up to ' + MAX_PER_USER + ' cartelas per round.');
  }

  if ((parseFloat(user.balance) || 0) < TICKET_PRICE) {
    throw new Error('Insufficient balance. You need ' + TICKET_PRICE + ' ETB.');
  }

  const grid   = generateCartellaNumbers();
  const ticket = {
    cartellaIndex: idx,
    grid,
    userId:   user.id,
    username: user.username || ('user_' + user.id),
  };

  state.purchasedTickets.push(ticket);
  state.prizePool    = calcPrizePool(state.purchasedTickets.length);
  state.totalTickets = state.purchasedTickets.length;

  if (state.status === 'WAITING' && state.purchasedTickets.length === 1) {
    startCountdown();
  } else {
    broadcastState();
  }

  return ticket;
}

function unselectTicket(userId, cartellaIndex) {
  if (state.status === 'DRAWING') {
    throw new Error('Cannot remove tickets while the round is in progress.');
  }

  const idx = Number(cartellaIndex);
  const pos = state.purchasedTickets.findIndex(
    t => t.cartellaIndex === idx && String(t.userId) === String(userId)
  );

  if (pos === -1) {
    throw new Error('Cartela #' + idx + ' not found in your ticket list.');
  }

  state.purchasedTickets.splice(pos, 1);
  state.prizePool    = calcPrizePool(state.purchasedTickets.length);
  state.totalTickets = state.purchasedTickets.length;

  if (state.purchasedTickets.length === 0 && state.status === 'COUNTDOWN') {
    stopCountdown();
    startWaiting();
    return;
  }

  broadcastState();
}

// ─────────────────────────────────────────────────────────────
// Round lifecycle
// ─────────────────────────────────────────────────────────────
function startWaiting() {
  stopCountdown();
  stopDrawing();

  state.status           = 'WAITING';
  state.roundId          = null;
  state.purchasedTickets = [];
  state.calledNumbers    = [];
  state.lastCalledBall   = null;
  state.prizePool        = 0;
  state.totalTickets     = 0;
  state.secondsLeft      = null;

  console.log('[GameEngine] Waiting for players...');
  broadcastState();
}

function startCountdown() {
  if (state.status === 'COUNTDOWN') return;
  stopDrawing();

  state.status      = 'COUNTDOWN';
  state.secondsLeft = COUNTDOWN_SECONDS;

  console.log('[GameEngine] Countdown: ' + COUNTDOWN_SECONDS + 's');
  broadcastState();

  // Notify bot so it can DM players
  emitter.emit('countdown_start', {
    secondsLeft:  COUNTDOWN_SECONDS,
    ticketCount:  state.purchasedTickets.length,
    prizePool:    state.prizePool,
    tickets:      state.purchasedTickets.map(t => ({ userId: t.userId, username: t.username, cartellaIndex: t.cartellaIndex })),
  });

  _countdownTimer = setInterval(() => {
    state.secondsLeft -= 1;
    if (_io) _io.emit('countdown_tick', { secondsLeft: state.secondsLeft });
    if (state.secondsLeft <= 0) {
      stopCountdown();
      startDrawing();
    }
  }, 1000);
}

function stopCountdown() {
  if (_countdownTimer) {
    clearInterval(_countdownTimer);
    _countdownTimer = null;
  }
  state.secondsLeft = null;
}

async function startDrawing() {
  if (state.purchasedTickets.length === 0) {
    startWaiting();
    return;
  }

  state.status      = 'DRAWING';
  state.secondsLeft = null;
  state.roundNumber += 1;

  // Persist round to Supabase (best-effort)
  try {
    const { data } = await supabase.from('game_rounds').insert({
      ticket_count: state.purchasedTickets.length,
      prize_pool:   state.prizePool,
      status:       'active',
      started_at:   new Date().toISOString(),
    }).select('id').single();
    if (data && data.id) state.roundId = data.id;
  } catch (e) {
    console.warn('[GameEngine] Could not save round to DB:', e.message);
  }

  const ballPool = buildBallPool();
  let ballIndex  = 0;

  console.log('[GameEngine] Drawing started — ' + state.purchasedTickets.length + ' cartela(s), prize: ' + state.prizePool + ' ETB');
  broadcastState();

  // Notify bot so it can DM players
  emitter.emit('drawing_start', {
    ticketCount: state.purchasedTickets.length,
    prizePool:   state.prizePool,
    tickets:     state.purchasedTickets.map(t => ({ userId: t.userId, username: t.username, cartellaIndex: t.cartellaIndex })),
  });

  _ballTimer = setInterval(async () => {
    if (ballIndex >= ballPool.length) {
      stopDrawing();
      await endRound([]);
      return;
    }

    const num  = ballPool[ballIndex++];
    state.calledNumbers.push(num);
    state.lastCalledBall = num;

    if (_io) {
      _io.emit('ball_drawn', {
        number:        num,
        letter:        getLetter(num),
        calledNumbers: state.calledNumbers,
      });
    }

    const calledSet = new Set(state.calledNumbers);
    const winners   = state.purchasedTickets.filter(t => checkBingo(t.grid, calledSet));

    if (winners.length > 0) {
      stopDrawing();
      await endRound(winners);
    }
  }, BALL_INTERVAL_MS);
}

function stopDrawing() {
  if (_ballTimer) {
    clearInterval(_ballTimer);
    _ballTimer = null;
  }
}

async function endRound(winners) {
  const totalPrize = state.prizePool;
  const splitPrize = winners.length > 0
    ? +(totalPrize / winners.length).toFixed(2)
    : 0;

  console.log('[GameEngine] Round ended. Winners: ' + winners.length + ', prize each: ' + splitPrize + ' ETB');

  // Pay each winner
  for (const w of winners) {
    try {
      const user = await get('SELECT * FROM users WHERE id = ?', [w.userId]);
      if (user) {
        const newBal  = (parseFloat(user.balance) || 0) + splitPrize;
        const newWith = (parseFloat(user.withdrawable_balance) || 0) + splitPrize;
        await run(
          'UPDATE users SET balance = ?, withdrawable_balance = ? WHERE id = ?',
          [newBal, newWith, user.id]
        );
        if (_io) {
          _io.emit('balance_updated', {
            userId:              user.id,
            newBalance:          newBal,
            withdrawableBalance: newWith,
          });
        }
      }
    } catch (err) {
      console.error('[GameEngine] Prize payout error for user ' + w.userId + ':', err.message);
    }
  }

  // Update round record
  try {
    if (state.roundId) {
      await supabase.from('game_rounds').update({
        winner_count:     winners.length,
        prize_per_winner: splitPrize,
        called_numbers:   state.calledNumbers,
        status:           'completed',
        ended_at:         new Date().toISOString(),
      }).eq('id', state.roundId);
    }
  } catch (e) {
    console.warn('[GameEngine] Could not update round in DB:', e.message);
  }

  // Broadcast result
  if (_io) {
    _io.emit('round_ended', {
      winners: winners.map(w => ({
        userId:        w.userId,
        username:      w.username,
        cartellaIndex: w.cartellaIndex,
      })),
      splitPrizePerWinner: splitPrize,
      totalPrize,
      calledNumbers: state.calledNumbers,
    });
  }

  // Notify bot with full context for personalised DMs
  emitter.emit('round_end', {
    winners,
    splitPrize,
    totalPrize,
    calledCount:    state.calledNumbers.length,
    allTickets:     state.purchasedTickets.map(t => ({ userId: t.userId, username: t.username, cartellaIndex: t.cartellaIndex })),
  });

  // Restart after 8 seconds
  setTimeout(() => startWaiting(), 8000);
}

// ─────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────
module.exports.setIO          = setIO;
module.exports.getPublicState = getPublicState;
module.exports.broadcastState = broadcastState;
module.exports.buyTicket      = buyTicket;
module.exports.unselectTicket = unselectTicket;
