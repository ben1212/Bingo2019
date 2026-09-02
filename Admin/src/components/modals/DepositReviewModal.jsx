import React, { useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/Badge';
import { formatCurrency, formatDateTime, copyToClipboard } from '../../utils/formatters';
import { Check, Copy, AlertCircle, ArrowDownLeft, ShieldCheck, XCircle, Trash2 } from 'lucide-react';

export function DepositReviewModal({
  deposit,
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

  if (!deposit) return null;

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

  const isPending = String(deposit.status || '').toLowerCase() === 'pending';

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <div className="flex items-center gap-2 text-emerald-400">
          <ArrowDownLeft className="w-5 h-5" />
          <span>Deposit #{deposit.id}</span>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Status banner */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-admin-bg border border-admin-border">
          <span className="text-xs text-slate-400 font-medium">Status</span>
          <StatusBadge status={deposit.status} />
        </div>

        {/* Core details grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3.5 rounded-xl bg-admin-bg/70 border border-admin-border">
            <span className="text-xs text-slate-400 font-medium block">Amount</span>
            <span className="text-base sm:text-lg font-bold text-emerald-400 mt-0.5 block">
              {formatCurrency(deposit.amount)}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-admin-bg/70 border border-admin-border">
            <span className="text-xs text-slate-400 font-medium block">Deposit Method</span>
            <div className="mt-1">
              {(() => {
                const m = String(deposit.method || 'telebirr').toLowerCase();
                if (m.includes('cbe') || m === 'cbebirr') {
                  return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">💳 CBE Birr</span>;
                }
                return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">📱 Telebirr</span>;
              })()}
            </div>
          </div>
        </div>

        {/* User & Account */}
        <div className="space-y-2.5 p-3.5 rounded-xl bg-admin-bg/70 border border-admin-border">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Player</span>
            <span className="font-semibold text-slate-200">{deposit.username || `User #${deposit.user_id}`}</span>
          </div>

          {deposit.account_name && (
            <div className="flex items-center justify-between text-sm pt-2 border-t border-admin-border/50">
              <span className="text-slate-400">Account Name</span>
              <span className="font-medium text-slate-200">{deposit.account_name}</span>
            </div>
          )}

          {/* Transaction Reference with 1-Click Copy */}
          <div className="flex items-center justify-between text-sm pt-2 border-t border-admin-border/50">
            <span className="text-slate-400">TX Reference</span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-medium text-emerald-400 text-xs sm:text-sm bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                {deposit.tx_hash || deposit.reference || deposit.transaction_ref || 'N/A'}
              </span>
              {(deposit.tx_hash || deposit.reference || deposit.transaction_ref) && (
                <button
                  type="button"
                  onClick={() => handleCopy('tx', deposit.tx_hash || deposit.reference || deposit.transaction_ref)}
                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Copy Reference"
                >
                  {copiedField === 'tx' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-sm pt-2 border-t border-admin-border/50">
            <span className="text-slate-400">Requested Time</span>
            <span className="text-xs text-slate-300">{formatDateTime(deposit.created_at)}</span>
          </div>
        </div>

        {/* Full Transaction Message / SMS Confirmation Box */}
        {(deposit.receipt_sms || deposit.message || deposit.sms_code || deposit.notes) && (
          <div className="p-3.5 rounded-xl bg-admin-surface/70 border border-admin-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-admin-muted uppercase tracking-wider">
                Transaction SMS / Message
              </span>
              <button
                type="button"
                onClick={() => handleCopy('sms', deposit.receipt_sms || deposit.message || deposit.sms_code || deposit.notes)}
                className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                {copiedField === 'sms' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Message</span>
                  </>
                )}
              </button>
            </div>
            <div className="p-2.5 rounded-lg bg-admin-bg border border-admin-border/60 text-xs font-mono text-admin-text whitespace-pre-wrap break-words leading-relaxed select-all">
              {deposit.receipt_sms || deposit.message || deposit.sms_code || deposit.notes}
            </div>
          </div>
        )}

        {/* Proof Image (if attached) */}
        {deposit.proof_image && (
          <div className="p-3.5 rounded-xl bg-admin-surface/70 border border-admin-border space-y-2">
            <span className="text-xs font-semibold text-admin-muted uppercase tracking-wider block">
              Payment Screenshot / Proof
            </span>
            <a
              href={deposit.proof_image.startsWith('http') || deposit.proof_image.startsWith('/uploads') ? deposit.proof_image : `/uploads/${deposit.proof_image}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg overflow-hidden border border-admin-border hover:opacity-90 transition-opacity"
            >
              <img
                src={deposit.proof_image.startsWith('http') || deposit.proof_image.startsWith('/uploads') ? deposit.proof_image : `/uploads/${deposit.proof_image}`}
                alt="Deposit proof receipt"
                className="w-full max-h-48 object-cover object-top"
              />
            </a>
          </div>
        )}

        {/* Reject reason input if in reject mode */}
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

        {/* Action Buttons */}
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
                    Reject
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    className="flex-1 order-1 sm:order-2"
                    onClick={() => onApprove(deposit.id)}
                    isLoading={isLoading}
                  >
                    <ShieldCheck className="w-4 h-4 mr-1.5" />
                    Approve Deposit
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
                    onClick={() => onReject(deposit.id, rejectReason)}
                    isLoading={isLoading}
                  >
                    Confirm Rejection
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
                onClick={() => onDelete(deposit.id)}
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
