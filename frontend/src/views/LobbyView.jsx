import React, { useState, useEffect, useRef } from 'react';
import { Wallet, Trophy, Users, Clock, AlertCircle, Sparkles, CheckCircle2, ShieldAlert } from 'lucide-react';
import { apiFetch } from '../api';

export default function LobbyView({
  user,
  gameState,
  countdown,
  token,
  onTicketPurchased,
  onGoToGameplay,
  onGoToWallet
}) {
  const [errMsg, setErrMsg] = useState('');
  const [localMyCartellas, setLocalMyCartellas] = useState(null);
  const purchasingRef = useRef(new Set());

  // Build a map of purchased tickets: { cartellaIndex -> userId }
  const purchasedMap = {};
  const uniquePlayers = new Set();

  if (gameState?.purchasedTickets) {
    gameState.purchasedTickets.forEach(tk => {
      purchasedMap[tk.cartellaIndex] = tk.userId;
      if (tk.userId) uniquePlayers.add(String(tk.userId));
    });
  }

  // Server-authoritative my cartellas
  const serverMyCartellas = gameState?.purchasedTickets
    ? gameState.purchasedTickets
        .filter(t => String(t.userId) === String(user?.id))
        .map(t => t.cartellaIndex)
    : [];

  // Use local state for instant feedback, sync when server updates
  const myCartellas = localMyCartellas !== null ? localMyCartellas : serverMyCartellas;

  useEffect(() => {
    setLocalMyCartellas(serverMyCartellas);
  }, [JSON.stringify(serverMyCartellas)]);

  const price = 10; // Fixed 10 ETB per Cartela
  const balance = parseFloat(user?.balance) || 0;
  const totalPrize = gameState?.prizePool !== undefined ? gameState.prizePool : (gameState?.totalTickets || 0) * price * 0.8;
  const selectedCartelasCount = gameState?.totalTickets !== undefined
    ? gameState.totalTickets
    : (gameState?.purchasedTickets ? gameState.purchasedTickets.length : Object.keys(purchasedMap).length);
  const isDrawing = gameState?.status === 'DRAWING';
  const isCountdown = gameState?.status === 'COUNTDOWN';
  const currentSec = countdown !== null ? countdown : (gameState?.secondsLeft ?? 50);

  const handleCartellaClick = async (index) => {
    if (isDrawing) return; // Cannot change during drawing
    setErrMsg('');

    const isMine = myCartellas.includes(index);
    const ownerId = purchasedMap[index];
    const isTaken = !!ownerId && String(ownerId) !== String(user?.id);

    // UNSELECT
    if (isMine) {
      const updated = myCartellas.filter(i => i !== index);
      setLocalMyCartellas(updated);
      if (onTicketPurchased) onTicketPurchased(balance + price);

      if (user?.isGuest) {
        return;
      }

      try {
        const res = await apiFetch('/api/game/unselect-ticket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ cartellaIndex: index })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to unselect cartela');
        if (onTicketPurchased && data.newBalance !== undefined) {
          onTicketPurchased(data.newBalance, data.withdrawableBalance);
        }
      } catch (err) {
        setErrMsg(err.message);
        setTimeout(() => setErrMsg(''), 2500);
        setLocalMyCartellas(myCartellas); // rollback
      }
      return;
    }

    // Block if taken by someone else
    if (isTaken) {
      setErrMsg(`Cartela #${index} is already taken.`);
      setTimeout(() => setErrMsg(''), 2000);
      return;
    }

    // Block if this cartella is already being purchased (in-flight)
    if (purchasingRef.current.has(index)) return;

    // Max cartellas check — 2 cartellas limit per round
    const effectiveCount = myCartellas.length + purchasingRef.current.size;
    if (effectiveCount >= 2) {
      setErrMsg('You can select a maximum of 2 Cartelas per round.');
      setTimeout(() => setErrMsg(''), 2500);
      return;
    }

    // Balance check
    if (balance < price) {
      setErrMsg(`Insufficient balance (10 ETB required) — please top up your wallet.`);
      setTimeout(() => setErrMsg(''), 3000);
      return;
    }

    // INSTANT SELECT (Zero lag optimistic update)
    purchasingRef.current.add(index);
    const updated = [...myCartellas, index];
    setLocalMyCartellas(updated);
    if (onTicketPurchased) onTicketPurchased(Math.max(0, balance - price));

    if (user?.isGuest) {
      purchasingRef.current.delete(index);
      return;
    }

    try {
      const res = await apiFetch('/api/game/buy-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ cartellaIndex: index })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to select cartela');
      if (onTicketPurchased && data.newBalance !== undefined) {
        onTicketPurchased(data.newBalance, data.withdrawableBalance);
      }
    } catch (err) {
      setErrMsg(err.message);
      setTimeout(() => setErrMsg(''), 2500);
      setLocalMyCartellas(myCartellas); // rollback
    } finally {
      purchasingRef.current.delete(index);
    }
  };

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
        boxSizing: 'border-box'
      }}
    >
      {/* ── FLOATING HIGHLIGHT PROMPT ALERT (DOES NOT MOVE LAYOUT) ── */}
      {errMsg && (
        <div
          style={{
            position: 'fixed',
            top: '56px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 999999,
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            border: '1px solid rgba(255, 255, 255, 0.4)',
            color: '#ffffff',
            padding: '8px 18px',
            borderRadius: '24px',
            fontSize: '12px',
            fontWeight: '800',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 8px 24px rgba(239, 68, 68, 0.5), 0 0 16px rgba(239, 68, 68, 0.4)',
            maxWidth: '90vw',
            pointerEvents: 'none',
            whiteSpace: 'nowrap'
          }}
        >
          <AlertCircle size={15} color="#ffffff" />
          <span>{errMsg}</span>
        </div>
      )}

      {/* ── FIXED TOP BANNER (Dark background, White metric boxes inside) ── */}
      <div
        style={{
          flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(17, 26, 46, 0.98) 0%, rgba(13, 20, 38, 0.98) 100%)',
          borderBottom: '1px solid rgba(56, 189, 248, 0.25)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.45)',
          padding: '10px 12px',
          zIndex: 100
        }}
      >
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>
          
          {/* 3 Metric Cards with Clean WHITE Background */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', textAlign: 'center' }}>
            
            {/* 1. COUNTDOWN (White Box) */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '12px',
                padding: '6px 4px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)'
              }}
            >
              <div style={{ fontSize: '9px', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', marginBottom: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                <Clock size={10} color="#f59e0b" />
                Game starts in
              </div>
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: '900',
                  color: currentSec <= 10 ? '#ef4444' : '#d97706',
                  lineHeight: 1.1,
                  letterSpacing: '-0.3px'
                }}
              >
                {isDrawing ? 'DRAWING' : `${currentSec}s`}
              </div>
            </div>

            {/* 2. PLAYERS / SELECTED CARTELAS (White Box) */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '12px',
                padding: '6px 4px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)'
              }}
            >
              <div style={{ fontSize: '9px', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', marginBottom: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                <Users size={10} color="#0284c7" />
                Players
              </div>
              <div style={{ fontSize: '16px', fontWeight: '900', color: '#0284c7', lineHeight: 1.1 }}>
                {selectedCartelasCount}
              </div>
            </div>

            {/* 3. TOTAL PRIZE (White Box) */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '12px',
                padding: '6px 4px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)'
              }}
            >
              <div style={{ fontSize: '9px', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', marginBottom: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                <Trophy size={10} color="#059669" />
                Total Prize
              </div>
              <div style={{ fontSize: '16px', fontWeight: '900', color: '#059669', lineHeight: 1.1 }}>
                {parseFloat(totalPrize || 0).toFixed(0)} <span style={{ fontSize: '9.5px', opacity: 0.85 }}>ETB</span>
              </div>
            </div>

          </div>

          {/* Spectator Prompt if live drawing */}
          {isDrawing && serverMyCartellas.length === 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: '8px',
                padding: '6px 10px',
                marginTop: '6px'
              }}
            >
              <div style={{ fontSize: '11px', color: '#38bdf8', fontWeight: '800' }}>
                🔴 Live game in progress
              </div>
              <button
                type="button"
                onClick={onGoToGameplay}
                style={{
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  border: 'none',
                  color: '#ffffff',
                  padding: '4px 12px',
                  borderRadius: '6px',
                  fontSize: '10.5px',
                  fontWeight: '800',
                  cursor: 'pointer'
                }}
              >
                Watch Live →
              </button>
            </div>
          )}

        </div>
      </div>

      {/* ── SCROLLABLE CARTELA BOARD (200 TILES, 8 PER ROW) ── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 10px 16px',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>
          <div className="cartella-grid-container">
            {Array.from({ length: 200 }, (_, i) => i + 1).map(num => {
              const isMine = myCartellas.includes(num);
              const ownerId = purchasedMap[num];
              const isTaken = !!ownerId && String(ownerId) !== String(user?.id);

              let itemClass = 'cartella-grid-item';
              if (isMine) itemClass += ' mine';
              else if (isTaken) itemClass += ' taken';
              if (isDrawing && !isMine) itemClass += ' disabled';

              return (
                <div
                  key={num}
                  className={itemClass}
                  onClick={() => handleCartellaClick(num)}
                >
                  {num}
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}
