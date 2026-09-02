import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function TabsList({ className, children, ...props }) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 p-1 bg-admin-surface/80 border border-admin-border rounded-xl no-scrollbar overflow-x-auto max-w-full',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function TabTrigger({
  active = false,
  badgeCount,
  icon: Icon,
  className,
  children,
  onClick,
  ...props
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all duration-150 whitespace-nowrap select-none',
        active
          ? 'bg-emerald-500 text-white shadow-sm font-semibold'
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60',
        className
      )}
      {...props}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      <span>{children}</span>
      {badgeCount !== undefined && badgeCount !== null && (
        <span
          className={cn(
            'px-1.5 py-0.2 text-[10px] font-bold rounded-full',
            active
              ? 'bg-black/20 text-white'
              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
          )}
        >
          {badgeCount}
        </span>
      )}
    </button>
  );
}
