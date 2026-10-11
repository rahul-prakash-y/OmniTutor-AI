import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      leadingIcon,
      trailingIcon,
      className,
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    const errorId = inputId ? `${inputId}-error` : undefined;
    const helperId = inputId ? `${inputId}-helper` : undefined;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {leadingIcon && (
            <div className="absolute left-3 text-slate-400 dark:text-slate-500 pointer-events-none flex items-center justify-center">
              {leadingIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={twMerge(
              clsx(
                'w-full px-3 py-2 text-sm rounded-lg transition-colors duration-150',
                'bg-white dark:bg-slate-900',
                'border border-slate-300 dark:border-slate-700',
                'text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-500',
                'disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed',
                leadingIcon && 'pl-9',
                trailingIcon && 'pr-9',
                error && 'border-rose-500 focus:ring-rose-500 focus:border-rose-500 dark:border-rose-500',
                className
              )
            )}
            {...props}
          />

          {trailingIcon && (
            <div className="absolute right-3 text-slate-400 dark:text-slate-500 flex items-center justify-center">
              {trailingIcon}
            </div>
          )}
        </div>

        {error && (
          <p id={errorId} className="text-xs text-rose-500 font-medium">
            {error}
          </p>
        )}

        {!error && helperText && (
          <p id={helperId} className="text-xs text-slate-500 dark:text-slate-400">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
