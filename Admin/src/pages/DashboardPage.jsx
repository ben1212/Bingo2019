import React from 'react';
import { formatCurrency, formatRelativeTime } from '../utils/formatters';
import {
  Users,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  UserPlus,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight
} from 'lucide-react';

export function DashboardPage({ setCurrentTab, metrics, users, deposits, withdrawals }) {

  // Derived KPI metrics — use exact totalUsers from metrics (admin excluded server-side)
  const totalUsers = metrics?.totalUsers ?? (users?.length || 0);
  const newUsersToday = metrics?.newUsersToday || 0;
  const onlinePlayers = metrics?.onlinePlayers || 0;

  const totalDeposits = metrics?.totalDepositsAmount || 0;
  const pendingDeposits = metrics?.pendingDepositsCount || 0;

  const totalWithdrawals = metrics?.totalWithdrawalsAmount || 0;
  const pendingWithdrawals = metrics?.pendingWithdrawalsCount || 0;

  const netMargin = Math.max(0, totalDeposits - totalWithdrawals);

  // Build recent activity from passed-in props (no extra API calls)
  const recentActivities = (() => {
    const activities = [];
    (users || []).slice(0, 4).forEach(u => {
      activities.push({
        id: `user-${u.id}`,
        icon: UserPlus,
        iconColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
        title: 'New Player Registered',
        detail: u.username || `Player #${u.id}`,
        time: u.created_at || new Date().toISOString(),
        timestamp: new Date(u.created_at || Date.now()).getTime()
      });
    });
    (deposits || []).slice(0, 4).forEach(d => {
      const isApproved = String(d.status).toLowerCase() === 'approved';
      activities.push({
        id: `dep-${d.id}`,
        icon: isApproved ? CheckCircle2 : (d.status === 'pending' ? Clock : XCircle),
        iconColor: isApproved ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : (d.status === 'pending' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : 'text-rose-400 bg-rose-500/10 border-rose-500/20'),
        title: isApproved ? 'Deposit Approved' : (d.status === 'pending' ? 'Deposit Requested' : 'Deposit Rejected'),
        detail: `${d.username || 'Player'} (${formatCurrency(d.amount)})`,
        time: d.created_at || new Date().toISOString(),
        timestamp: new Date(d.created_at || Date.now()).getTime()
      });
    });
    (withdrawals || []).slice(0, 4).forEach(w => {
      const isApproved = ['approved', 'paid'].includes(String(w.status).toLowerCase());
      activities.push({
        id: `with-${w.id}`,
        icon: isApproved ? ArrowUpRight : (w.status === 'pending' ? Clock : XCircle),
        iconColor: isApproved ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : (w.status === 'pending' ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' : 'text-slate-400 bg-slate-500/10 border-slate-500/20'),
        title: isApproved ? 'Payout Completed' : (w.status === 'pending' ? 'Payout Requested' : 'Payout Rejected'),
        detail: `${w.username || 'Player'} (${formatCurrency(w.amount)})`,
        time: w.created_at || new Date().toISOString(),
        timestamp: new Date(w.created_at || Date.now()).getTime()
      });
    });
    return activities.sort((a, b) => b.timestamp - a.timestamp).slice(0, 6);
  })();

  const totalVolume = totalDeposits + totalWithdrawals;
  const depositPct = totalVolume > 0 ? Math.round((totalDeposits / totalVolume) * 100) : 50;
  const withdrawalPct = totalVolume > 0 ? 100 - depositPct : 50;


  return (
    <div className="space-y-6">
      {/* ── 4 Primary KPI Cards ────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5 stagger-children">
        {/* 1. PLAYERS */}
        <div
          onClick={() => setCurrentTab('users')}
          className="kpi-card animate-card-pop p-4 sm:p-5 rounded-2xl bg-admin-card/80 backdrop-blur-xl border border-admin-border/80 hover:border-blue-500/50 cursor-pointer shadow-card hover:shadow-glow-blue transition-all group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-extrabold text-admin-muted uppercase tracking-wider">Players</span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-md transition-all">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-admin-text tracking-tight stat-number">
            {totalUsers}
          </div>
          <div className="flex items-center gap-2 mt-2.5 text-xs font-semibold">
            <span className="text-emerald-400 flex items-center gap-1 font-bold">
              +{newUsersToday} today
            </span>
            <span className="text-admin-border">·</span>
            <span className="text-admin-muted flex items-center gap-1.5 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.9)] animate-pulse" />
              {onlinePlayers} online
            </span>
          </div>
        </div>

        {/* 2. DEPOSITS */}
        <div
          onClick={() => setCurrentTab('deposits')}
          className="kpi-card animate-card-pop p-4 sm:p-5 rounded-2xl bg-admin-card/80 backdrop-blur-xl border border-admin-border/80 hover:border-emerald-500/50 cursor-pointer shadow-card hover:shadow-glow-emerald transition-all group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-extrabold text-admin-muted uppercase tracking-wider">Deposits</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white group-hover:shadow-md transition-all">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight stat-number font-mono">
            {formatCurrency(totalDeposits)}
          </div>
          <div className="flex items-center gap-2 mt-2.5 text-xs font-semibold">
            {pendingDeposits > 0 ? (
              <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 font-extrabold border border-amber-500/20 animate-pulse">
                {pendingDeposits} pending review
              </span>
            ) : (
              <span className="text-admin-muted font-medium">All cleared</span>
            )}
          </div>
        </div>

        {/* 3. WITHDRAWALS */}
        <div
          onClick={() => setCurrentTab('withdrawals')}
          className="kpi-card animate-card-pop p-4 sm:p-5 rounded-2xl bg-admin-card/80 backdrop-blur-xl border border-admin-border/80 hover:border-rose-500/50 cursor-pointer shadow-card hover:shadow-glow-rose transition-all group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-extrabold text-admin-muted uppercase tracking-wider">Withdrawals</span>
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white group-hover:shadow-md transition-all">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-400 tracking-tight stat-number font-mono">
            {formatCurrency(totalWithdrawals)}
          </div>
          <div className="flex items-center gap-2 mt-2.5 text-xs font-semibold">
            {pendingWithdrawals > 0 ? (
              <span className="px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-400 font-extrabold border border-rose-500/20 animate-pulse">
                {pendingWithdrawals} pending payout
              </span>
            ) : (
              <span className="text-admin-muted font-medium">All processed</span>
            )}
          </div>
        </div>

        {/* 4. NET MARGIN */}
        <div className="kpi-card animate-card-pop p-4 sm:p-5 rounded-2xl bg-admin-card/80 backdrop-blur-xl border border-admin-border/80 shadow-card transition-all relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-extrabold text-admin-muted uppercase tracking-wider">Net Margin</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 tracking-tight stat-number font-mono">
            {formatCurrency(netMargin)}
          </div>
          <div className="flex items-center gap-2 mt-2.5 text-xs font-semibold text-admin-muted">
            <span>Net platform retention</span>
          </div>
        </div>
      </div>

      {/* ── Inflow vs Outflow Card (full-width) ─────────────── */}
      <div className="p-5 sm:p-6 rounded-2xl bg-admin-card/80 backdrop-blur-xl border border-admin-border/80 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-extrabold text-admin-text mb-0.5 flex items-center gap-2">
              <span>Inflow vs Outflow</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">Ratio</span>
            </h3>
            <p className="text-xs text-admin-muted">Real-time deposit and payout balance</p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setCurrentTab('deposits')}
              className="p-2.5 px-3.5 rounded-xl bg-admin-surface/80 hover:bg-admin-cardHover border border-admin-border/80 text-xs font-bold text-admin-text flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
            >
              <span>Review Deposits</span>
              <ChevronRight className="w-3.5 h-3.5 text-admin-muted" />
            </button>
            <button
              onClick={() => setCurrentTab('withdrawals')}
              className="p-2.5 px-3.5 rounded-xl bg-admin-surface/80 hover:bg-admin-cardHover border border-admin-border/80 text-xs font-bold text-admin-text flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
            >
              <span>Review Payouts</span>
              <ChevronRight className="w-3.5 h-3.5 text-admin-muted" />
            </button>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-black">
              <span className="text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.9)]" />
                Inflow: {depositPct}%
              </span>
              <span className="text-rose-400 flex items-center gap-1.5">
                Outflow: {withdrawalPct}%
                <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.9)]" />
              </span>
            </div>
            <div className="h-3.5 rounded-full bg-admin-surface border border-admin-border/80 overflow-hidden flex p-0.5 shadow-inner">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-400 rounded-l-full transition-all duration-500 shadow-sm" style={{ width: `${depositPct}%` }} />
              <div className="bg-gradient-to-r from-rose-400 to-rose-600 rounded-r-full transition-all duration-500 shadow-sm" style={{ width: `${withdrawalPct}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-admin-border/60">
            <div className="p-3.5 rounded-xl bg-admin-surface/60 border border-admin-border/80">
              <span className="text-[10px] font-black text-admin-muted uppercase tracking-wider block mb-1">Total Deposited</span>
              <span className="text-sm font-black text-emerald-400 font-mono">{formatCurrency(totalDeposits)}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-admin-surface/60 border border-admin-border/80">
              <span className="text-[10px] font-black text-admin-muted uppercase tracking-wider block mb-1">Total Payouts</span>
              <span className="text-sm font-black text-rose-400 font-mono">{formatCurrency(totalWithdrawals)}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-admin-surface/60 border border-admin-border/80">
              <span className="text-[10px] font-black text-admin-muted uppercase tracking-wider block mb-1">Net Margin</span>
              <span className="text-sm font-black text-emerald-400 font-mono">{formatCurrency(netMargin)}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-admin-surface/60 border border-admin-border/80">
              <span className="text-[10px] font-black text-admin-muted uppercase tracking-wider block mb-1">Total Players</span>
              <span className="text-sm font-black text-blue-400 font-mono">{totalUsers}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Recent Activity Feed ───────────────────────────── */}
      <div className="p-5 sm:p-6 rounded-2xl bg-admin-card/80 backdrop-blur-xl border border-admin-border/80 shadow-card">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-admin-border/60">
          <div>
            <h3 className="text-sm font-extrabold text-admin-text">Recent Activity</h3>
            <p className="text-xs text-admin-muted">Live transaction and player event stream</p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-admin-surface border border-admin-border text-admin-muted">
            {recentActivities.length} events
          </span>
        </div>

        {recentActivities.length > 0 ? (
          <div className="divide-y divide-admin-border/60">
            {recentActivities.map((act) => {
              const Icon = act.icon;
              return (
                <div key={act.id} className="py-3.5 flex items-center justify-between gap-3 first:pt-0 last:pb-0 hover:bg-white/[0.02] px-2 rounded-xl transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 shadow-sm ${act.iconColor}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-admin-text truncate">{act.title}</p>
                      <p className="text-[11px] text-admin-muted truncate font-medium">{act.detail}</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-admin-muted flex-shrink-0">
                    {formatRelativeTime(act.time)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-admin-muted">
            No recent platform activity recorded yet.
          </div>
        )}
      </div>
    </div>
  );
}
