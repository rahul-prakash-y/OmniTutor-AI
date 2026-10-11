import React, { createContext, useContext } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface TabsContextValue {
  value: string;
  onChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

export interface TabsProps {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ value, onChange, children, className }) => {
  return (
    <TabsContext.Provider value={{ value, onChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
};

export interface TabsListProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'pill' | 'underline';
}

export const TabsList: React.FC<TabsListProps> = ({
  children,
  className,
  variant = 'pill',
}) => {
  const variantStyles = {
    pill: 'p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl inline-flex gap-1',
    underline: 'flex border-b border-slate-200 dark:border-slate-800 gap-6',
  };

  return (
    <div
      role="tablist"
      className={twMerge(clsx(variantStyles[variant], className))}
    >
      {children}
    </div>
  );
};

export interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({
  value,
  children,
  className,
  icon,
  badge,
}) => {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('TabsTrigger must be used inside a Tabs component');

  const isSelected = ctx.value === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isSelected}
      onClick={() => ctx.onChange(value)}
      className={twMerge(
        clsx(
          'inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer select-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
          isSelected
            ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-subtle'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50',
          className
        )
      )}
    >
      {icon && <span className="text-slate-400 shrink-0">{icon}</span>}
      <span>{children}</span>
      {badge !== undefined && (
        <span
          className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
            isSelected
              ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
              : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
};

export interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export const TabsContent: React.FC<TabsContentProps> = ({
  value,
  children,
  className,
}) => {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('TabsContent must be used inside a Tabs component');

  if (ctx.value !== value) return null;

  return (
    <div
      role="tabpanel"
      className={twMerge(clsx('pt-4 animate-in fade-in duration-150', className))}
    >
      {children}
    </div>
  );
};
