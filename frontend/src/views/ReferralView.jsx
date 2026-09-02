import React, { useState, useEffect } from 'react';
import { Users, Check, Share2, Copy } from 'lucide-react';
import { apiFetch } from '../api';

// In-memory cache so switching tabs does NOT reload or flash a loading screen
let referralsCache = null;

export default function ReferralView({ user, token }) {
  const [data, setData] = useState(referralsCache);
  const [loading, setLoading] = useState(!referralsCache);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!token) return;
    if (!referralsCache) setLoading(true);

    apiFetch('/api/referrals', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(d => {
        referralsCache = d;
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token]);

  const refCode = data?.referralCode || user?.referralCode || user?.referral_code || '';
  const refLink = data?.referralLink || (refCode ? `https://t.me/bingox2019_bot?start=${refCode}` : 'https://t.me/bingox2019_bot');
  const referralsList = data?.referrals || [];

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'BingoX - Play & Win!',
        text: 'Join BingoX and play Ethiopian Multiplayer Bingo on Telegram!',
        url: refLink
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(refLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(refLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
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
        boxSizing: 'border-box',
        color: '#ffffff',
        maxWidth: '480px',
        margin: '0 auto'
      }}
    >
      {/* ── FIXED TOP INVITATION CARD & TITLE ── */}
      <div style={{ flexShrink: 0, padding: '12px 12px 4px' }}>
        
        {/* Invite link card */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(17, 26, 46, 0.98) 100%)',
            borderRadius: '16px',
            padding: '14px',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            marginBottom: '10px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)'
          }}
        >
          <div style={{ fontSize: '10.5px', color: '#c084fc', fontWeight: '800', letterSpacing: '0.4px', marginBottom: '6px', textTransform: 'uppercase' }}>
            Your Invitation Link
          </div>

          {/* Link display */}
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              padding: '8px 12px',
              fontSize: '12px',
              color: '#38bdf8',
              wordBreak: 'break-all',
              marginBottom: '10px',
              lineHeight: 1.3
            }}
          >
            {refLink}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              onClick={copyLink}
              style={{
                padding: '9px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '10px',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              {copiedLink ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
              {copiedLink ? 'Copied!' : 'Copy Link'}
            </button>

            <button
              onClick={handleShare}
              style={{
                padding: '9px',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                border: 'none',
                borderRadius: '10px',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(139, 92, 246, 0.35)'
              }}
            >
              <Share2 size={14} /> Share
            </button>
          </div>
        </div>

        {/* Notice */}
        <div style={{
          background: 'rgba(56, 189, 248, 0.08)',
          border: '1px solid rgba(56, 189, 248, 0.2)',
          borderRadius: '10px',
          padding: '8px 10px',
          fontSize: '11px',
          color: '#bae6fd',
          lineHeight: '1.4',
          marginBottom: '10px'
        }}>
          💡 <b>10% Reward:</b> Earn a 10% cash bonus on every approved deposit made by your invited players!
        </div>

        {/* Fixed Title */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px 4px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: '800', margin: 0, color: '#ffffff' }}>
            Invited Players ({referralsList.length})
          </h3>
        </div>

      </div>

      {/* ── SCROLLABLE PLAYERS LIST ONLY ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 12px', boxSizing: 'border-box' }}>
        {referralsList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 16px', background: 'rgba(17, 26, 46, 0.7)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.06)', color: '#94a3b8' }}>
            <Users size={28} color="#64748b" style={{ margin: '0 auto 8px', display: 'block' }} />
            <div style={{ fontWeight: '800', fontSize: '13px', color: '#ffffff' }}>No invited players yet</div>
            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '3px' }}>
              Share your link to see friends appear here!
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {referralsList.map((ref, idx) => {
              const displayName = ref.referee_name || ref.referee_username || `Player #${idx + 1}`;

              return (
                <div
                  key={ref.id || idx}
                  style={{
                    background: 'rgba(17, 26, 46, 0.95)',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    border: '1px solid rgba(255, 255, 255, 0.07)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)'
                  }}
                >
                  {/* Avatar + Name ONLY */}
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '10px',
                      background: 'rgba(139, 92, 246, 0.2)',
                      color: '#c084fc',
                      fontWeight: '800',
                      fontSize: '13.5px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: '800',
                      color: '#f8fafc',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {displayName}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}


