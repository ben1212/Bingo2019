import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusBadge, Badge } from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';
import { adminApi } from '../api/adminApi';
import { getNotificationPermission, requestNotificationPermission, sendPhoneNotification } from '../utils/notifications';
import { formatCurrency, formatDateTime, copyToClipboard } from '../utils/formatters';
import {
  KeyRound,
  Bell,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Lock,
  ChevronDown,
  ChevronUp,
  History,
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  Search,
  Copy,
  Check,
  RefreshCw,
  SlidersHorizontal,
  Wallet
} from 'lucide-react';

export function SettingsPage({ deposits = [], withdrawals = [], metrics, onRefresh }) {
  const { user, logout } = useAuth();

  // Collapsible Password State (Collapsed by default)
  const [isPasswordExpanded, setIsPasswordExpanded] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Notifications State
  const [notifPermission, setNotifPermission] = useState('default');

  // Transaction History State
  const [txTypeFilter, setTxTypeFilter] = useState('all'); // 'all' | 'deposits' | 'withdrawals'
  const [txStatusFilter, setTxStatusFilter] = useState('all'); // 'all' | 'approved' | 'pending' | 'rejected'
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    setNotifPermission(getNotificationPermission());
  }, []);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) {
      setPasswordError('Please fill in both current and new password');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setPasswordLoading(true);
    setPasswordError('');
    setPasswordSuccess('');

    try {
      await adminApi.changePassword(oldPassword, newPassword);
      setPasswordSuccess('Admin password updated successfully.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setIsPasswordExpanded(false);
        setPasswordSuccess('');
      }, 2500);
    } catch (err) {
      setPasswordError(err.response?.data?.error || err.message || 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleEnableNotifications = async () => {
    const perm = await requestNotificationPermission();
    setNotifPermission(perm);
    if (perm === 'granted') {
      sendPhoneNotification({
        title: 'Alerts Active',
        body: 'Notifications are enabled for new transactions.',
        tag: 'welcome-notification'
      });
    }
  };

  const handleCopy = async (id, text) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // ── Build Unified Transaction History ─────────────────────
  const unifiedTransactions = useMemo(() => {
    const depList = (deposits || []).map((d) => ({
      ...d,
      type: 'deposit',
      dateObj: new Date(d.created_at || d.timestamp || 0),
      refCode: d.tx_hash || d.reference || d.receipt_sms || 'N/A'
    }));

    const withList = (withdrawals || []).map((w) => ({
      ...w,
      type: 'withdrawal',
      dateObj: new Date(w.created_at || w.timestamp || 0),
      refCode: w.account_number || w.phone || 'N/A'
    }));

    return [...depList, ...withList].sort((a, b) => b.dateObj - a.dateObj);
  }, [deposits, withdrawals]);

  // Statistics
  const stats = useMemo(() => {
    const totalDepositsApproved = (deposits || []).reduce((sum, d) => {
      return String(d.status || '').toLowerCase() === 'approved' ? sum + (parseFloat(d.amount) || 0) : sum;
    }, 0);

    const totalWithdrawalsApproved = (withdrawals || []).reduce((sum, w) => {
      const s = String(w.status || '').toLowerCase();
      return (s === 'approved' || s === 'paid' || s === 'completed') ? sum + (parseFloat(w.amount) || 0) : sum;
    }, 0);

    return {
      totalDeposits: totalDepositsApproved,
      totalWithdrawals: totalWithdrawalsApproved,
      totalCount: unifiedTransactions.length
    };
  }, [deposits, withdrawals, unifiedTransactions]);

  // Filtered History
  const filteredHistory = useMemo(() => {
    return unifiedTransactions.filter((tx) => {
      // Type filter
      if (txTypeFilter === 'deposits' && tx.type !== 'deposit') return false;
      if (txTypeFilter === 'withdrawals' && tx.type !== 'withdrawal') return false;

      // Status filter
      const s = String(tx.status || '').toLowerCase();
      if (txStatusFilter === 'approved' && !['approved', 'paid', 'completed'].includes(s)) return false;
      if (txStatusFilter === 'pending' && s !== 'pending') return false;
      if (txStatusFilter === 'rejected' && !['rejected', 'declined', 'failed'].includes(s)) return false;

      // Search term
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        String(tx.username || '').toLowerCase().includes(term) ||
        String(tx.phone || '').includes(term) ||
        String(tx.refCode || '').toLowerCase().includes(term) ||
        String(tx.id).includes(term) ||
        String(tx.amount).includes(term) ||
        String(tx.method || '').toLowerCase().includes(term)
      );
    });
  }, [unifiedTransactions, txTypeFilter, txStatusFilter, searchTerm]);

  // ── CSV Export Function ────────────────────────────────────
  const handleExportCSV = () => {
    if (unifiedTransactions.length === 0) {
      alert('No transaction history records available to export.');
      return;
    }

    const headers = ['Type', 'ID', 'Player Username', 'Phone', 'Method', 'Amount (ETB)', 'Status', 'Reference/Account', 'Date & Time'];
    const rows = unifiedTransactions.map((tx) => [
      tx.type.toUpperCase(),
      tx.id,
      `"${(tx.username || `User #${tx.user_id}`).replace(/"/g, '""')}"`,
      `"${(tx.phone || '').replace(/"/g, '""')}"`,
      `"${(tx.method || 'Telebirr').replace(/"/g, '""')}"`,
      tx.amount,
      tx.status || 'pending',
      `"${String(tx.refCode || '').replace(/"/g, '""')}"`,
      `"${formatDateTime(tx.created_at || tx.dateObj)}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `platform_transaction_history_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isGranted = notifPermission === 'granted';

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* ── Top Bar: Profile & Sign Out ──────────────────────── */}
      <Card>
        <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/30 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-base shadow-sm">
              {user?.username?.[0]?.toUpperCase() || 'A'}
            </div>
            <div>
              <div className="text-sm font-bold text-admin-text">{user?.username || 'Admin'}</div>
              <div className="text-xs text-admin-muted font-medium flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Super Administrator
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={logout}
            className="text-xs font-semibold"
          >
            <LogOut className="w-3.5 h-3.5 mr-1.5" />
            Sign Out
          </Button>
        </CardContent>
      </Card>

      {/* ── Collapsible Change Password Card ────────────────── */}
      <Card>
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-admin-text">Change Password</h3>
              </div>
            </div>

            <Button
              type="button"
              variant={isPasswordExpanded ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => {
                setIsPasswordExpanded(!isPasswordExpanded);
                setPasswordError('');
                setPasswordSuccess('');
              }}
              className="text-xs font-semibold flex items-center gap-1.5"
            >
              <span>{isPasswordExpanded ? 'Cancel' : 'Change Password'}</span>
              {isPasswordExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </Button>
          </div>

          {/* Collapsible Form */}
          {isPasswordExpanded && (
            <form onSubmit={handleChangePassword} className="pt-3 border-t border-admin-border space-y-3 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-admin-muted block mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Current password"
                    className="w-full text-xs px-3 py-2 rounded-xl bg-admin-surface border border-admin-border text-admin-text placeholder-admin-muted focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-admin-muted block mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full text-xs px-3 py-2 rounded-xl bg-admin-surface border border-admin-border text-admin-text placeholder-admin-muted focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-admin-muted block mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full text-xs px-3 py-2 rounded-xl bg-admin-surface border border-admin-border text-admin-text placeholder-admin-muted focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              {passwordError && (
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPasswordExpanded(false)}
                  className="text-xs"
                >
                  Close
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  size="sm"
                  className="text-xs font-bold"
                  disabled={passwordLoading}
                  isLoading={passwordLoading}
                >
                  <Lock className="w-3.5 h-3.5 mr-1" />
                  Save New Password
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* ── Transaction History & Audit Records ─────────────── */}
      <Card>
        <CardContent className="p-4 sm:p-5 space-y-4">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-admin-border">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <History className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-admin-text">Transaction History Storage</h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onRefresh && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onRefresh}
                  className="text-xs text-slate-300"
                  title="Refresh records"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              )}
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleExportCSV}
                className="text-xs font-bold"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Export CSV Backup
              </Button>
            </div>
          </div>

          {/* Quick Volume Summary Chips */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-admin-surface border border-admin-border">
              <div className="flex items-center justify-between text-xs text-admin-muted mb-1">
                <span>Total Approved Deposits</span>
                <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-base font-bold text-emerald-400">
                {formatCurrency(stats.totalDeposits)}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-admin-surface border border-admin-border">
              <div className="flex items-center justify-between text-xs text-admin-muted mb-1">
                <span>Total Approved Withdrawals</span>
                <ArrowUpRight className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-base font-bold text-blue-400">
                {formatCurrency(stats.totalWithdrawals)}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-admin-surface border border-admin-border">
              <div className="flex items-center justify-between text-xs text-admin-muted mb-1">
                <span>Total Records Saved</span>
                <Wallet className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-base font-bold text-admin-text">
                {stats.totalCount} Transactions
              </div>
            </div>
          </div>

          {/* Filter & Search Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
            {/* Type selector */}
            <div className="flex items-center gap-1 bg-admin-surface p-1 rounded-xl border border-admin-border overflow-x-auto">
              {[
                { id: 'all', label: 'All' },
                { id: 'deposits', label: 'Deposits' },
                { id: 'withdrawals', label: 'Withdrawals' }
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTxTypeFilter(t.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    txTypeFilter === t.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-admin-muted hover:text-admin-text'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Status selector & Search input */}
            <div className="flex items-center gap-2">
              <select
                value={txStatusFilter}
                onChange={(e) => setTxStatusFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-xl bg-admin-surface border border-admin-border text-admin-text focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>

              <div className="relative flex-1 sm:w-56">
                <Search className="w-3.5 h-3.5 text-admin-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search player, phone, ref..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl bg-admin-surface border border-admin-border text-admin-text placeholder-admin-muted focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Transactions List */}
          <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
            {filteredHistory.length > 0 ? (
              filteredHistory.map((tx) => {
                const isDeposit = tx.type === 'deposit';
                return (
                  <div
                    key={`${tx.type}-${tx.id}`}
                    className="p-3 rounded-xl bg-admin-surface/70 hover:bg-admin-surface border border-admin-border flex items-center justify-between gap-3 transition-colors text-xs"
                  >
                    {/* Left: Icon & Player Info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isDeposit ? 'bg-emerald-500/15 text-emerald-400' : 'bg-blue-500/15 text-blue-400'
                      }`}>
                        {isDeposit ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-admin-text truncate">
                            {tx.username || `User #${tx.user_id}`}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            isDeposit ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'
                          }`}>
                            {isDeposit ? 'DEPOSIT' : 'PAYOUT'}
                          </span>
                        </div>
                        <div className="text-[11px] text-admin-muted flex items-center gap-2 mt-0.5 font-mono flex-wrap">
                          {tx.phone && <span>{tx.phone}</span>}
                          {tx.account_name && <span className="text-slate-300 font-semibold">• {tx.account_name}</span>}
                          {tx.method && <span>• {tx.method}</span>}
                          <span>• {formatDateTime(tx.created_at || tx.dateObj)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Amount, Status & Reference */}
                    <div className="flex items-center gap-3 text-right flex-shrink-0">
                      <div className="hidden sm:block">
                        <div className="font-mono text-[11px] text-admin-muted flex items-center gap-1 justify-end">
                          <span>{String(tx.refCode).slice(0, 16)}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(`${tx.type}-${tx.id}`, tx.refCode)}
                            className="text-slate-400 hover:text-white p-0.5"
                            title="Copy Ref"
                          >
                            {copiedId === `${tx.type}-${tx.id}` ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div>
                        <div className={`font-bold text-sm ${isDeposit ? 'text-emerald-400' : 'text-slate-200'}`}>
                          {isDeposit ? '+' : '-'}{formatCurrency(tx.amount)}
                        </div>
                        <div className="mt-0.5 flex justify-end">
                          <StatusBadge status={tx.status} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center rounded-xl bg-admin-surface border border-admin-border/60">
                <History className="w-8 h-8 text-admin-muted mx-auto mb-2 opacity-50" />
                <div className="text-xs font-semibold text-admin-text">No transactions found</div>
                <div className="text-[11px] text-admin-muted mt-0.5">
                  {searchTerm ? 'Try changing your search keywords' : 'No transactions recorded yet'}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── System Alerts / Push Notifications ─────────────── */}
      <Card>
        <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-admin-text">Push Notifications</div>
          </div>

          <Button
            type="button"
            variant={isGranted ? 'secondary' : 'default'}
            size="sm"
            onClick={handleEnableNotifications}
            className="text-xs font-semibold"
          >
            <Bell className="w-3.5 h-3.5 mr-1" />
            {isGranted ? 'Active' : 'Enable'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
