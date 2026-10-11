import { jsx as _jsx } from "react/jsx-runtime";
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
export const Card = ({ children, hover = false, className, ...props }) => {
    return (_jsx("div", { className: twMerge(clsx('glass-panel rounded-2xl p-5 border border-surface-border/70', hover && 'glass-panel-hover cursor-pointer', className)), ...props, children: children }));
};
