import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { ToastContainer } from '../ui/Toast';

export const AuthShell: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors duration-150">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <Link to="/" className="inline-flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
            <GraduationCap className="w-6 h-6" />
          </div>
          <span className="font-display font-bold text-2xl tracking-tight text-slate-900 dark:text-white">
            OmniTutor AI
          </span>
        </Link>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Cognitive Socratic Scaffolding & Adaptive Education
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 sm:px-10 shadow-elevated rounded-2xl border border-slate-200 dark:border-slate-800">
          <Outlet />
        </div>
      </div>

      <ToastContainer />
    </div>
  );
};
