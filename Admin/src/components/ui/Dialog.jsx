import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function Dialog({
  isOpen,
  open,
  onClose,
  onOpenChange,
  title,
  description,
  children,
  maxWidth = 'max-w-lg',
  className,
}) {
  const visible = isOpen !== undefined ? isOpen : !!open;
  const handleClose = () => {
    if (onClose) onClose();
    if (onOpenChange) onOpenChange(false);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    if (visible) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={handleClose}
      />

      {/* Modal / Bottom Sheet */}
      <div
        className={cn(
          'relative w-full z-10 bg-admin-surface border border-admin-border shadow-2xl',
          'rounded-t-3xl sm:rounded-2xl overflow-hidden max-h-[90vh] sm:max-h-[85vh] flex flex-col',
          'modal-bottom-sheet sm:modal-panel',
          maxWidth,
          className
        )}
      >
        {/* Mobile drag handle indicator */}
        <div className="sm:hidden w-12 h-1.5 bg-slate-700 rounded-full mx-auto mt-3 mb-1" />

        {/* Header */}
        {(title || description) && (
          <div className="flex items-start justify-between p-4 sm:p-5 border-b border-admin-border/60">
            <div>
              {title && (
                <h2 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight flex items-center gap-2">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  {description}
                </p>
              )}
            </div>
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors ml-3"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
}

export function DialogContent({ children, className = '' }) {
  return <div className={className}>{children}</div>;
}

export function DialogHeader({ children, className = '' }) {
  return <div className={cn('mb-4 space-y-1', className)}>{children}</div>;
}

export function DialogTitle({ children, className = '' }) {
  return <h2 className={cn('text-lg font-bold text-slate-100 tracking-tight', className)}>{children}</h2>;
}

export function DialogDescription({ children, className = '' }) {
  return <p className={cn('text-sm text-slate-400', className)}>{children}</p>;
}

export function DialogFooter({ children, className = '' }) {
  return <div className={cn('flex items-center justify-end gap-2 mt-4', className)}>{children}</div>;
}

