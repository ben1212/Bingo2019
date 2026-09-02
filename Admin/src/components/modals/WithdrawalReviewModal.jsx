import React, { useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/Badge';
import { formatCurrency, formatDateTime, copyToClipboard } from '../../utils/formatters';
import { Check, Copy, AlertCircle, ArrowUpRight, CheckCircle2, XCircle, Smartphone, Wallet, Trash2 } from 'lucide-react';

export function WithdrawalReviewModal({
  withdrawal,
  isOpen,
  onClose,
  onApprove,
  onReject,
  onDelete,
  isLoading,
}) {
  const [copiedField, setCopiedField] = useState(null);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  if (!withdrawal) return null;

  const handleCopy = async (field, text) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const handleClose = () => {
    setRejectMode(false);
    setRejectReason('');
    onClose();
  };

  const isPending = String(withdrawal.status || '').toLowerCase() === 'pending';
  const accountVal = withdrawal.account_number || withdrawal.phone || withdrawal.account || 'N/A';

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <div className="flex items-center gap-2 text-amber-400">
          <ArrowUpRight className="w-5 h-5" />
          <span>Withdrawal #{withdrawal.id}</span>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Status banner */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-admin-bg border border-admin-border">
          <span className="text-xs text-slate-400 font-medium">Status</span>
          <StatusBadge status={withdrawal.status} />
        </div>

        {/* Payout Amount & Method */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3.5 rounded-xl bg-admin-bg/70 border border-admin-border">
            <span className="text-xs text-slate-400 font-medium block">Payout Amount</span>
            <span className="text-base sm:text-lg font-bold text-amber-400 mt-0.5 block">
              {formatCurrency(withdrawal.amount)}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-admin-bg/70 border border-admin-border">
            <span className="text-xs text-slate-400 font-medium block">Payout Method</span>
            <div className="mt-1">
              {(() => {
                const m = String(withdrawal.method || 'telebirr').toLowerCase();
                if (m.includes('bank') || m === 'cbe') {
                  return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">🏦 CBE Bank</span>;
                }
                if (m.includes('cbe') || m === 'cbebirr') {
                  return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">💳 CBE Birr</span>;
                }
                return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">📱 Telebirr</span>;
              })()}
            </div>
          </div>
        </div>

        {/* Recipient Account Details */}
        <div className="space-y-2.5 p-3.5 rounded-xl bg-admin-bg/70 border border-admin-border">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Player</span>
            <span className="font-semibold text-slate-200">{withdrawal.username || `User #${withdrawal.user_id}`}</span>
          </div>

          {/* Account Number / Phone with 1-Click Copy */}
          <div className="flex items-center justify-between text-sm pt-2 border-t border-admin-border/50">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Smartphone className="w-4 h-4" />
              <span>Target Account / Phone</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-bold text-white text-sm bg-slate-800 px-2.5 py-0.5 rounded-md border border-slate-700 select-all">
                {accountVal}
              </span>
              <button
                type="button"
                onClick={() => handleCopy('account', accountVal)}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Copy Account Number"
              >
                {copiedField === 'account' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {withdrawal.account_name && (
            <div className="flex items-center justify-between text-sm pt-2 border-t border-admin-border/50">
              <span className="text-slate-400">Account Holder Name</span>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-white text-sm bg-slate-800 px-2.5 py-0.5 rounded-md border border-slate-700 select-all">
                  {withdrawal.account_name}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy('name', withdrawal.account_name)}
                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Copy Account Holder Name"
                >
                  {copiedField === 'name' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-sm pt-2 border-t border-admin-border/50">
            <span className="text-slate-400">Requested Time</span>
            <span className="text-xs text-slate-300">{formatDateTime(withdrawal.created_at)}</span>
          </div>
        </div>

        {/* Reject reason input */}
        {rejectMode && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 space-y-2 animate-fade-in">
            <div className="flex items-center gap-2 text-red-400 text-xs font-semibold">
              <AlertCircle className="w-4 h-4" />
              <span>Reason for Rejection</span>
            </div>
            <input
              type="text"
              placeholder="Reason (optional)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg bg-admin-bg border border-red-500/30 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/40"
              autoFocus
            />
          </div>
        )}

        {/* Actions */}
        <div className="pt-2 space-y-2">
          {isPending ? (
            <div className="flex flex-col sm:flex-row gap-2.5">
              {!rejectMode ? (
                <>
                  <Button
                    type="button"
                    variant="destructive"
                    className="flex-1 order-2 sm:order-1"
                    onClick={() => setRejectMode(true)}
                    disabled={isLoading}
                  >
                    <XCircle className="w-4 h-4 mr-1.5" />
                    Reject & Refund
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    className="flex-1 order-1 sm:order-2"
                    onClick={() => onApprove(withdrawal.id)}
                    isLoading={isLoading}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    Approve Payout
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 order-2 sm:order-1"
                    onClick={() => setRejectMode(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructiveSolid"
                    className="flex-1 order-1 sm:order-2"
                    onClick={() => onReject(withdrawal.id, rejectReason)}
                    isLoading={isLoading}
                  >
                    Confirm Reject & Refund
                  </Button>
                </>
              )}
            </div>
          ) : null}

          {/* Delete and Close Row */}
          <div className="flex items-center gap-2 pt-1 border-t border-admin-border/50">
            {onDelete && (
              <Button
                type="button"
                variant="outline"
                className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border-rose-500/30"
                onClick={() => onDelete(withdrawal.id)}
                disabled={isLoading}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Delete Record
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              className="flex-1 text-xs"
              onClick={handleClose}
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
