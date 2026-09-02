import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2, Gift, Send, Users, ExternalLink, ShieldAlert, Award } from 'lucide-react';
import { apiFetch } from '../api';

// In-memory cache so switching tabs does NOT reload or flash a loading screen
let tasksCache = null;

export default function TaskView({ user, token, onBalanceUpdated }) {
  const [tasks, setTasks] = useState(tasksCache || []);
  const [loading, setLoading] = useState(!tasksCache);
  const [claimingId, setClaimingId] = useState(null);
  const [feedback, setFeedback] = useState({ error: '', success: '' });

  const fetchTasks = async () => {
    try {
      if (!tasksCache) setLoading(true);
      const res = await apiFetch('/api/tasks', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.tasks) {
        // Filter out daily_checkin — managed exclusively in Profile section
        const filtered = data.tasks.filter(t => t.task_type !== 'daily_checkin');
        tasksCache = filtered;
        setTasks(filtered);
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchTasks();
  }, [token]);

  const handleAction = async (task) => {
    if (task.is_claimed) return;

    // If task has a target url (e.g. Telegram channel), open it first
    if (task.target_url) {
      window.open(task.target_url, '_blank');
    }

    // Attempt claim
    setClaimingId(task.id);
    setFeedback({ error: '', success: '' });

    try {
      const res = await apiFetch('/api/tasks/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ taskId: task.id })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to claim task reward');

      setFeedback({ success: data.message || `+${data.reward} ETB credited!`, error: '' });
      if (onBalanceUpdated && data.newBalance !== undefined) {
        onBalanceUpdated(data.newBalance);
      }
      fetchTasks();
    } catch (err) {
      setFeedback({ error: err.message, success: '' });
    } finally {
      setClaimingId(null);
      setTimeout(() => {
        setFeedback({ error: '', success: '' });
      }, 3500);
    }
  };

  const getTaskIcon = (type) => {
    switch (type) {
      case 'telegram_channel':
      case 'telegram_group':
        return <Send size={18} color="#38bdf8" />;
      case 'referral_milestone':
        return <Users size={18} color="#c084fc" />;
      default:
        return <Award size={18} color="#34d399" />;
    }
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
      {/* ── FIXED TOP HEADER & FEEDBACK ── */}
      <div style={{ flexShrink: 0, padding: '12px 12px 4px' }}>
        
        {/* Header banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(17, 26, 46, 0.98) 0%, rgba(13, 20, 38, 0.98) 100%)',
            borderRadius: '16px',
            padding: '14px',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 14px rgba(56, 189, 248, 0.4)',
              flexShrink: 0
            }}
          >
            <Sparkles size={20} color="#000000" />
          </div>
          <div>
            <h2 style={{ fontSize: '15.5px', fontWeight: '900', margin: '0 0 2px', color: '#ffffff', letterSpacing: '-0.2px' }}>
              Rewards & Tasks
            </h2>
            <p style={{ fontSize: '11.5px', color: '#94a3b8', margin: 0, lineHeight: 1.3 }}>
              Complete official tasks to earn bonus ETB!
            </p>
          </div>
        </div>

        {/* Feedback Alerts */}
        {feedback.success && (
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: '#34d399',
              padding: '8px 12px',
              borderRadius: '10px',
              fontSize: '11.5px',
              fontWeight: '700',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <CheckCircle2 size={15} />
            {feedback.success}
          </div>
        )}

        {feedback.error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#f87171',
              padding: '8px 12px',
              borderRadius: '10px',
              fontSize: '11.5px',
              fontWeight: '700',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <ShieldAlert size={15} />
            {feedback.error}
          </div>
        )}

      </div>

      {/* ── SCROLLABLE TASK LIST ONLY (INSTANT RENDERING) ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 14px', boxSizing: 'border-box' }}>
        {tasks.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '30px 16px',
              background: 'rgba(17, 26, 46, 0.7)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              color: '#94a3b8'
            }}
          >
            <Gift size={28} color="#64748b" style={{ margin: '0 auto 8px', display: 'block' }} />
            <div style={{ fontWeight: '800', fontSize: '13px', color: '#ffffff' }}>No active tasks right now</div>
            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '3px' }}>Check back soon for new bonus challenges!</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {tasks.map((task) => {
              const isClaimed = task.is_claimed;
              const isClaiming = claimingId === task.id;

              return (
                <div
                  key={task.id}
                  style={{
                    background: 'rgba(17, 26, 46, 0.95)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '14px',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
                    opacity: isClaimed ? 0.7 : 1
                  }}
                >
                  {/* Left: Icon & Details */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      {getTaskIcon(task.task_type)}
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: '800',
                          color: '#f8fafc',
                          lineHeight: 1.2,
                          marginBottom: '2px'
                        }}
                      >
                        {task.title}
                      </div>

                      {task.description && (
                        <div
                          style={{
                            fontSize: '11px',
                            color: '#94a3b8',
                            lineHeight: 1.3,
                            marginBottom: '4px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical'
                          }}
                        >
                          {task.description}
                        </div>
                      )}

                      {/* Reward Badge */}
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span
                          style={{
                            fontSize: '10.5px',
                            fontWeight: '800',
                            color: '#38bdf8',
                            background: 'rgba(56, 189, 248, 0.12)',
                            padding: '2px 7px',
                            borderRadius: '6px',
                            border: '1px solid rgba(56, 189, 248, 0.25)'
                          }}
                        >
                          +{parseFloat(task.reward_amount).toFixed(2)} ETB
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Action Button */}
                  <div style={{ flexShrink: 0 }}>
                    {isClaimed ? (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: '#34d399',
                          fontSize: '11px',
                          fontWeight: '800',
                          padding: '5px 10px',
                          background: 'rgba(16, 185, 129, 0.15)',
                          borderRadius: '8px',
                          border: '1px solid rgba(16, 185, 129, 0.3)'
                        }}
                      >
                        <CheckCircle2 size={12} /> Done
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAction(task)}
                        disabled={isClaiming}
                        style={{
                          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                          color: '#ffffff',
                          border: 'none',
                          padding: '7px 14px',
                          borderRadius: '8px',
                          fontSize: '11.5px',
                          fontWeight: '800',
                          cursor: isClaiming ? 'wait' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          boxShadow: '0 2px 8px rgba(2, 132, 199, 0.35)',
                          opacity: isClaiming ? 0.6 : 1
                        }}
                      >
                        {isClaiming ? (
                          'Claiming...'
                        ) : task.target_url ? (
                          <>
                            {task.action_label || 'Join'}
                            <ExternalLink size={11} />
                          </>
                        ) : (
                          <>
                            {task.action_label || 'Claim'}
                            <Gift size={11} />
                          </>
                        )}
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
