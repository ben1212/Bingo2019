import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/Badge';
import { TableWrapper, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmptyState } from '../components/ui/Table';
import { DepositReviewModal } from '../components/modals/DepositReviewModal';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { adminApi } from '../api/adminApi';
import { Search, ArrowDownLeft, ShieldCheck, CheckCircle2, XCircle, Eye, Clock, Check, X, Filter, Trash2 } from 'lucide-react';

export function DepositsPage({ deposits, loading, onRefresh }) {
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'approved' | 'rejected' | 'all'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeposit, setSelectedDeposit] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Counts
  const counts = useMemo(() => {
    const list = deposits || [];
    return {
      all: list.length,
      pending: list.filter(d => String(d.status || '').toLowerCase() === 'pending').length,
      approved: list.filter(d => String(d.status || '').toLowerCase() === 'approved').length,
      rejected: list.filter(d => ['rejected', 'declined', 'failed'].includes(String(d.status || '').toLowerCase())).length,
    };
  }, [deposits]);

  // Filtered deposits
  const filteredDeposits = useMemo(() => {
    return (deposits || []).filter((d) => {
      const status = String(d.status || '').toLowerCase();
      
      if (activeTab === 'pending' && status !== 'pending') return false;
      if (activeTab === 'approved' && status !== 'approved') return false;
      if (activeTab === 'rejected' && !['rejected', 'declined', 'failed'].includes(status)) return false;

      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        String(d.username || '').toLowerCase().includes(term) ||
        String(d.tx_hash || d.reference || d.receipt_sms || '').toLowerCase().includes(term) ||
        String(d.phone || '').includes(term) ||
        String(d.id).includes(term) ||
        String(d.amount).includes(term)
      );
    });
  }, [deposits, activeTab, searchTerm]);

  const handleOpenReview = (dep) => {
    setSelectedDeposit(dep);
    setIsModalOpen(true);
  };

  const handleQuickApprove = async (e, deposit) => {
    e.stopPropagation();
    if (!window.confirm(`Approve deposit of ${formatCurrency(deposit.amount)} for player ${deposit.username || 'User'}?`)) return;
    setActionLoadingId(deposit.id);
    try {
      await adminApi.approveDeposit(deposit.id);
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to approve deposit');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleQuickReject = async (e, deposit) => {
    e.stopPropagation();
    const reason = window.prompt(`Reject deposit #${deposit.id}? Enter optional reason:`, 'Invalid transaction receipt');
    if (reason === null) return;
    setActionLoadingId(deposit.id);
    try {
      await adminApi.rejectDeposit(deposit.id, reason);
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reject deposit');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteDeposit = async (e, depositId) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!window.confirm(`Are you sure you want to permanently delete deposit #${depositId}? This will remove it from all records and history.`)) return;
    setActionLoadingId(depositId);
    try {
      await adminApi.deleteDeposit(depositId);
      if (selectedDeposit && selectedDeposit.id === depositId) {
        setIsModalOpen(false);
        setSelectedDeposit(null);
      }
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete deposit');
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
            { id: 'pending', label: 'Pending', count: counts.pending, color: 'bg-amber-500/20 text-amber-400 font-bold' },
            { id: 'approved', label: 'Approved', count: counts.approved, color: 'bg-emerald-500/20 text-emerald-400 font-bold' },
            { id: 'rejected', label: 'Rejected', count: counts.rejected, color: 'bg-rose-500/20 text-rose-400 font-bold' },
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

        {/* Search Input */}
        <div className="relative min-w-[240px] sm:w-72">
          <Search className="w-4 h-4 text-admin-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search player, phone, or transaction ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl bg-admin-card border border-admin-border text-admin-text placeholder-admin-muted focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {/* ── Deposits Content ────────────────────────────── */}
      {filteredDeposits.length > 0 ? (
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
                    <TableHead>TX Reference / SMS</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDeposits.map((d) => {
                    const isPending = String(d.status || '').toLowerCase() === 'pending';
                    const isLoading = actionLoadingId === d.id;

                    return (
                      <TableRow
                        key={d.id}
                        onClick={() => handleOpenReview(d)}
                        className="group hover:bg-admin-cardHover/50 cursor-pointer"
                      >
                        <TableCell className="font-mono text-xs text-admin-muted">#{d.id}</TableCell>
                        <TableCell>
                          <span className="font-bold text-admin-text block">{d.username || `User #${d.user_id}`}</span>
                          {d.phone && <span className="text-[11px] text-admin-muted font-mono">{d.phone}</span>}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const m = String(d.method || 'telebirr').toLowerCase();
                            if (m.includes('cbe') || m === 'cbebirr') {
                              return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">💳 CBE Birr</span>;
                            }
                            return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">📱 Telebirr</span>;
                          })()}
                        </TableCell>
                        <TableCell className="font-extrabold text-emerald-400 font-mono text-sm">
                          {formatCurrency(d.amount)}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-admin-text max-w-xs truncate">
                          <span className="bg-admin-surface px-2 py-0.5 rounded-lg border border-admin-border" title={d.receipt_sms || d.tx_hash || d.reference || ''}>
                            {d.tx_hash || d.reference || (d.receipt_sms ? `${d.receipt_sms.slice(0, 30)}...` : '—')}
                          </span>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={d.status} />
                        </TableCell>
                        <TableCell className="text-xs text-admin-muted font-mono">{formatDateTime(d.created_at)}</TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {isPending && (
                              <>
                                <button
                                  onClick={(e) => handleQuickApprove(e, d)}
                                  disabled={isLoading}
                                  className="p-1.5 rounded-xl bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500 hover:text-white border border-emerald-500/30 transition-all"
                                  title="Quick Approve"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => handleQuickReject(e, d)}
                                  disabled={isLoading}
                                  className="p-1.5 rounded-xl bg-rose-500/15 text-rose-400 hover:bg-rose-500 hover:text-white border border-rose-500/30 transition-all"
                                  title="Quick Reject"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={(e) => handleDeleteDeposit(e, d.id)}
                              disabled={isLoading}
                              className="p-1.5 rounded-xl bg-slate-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 border border-slate-700/50 transition-all"
                              title="Delete Transaction Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleOpenReview(d)}
                              className="text-xs"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              Details
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
            {filteredDeposits.map((d) => {
              const isPending = String(d.status || '').toLowerCase() === 'pending';
              const isLoading = actionLoadingId === d.id;

              return (
                <div
                  key={d.id}
                  onClick={() => handleOpenReview(d)}
                  className={`p-4 rounded-2xl bg-admin-card border transition-all shadow-sm space-y-3 cursor-pointer ${
                    isPending ? 'border-amber-500/40 bg-amber-500/5' : 'border-admin-border'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-admin-muted">#{d.id}</span>
                      <span className="font-bold text-sm text-admin-text">{d.username || `User #${d.user_id}`}</span>
                    </div>
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <StatusBadge status={d.status} />
                      <button
                        onClick={(e) => handleDeleteDeposit(e, d.id)}
                        disabled={isLoading}
                        className="p-1 text-slate-400 hover:text-rose-400"
                        title="Delete Record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-admin-border/50 text-xs">
                    <span className="text-admin-muted font-medium">Payment Method</span>
                    {(() => {
                      const m = String(d.method || 'telebirr').toLowerCase();
                      if (m.includes('cbe') || m === 'cbebirr') {
                        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">💳 CBE Birr</span>;
                      }
                      return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">📱 Telebirr</span>;
                    })()}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-admin-muted font-medium">Deposit Amount</span>
                    <span className="font-extrabold text-sm text-emerald-400 font-mono">{formatCurrency(d.amount)}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-admin-muted font-medium">TX Reference</span>
                    <span className="font-mono text-admin-text bg-admin-surface px-2 py-0.5 rounded-lg text-[11px] border border-admin-border truncate max-w-[180px]">
                      {d.tx_hash || d.reference || (d.receipt_sms ? `${d.receipt_sms.slice(0, 25)}...` : '—')}
                    </span>
                  </div>

                  {/* Full Message Preview */}
                  {(d.receipt_sms || d.message || d.notes) && (
                    <div className="p-2.5 rounded-xl bg-admin-surface/80 border border-admin-border/60 text-[11px] font-mono text-admin-text whitespace-pre-wrap break-words leading-relaxed">
                      <span className="text-[10px] font-bold text-admin-muted uppercase tracking-wider block mb-1">
                        Transaction Message
                      </span>
                      {d.receipt_sms || d.message || d.notes}
                    </div>
                  )}

                  {isPending ? (
                    <div className="flex gap-2 pt-2 border-t border-admin-border/50">
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={(e) => handleQuickApprove(e, d)}
                        disabled={isLoading}
                      >
                        <Check className="w-3.5 h-3.5 mr-1" />
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={(e) => handleQuickReject(e, d)}
                        disabled={isLoading}
                      >
                        <X className="w-3.5 h-3.5 mr-1" />
                        Reject
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-[11px] text-admin-muted pt-1">
                      <span>Date</span>
                      <span className="font-mono">{formatDateTime(d.created_at)}</span>
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
            <h3 className="text-sm font-bold text-admin-text">No {activeTab} deposits found</h3>
            <p className="text-xs text-admin-muted mt-1 max-w-sm mx-auto">
              {searchTerm
                ? 'No deposit transactions match your search filter.'
                : 'All transactions in this category have been processed.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Review Modal */}
      {selectedDeposit && (
        <DepositReviewModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedDeposit(null);
          }}
          deposit={selectedDeposit}
          onApprove={async (id) => {
            await adminApi.approveDeposit(id);
            setIsModalOpen(false);
            onRefresh();
          }}
          onReject={async (id, reason) => {
            await adminApi.rejectDeposit(id, reason);
            setIsModalOpen(false);
            onRefresh();
          }}
          onDelete={async (id) => {
            await handleDeleteDeposit(null, id);
          }}
        />
      )}
    </div>
  );
}
