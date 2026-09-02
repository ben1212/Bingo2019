import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  ArrowDownLeft,
  ArrowUpRight,
  Ticket,
  ClipboardList,
  Megaphone,
  Wrench,
  Settings,
  LogOut,
  X,
  MoreHorizontal,
  ChevronRight,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function MobileNav({
  isOpen,
  onClose,
  currentTab,
  setCurrentTab,
  metrics,
  maintenanceActive,
}) {
  const { user, logout } = useAuth();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const showMoreSheet = isOpen || isMoreOpen;

  const moreItems = [
    { id: 'tasks', label: 'Tasks & Rewards', icon: ClipboardList, sub: 'Manage reward tasks & incentives' },
    { id: 'promo-codes', label: 'Promo Codes', icon: Ticket, sub: 'Manage bonus codes & limits' },
    { id: 'broadcast', label: 'Broadcast', icon: Megaphone, sub: 'Send live notifications to players' },
    { id: 'maintenance', label: 'Maintenance Mode', icon: Wrench, sub: 'Emergency lock platform', isWarning: maintenanceActive },
    { id: 'settings', label: 'Settings', icon: Settings, sub: 'Admin security & preferences' },
  ];

  const handleSelect = (id) => {
    setCurrentTab(id);
    setIsMoreOpen(false);
    onClose();
  };

  const isMoreActive = moreItems.some(i => i.id === currentTab);

  const mainTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'Players', icon: Users, badge: null },
    {
      id: 'deposits',
      label: 'Deposits',
      icon: ArrowDownLeft,
      badge: metrics?.pendingDepositsCount > 0 ? metrics.pendingDepositsCount : null,
      badgeColor: 'bg-amber-500 text-black',
    },
    {
      id: 'withdrawals',
      label: 'Payouts',
      icon: ArrowUpRight,
      badge: metrics?.pendingWithdrawalsCount > 0 ? metrics.pendingWithdrawalsCount : null,
      badgeColor: 'bg-rose-500 text-white',
    },
  ];

  return (
    <>
      {/* ── More Options Modal Bottom Sheet ────────────────────── */}
      {showMoreSheet && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-[65] lg:hidden transition-opacity animate-fade-in"
          onClick={() => {
            setIsMoreOpen(false);
            onClose();
          }}
        >
          <div
            className="fixed inset-x-0 bottom-0 z-[70] bg-admin-surface/98 backdrop-blur-2xl border-t border-admin-border/90 rounded-t-[32px] p-5 shadow-2xl modal-bottom-sheet max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet Drag Indicator */}
            <div className="w-12 h-1.5 bg-slate-600/50 rounded-full mx-auto mb-4" />

            {/* Sheet Header */}
            <div className="flex items-center justify-between pb-4 border-b border-admin-border/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-blue-500/25 ring-2 ring-white/10">
                  {user?.username?.[0]?.toUpperCase() || 'A'}
                </div>
                <div>
                  <span className="text-sm font-extrabold text-admin-text block">{user?.username || 'Admin'}</span>
                  <span className="text-xs text-admin-muted flex items-center gap-1 font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Administrator Operations
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsMoreOpen(false);
                  onClose();
                }}
                className="p-2 rounded-xl text-admin-muted hover:text-admin-text hover:bg-white/[0.06] transition-colors active:scale-90"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sheet Secondary Navigation Links */}
            <div className="py-3 space-y-2">
              {moreItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-left transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold shadow-lg shadow-blue-600/30 scale-[1.01] ring-1 ring-white/20'
                        : 'bg-admin-card/60 hover:bg-admin-card border border-admin-border/60 text-admin-muted hover:text-admin-text active:scale-[0.98]'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className={`p-2.5 rounded-xl transition-colors ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-admin-surface border border-admin-border/80 text-admin-muted shadow-sm'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className={`text-xs font-bold block truncate ${isActive ? 'text-white' : 'text-admin-text'}`}>
                          {item.label}
                        </span>
                        <span className={`text-[10px] block truncate ${isActive ? 'text-white/80' : 'text-admin-muted'}`}>
                          {item.sub}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {item.isWarning && (
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
                      )}
                      <ChevronRight className={`w-4 h-4 ${isActive ? 'text-white' : 'text-admin-muted opacity-50'}`} />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Sheet Logout */}
            <div className="pt-3 border-t border-admin-border/60 pb-safe">
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl text-xs font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all active:scale-[0.98]"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Constant Native Mobile Bottom Navigation Bar ─────── */}
      <nav
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-admin-surface/95 backdrop-blur-2xl border-t border-admin-border/90 shadow-[0_-8px_32px_rgba(0,0,0,0.5)] transition-colors bottom-nav-safe"
      >
        <div className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto">
          {/* Main 4 Navigation Items */}
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setCurrentTab(tab.id);
                  setIsMoreOpen(false);
                }}
                className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-200 relative group active:scale-90 ${
                  isActive
                    ? 'text-blue-400 font-bold'
                    : 'text-admin-muted hover:text-admin-text'
                }`}
              >
                {/* Active glow pill background */}
                {isActive && (
                  <span className="absolute inset-x-3 -top-1 h-0.5 bg-gradient-to-r from-sky-400 to-blue-500 rounded-full shadow-[0_0_10px_rgba(56,189,248,0.9)]" />
                )}

                <div className={`relative p-1.5 rounded-xl transition-all ${
                  isActive ? 'bg-blue-500/15 text-blue-400 scale-105 shadow-inner' : 'text-admin-muted'
                }`}>
                  <Icon className="w-5 h-5" />
                  {/* Badge */}
                  {tab.badge && (
                    <span className={`absolute -top-1.5 -right-1.5 min-w-[17px] h-[17px] px-1 rounded-full text-[10px] font-black flex items-center justify-center ring-2 ring-admin-surface shadow-sm ${tab.badgeColor}`}>
                      {tab.badge}
                    </span>
                  )}
                </div>

                <span className={`text-[10px] tracking-tight transition-all mt-0.5 font-bold ${
                  isActive ? 'text-blue-400' : 'text-admin-muted'
                }`}>
                  {tab.label}
                </span>
              </button>
            );
          })}

          {/* 5. More Menu Item */}
          <button
            type="button"
            onClick={() => setIsMoreOpen(true)}
            className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-200 relative group active:scale-90 ${
              isMoreActive || isMoreOpen
                ? 'text-blue-400 font-bold'
                : 'text-admin-muted hover:text-admin-text'
            }`}
          >
            {(isMoreActive || isMoreOpen) && (
              <span className="absolute inset-x-3 -top-1 h-0.5 bg-gradient-to-r from-sky-400 to-blue-500 rounded-full shadow-[0_0_10px_rgba(56,189,248,0.9)]" />
            )}

            <div className={`relative p-1.5 rounded-xl transition-all ${
              isMoreActive || isMoreOpen ? 'bg-blue-500/15 text-blue-400 scale-105 shadow-inner' : 'text-admin-muted'
            }`}>
              <MoreHorizontal className="w-5 h-5" />
              {maintenanceActive && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-admin-surface animate-pulse shadow-[0_0_6px_rgba(244,63,94,0.9)]" />
              )}
            </div>

            <span className={`text-[10px] tracking-tight transition-all mt-0.5 font-bold ${
              isMoreActive || isMoreOpen ? 'text-blue-400' : 'text-admin-muted'
            }`}>
              More
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}


