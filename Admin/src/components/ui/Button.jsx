import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function Button({
  className,
  variant = 'default',
  size = 'md',
  isLoading = false,
  disabled,
  children,
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-admin-bg disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

  const variants = {
    default: 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 focus:ring-emerald-500 border border-emerald-400/30',
    destructive: 'bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 hover:border-red-500/50 focus:ring-red-500',
    destructiveSolid: 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20 focus:ring-red-500 border border-red-500/30',
    secondary: 'bg-admin-card hover:bg-admin-cardHover text-admin-text border border-admin-border focus:ring-slate-400',
    outline: 'bg-transparent hover:bg-slate-800/60 text-slate-300 border border-slate-700/80 hover:text-white focus:ring-slate-400',
    ghost: 'bg-transparent hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 focus:ring-slate-400',
    warning: 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 focus:ring-amber-500',
    successOutline: 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 focus:ring-emerald-500'
  };

  const sizes = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5 h-8',
    md: 'text-sm px-3.5 py-2 gap-2 h-10',
    lg: 'text-base px-5 py-2.5 gap-2.5 h-12',
    icon: 'h-9 w-9 p-0',
    iconSm: 'h-8 w-8 p-0',
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Processing...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
