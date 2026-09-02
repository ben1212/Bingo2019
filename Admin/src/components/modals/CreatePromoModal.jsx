import React, { useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Ticket, Sparkles, Info, Calendar, Shield } from 'lucide-react';

export function CreatePromoModal({
  isOpen,
  onClose,
  onCreate,
  isLoading,
}) {
  const [code, setCode] = useState('');
  const [rewardAmount, setRewardAmount] = useState('');
  const [maxUses, setMaxUses] = useState('10');
  const [expiresAt, setExpiresAt] = useState('');
  const [requireDeposit, setRequireDeposit] = useState(false);
  const [minDepositAmount, setMinDepositAmount] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    const amt = parseFloat(rewardAmount);
    const uses = parseInt(maxUses);

    if (!cleanCode) {
      setError('Please enter a promo code name');
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      setError('Please enter a valid positive reward amount');
      return;
    }
    if (isNaN(uses) || uses <= 0) {
      setError('Please enter a valid maximum usage limit');
      return;
    }
    if (requireDeposit) {
      const minDep = parseFloat(minDepositAmount);
      if (isNaN(minDep) || minDep <= 0) {
        setError('Please enter a valid minimum deposit amount');
        return;
      }
    }

    setError('');
    onCreate({
      code: cleanCode,
      rewardAmount: amt,
      maxUses: uses,
      expiresAt: expiresAt || null,
      requireDeposit,
      minDepositAmount: requireDeposit ? parseFloat(minDepositAmount) : null,
    });
  };

  const handleClose = () => {
    setCode('');
    setRewardAmount('');
    setMaxUses('10');
    setExpiresAt('');
    setRequireDeposit(false);
    setMinDepositAmount('');
    setError('');
    onClose();
  };

  // ── Derived summary values ──────────────────────────────────
  const summaryCode = code.trim().toUpperCase() || '—';
  const summaryReward = rewardAmount ? `${parseFloat(rewardAmount).toLocaleString()} ETB` : '—';
  const summaryUses = maxUses ? parseInt(maxUses).toLocaleString() + ' users' : '—';
  const summaryDeposit = requireDeposit && minDepositAmount
    ? `Yes — ${parseFloat(minDepositAmount).toLocaleString()} ETB`
    : requireDeposit ? 'Yes' : 'No';
  const summaryExpiry = expiresAt
    ? new Date(expiresAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'No expiry';

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <div className="flex items-center gap-2 text-indigo-400">
          <Ticket className="w-5 h-5" />
          <span>Create Promo Code</span>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── BASIC INFORMATION ─────────────────────────────── */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-3">
            Basic Information
          </p>

          <div className="space-y-3">
            {/* Code */}
            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1.5">
                Promo Code Name
              </label>
              <input
                type="text"
                placeholder="e.g. WELCOME100 or VIPBONUS"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full text-sm font-mono uppercase px-3.5 py-2.5 rounded-xl bg-admin-bg border border-admin-border text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                required
                autoFocus
              />
            </div>

            {/* Reward + Usage in a grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1.5">
                  Reward Amount (ETB)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="e.g. 100"
                  value={rewardAmount}
                  onChange={(e) => setRewardAmount(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-admin-bg border border-admin-border text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1.5">
                  Usage Limit (Count)
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 1000"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-admin-bg border border-admin-border text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  required
                />
              </div>
            </div>

            {/* Expiration */}
            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Expiration Date (Optional)
              </label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-admin-bg border border-admin-border text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* ── DEPOSIT REQUIREMENT ────────────────────────────── */}
        <div className="rounded-xl border border-admin-border overflow-hidden">
          {/* Section header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-admin-bg/60 border-b border-admin-border">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              Deposit Requirement
            </p>
          </div>

          <div className="p-4 space-y-4">
            {/* Toggle row */}
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-300 font-medium">
                Require Deposit to Claim?
              </label>
              <div className="flex items-center gap-3 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="requireDeposit"
                    checked={!requireDeposit}
                    onChange={() => setRequireDeposit(false)}
                    className="accent-slate-400"
                  />
                  <span className={!requireDeposit ? 'text-white font-semibold' : 'text-slate-500'}>No</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="requireDeposit"
                    checked={requireDeposit}
                    onChange={() => setRequireDeposit(true)}
                    className="accent-indigo-500"
                  />
                  <span className={requireDeposit ? 'text-indigo-300 font-semibold' : 'text-slate-500'}>Yes</span>
                </label>
              </div>
            </div>

            {/* Conditional deposit amount + info */}
            {requireDeposit && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1.5">
                    Minimum Deposit Amount (ETB)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="e.g. 500"
                    value={minDepositAmount}
                    onChange={(e) => setMinDepositAmount(e.target.value)}
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-admin-bg border border-indigo-500/40 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    required={requireDeposit}
                    autoFocus
                  />
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                  <Info className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-300/80 leading-relaxed">
                    Users must deposit at least{' '}
                    <span className="font-semibold text-amber-300">
                      {minDepositAmount ? parseFloat(minDepositAmount).toLocaleString() : '…'} ETB
                    </span>{' '}
                    <em>after this promo is created</em> before they can claim the reward. Previous deposits do not count.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── PROMO SUMMARY ─────────────────────────────────── */}
        <div className="rounded-xl border border-admin-border overflow-hidden">
          <div className="px-4 py-3 bg-admin-bg/60 border-b border-admin-border">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              Promo Summary
            </p>
          </div>
          <div className="divide-y divide-admin-border">
            <SummaryRow label="Promo Code" value={<span className="font-mono text-indigo-400">{summaryCode}</span>} />
            <SummaryRow label="Reward" value={<span className="text-emerald-400 font-semibold">{summaryReward}</span>} />
            <SummaryRow label="Usage Limit" value={summaryUses} />
            <SummaryRow
              label="Deposit Required"
              value={
                requireDeposit
                  ? <span className="text-amber-400 font-semibold">{summaryDeposit}</span>
                  : <span className="text-slate-400">No</span>
              }
            />
            {requireDeposit && (
              <SummaryRow
                label="Deposit Counting Starts"
                value={<span className="text-slate-400">From promo creation time</span>}
              />
            )}
            <SummaryRow label="Expiration" value={summaryExpiry} />
          </div>
        </div>

        {error && <p className="text-xs text-red-400 font-medium">{error}</p>}

        {/* ── ACTIONS ───────────────────────────────────────── */}
        <div className="pt-1 flex flex-col sm:flex-row gap-2.5">
          <Button type="button" variant="outline" className="flex-1 order-2 sm:order-1" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" variant="default" className="flex-1 order-1 sm:order-2" isLoading={isLoading}>
            <Sparkles className="w-4 h-4 mr-1.5" />
            Create Promo Code
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

// Small helper for the summary grid
function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="text-admin-text font-medium">{value}</span>
    </div>
  );
}
