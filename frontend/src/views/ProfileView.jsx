import React, { useState, useEffect } from 'react';
import { User, Phone, AtSign, ShieldCheck, Flame, Crown, Hash, Star, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiFetch } from '../api';

// Format and validate phone numbers
function formatPhone(phone) {
  if (!phone) return null;
  const s = String(phone).trim();
  if (s.startsWith('tg_') || s.startsWith('web_')) return null;
  // Ethiopian local format: 09xxxxxxxx or 07xxxxxxxx -> +251 9x xxx xxxx
  if (/^0[79]\d{8}$/.test(s)) {
    return `+251 ${s.slice(1, 3)} ${s.slice(3, 6)} ${s.slice(6)}`;
  }
  // Ethiopian international format: +2519xxxxxxxx or +2517xxxxxxxx
  if (/^\+251[79]\d{8}$/.test(s)) {
    return `+251 ${s.slice(4, 6)} ${s.slice(6, 9)} ${s.slice(9)}`;
  }
  // 2519xxxxxxxx without +
  if (/^251[79]\d{8}$/.test(s)) {
    return `+251 ${s.slice(3, 5)} ${s.slice(5, 8)} ${s.slice(8)}`;
  }
  if (s.length >= 9 && !s.startsWith('tg_')) return s;
  return null;
}

export default function ProfileView({ user, token, onBalanceUpdated }) {
  const [profile, setProfile] = useState(null);
  const [streakData, setStreakData] = useState(null);
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimMsg, setClaimMsg] = useState('');
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (!token) return;
    apiFetch('/api/user/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(d => {
        if (d.user) { setProfile(d.user); if (d.user.streak) setStreakData(d.user.streak); }
      })
      .catch(() => {});

    apiFetch('/api/user/streak', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(d => { if (d.streak) setStreakData(d.streak); })
      .catch(() => {});
  }, [token]);

  // Merge: API profile (source of truth) + fallback to prop user + Telegram WebApp
  const p = profile || user || {};
  const wa = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
  const tgUser = wa?.initDataUnsafe?.user || null;

  // Also check localStorage cache
  let cachedTg = null;
  try {
    const raw = localStorage.getItem('bingo_tg_user');
    if (raw) cachedTg = JSON.parse(raw);
  } catch (e) {}

  const liveTg = tgUser || cachedTg || {};

  // Profile fields — API data is the source of truth (synced on each login)
  const firstName = p.first_name || liveTg.first_name || '';
  const lastName = p.last_name || liveTg.last_name || '';
  const fullName = p.full_name ||
    [firstName, lastName].filter(Boolean).join(' ') ||
    p.username || 'Player';

  const photoUrl = p.photo_url || liveTg.photo_url || null;

  const tgRawUsername = liveTg.username || p.username || '';
  const tgUsername = tgRawUsername
    ? (tgRawUsername.startsWith('@') ? tgRawUsername : `@${tgRawUsername}`)
    : null;

  const telegramId = String(liveTg.id || p.telegram_id || p.telegramId || '');
  const isPremium = !!(liveTg.is_premium || p.is_premium);

  // Phone: check all sources (API response, prop user, or Telegram contact)
  const rawPhone = p.phone || user?.phone || liveTg.phone_number || '';
  const displayPhone = formatPhone(rawPhone);


  // Streak
  const currentStreak = streakData?.currentStreak || p?.streak?.currentStreak || 0;
  const isClaimedToday = streakData?.isClaimedToday ?? p?.streak?.isClaimedToday ?? false;
  const nextClaimDay = streakData?.nextClaimDay || p?.streak?.nextClaimDay || 1;
  const streakDays = [1, 2, 3, 4, 5, 6, 7];

  const handleClaimStreak = async () => {
    if (!token || isClaimedToday || claimLoading) return;
    setClaimLoading(true);
    try {
      const res = await apiFetch('/api/user/streak/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to claim streak');
      if (data.streak) setStreakData(data.streak);
      if (onBalanceUpdated && data.newBalance !== undefined) {
        onBalanceUpdated(data.newBalance);
      }
      setClaimMsg(`🎉 Claimed +${data.reward || nextClaimDay} ETB to wallet!`);
      setTimeout(() => setClaimMsg(''), 3500);
    } catch (err) {
      setClaimMsg(`⚠️ ${err.message}`);
      setTimeout(() => setClaimMsg(''), 3000);
    } finally {
      setClaimLoading(false);
    }
  };

  const InfoRow = ({ icon, label, value, valueColor, valueStyle, small }) => (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.05)'
    }}>
      <span style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '7px', flexShrink: 0 }}>
        {icon} {label}
      </span>
      <span style={{
        fontSize: small ? '11px' : '13px',
        fontWeight: '700',
        color: valueColor || '#ffffff',
        textAlign: 'right',
        maxWidth: '55%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        ...valueStyle
      }}>
        {value}
      </span>
    </div>
  );

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex', flexDirection: 'column',
        background: '#080d1a', color: '#ffffff',
        overflow: 'hidden', paddingTop: '54px', paddingBottom: '68px',
        boxSizing: 'border-box'
      }}
    >
      <div
        style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          maxWidth: '480px', width: '100%', margin: '0 auto',
          padding: '10px 12px 0', gap: '10px',
          overflowY: 'auto', overflowX: 'hidden', boxSizing: 'border-box'
        }}
      >

        {/* ── TELEGRAM PROFILE HERO ── */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(17,26,46,0.98) 0%, rgba(13,20,38,0.98) 100%)',
            borderRadius: '18px', padding: '16px',
            border: '1px solid rgba(56,189,248,0.2)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', gap: '14px',
            position: 'relative', flexShrink: 0
          }}
        >
          {/* Badges */}
          <div style={{ position: 'absolute', top: '10px', right: '12px', display: 'flex', gap: '5px' }}>
            {isPremium && (
              <div style={{ background: 'rgba(236,72,153,0.2)', border: '1px solid rgba(236,72,153,0.4)', color: '#f472b6', padding: '2px 7px', borderRadius: '12px', fontSize: '10px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Crown size={10} /> Premium
              </div>
            )}
            {p?.isAdmin && (
              <div style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)', color: '#c084fc', padding: '2px 7px', borderRadius: '12px', fontSize: '10px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <ShieldCheck size={10} /> Admin
              </div>
            )}
          </div>

          {/* Avatar */}
          {photoUrl && !imgError ? (
            <img
              src={photoUrl} alt={fullName}
              onError={() => setImgError(true)}
              style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '2.5px solid #38bdf8', boxShadow: '0 0 16px rgba(56,189,248,0.45)', flexShrink: 0 }}
            />
          ) : (
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
              color: '#080d1a', fontWeight: '900', fontSize: '26px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 16px rgba(56,189,248,0.45)',
              border: '2px solid rgba(255,255,255,0.25)', flexShrink: 0
            }}>
              {fullName.charAt(0).toUpperCase()}
            </div>
          )}

          {/* Name + username */}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '17px', fontWeight: '900', color: '#ffffff', lineHeight: 1.1, marginBottom: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {fullName}
            </div>
            {tgUsername && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)', color: '#38bdf8', padding: '2px 8px', borderRadius: '12px', fontSize: '11.5px', fontWeight: '800' }}>
                <AtSign size={11} /> {tgUsername}
              </div>
            )}
            {!tgUsername && (
              <div style={{ fontSize: '11px', color: '#64748b' }}>No username set</div>
            )}
          </div>
        </div>

        {/* ── TELEGRAM DETAILS ── */}
        <div
          style={{
            background: 'rgba(17,26,46,0.95)', borderRadius: '16px',
            padding: '4px 16px', border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 2px 10px rgba(0,0,0,0.3)', flexShrink: 0
          }}
        >
          <div style={{ fontSize: '10px', fontWeight: '800', color: '#38bdf8', letterSpacing: '1.5px', textTransform: 'uppercase', padding: '10px 0 2px' }}>
            Telegram Info
          </div>

          {firstName ? <InfoRow icon={<User size={14} color="#38bdf8" />} label="First Name" value={firstName} /> : null}
          {lastName ? <InfoRow icon={<User size={14} color="#a855f7" />} label="Last Name" value={lastName} /> : null}
          <InfoRow
            icon={<User size={14} color="#38bdf8" />}
            label="Full Name"
            value={fullName}
          />
          <InfoRow
            icon={<AtSign size={14} color="#a855f7" />}
            label="Username"
            value={tgUsername || 'Not set'}
            valueColor={tgUsername ? '#38bdf8' : '#64748b'}
          />
          <InfoRow
            icon={<Hash size={14} color="#10b981" />}
            label="Telegram ID"
            value={telegramId || 'N/A'}
            valueColor="#34d399"
          />
          <InfoRow
            icon={<Phone size={14} color={displayPhone ? '#10b981' : '#f59e0b'} />}
            label="Phone"
            value={displayPhone || '⚠️ Share via @bingox2019_bot'}
            valueColor={displayPhone ? '#ffffff' : '#f59e0b'}
            small={!displayPhone}
          />
          {isPremium && (
            <InfoRow
              icon={<Crown size={14} color="#f472b6" />}
              label="Status"
              value="Telegram Premium ⭐"
              valueColor="#f472b6"
            />
          )}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '8px 0', fontSize: '10px',
            color: displayPhone ? '#34d399' : '#f59e0b', fontWeight: '600'
          }}>
            {displayPhone
              ? <><CheckCircle2 size={12} /> Phone verified via Telegram Bot</>
              : <><AlertCircle size={12} /> Open @bingox2019_bot → Share Phone Number to verify</>}
          </div>
        </div>

        {/* ── DAILY STREAK SLIDE ── */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(17,26,46,0.98) 100%)',
            borderRadius: '16px', padding: '14px',
            border: `1px solid ${isClaimedToday ? 'rgba(245,158,11,0.2)' : 'rgba(245,158,11,0.5)'}`,
            boxShadow: isClaimedToday ? '0 4px 16px rgba(0,0,0,0.35)' : '0 4px 24px rgba(245,158,11,0.2)',
            flexShrink: 0
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 10px rgba(245,158,11,0.4)' }}>
                <Flame size={17} color="#000000" />
              </div>
              <div>
                <div style={{ fontSize: '12.5px', fontWeight: '900', color: '#fbbf24', lineHeight: 1 }}>Daily Streak</div>
                <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>{currentStreak} day{currentStreak !== 1 ? 's' : ''} in a row</div>
              </div>
            </div>

            <button
              onClick={handleClaimStreak}
              disabled={isClaimedToday || claimLoading}
              style={{
                background: isClaimedToday ? 'rgba(16,185,129,0.2)' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                border: `1px solid ${isClaimedToday ? 'rgba(16,185,129,0.4)' : '#fbbf24'}`,
                color: isClaimedToday ? '#34d399' : '#000000',
                padding: '7px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: '900',
                cursor: isClaimedToday ? 'default' : 'pointer',
                boxShadow: isClaimedToday ? 'none' : '0 0 16px rgba(245,158,11,0.6)',
                animation: isClaimedToday || claimLoading ? 'none' : 'streakPulse 1.5s ease-in-out infinite',
                transition: 'all 0.15s ease', minWidth: '100px'
              }}
            >
              {isClaimedToday ? '✓ Claimed Today' : claimLoading ? 'Claiming...' : `🔥 Claim +${nextClaimDay} ETB`}
            </button>
          </div>

          {claimMsg && (
            <div style={{
              background: claimMsg.includes('⚠️') ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)',
              border: `1px solid ${claimMsg.includes('⚠️') ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.4)'}`,
              color: claimMsg.includes('⚠️') ? '#fca5a5' : '#34d399',
              borderRadius: '8px', padding: '6px 10px', fontSize: '11.5px',
              fontWeight: '800', textAlign: 'center', marginBottom: '8px'
            }}>
              {claimMsg}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {streakDays.map(day => {
              const isCompleted = currentStreak >= day;
              const isCurrent = nextClaimDay === day && !isClaimedToday;
              return (
                <div
                  key={day}
                  onClick={() => { if (isCurrent) handleClaimStreak(); }}
                  style={{
                    background: isCompleted ? 'rgba(16,185,129,0.2)' : isCurrent ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${isCompleted ? 'rgba(16,185,129,0.5)' : isCurrent ? '#fbbf24' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: '8px', padding: '7px 2px', textAlign: 'center',
                    cursor: isCurrent ? 'pointer' : 'default',
                    boxShadow: isCurrent ? '0 0 12px rgba(245,158,11,0.5)' : 'none',
                    transform: isCurrent ? 'scale(1.06)' : 'none',
                    animation: isCurrent ? 'streakPulse 1.5s ease-in-out infinite' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ fontSize: '9px', color: isCompleted ? '#34d399' : isCurrent ? '#fbbf24' : '#64748b', fontWeight: '800', marginBottom: '2px' }}>
                    {isCompleted ? '✓' : `D${day}`}
                  </div>
                  <div style={{ fontSize: '11.5px', fontWeight: '900', color: isCompleted ? '#ffffff' : isCurrent ? '#fbbf24' : '#94a3b8' }}>
                    +{day}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ fontSize: '10px', color: isClaimedToday ? '#64748b' : '#f59e0b', textAlign: 'center', marginTop: '8px', fontWeight: isClaimedToday ? '400' : '700' }}>
            {isClaimedToday ? '✓ Come back tomorrow for your next streak bonus!' : '👆 Tap the button or today\'s day to claim your bonus!'}
          </div>

          <style>{`
            @keyframes streakPulse {
              0%, 100% { box-shadow: 0 0 16px rgba(245,158,11,0.6); }
              50% { box-shadow: 0 0 28px rgba(245,158,11,0.9), 0 0 8px rgba(245,158,11,0.5); }
            }
          `}</style>
        </div>

      </div>
    </div>
  );
}
