import React from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { AlertTriangle, Send, Megaphone } from 'lucide-react';

export function BroadcastConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  message,
  recipientCount,
  isLoading,
}) {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-blue-400">
          <Megaphone className="w-5 h-5" />
          <span>Confirm Broadcast</span>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-admin-bg border border-admin-border space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Message</span>
          <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
            {message}
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
          <Button type="button" variant="outline" className="flex-1 order-2 sm:order-1" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="button" variant="default" className="flex-1 order-1 sm:order-2 font-bold" onClick={onConfirm} isLoading={isLoading}>
            <Send className="w-4 h-4 mr-1.5" />
            Confirm & Broadcast
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
