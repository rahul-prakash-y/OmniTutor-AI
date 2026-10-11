import { jsx as _jsx } from "react/jsx-runtime";
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
export const Badge = ({ children, variant = 'neutral', size = 'md', className, ...props }) => {
    const variantStyles = {
        brand: 'bg-brand-950/70 text-brand-300 border border-brand-500/30',
        success: 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/30',
        warning: 'bg-amber-950/70 text-amber-300 border border-amber-500/30',
        danger: 'bg-rose-950/70 text-rose-300 border border-rose-500/30',
        neutral: 'bg-slate-800/80 text-slate-300 border border-slate-700/50',
        accent: 'bg-cyan-950/70 text-cyan-300 border border-cyan-500/30',
    };
    const sizeStyles = {
        sm: 'text-xs px-2 py-0.5 rounded-full font-medium',
        md: 'text-xs px-2.5 py-1 rounded-full font-semibold',
    };
    return (_jsx("span", { className: twMerge(clsx('inline-flex items-center gap-1.5 transition-colors', variantStyles[variant], sizeStyles[size], className)), ...props, children: children }));
};
