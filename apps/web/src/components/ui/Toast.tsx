import React from 'react';
import { useToastStore, type ToastMessage } from '../../stores/useToastStore';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export const ToastItem: React.FC<{ toast: ToastMessage }> = ({ toast }) => {
  const { removeToast } = useToastStore();

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />,
    info: <Info className="w-5 h-5 text-indigo-500 shrink-0" />,
  };

  const borders = {
    success: 'border-emerald-200 dark:border-emerald-800/60',
    warning: 'border-amber-200 dark:border-amber-800/60',
    error: 'border-rose-200 dark:border-rose-800/60',
    info: 'border-indigo-200 dark:border-indigo-800/60',
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-start gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-900 shadow-elevated border ${borders[toast.type]} min-w-[300px] max-w-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-2`}
    >
      {icons[toast.type]}
      <div className="flex-1 text-sm">
        {toast.title && (
          <h4 className="font-semibold text-slate-900 dark:text-slate-100 leading-tight mb-0.5">
            {toast.title}
          </h4>
        )}
        <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
          {toast.message}
        </p>
      </div>
      <button
        type="button"
        onClick={() => removeToast(toast.id)}
        aria-label="Dismiss toast"
        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Notifications"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-auto"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
};
