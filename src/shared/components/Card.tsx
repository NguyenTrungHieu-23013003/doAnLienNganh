import React from 'react';
import { cn } from '@/lib/utils';

export const Card = ({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => {
  return (
    <div
      style={style}
      className={cn(
        "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden",
        className
      )}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ title, subtitle, className, children }: { title: string; subtitle?: string; className?: string; children?: React.ReactNode }) => (
  <div className={cn("px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4", className)}>
    <div>
      <h3 className="text-lg font-bold text-zinc-900 dark:text-white leading-none mb-1">{title}</h3>
      {subtitle && <p className="text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>}
    </div>
    {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
  </div>
);

export const CardContent = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("px-6 py-4", className)}>
    {children}
  </div>
);
