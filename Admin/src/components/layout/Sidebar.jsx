import React from 'react';
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
  Gamepad2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function Sidebar({ currentTab, setCurrentTab, metrics, maintenanceActive }) {
  const { user, logout } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'Players', icon: Users, count: metrics?.totalUsers },
    { id: 'deposits', label: 'Deposits', icon: ArrowDownLeft, badge: metrics?.pendingDepositsCount, badgeColor: 'bg-amber-500/15 text-amber-400 font-bold' },
    { id: 'withdrawals', label: 'Withdrawals', icon: ArrowUpRight, badge: metrics?.pendingWithdrawalsCount, badgeColor: 'bg-rose-500/15 text-rose-400 font-bold' },
    { id: 'tasks', label: 'Tasks & Rewards', icon: ClipboardList },
    { id: 'promo-codes', label: 'Promo Codes', icon: Ticket },
    { id: 'broadcast', label: 'Broadcast', icon: Megaphone },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench, isWarning: maintenanceActive },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-60 bg-admin-surface/95 backdrop-blur-xl border-r border-admin-border h-screen sticky top-0 z-30 select-none transition-colors">
      {/* Brand Header */}
      <div className="p-4 border-b border-admin-border/80 flex items-center gap-3">
        <div className="relative">
          <img src="/icon-192.jpg" alt="BingoX" className="w-9 h-9 rounded-xl object-cover shadow-md border border-sky-500/30 ring-2 ring-sky-500/10" />
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-admin-surface" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-black text-admin-text tracking-tight leading-tight flex items-center gap-1">
            <span>Bingo</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500 font-extrabold">X</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-widest ml-1">HQ</span>
          </h2>
          <span className="text-[11px] font-semibold text-admin-muted truncate block">Operations Portal</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-3.5 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all relative group ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/25 ring-1 ring-white/20'
                  : 'text-admin-muted hover:text-admin-text hover:bg-white/[0.04] active:scale-[0.98]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`p-1 rounded-lg transition-colors ${
                  isActive ? 'bg-white/15 text-white' : 'text-admin-muted group-hover:text-admin-text group-hover:bg-white/[0.04]'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge > 0 && (
                <span className={`px-2 py-0.5 text-[10px] font-black rounded-full leading-none shadow-sm ${
                  isActive ? 'bg-white/20 text-white ring-1 ring-white/30' : item.badgeColor
                }`}>
                  {item.badge}
                </span>
              )}

              {item.isWarning && !item.badge && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
              )}
            </button>
          );
        })}
      </nav>

      {/* User & Logout Footer */}
      <div className="p-3.5 border-t border-admin-border/80 bg-admin-card/30 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/20 to-sky-500/10 border border-blue-500/30 flex items-center justify-center text-xs font-black text-blue-400 shadow-inner flex-shrink-0">
            {user?.username?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold text-admin-text block truncate">{user?.username || 'Admin'}</span>
            <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Super Admin
            </span>
          </div>
        </div>
        <button
          onClick={logout}
          className="p-2 rounded-xl text-admin-muted hover:text-rose-400 hover:bg-rose-500/10 active:scale-95 transition-all"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}

