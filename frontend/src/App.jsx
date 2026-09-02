import React, { useState, useEffect, useRef } from 'react';
import { socket } from './socket';
import { apiFetch } from './api';
import Navbar from './components/Navbar';
import LobbyView from './views/LobbyView';
import GameplayView from './views/GameplayView';
import WalletView from './views/WalletView';
import TaskView from './views/TaskView';
import ReferralView from './views/ReferralView';
import ProfileView from './views/ProfileView';

let socketRef = socket;

// ─────────────────────────────────────────────────────────────────
// Telegram WebApp SDK helper — safely read from window.Telegram, hash, and search
// ─────────────────────────────────────────────────────────────────
function getTelegramInitInfo() {
  const wa = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
  let initData = wa?.initData || '';

  // Fallback: try to read initData from URL hash or search (for testing)
  if (!initData && typeof window !== 'undefined') {
    try {
      // Check hash first
      if (window.location.hash) {
        const cleanHash = window.location.hash.replace(/^#/, '');
        const hashParams = new URLSearchParams(cleanHash);
        const hashData = hashParams.get('tgWebAppData');
        if (hashData) {
          initData = decodeURIComponent(hashData);
        }
      }
      // If not found, check search
      if (!initData && window.location.search) {
        const searchParams = new URLSearchParams(window.location.search);
        const searchData = searchParams.get('tgWebAppData');
        if (searchData) {
          initData = decodeURIComponent(searchData);
        }
      }
    } catch (e) {
      // ignore
    }
  }

  // Only return wa and initData – no tgUser, tgId, or localStorage fallback
  return { wa, initData };
}

// ─────────────────────────────────────────────────────────────────
// Registration required screen (inside Telegram but not phone-verified)
// ─────────────────────────────────────────────────────────────────
function PhoneRegistrationRequired({ message }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f4f6fb',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: "'Bricolage Grotesque', sans-serif",
      textAlign: 'center'
    }}>
      <div style={{
        fontSize: '56px',
        marginBottom: '20px',
        animation: 'bounce 1.5s ease-in-out infinite'
      }}>📱</div>

      <h2 style={{ color: '#0f172a', fontSize: '20px', fontWeight: '900', margin: '0 0 8px' }}>
        One More Step!
      </h2>
      <p style={{
        color: '#64748b',
        fontSize: '14px',
        maxWidth: '320px',
        lineHeight: '1.5',
        margin: '0 0 24px'
      }}>
        {message || 'Please open @bingox2019_bot in Telegram and tap "Share Phone Number" to activate your account and start playing!'}
      </p>

      <a
        href="https://t.me/bingox2019_bot"
        target="_blank"
        rel="noreferrer"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: '#2481cc',
          color: '#ffffff',
          textDecoration: 'none',
          padding: '13px 28px',
          borderRadius: '12px',
          fontSize: '14px',
          fontWeight: '800',
          boxShadow: '0 4px 14px rgba(36, 129, 204, 0.3)'
        }}
      >
        📱 Open Bot & Register
      </a>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('bingo_token') || null);
  const [currentView, setCurrentView] = useState('navbar');

  const [gameState, setGameState] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState('');

  // Auth state machine & Intro sequence
  const [authStatus, setAuthStatus] = useState('loading'); // 'loading' | 'authenticated' | 'needs_phone' | 'not_telegram'
  const [gateMessage, setGateMessage] = useState('');
  const [introDone, setIntroDone] = useState(true); // intro disabled

  // Guard refs
  const gameEndedRef = useRef(false);
  const inGameplayRef = useRef(false);
  const authAttemptedRef = useRef(false);
  const loadingTimerRef = useRef(null);

  // ── Background Prefetch (0ms instant tab loading) ──
  useEffect(() => {
    if (!token) return;
    apiFetch('/api/tasks', { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    apiFetch('/api/referrals', { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    apiFetch('/api/user/streak', { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
  }, [token]);

  // ─────────────────────────────────────────────────────────────
  // AUTH — Rapid Telegram WebApp & Session Init
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (authAttemptedRef.current) return;
    authAttemptedRef.current = true;

    // 1. FAST PATH: Check cached token first
    const cachedToken = localStorage.getItem('bingo_token');
    if (cachedToken) {
      apiFetch('/api/user/profile', { headers: { Authorization: `Bearer ${cachedToken}` } })
        .then(r => r.json())
        .then(d => {
          if (d.user) {
            setToken(cachedToken);
            setUser({ ...d.user, balance: Number(d.user.balance) || 0 });
            setAuthStatus('authenticated');
            setCurrentView('navbar');
            return;
          }
          localStorage.removeItem('bingo_token');
          startTelegramDetection();
        })
        .catch(() => startTelegramDetection());
      return;
    }

    startTelegramDetection();

    function startTelegramDetection() {
      let attempts = 0;
      const MAX_ATTEMPTS = 30; // 30 * 100ms = 3.0 seconds

      const checkTelegram = () => {
        attempts++;
        const { wa, initData } = getTelegramInitInfo();
        const tgUser = wa?.initDataUnsafe?.user || null;
        const telegramId = tgUser?.id ? String(tgUser.id) : null;

        if (wa) {
          try {
            wa.expand?.();
            wa.ready?.();
          } catch {}
        }

        // Telegram context detected!
        if (initData || tgUser || telegramId) {
          apiFetch('/api/auth/telegram-webapp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              initData: initData || '',
              user: tgUser || null,
              telegramId: telegramId || undefined
            })
          })
            .then(r => r.json())
            .then(data => {
              if (data.token && data.user) {
                localStorage.setItem('bingo_token', data.token);
                setToken(data.token);
                setUser({ ...data.user, balance: Number(data.user.balance) || 0 });
                setAuthStatus('authenticated');
                setCurrentView('navbar');
              } else if (data.requiresPhoneRegistration) {
                setGateMessage(data.message || '');
                setAuthStatus('needs_phone');
              } else {
                setGateMessage(data.error || 'Authentication error');
                setAuthStatus('needs_phone');
              }
            })
            .catch(() => {
              setAuthStatus('not_telegram');
            });
          return;
        }

        // Wait for Telegram SDK to inject data
        if (attempts < MAX_ATTEMPTS) {
          setTimeout(checkTelegram, 100);
        } else {
          setAuthStatus('not_telegram');
        }
      };

      checkTelegram();
    }
  }, []);


  // ─────────────────────────────────────────────────────────────
  // Socket.io
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    socketRef = socket;

    socket.on('connect', () => console.log('Connected to Bingo Socket.io'));

    socket.on('round_state', state => {
      setGameState(state);
      if (state.maintenanceMode !== undefined) {
        setIsMaintenance(!!state.maintenanceMode);
      }
      if (state.maintenanceMessage) {
        setMaintenanceMsg(state.maintenanceMessage);
      }
      if (state.secondsLeft !== undefined && state.secondsLeft !== null && state.status === 'COUNTDOWN') {
        setCountdown(state.secondsLeft);
      } else if (state.status === 'WAITING') {
        setCountdown(null);
      }
      if (state.status === 'COUNTDOWN') gameEndedRef.current = false;
    });

    socket.on('maintenance_on', (data) => {
      setIsMaintenance(true);
      if (data?.message) setMaintenanceMsg(data.message);
    });

    socket.on('maintenance_off', () => {
      setIsMaintenance(false);
    });

    socket.on('countdown_tick', ({ secondsLeft }) => setCountdown(secondsLeft));

    socket.on('broadcast_message', ({ message }) => {
      setToastMessage(message);
      setTimeout(() => setToastMessage(''), 8000);
    });

    socket.on('balance_updated', ({ userId, newBalance, withdrawableBalance, hasDeposited }) => {
      setUser(prev => {
        if (prev && String(prev.id) === String(userId)) {
          const bal = parseFloat(newBalance) || 0;
          const updated = { ...prev, balance: bal };
          if (hasDeposited !== undefined) {
            updated.hasDeposited = !!hasDeposited;
            updated.has_deposited = !!hasDeposited;
          }
          if (withdrawableBalance !== undefined) {
            // Enforce invariant: withdrawable can NEVER exceed total balance
            const wb = Math.min(parseFloat(withdrawableBalance) || 0, bal);
            updated.withdrawableBalance = wb;
            updated.withdrawable_balance = wb;
            updated.nonWithdrawableBalance = Math.max(0, bal - wb);
          }
          return updated;
        }
        return prev;
      });
    });

    socket.on('round_ended', () => {
      gameEndedRef.current = true;
      const storedToken = localStorage.getItem('bingo_token');
      if (storedToken) {
        apiFetch('/api/user/profile', { headers: { Authorization: `Bearer ${storedToken}` } })
          .then(r => r.json())
          .then(d => {
            if (d.user) {
              // Always enforce invariant when loading from server
              const bal = parseFloat(d.user.balance) || 0;
              const rawWith = parseFloat(d.user.withdrawableBalance ?? d.user.withdrawable_balance) || 0;
              const wb = Math.min(rawWith, bal);
              setUser(prev => prev ? {
                ...prev,
                ...d.user,
                balance: bal,
                withdrawableBalance: wb,
                withdrawable_balance: wb,
                nonWithdrawableBalance: Math.max(0, bal - wb)
              } : d.user);
            }
          })
          .catch(() => {});
      }
    });

    // NOTE: Do NOT disconnect the module-level socket singleton here.
    // Disconnecting it kills real-time for the entire session.
    return () => {};
  }, []);

  // Track when the last authoritative server sync happened (profile fetch)
  const lastServerSyncRef = React.useRef(0);

  // Periodic profile sync — this is the SOURCE OF TRUTH, always overrides local state
  useEffect(() => {
    const syncProfile = () => {
      if (token) {
        apiFetch('/api/user/profile', { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json())
          .then(d => {
            if (d.user) {
              lastServerSyncRef.current = Date.now();
              // Enforce client-side invariant: withdrawable can never exceed total
              const bal = parseFloat(d.user.balance) || 0;
              const rawWith = parseFloat(d.user.withdrawableBalance ?? d.user.withdrawable_balance) || 0;
              const with_ = Math.min(rawWith, bal);
              setUser(prev => prev ? {
                ...prev,
                ...d.user,
                balance: bal,
                withdrawableBalance: with_,
                withdrawable_balance: with_,
                nonWithdrawableBalance: Math.max(0, bal - with_)
              } : d.user);
            }
          })
          .catch(() => {});
      }
    };
    if (authStatus === 'authenticated') {
      syncProfile();
      // 60s fallback polling (real-time updates arrive instantly via WebSocket balance_updated & round_ended events)
      const interval = setInterval(syncProfile, 60000);
      const onVisible = () => {
        if (!document.hidden) syncProfile();
      };
      document.addEventListener('visibilitychange', onVisible);
      return () => {
        clearInterval(interval);
        document.removeEventListener('visibilitychange', onVisible);
      };
    }
  }, [token, authStatus]);

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('bingo_token');
    setAuthStatus('loading');
    authAttemptedRef.current = false;
    setCurrentView('navbar');
    window.location.reload();
  };

  // Optimistic balance update — only applied if no recent server sync has happened
  // This prevents stale optimistic values from overwriting the authoritative server data
  const handleBalanceUpdate = (newBalance, withdrawableBal) => {
    setUser(prev => {
      if (!prev) return prev;
      const bal = parseFloat(newBalance) || 0;
      const updated = { ...prev, balance: bal };
      if (withdrawableBal !== undefined) {
        // Enforce invariant: withdrawable can never exceed balance
        const wb = Math.min(parseFloat(withdrawableBal) || 0, bal);
        updated.withdrawableBalance = wb;
        updated.withdrawable_balance = wb;
        updated.nonWithdrawableBalance = Math.max(0, bal - wb);
      }
      return updated;
    });
  };

  const getUserTickets = () => {
    if (!user || !gameState?.purchasedTickets) return [];
    return gameState.purchasedTickets.filter(t => String(t.userId) === String(user.id));
  };

  const userTickets = getUserTickets();
  const isGameLocked = gameState?.status === 'DRAWING' && userTickets.length > 0;

  const handleSetView = (newView) => {
    if (isGameLocked && newView !== 'gameplay') {
      return; // Hard lockout during live draw
    }
    setCurrentView(newView);
  };

  // Auto-switch to gameplay when drawing starts ONLY if user bought tickets for this round
  // AND auto-switch back to navbar/lobby when round ends
  useEffect(() => {
    if (
      gameState?.status === 'DRAWING' &&
      currentView !== 'gameplay' &&
      !gameEndedRef.current &&
      userTickets.length > 0
    ) {
      setCurrentView('gameplay');
    } else if (
      currentView === 'gameplay' &&
      (gameState?.status === 'COUNTDOWN' || gameState?.status === 'WAITING')
    ) {
      // Auto-return to navbar/lobby when game finishes
      setCurrentView('navbar');
    }
  }, [gameState?.status, currentView, userTickets.length]);

  const handleBackToLobby = () => {
    if (isGameLocked) return;
    gameEndedRef.current = true;
    setCurrentView('navbar');
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER STATES
  // ─────────────────────────────────────────────────────────────

  // Auth still resolving — show minimal dark loader
  if (authStatus === 'loading') {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#040711',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '50%',
          border: '3px solid #1e293b',
          borderTopColor: '#38bdf8',
          animation: 'spin 0.7s linear infinite'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Inside Telegram but phone not registered
  if (authStatus === 'needs_phone') {
    return <PhoneRegistrationRequired message={gateMessage} />;
  }


  // Not opened via Telegram — do one final live check before showing the redirect screen
  // (Telegram WebApp sometimes injects late, so we verify once more before giving up)
  if (authStatus === 'not_telegram') {
    const wa = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
    const hasTgContext = !!(wa?.initData || wa?.initDataUnsafe?.user);
    if (hasTgContext && !authAttemptedRef.current) {
      // Race condition: Telegram injected AFTER the retry loop ended — restart auth
      authAttemptedRef.current = false;
      setAuthStatus('loading');
    }
    if (hasTgContext) {
      // Still in Telegram but auth somehow set not_telegram — go back to loading
      return (
        <div style={{
          minHeight: '100vh', background: '#040711',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            border: '3px solid #1e293b', borderTopColor: '#38bdf8',
            animation: 'spin 0.7s linear infinite'
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      );
    }

    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #070b14 0%, #0c1528 60%, #0a1220 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px',
        fontFamily: "'Bricolage Grotesque', sans-serif",
        textAlign: 'center',
        color: '#fff',
        boxSizing: 'border-box',
        gap: '0'
      }}>
        <div style={{ fontSize: '72px', marginBottom: '18px', lineHeight: 1 }}>🎰</div>

        <h1 style={{
          fontSize: '28px',
          fontWeight: '900',
          margin: '0 0 8px',
          background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          BingoX
        </h1>

        <p style={{
          fontSize: '13px',
          color: '#64748b',
          fontWeight: '600',
          letterSpacing: '1px',
          textTransform: 'uppercase',
          margin: '0 0 28px'
        }}>
          Ethiopian Live Bingo
        </p>

        <div style={{
          background: 'rgba(56, 189, 248, 0.06)',
          border: '1px solid rgba(56, 189, 248, 0.2)',
          borderRadius: '18px',
          padding: '20px 24px',
          maxWidth: '320px',
          marginBottom: '28px'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>📱</div>
          <p style={{
            color: '#cbd5e1',
            fontSize: '14px',
            lineHeight: '1.7',
            margin: 0
          }}>
            BingoX is a <strong>Telegram Mini App</strong>.<br />
            Open it through the bot to play.
          </p>
          {gateMessage ? (
            <p style={{ color: '#f87171', fontSize: '12px', marginTop: '10px', marginBottom: 0 }}>
              {gateMessage}
            </p>
          ) : null}
        </div>

        <a
          href="https://t.me/bingox2019_bot"
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            background: 'linear-gradient(135deg, #2481cc, #1a6aaa)',
            color: '#fff',
            textDecoration: 'none',
            padding: '14px 32px',
            borderRadius: '50px',
            fontSize: '15px',
            fontWeight: '800',
            boxShadow: '0 8px 28px rgba(36, 129, 204, 0.4)',
            letterSpacing: '0.3px'
          }}
        >
          🚀 Open @bingox2019_bot
        </a>

        <p style={{
          marginTop: '20px',
          color: '#334155',
          fontSize: '12px'
        }}>
          Tap the bot → tap <strong>🎮 PLAY BINGO</strong>
        </p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // MAINTENANCE MODE SCREEN
  // ─────────────────────────────────────────────────────────────
  if (isMaintenance) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #090d16 0%, #060a14 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        color: '#fff',
        fontFamily: "'Bricolage Grotesque', sans-serif",
        textAlign: 'center'
      }}>
        <div style={{
          width: '84px',
          height: '84px',
          borderRadius: '26px',
          background: 'rgba(245, 158, 11, 0.12)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '42px',
          marginBottom: '20px',
          boxShadow: '0 0 32px rgba(245, 158, 11, 0.25)'
        }}>
          🛠️
        </div>

        <h2 style={{
          fontSize: '22px',
          fontWeight: '800',
          color: '#f8fafc',
          margin: '0 0 10px',
          letterSpacing: '-0.3px'
        }}>
          System Under Maintenance
        </h2>

        <p style={{
          color: '#94a3b8',
          fontSize: '14px',
          maxWidth: '340px',
          lineHeight: '1.6',
          margin: '0 0 24px'
        }}>
          {maintenanceMsg || 'We are currently performing scheduled maintenance and system upgrades. Live games, deposits, and withdrawals are temporarily paused.'}
        </p>

        <div style={{
          background: 'rgba(56, 189, 248, 0.08)',
          border: '1px solid rgba(56, 189, 248, 0.22)',
          borderRadius: '14px',
          padding: '12px 20px',
          fontSize: '12px',
          color: '#38bdf8',
          fontWeight: '600'
        }}>
          🔒 All player balances and data are completely safe.
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // MAIN GAME UI
  // ─────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', paddingBottom: '74px', background: '#090d16', color: '#fff' }}>
      <Navbar
        user={user}
        currentView={currentView}
        setCurrentView={handleSetView}
        onLogout={handleLogout}
        isGameLocked={isGameLocked}
      />

      {/* Toast Announcement */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '56px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          background: '#2481cc',
          color: '#ffffff',
          padding: '10px 18px',
          borderRadius: '12px',
          boxShadow: '0 4px 14px rgba(36, 129, 204, 0.3)',
          maxWidth: '90vw',
          fontSize: '13px',
          fontWeight: '800',
          textAlign: 'center'
        }}>
          📢 {toastMessage}
        </div>
      )}

      {(currentView === 'navbar' || currentView === 'lobby') && (
        <LobbyView
          user={user}
          gameState={gameState}
          countdown={countdown}
          token={token}
          onTicketPurchased={handleBalanceUpdate}
          onGoToGameplay={() => handleSetView('gameplay')}
          onGoToWallet={() => handleSetView('wallet')}
        />
      )}

      {currentView === 'gameplay' && (
        <GameplayView
          user={user}
          gameState={gameState}
          userTickets={userTickets}
          socket={socket}
          onBackToLobby={handleBackToLobby}
          onGoToWallet={() => handleSetView('wallet')}
        />
      )}

      {currentView === 'wallet' && (
        <WalletView
          user={user}
          token={token}
          socket={socket}
          onBalanceUpdated={handleBalanceUpdate}
        />
      )}

      {(currentView === 'task' || currentView === 'tasks') && (
        <TaskView
          user={user}
          token={token}
          onBalanceUpdated={handleBalanceUpdate}
          onGoToWallet={() => handleSetView('wallet')}
        />
      )}

      {(currentView === 'invite' || currentView === 'referral') && (
        <ReferralView
          user={user}
          token={token}
        />
      )}

      {currentView === 'profile' && (
        <ProfileView
          user={user}
          token={token}
          onBalanceUpdated={handleBalanceUpdate}
        />
      )}

    </div>
  );
}


