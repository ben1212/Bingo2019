import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function Badge({
  className,
  variant = 'default',
  dot = false,
  children,
  ...props
}) {
  const baseStyles = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide select-none transition-colors border';

  const variants = {
    default: 'bg-slate-800 text-slate-300 border-slate-700',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    warning: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    danger: 'bg-red-500/10 text-red-400 border-red-500/30',
    info: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    purple: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
  };

  const dotColors = {
    default: 'bg-slate-400',
    success: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]',
    warning: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]',
    danger: 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]',
    info: 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]',
    purple: 'bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]',
  };

  return (
    <span className={cn(baseStyles, variants[variant], className)} {...props}>
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full inline-block', dotColors[variant])} />}
      {children}
    </span>
  );
}

export function StatusBadge({ status }) {
  const norm = String(status || '').toLowerCase();

  if (norm === 'approved' || norm === 'active' || norm === 'online' || norm === 'success' || norm === 'qualified') {
    return <Badge variant="success" dot>{status ? status.toUpperCase() : 'ACTIVE'}</Badge>;
  }
  if (norm === 'pending' || norm === 'waiting') {
    return <Badge variant="warning" dot>{status ? status.toUpperCase() : 'PENDING'}</Badge>;
  }
  if (norm === 'rejected' || norm === 'banned' || norm === 'offline' || norm === 'disabled' || norm === 'maintenance') {
    return <Badge variant="danger" dot>{status ? status.toUpperCase() : 'REJECTED'}</Badge>;
  }
  return <Badge variant="default">{status}</Badge>;
}
