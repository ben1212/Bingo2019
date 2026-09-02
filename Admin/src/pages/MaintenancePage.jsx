import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { adminApi } from '../api/adminApi';
import { Wrench, ShieldCheck, AlertTriangle, CheckCircle2, Lock, KeyRound, AlertCircle } from 'lucide-react';

export function MaintenancePage({ maintenanceActive, onRefresh }) {
  const [enabled, setEnabled] = useState(maintenanceActive);
  const [message, setMessage] = useState('System is under maintenance. We will be back shortly!');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Password confirmation modal state
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [modalError, setModalError] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const data = await adminApi.getMaintenance();
      setEnabled(!!data.maintenanceMode);
      if (data.maintenanceMessage) setMessage(data.maintenanceMessage);
    } catch (err) {
      console.error('Error fetching maintenance state:', err);
    }
  };

  const handleToggleClick = () => {
    setError('');
    setSuccess('');
    if (!enabled) {
      // Activating maintenance requires password
      setAdminPassword('');
      setModalError('');
      setIsPasswordModalOpen(true);
    } else {
      // Deactivating directly
      handleDeactivate();
    }
  };

  const handleDeactivate = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await adminApi.setMaintenance(false, message);
      setEnabled(false);
      setSuccess('System is now ONLINE. All services active.');
      if (onRefresh) onRefresh();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to deactivate maintenance mode');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmActivation = async (e) => {
    e.preventDefault();
    if (!adminPassword) {
      setModalError('Please enter your admin password.');
      return;
    }

    setModalLoading(true);
    setModalError('');
    try {
      await adminApi.setMaintenance(true, message, adminPassword);
      setEnabled(true);
      setIsPasswordModalOpen(false);
      setAdminPassword('');
      setSuccess('Maintenance mode is now ACTIVE. Game rounds paused and access restricted.');
      if (onRefresh) onRefresh();
    } catch (err) {
      setModalError(err.response?.data?.error || 'Incorrect admin password or failed to activate');
    } finally {
      setModalLoading(false);
    }
  };

  const handleSaveMessage = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await adminApi.setMaintenance(enabled, message);
      setSuccess('Maintenance notice message updated.');
      if (onRefresh) onRefresh();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update message');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <Card>
        <CardContent className="p-4 sm:p-6 space-y-5">
          {/* Status & Toggle */}
          <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-admin-surface border border-admin-border">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                enabled ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'
              }`}>
                {enabled ? <AlertTriangle className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
              </div>
              <div>
                <div className="text-sm font-bold text-admin-text">
                  {enabled ? 'Maintenance Active' : 'System Online'}
                </div>
              </div>
            </div>

            <Button
              type="button"
              variant={enabled ? 'default' : 'destructive'}
              size="sm"
              onClick={handleToggleClick}
              disabled={loading}
              className="text-xs font-bold"
            >
              {enabled ? 'Deactivate' : 'Activate Lock'}
            </Button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Maintenance Message */}
          <form onSubmit={handleSaveMessage} className="space-y-3">
            <label className="text-xs font-bold text-admin-muted uppercase tracking-wider block">
              Player Notice Message
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full text-xs p-3 rounded-xl bg-admin-surface border border-admin-border text-admin-text placeholder-admin-muted focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
              placeholder="Message shown to players during maintenance..."
            />

            <Button
              type="submit"
              variant="secondary"
              size="sm"
              className="text-xs"
              disabled={loading}
            >
              Save Message
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Admin Security Password Confirmation Modal */}
      <Dialog
        isOpen={isPasswordModalOpen}
        onClose={() => {
          if (!modalLoading) {
            setIsPasswordModalOpen(false);
            setAdminPassword('');
            setModalError('');
          }
        }}
        title={
          <div className="flex items-center gap-2 text-rose-400">
            <Lock className="w-5 h-5" />
            <span>Admin Authorization</span>
          </div>
        }
      >
        <form onSubmit={handleConfirmActivation} className="space-y-4">

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-rose-400" />
              Admin Password
            </label>
            <input
              type="password"
              autoFocus
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Enter current admin password"
              className="w-full text-sm px-3 py-2.5 rounded-xl bg-admin-bg border border-admin-border text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
              required
            />
          </div>

          {modalError && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            <Button
              type="button"
              variant="outline"
              className="flex-1 order-2 sm:order-1"
              onClick={() => setIsPasswordModalOpen(false)}
              disabled={modalLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              className="flex-1 order-1 sm:order-2 font-bold"
              isLoading={modalLoading}
            >
              <Lock className="w-3.5 h-3.5 mr-1.5" />
              Confirm & Activate Lock
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
