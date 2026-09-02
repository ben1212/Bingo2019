import React, { useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { adminApi } from '../../api/adminApi';
import { KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';

export function ChangePasswordModal({
  isOpen,
  onClose,
}) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) {
      setError('Please fill in all required fields');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await adminApi.changePassword(oldPassword, newPassword);
      setSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update admin password');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess(false);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <div className="flex items-center gap-2 text-emerald-400">
          <KeyRound className="w-5 h-5" />
          <span>Change Admin Password</span>
        </div>
      }
      description="Update your administrator login credentials"
    >
      {success ? (
        <div className="py-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold text-slate-100">Password Changed Successfully</h4>
          <p className="text-xs text-slate-400">Your admin credentials have been updated.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-slate-300 font-medium block mb-1.5">
              Current Password
            </label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-admin-bg border border-admin-border text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="text-xs text-slate-300 font-medium block mb-1.5">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-admin-bg border border-admin-border text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="text-xs text-slate-300 font-medium block mb-1.5">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-admin-bg border border-admin-border text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              required
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            <Button type="button" variant="outline" className="flex-1 order-2 sm:order-1" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" variant="default" className="flex-1 order-1 sm:order-2" isLoading={loading}>
              Save New Password
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
