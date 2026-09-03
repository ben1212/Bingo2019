import React from 'react';
import { Gamepad2, Wallet, Gift, Users, User, Dices } from 'lucide-react';

export default function Navbar({
  user,
  currentView,
  setCurrentView,
  onLogout,
  isGameLocked = false
}) {
  const navItems = [
    {
      id: 'lobby',
      label: 'Game',
      icon: Gamepad2,
      activeColor: '#38bdf8',
      activeBg: 'rgba(56, 189, 248, 0.15)',
      viewMatches: ['lobby', 'game', 'gameplay']
    },
    {
      id: 'wallet',
      label: 'Wallet',
      icon: Wallet,
      activeColor: '#10b981',
      activeBg: 'rgba(16, 185, 129, 0.15)',
      viewMatches: ['wallet']
    },
    {
      id: 'task',
      label: 'Tasks',
      icon: Gift,
      activeColor: '#f59e0b',
      activeBg: 'rgba(245, 158, 11, 0.15)',
      viewMatches: ['task', 'tasks']
    },
    {
      id: 'invite',
      label: 'Invite',
      icon: Users,
      activeColor: '#a855f7',
      activeBg: 'rgba(168, 85, 247, 0.15)',
      viewMatches: ['invite', 'referral']
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      activeColor: '#ec4899',
      activeBg: 'rgba(236, 72, 153, 0.15)',
      viewMatches: ['profile']
    },
  ];

  return (
    <>
      {/* ── Top Midnight Header Bar ── */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 500,
          background: 'rgba(8, 13, 26, 0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
          padding: '0 16px',
          height: '48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.4)'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: isGameLocked ? 'default' : 'pointer'
          }}
          onClick={() => {
            if (!isGameLocked) setCurrentView('lobby');
          }}
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 0 12px rgba(56, 189, 248, 0.4)'
            }}
          >
            <Dices size={16} color="#000000" />
          </div>
          <span
            style={{
              fontSize: '18px',
              fontWeight: '900',
              color: '#ffffff',
              letterSpacing: '-0.3px'
            }}
          >
            Bingo<span style={{ color: '#38bdf8' }}>X</span>
          </span>
        </div>
      </header>

      {/* ── 5-Button Midnight Bottom Navigation Bar ── */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          background: 'rgba(8, 13, 26, 0.96)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          height: '62px',
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 4px)',
          paddingLeft: '6px',
          paddingRight: '6px',
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.5)',
          userSelect: 'none'
        }}
      >
        {/* Hard Lockout Overlay During Live Game */}
        {isGameLocked && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(8, 13, 26, 0.96)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              zIndex: 20,
              borderTop: '1px solid rgba(239, 68, 68, 0.3)',
              userSelect: 'none'
            }}
          >
            <div
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: '#ef4444',
                boxShadow: '0 0 8px #ef4444',
                animation: 'radarBeacon 1.2s infinite'
              }}
            />
            <span
              style={{
                fontSize: '11px',
                fontWeight: '800',
                color: '#f87171',
                letterSpacing: '0.3px'
              }}
            >
              🔒 LIVE GAME IN PROGRESS
            </span>
          </div>
        )}

        {navItems.map((item) => {
          const isActive = item.viewMatches.includes(currentView);
          const Icon = item.icon;

          // ── Center Emphasized "Game" Button ──
          if (item.isCenter) {
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (!isGameLocked) setCurrentView('lobby');
                }}
                disabled={isGameLocked}
                style={{
                  flex: 1,
                  maxWidth: '72px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  cursor: isGameLocked ? 'not-allowed' : 'pointer',
                  position: 'relative',
                  padding: 0,
                  transform: 'translateY(-10px)',
                  transition: 'transform 0.15s ease',
                  opacity: isGameLocked ? 0.4 : 1
                }}
              >
                {/* Elevated Glowing Outer Circle */}
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: isActive
                      ? 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)'
                      : 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                    border: isActive
                      ? '2px solid rgba(255, 255, 255, 0.4)'
                      : '2px solid rgba(56, 189, 248, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: isActive
                      ? '0 0 18px rgba(56, 189, 248, 0.6), 0 4px 12px rgba(0, 0, 0, 0.6)'
                      : '0 4px 12px rgba(0, 0, 0, 0.5)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Icon
                    size={24}
                    color={isActive ? '#000000' : '#38bdf8'}
                    strokeWidth={2.4}
                  />
                </div>

                {/* Label */}
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: '800',
                    color: isActive ? '#38bdf8' : '#94a3b8',
                    marginTop: '2px',
                    letterSpacing: '0.2px'
                  }}
                >
                  {item.label}
                </span>
              </button>
            );
          }

          // ── Standard Action Buttons (Task, Invite, Wallet, Profile) ──
          return (
            <button
              key={item.id}
              onClick={() => {
                if (!isGameLocked) setCurrentView(item.id);
              }}
              disabled={isGameLocked}
              style={{
                flex: 1,
                maxWidth: '72px',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                cursor: isGameLocked ? 'not-allowed' : 'pointer',
                position: 'relative',
                transition: 'all 0.15s ease',
                padding: '4px 0',
                opacity: isGameLocked ? 0.3 : 1
              }}
            >
              {/* Icon Container */}
              <div
                style={{
                  width: '34px',
                  height: '26px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isActive && !isGameLocked ? item.activeBg : 'transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon
                  size={19}
                  color={isActive && !isGameLocked ? item.activeColor : '#64748b'}
                  strokeWidth={isActive ? 2.4 : 1.8}
                />
              </div>

              {/* Label */}
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: isActive ? '800' : '600',
                  color: isActive && !isGameLocked ? item.activeColor : '#64748b',
                  letterSpacing: '0.1px',
                  transition: 'all 0.15s ease'
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
