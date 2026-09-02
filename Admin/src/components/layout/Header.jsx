import React, { useState, useEffect } from 'react';
import {
  Menu,
  RefreshCw,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { isSoundEnabled, setSoundEnabled, playDepositChime } from '../../utils/audioAlerts';

export function Header({
  title,
  onOpenMobileMenu,
  onRefresh,
  isRefreshing,
  maintenanceActive,
  isRealtimeConnected = true
}) {
  const { user } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const [soundOn, setSoundOn] = useState(true);

  useEffect(() => {
    setSoundOn(isSoundEnabled());
  }, []);

  const handleSoundToggle = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) playDepositChime();
  };

  return (
    <header className="sticky top-0 z-40 bg-admin-surface/90 backdrop-blur-xl border-b border-admin-border/80 px-4 sm:px-8 pt-safe transition-colors select-none">
      <div className="h-16 flex items-center justify-between">
        {/* Left: Mobile Brand & Page Title */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            onClick={onOpenMobileMenu}
            className="lg:hidden w-9 h-9 rounded-xl overflow-hidden shadow-md cursor-pointer active:scale-90 transition-transform border border-sky-500/30 flex-shrink-0"
            title="Open Operations Menu"
          >
            <img src="/icon-192.jpg" alt="BingoX" className="w-full h-full object-cover" />
          </div>

          <div className="flex items-center gap-2.5 min-w-0">
            <h1 className="text-lg sm:text-xl font-extrabold text-admin-text tracking-tight truncate">
              {title}
            </h1>

            {maintenanceActive && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-500/10 text-rose-400 border border-rose-500/25 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
                Maintenance
              </span>
            )}
          </div>
        </div>

        {/* Right: Essential quick controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Live status dot */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-admin-card/80 border border-admin-border/80 text-[11px] font-bold text-admin-muted shadow-sm backdrop-blur-sm"
            title={isRealtimeConnected ? 'Real-time WebSocket active' : 'Connecting to real-time server...'}
          >
            <span className={`w-2 h-2 rounded-full ${isRealtimeConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)] animate-pulse' : 'bg-amber-500 animate-ping'}`} />
            <span className="hidden sm:inline font-semibold">{isRealtimeConnected ? 'Live Real-Time' : 'Connecting...'}</span>
          </div>

          {/* Refresh */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2.5 rounded-xl text-admin-muted hover:text-admin-text hover:bg-white/[0.06] border border-transparent hover:border-admin-border/60 transition-all active:scale-90 disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
            </button>
          )}

          {/* Sound toggle */}
          <button
            onClick={handleSoundToggle}
            className={`p-2.5 rounded-xl border border-transparent hover:border-admin-border/60 transition-all active:scale-90 ${
              soundOn
                ? 'text-blue-400 bg-blue-500/10 border-blue-500/20 shadow-sm'
                : 'text-admin-muted hover:text-admin-text hover:bg-white/[0.06]'
            }`}
            title={soundOn ? 'Sound alerts on' : 'Sound alerts muted'}
          >
            {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Theme toggle (Dark / Light) */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl text-admin-muted hover:text-admin-text hover:bg-white/[0.06] border border-transparent hover:border-admin-border/60 transition-all active:scale-90"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          {/* Admin profile badge (Desktop) */}
          <div className="hidden sm:flex items-center gap-2.5 pl-3 border-l border-admin-border/80">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/20 to-sky-500/10 border border-blue-500/30 text-blue-400 font-extrabold text-xs flex items-center justify-center shadow-inner">
              {user?.username?.[0]?.toUpperCase() || 'A'}
            </div>
            <span className="text-xs font-bold text-admin-text truncate max-w-[110px]">
              {user?.username || 'Admin'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

