import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/Badge';
import { TableWrapper, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmptyState } from '../components/ui/Table';
import { WithdrawalReviewModal } from '../components/modals/WithdrawalReviewModal';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { adminApi } from '../api/adminApi';
import { Search, ArrowUpRight, CheckCircle2, Eye, Smartphone, Clock, Check, X, Copy, Trash2 } from 'lucide-react';

export function WithdrawalsPage({ withdrawals, loading, onRefresh }) {
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'approved' | 'rejected' | 'all'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Counts
  const counts = useMemo(() => {
    const list = withdrawals || [];
    return {
      all: list.length,
      pending: list.filter(w => String(w.status || '').toLowerCase() === 'pending').length,
      approved: list.filter(w => ['approved', 'paid', 'completed'].includes(String(w.status || '').toLowerCase())).length,
      rejected: list.filter(w => ['rejected', 'declined', 'failed'].includes(String(w.status || '').toLowerCase())).length,
    };
  }, [withdrawals]);

  // Filtered withdrawals
  const filteredWithdrawals = useMemo(() => {
    return (withdrawals || []).filter((w) => {
      const status = String(w.status || '').toLowerCase();
      
      // Tab filter
      if (activeTab === 'pending' && status !== 'pending') return false;
      if (activeTab === 'approved' && !['approved', 'paid', 'completed'].includes(status)) return false;
      if (activeTab === 'rejected' && !['rejected', 'declined', 'failed'].includes(status)) return false;

      // Search filter
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        String(w.username || '').toLowerCase().includes(term) ||
        String(w.account_number || w.phone || w.account || '').includes(term) ||
        String(w.method || '').toLowerCase().includes(term) ||
        String(w.id).includes(term) ||
        String(w.amount).includes(term)
      );
    });
  }, [withdrawals, activeTab, searchTerm]);

  const handleOpenReview = (w) => {
    setSelectedWithdrawal(w);
    setIsModalOpen(true);
  };

  const handleCopyAccount = (e, text, id) => {
    e.stopPropagation();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleQuickApprove = async (e, withdrawalId) => {
    e.stopPropagation();
    if (!window.confirm('Confirm that you have transferred the funds to the player and approve this payout?')) return;
    setActionLoadingId(withdrawalId);
    try {
      await adminApi.approveWithdrawal(withdrawalId);
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to approve payout');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleQuickReject = async (e, withdrawalId) => {
    e.stopPropagation();
    const reason = window.prompt('Enter reason for rejecting this withdrawal (funds will be refunded to player wallet):', 'Account details incorrect');
    if (reason === null) return;
    setActionLoadingId(withdrawalId);
    try {
      await adminApi.rejectWithdrawal(withdrawalId, reason);
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reject withdrawal');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteWithdrawal = async (e, withdrawalId) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!window.confirm(`Are you sure you want to permanently delete withdrawal #${withdrawalId}? If pending, funds will be refunded to the player.`)) return;
    setActionLoadingId(withdrawalId);
    try {
      await adminApi.deleteWithdrawal(withdrawalId);
      if (selectedWithdrawal && selectedWithdrawal.id === withdrawalId) {
        setIsModalOpen(false);
        setSelectedWithdrawal(null);
      }
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete withdrawal');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* ── Top Bar: Filter Tabs & Search ──────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Filter Tabs */}
        <div className="inline-flex rounded-2xl bg-admin-card p-1 border border-admin-border overflow-x-auto no-scrollbar">
          {[
            { id: 'pending', label: 'Pending', count: counts.pending, color: 'bg-rose-500/20 text-rose-400 font-bold' },
            { id: 'approved', label: 'Paid / Approved', count: counts.approved, color: 'bg-emerald-500/20 text-emerald-400 font-bold' },
            { id: 'rejected', label: 'Rejected', count: counts.rejected, color: 'bg-slate-500/20 text-slate-400 font-bold' },
            { id: 'all', label: 'All History', count: counts.all, color: 'bg-slate-500/20 text-slate-400' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-admin-muted hover:text-admin-text'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] leading-none ${
                  activeTab === tab.id ? 'bg-white/20 text-white' : tab.color
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[240px] sm:w-72">
          <Search className="w-4 h-4 text-admin-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search player, account, phone, ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl bg-admin-card border border-admin-border text-admin-text placeholder-admin-muted focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {/* ── Withdrawals Content ─────────────────────────── */}
      {filteredWithdrawals.length > 0 ? (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <TableWrapper>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Destination Account</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWithdrawals.map((w) => {
                    const isPending = String(w.status || '').toLowerCase() === 'pending';
                    const isLoading = actionLoadingId === w.id;
                    const destAccount = w.account_number || w.phone || w.account || '—';

                    return (
                      <TableRow key={w.id} className="group hover:bg-admin-cardHover/50">
                        <TableCell className="font-mono text-xs text-admin-muted">#{w.id}</TableCell>
                        <TableCell>
                          <span className="font-bold text-admin-text block">{w.username || `User #${w.user_id}`}</span>
                          {w.account_name && <span className="text-[11px] text-admin-muted block">{w.account_name}</span>}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const m = String(w.method || 'telebirr').toLowerCase();
                            if (m.includes('bank') || m === 'cbe') {
                              return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">🏦 CBE Bank</span>;
                            }
                            if (m.includes('cbe') || m === 'cbebirr') {
                              return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">💳 CBE Birr</span>;
                            }
                            return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">📱 Telebirr</span>;
                          })()}
                        </TableCell>
                        <TableCell className="font-extrabold text-amber-400 font-mono text-sm">
                          {formatCurrency(w.amount)}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-admin-text">
                          <div className="flex items-center gap-1.5">
                            <span className="bg-admin-surface px-2 py-0.5 rounded-lg border border-admin-border select-all">
                              {destAccount}
                            </span>
                            {destAccount !== '—' && (
                              <button
                                onClick={(e) => handleCopyAccount(e, destAccount, w.id)}
                                className="p-1 rounded-lg text-admin-muted hover:text-admin-text hover:bg-admin-cardHover transition-colors"
                                title="Copy Account"
                              >
                                {copiedId === w.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={w.status} />
                        </TableCell>
                        <TableCell className="text-xs text-admin-muted font-mono">{formatDateTime(w.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isPending && (
                              <>
                                <button
                                  onClick={(e) => handleQuickApprove(e, w.id)}
                                  disabled={isLoading}
                                  className="p-1.5 rounded-xl bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500 hover:text-white border border-emerald-500/30 transition-all"
                                  title="Approve & Mark Paid"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => handleQuickReject(e, w.id)}
                                  disabled={isLoading}
                                  className="p-1.5 rounded-xl bg-rose-500/15 text-rose-400 hover:bg-rose-500 hover:text-white border border-rose-500/30 transition-all"
                                  title="Reject & Refund"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={(e) => handleDeleteWithdrawal(e, w.id)}
                              disabled={isLoading}
                              className="p-1.5 rounded-xl bg-slate-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 border border-slate-700/50 transition-all"
                              title="Delete Transaction Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleOpenReview(w)}
                              className="text-xs"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              Review
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableWrapper>
          </div>

          {/* Mobile Card List View */}
          <div className="md:hidden space-y-3">
            {filteredWithdrawals.map((w) => {
              const isPending = String(w.status || '').toLowerCase() === 'pending';
              const isLoading = actionLoadingId === w.id;
              const destAccount = w.account_number || w.phone || w.account || '—';

              return (
                <div
                  key={w.id}
                  onClick={() => handleOpenReview(w)}
                  className={`p-4 rounded-2xl bg-admin-card border transition-all shadow-sm space-y-3 cursor-pointer ${
                    isPending ? 'border-rose-500/40 bg-rose-500/5' : 'border-admin-border'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-admin-muted">#{w.id}</span>
                      <span className="font-bold text-sm text-admin-text">{w.username || `User #${w.user_id}`}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={w.status} />
                      <button
                        onClick={(e) => handleDeleteWithdrawal(e, w.id)}
                        disabled={isLoading}
                        className="p-1 text-slate-400 hover:text-rose-400"
                        title="Delete Record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-admin-border/50 text-xs">
                    <span className="text-admin-muted font-medium">Payout Amount</span>
                    <span className="font-extrabold text-sm text-amber-400 font-mono">{formatCurrency(w.amount)}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-admin-muted font-medium">Payout Method</span>
                    {(() => {
                      const m = String(w.method || 'telebirr').toLowerCase();
                      if (m.includes('bank') || m === 'cbe') {
                        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">🏦 CBE Bank</span>;
                      }
                      if (m.includes('cbe') || m === 'cbebirr') {
                        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">💳 CBE Birr</span>;
                      }
                      return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">📱 Telebirr</span>;
                    })()}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-admin-muted font-medium">Account / Phone</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-admin-text bg-admin-surface px-2 py-0.5 rounded-lg text-[11px] border border-admin-border font-bold select-all">
                        {destAccount}
                      </span>
                      {destAccount !== '—' && (
                        <button
                          onClick={(e) => handleCopyAccount(e, destAccount, w.id)}
                          className="p-1 text-admin-muted hover:text-admin-text"
                          title="Copy"
                        >
                          {copiedId === w.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {w.account_name && (
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-admin-muted font-medium">Account Holder</span>
                      <span className="font-semibold text-admin-text text-[11.5px]">{w.account_name}</span>
                    </div>
                  )}

                  {isPending ? (
                    <div className="flex gap-2 pt-2 border-t border-admin-border/50">
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={(e) => handleQuickApprove(e, w.id)}
                        disabled={isLoading}
                      >
                        <Check className="w-3.5 h-3.5 mr-1" />
                        Mark Paid
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={(e) => handleQuickReject(e, w.id)}
                        disabled={isLoading}
                      >
                        <X className="w-3.5 h-3.5 mr-1" />
                        Reject
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-[11px] text-admin-muted pt-1">
                      <span>Date</span>
                      <span className="font-mono">{formatDateTime(w.created_at)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* Empty State */
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-admin-accent/10 border border-admin-accent/20 flex items-center justify-center text-admin-accent mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-admin-text">No {activeTab} payouts found</h3>
            <p className="text-xs text-admin-muted mt-1 max-w-sm mx-auto">
              {searchTerm
                ? 'No withdrawal requests match your search filter.'
                : 'All payouts in this category have been processed.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Review Modal */}
      {selectedWithdrawal && (
        <WithdrawalReviewModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedWithdrawal(null);
          }}
          withdrawal={selectedWithdrawal}
          onApprove={async (id) => {
            await adminApi.approveWithdrawal(id);
            setIsModalOpen(false);
            onRefresh();
          }}
          onReject={async (id, reason) => {
            await adminApi.rejectWithdrawal(id, reason);
            setIsModalOpen(false);
            onRefresh();
          }}
          onDelete={async (id) => {
            await handleDeleteWithdrawal(null, id);
          }}
        />
      )}
    </div>
  );
}
