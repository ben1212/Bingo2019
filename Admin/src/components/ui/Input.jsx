import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const Input = forwardRef(({
  className,
  type = 'text',
  icon: Icon,
  error,
  ...props
}, ref) => {
  return (
    <div className="w-full">
      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center justify-center">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          ref={ref}
          type={type}
          className={cn(
            'w-full rounded-xl bg-admin-bg/90 border border-admin-border px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-all duration-150',
            'focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            Icon && 'pl-10',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-red-400 font-medium">{error}</p>}
    </div>
  );
});

Input.displayName = 'Input';

export const Textarea = forwardRef(({
  className,
  error,
  rows = 3,
  ...props
}, ref) => {
  return (
    <div className="w-full">
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          'w-full rounded-xl bg-admin-bg/90 border border-admin-border px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-all duration-150 resize-y',
          'focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
          className
        )}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs text-red-400 font-medium">{error}</p>}
    </div>
  );
});

Textarea.displayName = 'Textarea';
