import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Clock, Users, Zap, CheckCircle2, ArrowLeft } from 'lucide-react';
import MasterBoard from '../components/MasterBoard';
import CartellaCard from '../components/CartellaCard';

const LETTER_COLORS = {
  B: '#ef4444',
  I: '#f59e0b',
  N: '#10b981',
  G: '#38bdf8',
  O: '#a855f7'
};

const getBallLetter = num => {
  if (!num) return 'B';
  if (num <= 15) return 'B';
  if (num <= 30) return 'I';
  if (num <= 45) return 'N';
  if (num <= 60) return 'G';
  return 'O';
};

export default function GameplayView({
  user,
  gameState,
  userTickets = [],
  socket,
  onBackToLobby,
  onGoToWallet
}) {
  const initialLastBall = gameState?.lastCalledBall
    ? { number: gameState.lastCalledBall, letter: getBallLetter(gameState.lastCalledBall) }
    : null;

  const [calledNumbers, setCalledNumbers] = useState(gameState?.calledNumbers || []);
  const [lastBall, setLastBall] = useState(initialLastBall);
  const [winnerData, setWinnerData] = useState(null);
  const [redirectSec, setRedirectSec] = useState(null);
  const confettiFired = useRef(false);

  // calledSet for rendering the cartella — always include FREE (0)
  const calledSet = new Set(calledNumbers);
  calledSet.add(0);

  // ── Socket listeners ──
  useEffect(() => {
    if (!socket) return;

    const onBallDrawn = data => {
      const drawnLetter = data.letter || getBallLetter(data.number);
      setLastBall({ number: data.number, letter: drawnLetter });
      setCalledNumbers(data.calledNumbers || []);
    };

    const onRoundEnded = data => {
      setWinnerData(data);
      setRedirectSec(6);
      if (!confettiFired.current && data.winners?.some(w => String(w.userId) === String(user?.id))) {
        confettiFired.current = true;
        confetti({ particleCount: 200, spread: 100, origin: { y: 0.4 }, colors: ['#38bdf8', '#10b981', '#fbbf24'] });
        setTimeout(() =>
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.5 }, colors: ['#38bdf8', '#0284c7'] }), 600
        );
      }
    };

    const onRoundState = state => {
      if (state.calledNumbers) setCalledNumbers(state.calledNumbers);
      if (state.lastCalledBall) {
        setLastBall({ number: state.lastCalledBall, letter: getBallLetter(state.lastCalledBall) });
      }
    };

    socket.on('ball_drawn', onBallDrawn);
    socket.on('round_ended', onRoundEnded);
    socket.on('round_state', onRoundState);

    return () => {
      socket.off('ball_drawn', onBallDrawn);
      socket.off('round_ended', onRoundEnded);
      socket.off('round_state', onRoundState);
    };
  }, [socket, user]);

  // ── 6-second auto-redirect countdown ──
  useEffect(() => {
    if (redirectSec === null) return;
    if (redirectSec <= 0) {
      onBackToLobby();
      return;
    }
    const t = setTimeout(() => setRedirectSec(prev => (prev !== null && prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearTimeout(t);
  }, [redirectSec, onBackToLobby]);

  const lastBallColor = lastBall ? (LETTER_COLORS[lastBall.letter] || '#38bdf8') : '#38bdf8';
  const isWinner = winnerData?.winners?.some(w => String(w.userId) === String(user?.id));

  return (
    <div
      style={{
        position: 'fixed',
        top: '48px',
        left: 0,
        right: 0,
        bottom: '62px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        padding: '6px 8px',
        boxSizing: 'border-box',
        maxWidth: '1100px',
        margin: '0 auto'
      }}
    >
      {/* ── TOP HUD BANNER (Dark midnight banner, crisp WHITE metric boxes inside) ── */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(17, 26, 46, 0.98) 0%, rgba(13, 20, 38, 0.98) 100%)',
          borderRadius: '14px',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          padding: '6px 8px',
          marginBottom: '6px',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr 1fr',
          gap: '6px',
          flexShrink: 0
        }}
      >
        {/* 1. PRIZE (White Box) */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '10px',
            padding: '5px 3px',
            border: '1px solid #e2e8f0',
            textAlign: 'center',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)'
          }}
        >
          <div style={{ fontSize: '8.5px', color: '#64748b', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
            <Trophy size={9} color="#059669" /> PRIZE
          </div>
          <div style={{ fontSize: '13px', fontWeight: '900', color: '#059669', lineHeight: 1.1 }}>
            {(gameState?.prizePool || 0).toFixed(0)} <span style={{ fontSize: '8px', opacity: 0.85 }}>ETB</span>
          </div>
        </div>

        {/* 2. PLAYERS (White Box) */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '10px',
            padding: '5px 3px',
            border: '1px solid #e2e8f0',
            textAlign: 'center',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)'
          }}
        >
          <div style={{ fontSize: '8.5px', color: '#64748b', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
            <Users size={9} color="#0284c7" /> PLAYERS
          </div>
          <div style={{ fontSize: '13px', fontWeight: '900', color: '#0284c7', lineHeight: 1.1 }}>
            {gameState?.totalTickets || 1}
          </div>
        </div>

        {/* 3. STAKE (White Box) */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '10px',
            padding: '5px 3px',
            border: '1px solid #e2e8f0',
            textAlign: 'center',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)'
          }}
        >
          <div style={{ fontSize: '8.5px', color: '#64748b', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
            <Zap size={9} color="#7c3aed" /> STAKE
          </div>
          <div style={{ fontSize: '13px', fontWeight: '900', color: '#7c3aed', lineHeight: 1.1 }}>
            {(gameState?.ticketPrice || 10).toFixed(0)} <span style={{ fontSize: '8px', opacity: 0.85 }}>ETB</span>
          </div>
        </div>

        {/* 4. CALLED COUNT (White Box) */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '10px',
            padding: '5px 3px',
            border: '1px solid #e2e8f0',
            textAlign: 'center',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)'
          }}
        >
          <div style={{ fontSize: '8.5px', color: '#64748b', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
            🎱 CALLED
          </div>
          <div style={{ fontSize: '13px', fontWeight: '900', color: '#0f172a', lineHeight: 1.1 }}>
            {calledNumbers.length} <span style={{ fontSize: '8px', color: '#64748b' }}>/75</span>
          </div>
        </div>
      </div>

      {/* ── FIXED MAIN GAMEPLAY LAYOUT (NO SCROLLING) ── */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'row',
          gap: '6px',
          overflow: 'hidden'
        }}
      >
        
        {/* LEFT: MASTER BOARD */}
        <div
          style={{
            flex: '1 1 50%',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            padding: '4px',
            borderRadius: '14px',
            overflow: 'hidden',
            background: '#111a2e',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          <div style={{ fontSize: '9px', fontWeight: '800', color: '#94a3b8', textAlign: 'center', letterSpacing: '0.5px', marginBottom: '2px' }}>
            MASTER BOARD (1–75)
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <MasterBoard calledNumbers={calledNumbers} />
          </div>
        </div>

        {/* RIGHT: LIVE BALL CALLER & ALL CARTELAS (ONE DOWN/STACKED) */}
        <div
          style={{
            flex: '0 0 50%',
            minWidth: 0,
            maxWidth: '320px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            overflow: 'hidden'
          }}
        >
          
          {/* ── LIVE BALL CALLER CONTAINER ── */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(17, 26, 46, 0.98) 0%, rgba(13, 20, 38, 0.98) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '6px 8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
              flexShrink: 0
            }}
          >
            <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#ef4444',
                    boxShadow: '0 0 6px #ef4444',
                    animation: 'radarBeacon 1.2s infinite'
                  }}
                />
                <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: '800' }}>
                  LIVE BALL
                </span>
              </div>

              <span style={{ fontSize: '10px', color: '#38bdf8', fontWeight: '800' }}>
                Active Draw
              </span>
            </div>

            {/* Glossy 3D Live Ball Display */}
            {lastBall ? (
              <div
                key={lastBall.number}
                className="bingo-3d-ball"
                style={{
                  width: '44px',
                  height: '44px',
                  margin: '1px 0 2px',
                  background: `radial-gradient(circle at 35% 30%, #ffffff 0%, ${lastBallColor} 45%, #050505 100%)`,
                  border: `2px solid rgba(255, 255, 255, 0.4)`,
                  boxShadow: `0 0 16px ${lastBallColor}88, 0 4px 10px rgba(0,0,0,0.5)`
                }}
              >
                <span
                  style={{
                    fontSize: '9px',
                    color: '#000000',
                    lineHeight: 1,
                    fontWeight: '900',
                    background: 'rgba(255, 255, 255, 0.95)',
                    padding: '1px 5px',
                    borderRadius: '8px',
                    marginBottom: '1px'
                  }}
                >
                  {lastBall.letter}
                </span>
                <span style={{ fontSize: '15px', color: '#ffffff', lineHeight: 1, fontWeight: '900' }}>
                  {lastBall.number}
                </span>
              </div>
            ) : (
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1.5px dashed rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '1px 0 2px'
                }}
              >
                <span style={{ fontSize: '9px', color: '#64748b', fontWeight: '800' }}>Wait...</span>
              </div>
            )}

            {/* ── RECENT CALLED BALLS RIBBON ── */}
            <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '3px', overflowX: 'auto', paddingTop: '3px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <span style={{ fontSize: '8px', color: '#64748b', fontWeight: '800', flexShrink: 0 }}>REC:</span>
              {calledNumbers.length === 0 ? (
                <span style={{ fontSize: '8.5px', color: '#64748b' }}>...</span>
              ) : (
                [...calledNumbers].reverse().slice(0, 8).map((n, i) => {
                  const letter = getBallLetter(n);
                  const col = LETTER_COLORS[letter] || '#38bdf8';
                  return (
                    <span
                      key={n}
                      style={{
                        flexShrink: 0,
                        padding: '1px 5px',
                        borderRadius: '5px',
                        fontSize: '9px',
                        fontWeight: '900',
                        background: i === 0 ? col : 'rgba(255, 255, 255, 0.06)',
                        color: i === 0 ? '#000000' : col,
                        border: i === 0 ? 'none' : `1px solid ${col}44`
                      }}
                    >
                      {letter}{n}
                    </span>
                  );
                })
              )}
            </div>
          </div>

          {/* ── CARTELLA DISPLAY: BOTH CARTELAS SHOWN ONE AFTER DOWN ── */}
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
            {userTickets.length > 0 ? (
              userTickets.map(tk => (
                <div key={tk.cartellaIndex} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '8.5px', color: '#38bdf8', fontWeight: '800', textAlign: 'center', marginBottom: '1px' }}>
                    Cartela #{tk.cartellaIndex}
                  </div>
                  <div style={{ flex: 1, minHeight: 0 }}>
                    <CartellaCard
                      id={tk.cartellaIndex}
                      grid={tk.grid || []}
                      calledSet={calledSet}
                      price={gameState?.ticketPrice || 10}
                      compact
                    />
                  </div>
                </div>
              ))
            ) : (
              <div
                style={{
                  height: '100%',
                  background: 'linear-gradient(180deg, rgba(17, 26, 46, 0.95) 0%, rgba(10, 15, 30, 0.98) 100%)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  textAlign: 'center',
                  padding: '12px',
                  boxSizing: 'border-box'
                }}
              >
                <div
                  style={{
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid rgba(56, 189, 248, 0.35)',
                    padding: '4px 12px',
                    borderRadius: '16px',
                    fontSize: '11px',
                    fontWeight: '800',
                    color: '#38bdf8'
                  }}
                >
                  👀 Spectator
                </div>

                <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0, lineHeight: 1.3 }}>
                  Watching live draw.
                </p>

                <button
                  type="button"
                  onClick={onBackToLobby}
                  style={{
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    border: 'none',
                    color: '#ffffff',
                    padding: '7px 14px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: '800',
                    cursor: 'pointer'
                  }}
                >
                  ← Next Cartela
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── WINNER ANNOUNCEMENT MODAL ── */}
      {winnerData && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.88)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            style={{
              background: 'linear-gradient(180deg, rgba(18, 28, 50, 0.99) 0%, rgba(10, 15, 30, 1) 100%)',
              borderRadius: '24px',
              padding: '24px 20px',
              border: `2px solid ${isWinner ? '#10b981' : 'rgba(255, 255, 255, 0.15)'}`,
              textAlign: 'center',
              maxWidth: '380px',
              width: '100%',
              boxShadow: isWinner ? '0 0 40px rgba(16, 185, 129, 0.4)' : '0 20px 40px rgba(0, 0, 0, 0.7)'
            }}
          >
            <div style={{ fontSize: '44px', marginBottom: '6px', lineHeight: 1 }}>
              {isWinner ? '🏆' : '🎉'}
            </div>

            <h2
              style={{
                fontSize: '19px',
                fontWeight: '900',
                color: isWinner ? '#34d399' : '#ffffff',
                marginBottom: '6px'
              }}
            >
              {isWinner ? 'Congratulations! You Won! 🎉' : 'Round Completed!'}
            </h2>

            <div style={{ fontSize: '12.5px', color: '#cbd5e1', fontWeight: '700', marginBottom: '14px', lineHeight: 1.4 }}>
              {winnerData.winners?.map((w, i) => (
                <div key={i} style={{ marginBottom: '4px' }}>
                  <span style={{ color: '#38bdf8', fontWeight: '900' }}>
                    {w.username} (#{w.cartellaIndex})
                  </span>
                  {' '}— <span style={{ color: '#10b981', fontWeight: '900' }}>
                    {(winnerData.splitPrizePerWinner || 0).toFixed(0)} ETB
                  </span>
                </div>
              ))}
            </div>

            {/* Auto-redirect Countdown */}
            <div
              style={{
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: '12px',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Clock size={14} color="#38bdf8" />
              <span style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: '800' }}>
                Returning to Lobby in{' '}
                <span style={{ fontSize: '14px', color: '#38bdf8', fontWeight: '900' }}>{redirectSec ?? 6}</span>s
              </span>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
