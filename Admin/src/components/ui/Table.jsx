import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function TableWrapper({ className, children, ...props }) {
  return (
    <div className={cn('w-full overflow-x-auto rounded-xl border border-admin-border bg-admin-card/50', className)} {...props}>
      {children}
    </div>
  );
}

export function Table({ className, children, ...props }) {
  return (
    <table className={cn('w-full text-left text-sm text-slate-200 border-collapse', className)} {...props}>
      {children}
    </table>
  );
}

export function TableHeader({ className, children, ...props }) {
  return (
    <thead className={cn('bg-admin-surface/90 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-admin-border', className)} {...props}>
      {children}
    </thead>
  );
}

export function TableBody({ className, children, ...props }) {
  return (
    <tbody className={cn('divide-y divide-admin-border/50', className)} {...props}>
      {children}
    </tbody>
  );
}

export function TableRow({ className, children, ...props }) {
  return (
    <tr className={cn('transition-colors hover:bg-admin-cardHover/60', className)} {...props}>
      {children}
    </tr>
  );
}

export function TableHead({ className, children, ...props }) {
  return (
    <th className={cn('px-4 py-3.5 whitespace-nowrap font-medium text-slate-400', className)} {...props}>
      {children}
    </th>
  );
}

export function TableCell({ className, children, ...props }) {
  return (
    <td className={cn('px-4 py-3.5 whitespace-nowrap text-sm text-slate-200', className)} {...props}>
      {children}
    </td>
  );
}

export function TableEmptyState({ icon: Icon, title, description }) {
  return (
    <div className="py-12 px-4 text-center flex flex-col items-center justify-center">
      {Icon && (
        <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400 mb-3">
          <Icon className="w-6 h-6" />
        </div>
      )}
      <h4 className="text-sm font-semibold text-slate-200">{title || 'No records found'}</h4>
      {description && <p className="text-xs text-slate-400 mt-1 max-w-sm">{description}</p>}
    </div>
  );
}
