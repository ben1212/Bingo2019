import React, { useState } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { BroadcastConfirmModal } from '../components/modals/BroadcastConfirmModal';
import { adminApi } from '../api/adminApi';
import { Megaphone, Users, Send, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

export function BroadcastPage({ users = [], metrics }) {
  const [message, setMessage] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successStatus, setSuccessStatus] = useState('');
  const [errorStatus, setErrorStatus] = useState('');

  // Real user counts from database
  const totalUsers = users?.length || metrics?.totalUsers || 0;

  const handleInitiateBroadcast = (e) => {
    e.preventDefault();
    if (!message.trim()) {
      setErrorStatus('Please enter an announcement message to broadcast.');
      return;
    }
    setErrorStatus('');
    setSuccessStatus('');
    setIsConfirmOpen(true);
  };

  const handleConfirmSend = async () => {
    setIsLoading(true);
    try {
      const res = await adminApi.sendBroadcast('all', message.trim());
      setIsConfirmOpen(false);
      setMessage('');
      setSuccessStatus(res?.message || `Broadcast message successfully sent to all ${totalUsers.toLocaleString()} platform users!`);
    } catch (err) {
      setErrorStatus(err.response?.data?.error || 'Failed to send broadcast');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Card>
        <CardContent className="p-4 sm:p-6">
          <form onSubmit={handleInitiateBroadcast} className="space-y-4">
            {/* Target Audience Banner */}
            <div>
              <label className="text-xs font-bold text-admin-muted uppercase tracking-wider block mb-2">
                Target Audience
              </label>
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-500/10 via-admin-surface to-admin-surface border border-blue-500/25 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0">
                    <Users className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <span>All Platform Users</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        {totalUsers.toLocaleString()} Registered
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Message Area */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-admin-muted uppercase tracking-wider">
                  Broadcast Message
                </label>
                <span className="text-xs text-admin-muted">{message.length} chars</span>
              </div>
              <textarea
                rows={5}
                placeholder="Type your platform announcement here (e.g. system update, deposit bonus, upcoming tournament)..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full text-sm p-3.5 rounded-xl bg-admin-surface border border-admin-border text-admin-text placeholder-admin-muted focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-y"
                required
              />
            </div>

            {/* Alerts */}
            {errorStatus && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorStatus}</span>
              </div>
            )}

            {successStatus && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{successStatus}</span>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              variant="default"
              size="md"
              className="w-full text-xs font-bold py-2.5"
              disabled={isLoading || !message.trim()}
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Broadcast to All Users
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      <BroadcastConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmSend}
        target="all"
        recipientCount={totalUsers}
        message={message}
        isLoading={isLoading}
      />
    </div>
  );
}
