import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Trophy,
  Gamepad2,
  ArrowDownLeft,
  ArrowUpRight,
  Copy,
  Check,
  Smartphone,
  Building2,
  Landmark,
  Send,
  AlertCircle,
  CheckCircle2,
  X,
  Clock,
  ArrowUpCircle,
  ArrowDownCircle
} from 'lucide-react';
import { apiFetch } from '../api';

const DEPOSIT_METHODS = {
  telebirr: {
    id: 'Telebirr',
    name: 'Telebirr',
    icon: Smartphone,
    color: '#0284c7',
    badgeBg: 'rgba(2, 132, 199, 0.15)',
    accountNumber: '0993994168',
    accountName: 'BingoX Official'
  },
  cbebirr: {
    id: 'cbebirr',
    name: 'CBE Birr',
    icon: CreditCard,
    color: '#10b981',
    badgeBg: 'rgba(16, 185, 129, 0.15)',
    accountNumber: '0993994168',
    accountName: 'BingoX Official'
  }
};

const WITHDRAW_METHODS = {
  telebirr: {
    id: 'Telebirr',
    name: 'Telebirr',
    icon: Smartphone,
    color: '#0284c7',
    badgeBg: 'rgba(2, 132, 199, 0.15)',
    label: 'Telebirr Phone Number',
    placeholder: '09XXXXXXXX'
  },
  cbebirr: {
    id: 'CBE Birr',
    name: 'CBE Birr',
    icon: Building2,
    color: '#8b5cf6',
    badgeBg: 'rgba(139, 92, 246, 0.15)',
    label: 'CBE Birr Phone Number',
    placeholder: '09XXXXXXXX'
  },
  cbe: {
    id: 'CBE',
    name: 'CBE Bank',
    icon: Landmark,
    color: '#10b981',
    badgeBg: 'rgba(16, 185, 129, 0.15)',
    label: 'CBE Bank Account Number',
    placeholder: '1000XXXXXXXXX'
  }
};

// In-memory cache for transactions
let txCache = null;

export default function WalletView({ user, token, socket, onBalanceUpdated }) {
  const [localUser, setLocalUser] = useState(user);
  const [paymentMethods, setPaymentMethods] = useState(DEPOSIT_METHODS);

  useEffect(() => {
    apiFetch('/api/wallet/payment-methods')
      .then(res => res.json())
      .then(data => {
        if (data && (data.telebirr || data.cbe)) {
          setPaymentMethods(prev => ({
            ...prev,
            telebirr: {
              ...prev.telebirr,
              accountNumber: data.telebirr?.accountNumber || prev.telebirr.accountNumber,
              accountName: data.telebirr?.accountName || prev.telebirr.accountName
            },
            cbebirr: {
              ...prev.cbebirr,
              accountNumber: data.cbebirr?.accountNumber || prev.cbebirr.accountNumber,
              accountName: data.cbebirr?.accountName || prev.cbebirr.accountName
            }
          }));
        }
      })
      .catch(() => {});
  }, []);
  
  React.useEffect(() => {
    if (user) setLocalUser(user);
  }, [user]);

  const balance = parseFloat(localUser?.balance) || 0;
  const withdrawableBal = parseFloat(localUser?.withdrawableBalance ?? localUser?.withdrawable_balance ?? 0) || 0;
  const playable = Math.max(0, balance - withdrawableBal);

  // ── Transactions State ──
  const [transactions, setTransactions] = useState(txCache || []);
  const [loadingTx, setLoadingTx] = useState(!txCache);

  const fetchTransactions = async () => {
    if (!token) return;
    try {
      const res = await apiFetch('/api/wallet/transactions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        const deps = (data.deposits || []).map(d => ({ ...d, type: 'deposit' }));
        const withs = (data.withdrawals || []).map(w => ({ ...w, type: 'withdrawal' }));
        const combined = [...deps, ...withs].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        txCache = combined;
        setTransactions(combined);
      }
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoadingTx(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
    if (!socket) return;
    const onTxUpdate = () => fetchTransactions();
    socket.on('user_transaction_updated', onTxUpdate);
    socket.on('balance_updated', onTxUpdate);
    return () => {
      socket.off('user_transaction_updated', onTxUpdate);
      socket.off('balance_updated', onTxUpdate);
    };
  }, [token, socket]);

  // ── Modal States ──
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  // Deposit Form State
  const [selectedDepositMethod, setSelectedDepositMethod] = useState('telebirr');
  const [depositAmount, setDepositAmount] = useState('10');
  const [transactionSms, setTransactionSms] = useState('');
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [depositSubmitting, setDepositSubmitting] = useState(false);
  const [depositFeedback, setDepositFeedback] = useState({ error: '', success: '' });

  // Withdraw Form State
  const [selectedWithdrawMethod, setSelectedWithdrawMethod] = useState('telebirr');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [destinationAccount, setDestinationAccount] = useState(localUser?.phone || '');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);
  const [withdrawFeedback, setWithdrawFeedback] = useState({ error: '', success: '', pendingDetails: null });

  const activeDepositAccount = paymentMethods[selectedDepositMethod] || paymentMethods.telebirr;
  const activeWithdrawMethod = WITHDRAW_METHODS[selectedWithdrawMethod] || WITHDRAW_METHODS.telebirr;

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedNumber(true);
    setTimeout(() => setCopiedNumber(false), 2000);
  };

  // ── Handle Deposit Submission ──
  const handleDepositSubmit = async (e) => {
    if (e) e.preventDefault();
    setDepositFeedback({ error: '', success: '' });

    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt < 10) {
      setDepositFeedback({ error: 'Minimum deposit is 10 ETB.', success: '' });
      return;
    }

    if (!transactionSms.trim()) {
      setDepositFeedback({ error: 'Please enter transaction SMS / Ref ID.', success: '' });
      return;
    }

    setDepositSubmitting(true);

    try {
      const res = await apiFetch('/api/wallet/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          method: activeDepositAccount.id,
          amount: amt,
          receiptSms: transactionSms.trim()
        })
      });

      const text = await res.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch (jsonErr) {
        throw new Error(text || `Server error (${res.status})`);
      }

      if (!res.ok) throw new Error(data.error || data.message || `Deposit failed (${res.status})`);

      setDepositFeedback({
        success: data.message || 'Deposit submitted for review.',
        error: ''
      });
      setTransactionSms('');
      fetchTransactions();

      setTimeout(() => {
        setShowDepositModal(false);
        setDepositFeedback({ error: '', success: '' });
      }, 2500);
    } catch (err) {
      setDepositFeedback({ error: err.message || 'Network error. Please try again.', success: '' });
    } finally {
      setDepositSubmitting(false);
    }
  };

  // ── Handle Withdraw Submission ──
  const handleWithdrawSubmit = async (e) => {
    if (e) e.preventDefault();
    setWithdrawFeedback({ error: '', success: '', pendingDetails: null });

    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt < 200) {
      setWithdrawFeedback({ error: 'Minimum withdrawal is 200 ETB.', success: '', pendingDetails: null });
      return;
    }

    if (amt > withdrawableBal) {
      setWithdrawFeedback({
        error: `Insufficient withdrawable balance (${withdrawableBal.toFixed(2)} ETB available).`,
        success: '',
        pendingDetails: null
      });
      return;
    }

    if (!destinationAccount.trim()) {
      setWithdrawFeedback({ error: `Please enter your ${activeWithdrawMethod.name} account / phone.`, success: '', pendingDetails: null });
      return;
    }

    if (!accountHolderName.trim()) {
      setWithdrawFeedback({ error: 'Please enter Account Name.', success: '', pendingDetails: null });
      return;
    }

    setWithdrawSubmitting(true);

    // Optimistic balance deduction
    const remainingWithdrawable = Math.max(0, withdrawableBal - amt);
    const remainingTotal = Math.max(0, balance - amt);
    setLocalUser(prev => ({
      ...prev,
      balance: remainingTotal,
      withdrawableBalance: remainingWithdrawable,
      withdrawable_balance: remainingWithdrawable
    }));

    try {
      const res = await apiFetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          method: activeWithdrawMethod.id,
          accountNumber: destinationAccount.trim(),
          accountName: accountHolderName.trim(),
          amount: amt
        })
      });

      const text = await res.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch (jsonErr) {
        setLocalUser(user); // rollback
        throw new Error(text || `Server error (${res.status})`);
      }

      if (!res.ok) {
        setLocalUser(user); // rollback
        throw new Error(data.error || data.message || `Withdrawal failed (${res.status})`);
      }

      if (onBalanceUpdated && data.newBalance !== undefined) {
        onBalanceUpdated(data.newBalance, data.withdrawableBalance);
      }

      setWithdrawFeedback({
        success: 'Withdrawal request submitted!',
        error: '',
        pendingDetails: {
          method: activeWithdrawMethod.name,
          requestedAmount: amt,
          remainingBalance: data.withdrawableBalance !== undefined ? data.withdrawableBalance : remainingWithdrawable,
          status: 'Pending'
        }
      });
      setWithdrawAmount('');
      fetchTransactions();
    } catch (err) {
      setWithdrawFeedback({ error: err.message || 'Network error. Please try again.', success: '', pendingDetails: null });
    } finally {
      setWithdrawSubmitting(false);
    }
  };


  const getStatusBadge = (status) => {
    const s = (status || 'pending').toLowerCase();
    if (s === 'approved' || s === 'completed') {
      return <span style={{ color: '#34d399', fontWeight: '800', fontSize: '11px' }}>Approved</span>;
    }
    if (s === 'rejected' || s === 'declined') {
      return <span style={{ color: '#ef4444', fontWeight: '800', fontSize: '11px' }}>Rejected</span>;
    }
    return <span style={{ color: '#fbbf24', fontWeight: '800', fontSize: '11px' }}>Pending</span>;
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '48px',
        left: 0,
        right: 0,
        bottom: '62px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxSizing: 'border-box',
        color: '#ffffff',
        maxWidth: '480px',
        margin: '0 auto'
      }}
    >
      {/* ── FIXED TOP SECTION (3 BALANCE CARDS + BUTTONS) ── */}
      <div style={{ flexShrink: 0, padding: '12px 12px 6px' }}>

        {/* 3 BALANCE CARDS */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(17, 26, 46, 0.98) 0%, rgba(13, 20, 38, 0.98) 100%)',
            borderRadius: '18px',
            padding: '14px 10px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)'
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>

            {/* 1. ACCOUNT BALANCE */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.15) 0%, rgba(15, 23, 42, 0.9) 100%)',
                borderRadius: '12px',
                padding: '10px 4px',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px'
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  background: 'rgba(56, 189, 248, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 2px'
                }}
              >
                <CreditCard size={14} color="#38bdf8" />
              </div>
              <div style={{ fontSize: '9px', color: '#38bdf8', fontWeight: '800', textTransform: 'uppercase' }}>
                Account
              </div>
              <div style={{ fontSize: '8px', color: '#94a3b8', fontWeight: '600' }}>Total</div>
              <div style={{ fontSize: '15.5px', fontWeight: '900', color: '#ffffff', lineHeight: 1.1, marginTop: '2px' }}>
                {balance.toFixed(2)}
              </div>
              <div style={{ fontSize: '8.5px', color: '#38bdf8', fontWeight: '800' }}>ETB</div>
            </div>

            {/* 2. WITHDRAWAL BALANCE */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(15, 23, 42, 0.9) 100%)',
                borderRadius: '12px',
                padding: '10px 4px',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px'
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  background: 'rgba(16, 185, 129, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 2px'
                }}
              >
                <Trophy size={14} color="#34d399" />
              </div>
              <div style={{ fontSize: '9px', color: '#34d399', fontWeight: '800', textTransform: 'uppercase' }}>
                Withdrawal
              </div>
              <div style={{ fontSize: '8px', color: '#94a3b8', fontWeight: '600' }}>Winnings</div>
              <div style={{ fontSize: '15.5px', fontWeight: '900', color: '#34d399', lineHeight: 1.1, marginTop: '2px' }}>
                {withdrawableBal.toFixed(2)}
              </div>
              <div style={{ fontSize: '8.5px', color: '#34d399', fontWeight: '800' }}>ETB</div>
            </div>

            {/* 3. PLAYABLE BALANCE */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(15, 23, 42, 0.9) 100%)',
                borderRadius: '12px',
                padding: '10px 4px',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px'
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  background: 'rgba(245, 158, 11, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 2px'
                }}
              >
                <Gamepad2 size={14} color="#fbbf24" />
              </div>
              <div style={{ fontSize: '9px', color: '#fbbf24', fontWeight: '800', textTransform: 'uppercase' }}>
                Playable
              </div>
              <div style={{ fontSize: '8px', color: '#94a3b8', fontWeight: '600' }}>Deposits</div>
              <div style={{ fontSize: '15.5px', fontWeight: '900', color: '#fbbf24', lineHeight: 1.1, marginTop: '2px' }}>
                {playable.toFixed(2)}
              </div>
              <div style={{ fontSize: '8.5px', color: '#fbbf24', fontWeight: '800' }}>ETB</div>
            </div>

          </div>
        </div>

        {/* SIDE-BY-SIDE BUTTONS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
          
          {/* DEPOSIT */}
          <button
            type="button"
            onClick={() => {
              setShowDepositModal(true);
              setDepositFeedback({ error: '', success: '' });
            }}
            style={{
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              borderRadius: '14px',
              padding: '12px 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontSize: '13.5px',
              fontWeight: '900',
              boxShadow: '0 3px 12px rgba(2, 132, 199, 0.3)'
            }}
          >
            <ArrowDownLeft size={16} color="#ffffff" strokeWidth={2.5} />
            <span>Deposit</span>
          </button>

          {/* WITHDRAW */}
          <button
            type="button"
            onClick={() => {
              setShowWithdrawModal(true);
              setWithdrawFeedback({ error: '', success: '', pendingDetails: null });
            }}
            style={{
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              color: '#ffffff',
              border: '1px solid rgba(52, 211, 153, 0.35)',
              borderRadius: '14px',
              padding: '12px 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontSize: '13.5px',
              fontWeight: '900',
              boxShadow: '0 3px 12px rgba(5, 150, 105, 0.3)'
            }}
          >
            <ArrowUpRight size={16} color="#ffffff" strokeWidth={2.5} />
            <span>Withdraw</span>
          </button>

        </div>

        {/* Transactions Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', padding: '0 2px' }}>
          <h3 style={{ fontSize: '12.5px', fontWeight: '800', margin: 0, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Transactions
          </h3>
        </div>

      </div>

      {/* ── SCROLLABLE TRANSACTIONS LIST (CLEAN PLAIN TEXT) ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 12px', boxSizing: 'border-box' }}>
        {transactions.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '24px 16px',
              background: 'rgba(17, 26, 46, 0.6)',
              borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              color: '#64748b',
              fontSize: '12px',
              fontWeight: '600'
            }}
          >
            No transactions yet
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {transactions.map((tx, i) => {
              const isDep = tx.type === 'deposit';
              const amt = parseFloat(tx.amount || 0).toFixed(2);
              const method = tx.method || 'Telebirr';
              const dateStr = tx.created_at
                ? new Date(tx.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                : '';

              return (
                <div
                  key={tx.id ? `${tx.type}-${tx.id}` : i}
                  style={{
                    background: 'rgba(17, 26, 46, 0.95)',
                    borderRadius: '12px',
                    padding: '10px 12px',
                    border: '1px solid rgba(255, 255, 255, 0.07)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px'
                  }}
                >
                  {/* Left: Icon + Type & Method + Date */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '8px',
                        background: isDep ? 'rgba(56, 189, 248, 0.15)' : 'rgba(52, 211, 153, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      {isDep ? (
                        <ArrowDownCircle size={16} color="#38bdf8" />
                      ) : (
                        <ArrowUpCircle size={16} color="#34d399" />
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#f8fafc' }}>
                        {isDep ? 'Deposit' : 'Withdrawal'} • <span style={{ color: '#94a3b8', fontWeight: '700' }}>{method}</span>
                      </div>
                      {dateStr && (
                        <div style={{ fontSize: '10px', color: '#64748b', marginTop: '1px' }}>
                          {dateStr}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Amount & Status */}
                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        fontSize: '13.5px',
                        fontWeight: '900',
                        color: isDep ? '#38bdf8' : '#34d399'
                      }}
                    >
                      {isDep ? `+${amt}` : `-${amt}`} ETB
                    </div>
                    <div style={{ marginTop: '1px' }}>
                      {getStatusBadge(tx.status)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── CLEAN DEPOSIT MODAL ── */}
      {showDepositModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.82)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            style={{
              background: 'linear-gradient(180deg, rgba(18, 28, 50, 0.99) 0%, rgba(10, 15, 30, 1) 100%)',
              borderRadius: '20px',
              padding: '18px 16px',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              maxWidth: '400px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
              position: 'relative',
              boxSizing: 'border-box'
            }}
          >
            <button
              type="button"
              onClick={() => setShowDepositModal(false)}
              style={{
                position: 'absolute',
                top: '14px',
                right: '14px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                borderRadius: '50%',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#cbd5e1',
                cursor: 'pointer'
              }}
            >
              <X size={15} />
            </button>

            <h3 style={{ fontSize: '15px', fontWeight: '900', margin: '0 0 12px', color: '#ffffff' }}>
              Deposit ETB
            </h3>

            {depositFeedback.error && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#f87171', padding: '7px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={13} /> <span>{depositFeedback.error}</span>
              </div>
            )}

            {depositFeedback.success && (
              <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#34d399', padding: '8px 10px', borderRadius: '8px', fontSize: '11.5px', fontWeight: '700', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={14} /> <span>{depositFeedback.success}</span>
              </div>
            )}

            {/* 1. Payment Method */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '10px' }}>
              {Object.entries(DEPOSIT_METHODS).map(([key, item]) => {
                const isSelected = selectedDepositMethod === key;
                const Icon = item.icon;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDepositMethod(key)}
                    style={{
                      background: isSelected ? item.badgeBg : 'rgba(255, 255, 255, 0.04)',
                      border: isSelected ? `2px solid ${item.color}` : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '10px',
                      padding: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    <Icon size={15} color={item.color} />
                    <span style={{ fontSize: '12px', fontWeight: '800', color: isSelected ? '#ffffff' : '#94a3b8' }}>
                      {item.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 2. Number & Copy */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
                padding: '7px 10px',
                marginBottom: '10px'
              }}
            >
              <div>
                <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: '700' }}>{activeDepositAccount.name} Number</div>
                <div style={{ fontSize: '14px', fontWeight: '900', color: '#ffffff', letterSpacing: '0.5px' }}>
                  {activeDepositAccount.accountNumber}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(activeDepositAccount.accountNumber)}
                style={{
                  background: copiedNumber ? '#10b981' : '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '10.5px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {copiedNumber ? <Check size={11} /> : <Copy size={11} />}
                {copiedNumber ? 'Copied' : 'Copy'}
              </button>
            </div>

            {/* 3. Form */}
            <form onSubmit={handleDepositSubmit}>
              <div style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontSize: '10.5px' }}>
                  <span style={{ color: '#94a3b8', fontWeight: '800' }}>AMOUNT (ETB)</span>
                  <span style={{ color: '#38bdf8', fontWeight: '800' }}>Min: 10 ETB</span>
                </div>
                <input
                  type="number"
                  min="10"
                  step="any"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="Enter amount"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: '800',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: '800', marginBottom: '3px' }}>
                  TRANSACTION SMS / REF ID
                </div>
                <textarea
                  rows={2}
                  value={transactionSms}
                  onChange={(e) => setTransactionSms(e.target.value)}
                  placeholder="Paste bank confirmation SMS / Ref ID here..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#ffffff',
                    fontSize: '11.5px',
                    boxSizing: 'border-box',
                    outline: 'none',
                    resize: 'none'
                  }}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={depositSubmitting}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px',
                  fontSize: '13px',
                  fontWeight: '900',
                  cursor: depositSubmitting ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Send size={14} />
                <span>{depositSubmitting ? 'Submitting...' : 'Submit Deposit'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── CLEAN WITHDRAW MODAL (💸 Telebirr, CBE Birr & CBE Bank) ── */}
      {showWithdrawModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.82)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            style={{
              background: 'linear-gradient(180deg, rgba(18, 28, 50, 0.99) 0%, rgba(10, 15, 30, 1) 100%)',
              borderRadius: '20px',
              padding: '18px 16px',
              border: '1px solid rgba(52, 211, 153, 0.3)',
              maxWidth: '400px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
              position: 'relative',
              boxSizing: 'border-box'
            }}
          >
            <button
              type="button"
              onClick={() => setShowWithdrawModal(false)}
              style={{
                position: 'absolute',
                top: '14px',
                right: '14px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                borderRadius: '50%',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#cbd5e1',
                cursor: 'pointer'
              }}
            >
              <X size={15} />
            </button>

            <h3 style={{ fontSize: '15px', fontWeight: '900', margin: '0 0 10px', color: '#ffffff' }}>
              Withdraw ETB
            </h3>

            {withdrawFeedback.error && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#f87171', padding: '7px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={13} /> <span>{withdrawFeedback.error}</span>
              </div>
            )}

            {withdrawFeedback.pendingDetails ? (
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  borderRadius: '14px',
                  padding: '14px',
                  textAlign: 'center',
                  marginBottom: '10px'
                }}
              >
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px' }}>
                  <CheckCircle2 size={20} color="#34d399" />
                </div>
                <h4 style={{ fontSize: '14px', fontWeight: '900', color: '#34d399', margin: '0 0 6px' }}>
                  Request Submitted
                </h4>
                <div style={{ fontSize: '11.5px', color: '#cbd5e1', margin: '6px 0 10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                    <span style={{ color: '#94a3b8' }}>Method:</span>
                    <span style={{ fontWeight: '900', color: '#ffffff' }}>{withdrawFeedback.pendingDetails.method}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                    <span style={{ color: '#94a3b8' }}>Requested:</span>
                    <span style={{ fontWeight: '900', color: '#ffffff' }}>{withdrawFeedback.pendingDetails.requestedAmount.toFixed(2)} ETB</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                    <span style={{ color: '#94a3b8' }}>Remaining:</span>
                    <span style={{ fontWeight: '900', color: '#34d399' }}>{withdrawFeedback.pendingDetails.remainingBalance.toFixed(2)} ETB</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                    <span style={{ color: '#94a3b8' }}>Status:</span>
                    <span style={{ fontWeight: '900', color: '#fbbf24' }}>Pending</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  style={{
                    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px',
                    fontSize: '12px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    width: '100%'
                  }}
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleWithdrawSubmit}>
                
                {/* 1. Method Selector: Telebirr | CBE Birr | CBE Bank */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '10px' }}>
                  {Object.entries(WITHDRAW_METHODS).map(([key, item]) => {
                    const isSelected = selectedWithdrawMethod === key;
                    const Icon = item.icon;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setSelectedWithdrawMethod(key);
                          if (key === 'cbe') {
                            setDestinationAccount('');
                          } else {
                            setDestinationAccount(localUser?.phone || '');
                          }
                        }}
                        style={{
                          background: isSelected ? item.badgeBg : 'rgba(255, 255, 255, 0.04)',
                          border: isSelected ? `2px solid ${item.color}` : '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '10px',
                          padding: '7px 4px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '3px',
                          cursor: 'pointer'
                        }}
                      >
                        <Icon size={14} color={item.color} />
                        <span style={{ fontSize: '11px', fontWeight: '800', color: isSelected ? '#ffffff' : '#94a3b8' }}>
                          {item.name}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* 2. Amount */}
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontSize: '10.5px' }}>
                    <span style={{ color: '#94a3b8', fontWeight: '800' }}>AMOUNT</span>
                    <span style={{ color: '#34d399', fontWeight: '800' }}>Min: 200 ETB (Available: {withdrawableBal.toFixed(2)} ETB)</span>
                  </div>
                  <input
                    type="number"
                    min="200"
                    max={withdrawableBal}
                    step="any"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="Enter withdrawal amount (min 200)"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: '800',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                    required
                  />
                </div>

                {/* 3. Account / Phone Number */}
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: '800', marginBottom: '3px', textTransform: 'uppercase' }}>
                    {activeWithdrawMethod.label}
                  </div>
                  <input
                    type="text"
                    value={destinationAccount}
                    onChange={(e) => setDestinationAccount(e.target.value)}
                    placeholder={activeWithdrawMethod.placeholder}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: '700',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                    required
                  />
                </div>

                {/* 4. Name */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: '800', marginBottom: '3px' }}>
                    {selectedWithdrawMethod === 'cbe' ? 'ACCOUNT HOLDER NAME' : 'FULL NAME'}
                  </div>
                  <input
                    type="text"
                    value={accountHolderName}
                    onChange={(e) => setAccountHolderName(e.target.value)}
                    placeholder={selectedWithdrawMethod === 'cbe' ? 'Account Holder Full Name' : 'Your Full Name'}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: '700',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={withdrawSubmitting || withdrawableBal <= 0}
                  style={{
                    width: '100%',
                    background: withdrawableBal <= 0 ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    color: withdrawableBal <= 0 ? '#64748b' : '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '10px',
                    fontSize: '13px',
                    fontWeight: '900',
                    cursor: withdrawableBal <= 0 ? 'not-allowed' : (withdrawSubmitting ? 'wait' : 'pointer'),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Send size={14} />
                  <span>{withdrawSubmitting ? 'Processing...' : 'Request Withdrawal'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
