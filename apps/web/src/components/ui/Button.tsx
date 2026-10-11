import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      className,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const variantStyles = {
      primary:
        'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-sm border border-indigo-600 focus-visible:ring-indigo-500',
      secondary:
        'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 focus-visible:ring-slate-400',
      outline:
        'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 focus-visible:ring-indigo-500',
      ghost:
        'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 border border-transparent focus-visible:ring-indigo-500',
      destructive:
        'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-sm border border-rose-600 focus-visible:ring-rose-500',
      link:
        'bg-transparent text-indigo-600 dark:text-indigo-400 hover:underline p-0 h-auto border-none focus-visible:ring-indigo-500',
    };

    const sizeStyles = {
      sm: 'text-xs px-2.5 py-1.5 rounded-lg gap-1.5 font-medium',
      md: 'text-sm px-3.5 py-2 rounded-lg gap-2 font-medium',
      lg: 'text-base px-5 py-2.5 rounded-xl gap-2.5 font-semibold',
      icon: 'p-2 rounded-lg',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={twMerge(
          clsx(
            'inline-flex items-center justify-center transition-colors duration-150 select-none',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950',
            'disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
            variantStyles[variant],
            variant !== 'link' && sizeStyles[size],
            className
          )
        )}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-0.5 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
