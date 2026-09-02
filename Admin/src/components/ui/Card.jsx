import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function Card({ className, children, ...props }) {
  return (
    <div
      className={cn(
        'bg-admin-card/80 backdrop-blur-md rounded-2xl border border-admin-border shadow-card overflow-hidden transition-colors',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }) {
  return (
    <div className={cn('p-4 sm:p-5 border-b border-admin-border/60', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }) {
  return (
    <h3 className={cn('text-base sm:text-lg font-semibold text-slate-100 tracking-tight flex items-center gap-2', className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className, children, ...props }) {
  return (
    <p className={cn('text-xs sm:text-sm text-slate-400 mt-1', className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ className, children, ...props }) {
  return (
    <div className={cn('p-4 sm:p-5', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }) {
  return (
    <div className={cn('p-4 sm:p-5 bg-admin-surface/40 border-t border-admin-border/60 flex items-center justify-between gap-3', className)} {...props}>
      {children}
    </div>
  );
}
