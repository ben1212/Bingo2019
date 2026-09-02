import React, { useState, useEffect } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/Badge';
import { TabsList, TabTrigger } from '../ui/Tabs';
import { TableWrapper, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmptyState } from '../ui/Table';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { adminApi } from '../../api/adminApi';
import { User, Phone, Wallet, Calendar, ShieldAlert, ShieldCheck, ArrowDownLeft, ArrowUpRight, ExternalLink } from 'lucide-react';

export function UserDetailModal({
  user,
  isOpen,
  onClose,
  onUserUpdated,
}) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'deposits' | 'withdrawals'
  const [userDetails, setUserDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [banLoading, setBanLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user?.id) {
      fetchDetails(user.id);
      setActiveTab('overview');
    }
  }, [isOpen, user?.id]);

  const fetchDetails = async (id) => {
    setLoadingDetails(true);
    try {
      const data = await adminApi.getUserDetails(id);
      setUserDetails(data);
    } catch (err) {
      console.error('Error fetching user details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  if (!user) return null;

  const currentInfo = userDetails?.user || user;
  const deposits = userDetails?.deposits || [];
  const withdrawals = userDetails?.withdrawals || [];
  const totalDeposits = userDetails?.totalDeposited ?? (deposits.reduce((acc, d) => acc + (d.status === 'approved' ? parseFloat(d.amount) : 0), 0));
  const totalWithdrawals = userDetails?.totalWithdrawn ?? (withdrawals.reduce((acc, w) => acc + (['approved', 'paid'].includes(String(w.status).toLowerCase()) ? parseFloat(w.amount) : 0), 0));

  const handleToggleBan = async () => {
    setBanLoading(true);
    try {
      const res = await adminApi.toggleUserBan(user.id);
      setUserDetails(prev => prev ? {
        ...prev,
        user: { ...prev.user, is_banned: res.isBanned ? 1 : 0 }
      } : null);
      if (onUserUpdated) onUserUpdated();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update ban status');
    } finally {
      setBanLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-2xl"
      title={
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs">
            {currentInfo.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <span>{currentInfo.username}</span>
          <StatusBadge status={currentInfo.is_banned ? 'banned' : 'active'} />
        </div>
      }
      description={`User ID: #${currentInfo.id} • Registered ${formatDateTime(currentInfo.created_at)}`}
    >
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <TabsList className="w-full">
          <TabTrigger active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>
            Overview
          </TabTrigger>
          <TabTrigger active={activeTab === 'deposits'} onClick={() => setActiveTab('deposits')} badgeCount={deposits.length}>
            Deposits
          </TabTrigger>
          <TabTrigger active={activeTab === 'withdrawals'} onClick={() => setActiveTab('withdrawals')} badgeCount={withdrawals.length}>
            Withdrawals
          </TabTrigger>
        </TabsList>

        {/* Tab Content: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-3.5">
            {/* Quick Stat Cards */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="p-3 rounded-xl bg-admin-bg/80 border border-admin-border">
                <span className="text-[11px] text-slate-400 font-medium block">Current Balance</span>
                <span className="text-sm sm:text-base font-bold text-emerald-400 mt-1 block font-mono">
                  {formatCurrency(currentInfo.balance)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-admin-bg/80 border border-admin-border">
                <span className="text-[11px] text-slate-400 font-medium block">Total Deposited</span>
                <span className="text-sm sm:text-base font-semibold text-slate-200 mt-1 block font-mono">
                  {formatCurrency(totalDeposits)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-admin-bg/80 border border-admin-border">
                <span className="text-[11px] text-slate-400 font-medium block">Total Withdrawn</span>
                <span className="text-sm sm:text-base font-semibold text-slate-200 mt-1 block font-mono">
                  {formatCurrency(totalWithdrawals)}
                </span>
              </div>
            </div>

            {/* Account Details List */}
            <div className="p-4 rounded-xl bg-admin-bg/80 border border-admin-border space-y-2.5 text-xs sm:text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Phone Number
                </span>
                <span className="font-mono text-slate-200 font-medium">{currentInfo.phone || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-admin-border/40">
                <span className="text-slate-400">Referral Link</span>
                {currentInfo.referral_code ? (
                  <a
                    href={`https://t.me/bingox2019_bot?start=${currentInfo.referral_code}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-emerald-400 hover:text-emerald-300 font-medium underline inline-flex items-center gap-1"
                    title="Open Referral Link"
                  >
                    <span>{currentInfo.referral_code}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="font-mono text-slate-400">None</span>
                )}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-admin-border/40">
                <span className="text-slate-400">Account Status</span>
                <span className="font-semibold">{currentInfo.is_banned ? '🔴 Suspended / Banned' : '🟢 Active & Verified'}</span>
              </div>
            </div>

            {/* Quick Ban / Unban Switch */}
            <div className="p-3.5 rounded-xl bg-admin-surface/60 border border-admin-border flex items-center justify-between">
              <div>
                <span className="text-xs sm:text-sm font-semibold text-slate-200 block">Account Access</span>
              </div>
              <Button
                type="button"
                variant={currentInfo.is_banned ? 'successOutline' : 'destructive'}
                size="sm"
                onClick={handleToggleBan}
                isLoading={banLoading}
              >
                {currentInfo.is_banned ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                    Unban User
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5 mr-1" />
                    Ban User
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Tab Content: DEPOSITS */}
        {activeTab === 'deposits' && (
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
                      <TableCell className="font-mono text-xs text-slate-400">#{d.id}</TableCell>
                      <TableCell className="font-semibold text-emerald-400">{formatCurrency(d.amount)}</TableCell>
                      <TableCell>{d.method || 'Telebirr'}</TableCell>
                      <TableCell className="font-mono text-xs text-slate-300" title={d.receipt_sms || d.tx_hash || d.reference || ''}>
                        {d.tx_hash || d.reference || (d.receipt_sms ? `${d.receipt_sms.slice(0, 25)}...` : '—')}
                      </TableCell>
                      <TableCell><StatusBadge status={d.status} /></TableCell>
                      <TableCell className="text-xs text-slate-400">{formatDateTime(d.created_at)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <td colSpan={6} className="py-8">
                      <TableEmptyState icon={ArrowDownLeft} title="No Deposits" description="This user has not made any deposit requests yet." />
                    </td>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableWrapper>
        )}

        {/* Tab Content: WITHDRAWALS */}
        {activeTab === 'withdrawals' && (
          <TableWrapper>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withdrawals.length > 0 ? (
                  withdrawals.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-mono text-xs text-slate-400">#{w.id}</TableCell>
                      <TableCell className="font-semibold text-amber-400">{formatCurrency(w.amount)}</TableCell>
                      <TableCell>{w.method || 'Telebirr'}</TableCell>
                      <TableCell className="font-mono text-xs text-slate-300">{w.account_number || w.phone || '—'}</TableCell>
                      <TableCell><StatusBadge status={w.status} /></TableCell>
                      <TableCell className="text-xs text-slate-400">{formatDateTime(w.created_at)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <td colSpan={6} className="py-8">
                      <TableEmptyState icon={ArrowUpRight} title="No Withdrawals" description="This user has not requested any withdrawals yet." />
                    </td>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableWrapper>
        )}
      </div>
    </Dialog>
  );
}


