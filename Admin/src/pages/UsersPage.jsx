import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/Badge';
import { TableWrapper, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmptyState } from '../components/ui/Table';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { adminApi } from '../api/adminApi';
import { Dialog } from '../components/ui/Dialog';
import {
  Search,
  Users,
  ChevronDown,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Wallet,
  Plus,
  Minus,
  Check
} from 'lucide-react';

export function UsersPage({ users, metrics, loading, onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [userDetailsMap, setUserDetailsMap] = useState({});
  const [loadingDetailsId, setLoadingDetailsId] = useState(null);
  const [banLoadingId, setBanLoadingId] = useState(null);
  const [historyTabMap, setHistoryTabMap] = useState({});

  const [balanceModalUser, setBalanceModalUser] = useState(null);
  const [balanceAction, setBalanceAction] = useState('add'); // 'add' | 'deduct'
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceSubmitting, setBalanceSubmitting] = useState(false);

  const totalPlayers = typeof metrics?.totalUsers === 'number' ? metrics.totalUsers : (users?.length || 0);
  const activePlayers = typeof metrics?.activeUsers === 'number' ? metrics.activeUsers : (users || []).filter(u => !u.is_banned).length;
  const bannedPlayers = typeof metrics?.bannedUsers === 'number' ? metrics.bannedUsers : (users || []).filter(u => !!u.is_banned).length;

  // Live remote search against full database
  useEffect(() => {
    const term = searchTerm.trim();
    if (!term) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    let isCurrent = true;
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await adminApi.getUsers(term);
        if (isCurrent) {
          setSearchResults(Array.isArray(res) ? res : []);
        }
      } catch (err) {
        console.error('Remote search error:', err);
      } finally {
        if (isCurrent) setIsSearching(false);
      }
    }, 250);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [searchTerm]);

  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users || [];
    if (searchResults.length > 0) return searchResults;
    return (users || []).filter((u) =>
      String(u.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(u.phone || '').includes(searchTerm) ||
      String(u.id).includes(searchTerm)
    );
  }, [users, searchTerm, searchResults]);

  const toggleExpand = async (userId) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
      return;
    }

    setExpandedUserId(userId);

    if (!userDetailsMap[userId]) {
      setLoadingDetailsId(userId);
      try {
        const data = await adminApi.getUserDetails(userId);
        setUserDetailsMap((prev) => ({ ...prev, [userId]: data }));
      } catch (err) {
        console.error('Error fetching user details:', err);
      } finally {
        setLoadingDetailsId(null);
      }
    }
  };

  const handleOpenBalanceModal = (e, u) => {
    e.stopPropagation();
    setBalanceModalUser(u);
    setBalanceAction('add');
    setBalanceAmount('');
  };

  const handleSaveBalance = async (e) => {
    e.preventDefault();
    if (!balanceModalUser || !balanceAmount || parseFloat(balanceAmount) <= 0) return;

    setBalanceSubmitting(true);
    try {
      const res = await adminApi.updateUserBalance(balanceModalUser.id, {
        action: balanceAction,
        amount: parseFloat(balanceAmount)
      });
      // Update local state
      setUserDetailsMap((prev) => {
        if (!prev[balanceModalUser.id]) return prev;
        return {
          ...prev,
          [balanceModalUser.id]: {
            ...prev[balanceModalUser.id],
            user: {
              ...prev[balanceModalUser.id].user,
              balance: res.newBalance,
              withdrawable_balance: res.withdrawableBalance
            }
          }
        };
      });
      setBalanceModalUser(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update user balance');
    } finally {
      setBalanceSubmitting(false);
    }
  };

  const handleToggleBan = async (e, u) => {
    e.stopPropagation();
    const actionName = u.is_banned ? 'unban' : 'ban';
    if (!window.confirm(`Are you sure you want to ${actionName} player "${u.username}"?`)) return;

    setBanLoadingId(u.id);
    try {
      const res = await adminApi.toggleUserBan(u.id);
      setUserDetailsMap((prev) => {
        if (!prev[u.id]) return prev;
        return {
          ...prev,
          [u.id]: {
            ...prev[u.id],
            user: { ...prev[u.id].user, is_banned: res.isBanned ? 1 : 0 },
          },
        };
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update ban status');
    } finally {
      setBanLoadingId(null);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">

      {/* ── Stats Cards ─────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-admin-card border border-admin-border flex flex-col gap-1">
          <span className="text-[11px] font-bold text-admin-muted uppercase tracking-wider">Total Players</span>
          <span className="text-3xl font-extrabold text-blue-400">{totalPlayers}</span>
        </div>
        <div className="p-4 rounded-2xl bg-admin-card border border-admin-border flex flex-col gap-1">
          <span className="text-[11px] font-bold text-admin-muted uppercase tracking-wider">Active</span>
          <span className="text-3xl font-extrabold text-emerald-400">{activePlayers}</span>
        </div>
        <div className="p-4 rounded-2xl bg-admin-card border border-admin-border flex flex-col gap-1">
          <span className="text-[11px] font-bold text-admin-muted uppercase tracking-wider">Banned</span>
          <span className="text-3xl font-extrabold text-rose-400">{bannedPlayers}</span>
        </div>
      </div>

      {/* 🔍 Search Input — full width */}
      <div className="relative">
        {isSearching ? (
          <RefreshCw className="w-4 h-4 text-blue-400 absolute left-3.5 top-1/2 -translate-y-1/2 animate-spin" />
        ) : (
          <Search className="w-4 h-4 text-admin-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
        )}
        <input
          type="text"
          placeholder="Search by username, phone, or player ID to view player details..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full text-xs sm:text-sm pl-10 pr-3.5 py-3 rounded-xl bg-admin-card border border-admin-border text-admin-text placeholder-admin-muted focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-admin-muted hover:text-admin-text"
          >
            Clear
          </button>
        )}
      </div>

      {/* 📋 Players List */}
      <div className="space-y-2.5">
        {filteredUsers.length > 0 ? (
          filteredUsers.map((u) => {
              const isExpanded = expandedUserId === u.id;
              const details = userDetailsMap[u.id];
              const currentInfo = details?.user || u;
              const deposits = details?.deposits || [];
              const withdrawals = details?.withdrawals || [];
              const activeHistoryTab = historyTabMap[u.id] || 'deposits';

              const totalDeposited =
                details?.totalDeposited ??
                deposits.reduce((acc, d) => acc + (d.status === 'approved' ? parseFloat(d.amount) : 0), 0);
              const totalWithdrawn =
                details?.totalWithdrawn ??
                withdrawals.reduce((acc, w) => acc + (w.status === 'approved' ? parseFloat(w.amount) : 0), 0);

              return (
                <div
                  key={u.id}
                  className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                    isExpanded
                      ? 'bg-admin-card border-emerald-500/40 shadow-lg ring-1 ring-emerald-500/20'
                      : 'bg-admin-card/80 border-admin-border hover:border-slate-700 hover:bg-admin-card'
                  }`}
                >
                  {/* ── Normal Grid Line Header (Tap to Expand) ── */}
                  <div
                    onClick={() => toggleExpand(u.id)}
                    className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer select-none"
                  >
                    {/* Left: Avatar + Username + Phone/ID */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 font-bold text-sm flex-shrink-0">
                        {u.username?.[0]?.toUpperCase() || 'U'}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm sm:text-base text-admin-text hover:text-blue-500 transition-colors truncate">
                            {u.username}
                          </span>
                          <span className="text-[10px] text-admin-muted hidden sm:inline">
                            ID: #{u.id}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-admin-muted">
                          <span>{u.phone || 'No phone'}</span>
                          <span className="hidden sm:inline">•</span>
                          <span className="hidden sm:inline text-[11px]">
                            Joined {formatDateTime(u.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Balance + Status + Expand Chevron */}
                    <div className="flex items-center gap-2.5 sm:gap-4 flex-shrink-0">
                      <div className="text-right">
                        <span className="font-bold text-sm sm:text-base text-admin-text block">
                          {formatCurrency(u.balance)}
                        </span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block">
                          {formatCurrency(u.withdrawable_balance || 0)} won
                        </span>
                      </div>

                      <div className="hidden sm:block">
                        <StatusBadge status={currentInfo.is_banned ? 'banned' : 'active'} />
                      </div>

                      <div
                        className={`w-7 h-7 rounded-lg bg-admin-surface border border-admin-border flex items-center justify-center text-admin-muted transition-transform duration-200 ${
                          isExpanded ? 'rotate-180 text-blue-500 border-blue-500/30' : ''
                        }`}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {/* ── Expanded Profile & History Drawer ── */}
                  {isExpanded && (
                    <div className="border-t border-admin-border bg-admin-surface/50 p-4 sm:p-5 space-y-4 animate-fade-in">
                      {loadingDetailsId === u.id ? (
                        <div className="py-8 flex flex-col items-center justify-center gap-2">
                          <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
                          <span className="text-xs text-admin-muted">Loading player profile...</span>
                        </div>
                      ) : (
                        <>
                          {/* 1. Quick Stats Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                            <div className="p-3 rounded-xl bg-admin-card border border-admin-border">
                              <span className="text-[10px] text-admin-muted uppercase tracking-wider block">
                                Total Balance
                              </span>
                              <span className="text-sm sm:text-base font-bold text-admin-text mt-1 block">
                                {formatCurrency(currentInfo.balance)}
                              </span>
                            </div>

                            <div className="p-3 rounded-xl bg-admin-card border border-admin-border">
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block font-semibold">
                                Withdrawable (Won)
                              </span>
                              <span className="text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
                                {formatCurrency(currentInfo.withdrawable_balance || 0)}
                              </span>
                            </div>

                            <div className="p-3 rounded-xl bg-admin-card border border-admin-border">
                              <span className="text-[10px] text-admin-muted uppercase tracking-wider block">
                                Total Deposits
                              </span>
                              <span className="text-sm sm:text-base font-bold text-admin-text mt-1 block">
                                {formatCurrency(totalDeposited)}
                              </span>
                            </div>

                            <div className="p-3 rounded-xl bg-admin-card border border-admin-border">
                              <span className="text-[10px] text-admin-muted uppercase tracking-wider block">
                                Total Withdrawn
                              </span>
                              <span className="text-sm sm:text-base font-bold text-admin-text mt-1 block">
                                {formatCurrency(totalWithdrawn)}
                              </span>
                            </div>
                          </div>

                          {/* 2. Account Information & Access Control */}
                          <div className="p-3.5 sm:p-4 rounded-xl bg-admin-card border border-admin-border space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                              <div>
                                <span className="text-admin-muted block mb-0.5">Phone Number</span>
                                <span className="text-admin-text font-semibold">{currentInfo.phone || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-admin-muted block mb-0.5">Referral Link</span>
                                {currentInfo.referral_code ? (
                                  <a
                                    href={`https://t.me/bingox2019_bot?start=${currentInfo.referral_code}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-blue-500 hover:text-blue-400 font-semibold underline inline-flex items-center gap-1"
                                    title="Open Referral Link"
                                  >
                                    <span>{currentInfo.referral_code}</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                ) : (
                                  <span className="text-admin-muted">None</span>
                                )}
                              </div>
                              <div>
                                <span className="text-admin-muted block mb-0.5">Account Status</span>
                                <span className="font-semibold text-admin-text">
                                  {currentInfo.is_banned ? '🔴 Suspended / Banned' : '🟢 Active & Verified'}
                                </span>
                              </div>
                            </div>

                            <div className="pt-3 border-t border-admin-border flex items-center justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={(e) => handleOpenBalanceModal(e, u)}
                                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border-emerald-500/30"
                              >
                                <Wallet className="w-3.5 h-3.5 mr-1.5" />
                                Adjust Balance
                              </Button>
                              <Button
                                type="button"
                                variant={currentInfo.is_banned ? 'successOutline' : 'destructive'}
                                size="sm"
                                onClick={(e) => handleToggleBan(e, u)}
                                isLoading={banLoadingId === u.id}
                              >
                                {currentInfo.is_banned ? (
                                  <>
                                    <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                                    Unban Player
                                  </>
                                ) : (
                                  <>
                                    <ShieldAlert className="w-3.5 h-3.5 mr-1" />
                                    Ban Player
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>

                          {/* 3. Transaction History Tabs */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between border-b border-admin-border pb-2">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setHistoryTabMap((prev) => ({ ...prev, [u.id]: 'deposits' }))}
                                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                                    activeHistoryTab === 'deposits'
                                      ? 'bg-blue-500/15 text-blue-500 border border-blue-500/30'
                                      : 'text-admin-muted hover:text-admin-text'
                                  }`}
                                >
                                  <ArrowDownLeft className="w-3.5 h-3.5" />
                                  Deposits ({deposits.length})
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setHistoryTabMap((prev) => ({ ...prev, [u.id]: 'withdrawals' }))}
                                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                                    activeHistoryTab === 'withdrawals'
                                      ? 'bg-blue-500/15 text-blue-500 border border-blue-500/30'
                                      : 'text-admin-muted hover:text-admin-text'
                                  }`}
                                >
                                  <ArrowUpRight className="w-3.5 h-3.5" />
                                  Withdrawals ({withdrawals.length})
                                </button>
                              </div>
                            </div>

                            {activeHistoryTab === 'deposits' && (
                              <div className="rounded-xl border border-admin-border overflow-hidden">
                                <TableWrapper>
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>ID</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Method</TableHead>
                                        <TableHead>Reference</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Date</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {deposits.length > 0 ? (
                                        deposits.map((d) => (
                                          <TableRow key={d.id}>
                                            <TableCell className="text-xs text-admin-muted">#{d.id}</TableCell>
                                            <TableCell className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(d.amount)}</TableCell>
                                            <TableCell className="text-xs text-admin-text">{d.method || 'Telebirr'}</TableCell>
                                            <TableCell className="text-xs text-admin-text font-mono" title={d.receipt_sms || d.tx_hash || d.reference || ''}>
                                              {d.tx_hash || d.reference || (d.receipt_sms ? `${d.receipt_sms.slice(0, 20)}...` : '—')}
                                            </TableCell>
                                            <TableCell><StatusBadge status={d.status} /></TableCell>
                                            <TableCell className="text-xs text-admin-muted">{formatDateTime(d.created_at)}</TableCell>
                                          </TableRow>
                                        ))
                                      ) : (
                                        <TableRow>
                                          <td colSpan={6} className="py-6 text-center text-xs text-admin-muted">
                                            No deposit transactions found for this player.
                                          </td>
                                        </TableRow>
                                      )}
                                    </TableBody>
                                  </Table>
                                </TableWrapper>
                              </div>
                            )}

                            {activeHistoryTab === 'withdrawals' && (
                              <div className="rounded-xl border border-admin-border overflow-hidden">
                                <TableWrapper>
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>ID</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Method</TableHead>
                                        <TableHead>Account/Phone</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Date</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {withdrawals.length > 0 ? (
                                        withdrawals.map((w) => (
                                          <TableRow key={w.id}>
                                            <TableCell className="text-xs text-admin-muted">#{w.id}</TableCell>
                                            <TableCell className="font-semibold text-amber-600 dark:text-amber-400">{formatCurrency(w.amount)}</TableCell>
                                            <TableCell className="text-xs text-admin-text">{w.method || 'Telebirr'}</TableCell>
                                            <TableCell className="text-xs text-admin-text">{w.account_number || w.phone || '—'}</TableCell>
                                            <TableCell><StatusBadge status={w.status} /></TableCell>
                                            <TableCell className="text-xs text-admin-muted">{formatDateTime(w.created_at)}</TableCell>
                                          </TableRow>
                                        ))
                                      ) : (
                                        <TableRow>
                                          <td colSpan={6} className="py-6 text-center text-xs text-admin-muted">
                                            No withdrawal requests found for this player.
                                          </td>
                                        </TableRow>
                                      )}
                                    </TableBody>
                                  </Table>
                                </TableWrapper>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <Card>
              <CardContent className="py-12">
                <TableEmptyState
                  icon={Users}
                  title="No Players Found"
                  description="No players match your search. Try a different username, phone, or ID."
                />
              </CardContent>
            </Card>
          )}
        </div>

      {/* ── Adjust Balance Modal ── */}
      {balanceModalUser && (
        <Dialog
          isOpen={!!balanceModalUser}
          onClose={() => setBalanceModalUser(null)}
          title={
            <div className="flex items-center gap-2 text-emerald-400">
              <Wallet className="w-5 h-5" />
              <span>Adjust Player Balance</span>
            </div>
          }
        >
          <form onSubmit={handleSaveBalance} className="space-y-4">
            <div className="p-3 rounded-xl bg-admin-surface border border-admin-border text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-admin-muted">Player:</span>
                <span className="font-bold text-admin-text">{balanceModalUser.username} (#{balanceModalUser.id})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-admin-muted">Current Balance:</span>
                <span className="font-bold text-emerald-400">{formatCurrency(balanceModalUser.balance)}</span>
              </div>
            </div>

            {/* Action Type Toggle */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setBalanceAction('add')}
                className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  balanceAction === 'add'
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                    : 'bg-admin-surface text-admin-muted border border-admin-border'
                }`}
              >
                <Plus className="w-4 h-4" />
                Credit (Add Funds)
              </button>

              <button
                type="button"
                onClick={() => setBalanceAction('deduct')}
                className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  balanceAction === 'deduct'
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                    : 'bg-admin-surface text-admin-muted border border-admin-border'
                }`}
              >
                <Minus className="w-4 h-4" />
                Debit (Deduct Funds)
              </button>
            </div>

            {/* Amount Input */}
            <div>
              <label className="text-xs font-semibold text-admin-muted block mb-1">
                Amount (ETB) *
              </label>
              <input
                type="number"
                step="any"
                min="0.01"
                placeholder="Enter amount (e.g. 50)"
                value={balanceAmount}
                onChange={(e) => setBalanceAmount(e.target.value)}
                className="w-full text-sm font-mono font-bold px-3 py-2.5 rounded-xl bg-admin-surface border border-admin-border text-admin-text focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                required
                autoFocus
              />
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2 pt-2 border-t border-admin-border">
              <Button
                type="button"
                variant="outline"
                className="flex-1 text-xs"
                onClick={() => setBalanceModalUser(null)}
                disabled={balanceSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant={balanceAction === 'add' ? 'default' : 'destructive'}
                className="flex-1 text-xs font-bold"
                disabled={balanceSubmitting || !balanceAmount || parseFloat(balanceAmount) <= 0}
                isLoading={balanceSubmitting}
              >
                {balanceAction === 'add' ? 'Credit Balance' : 'Deduct Balance'}
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}



