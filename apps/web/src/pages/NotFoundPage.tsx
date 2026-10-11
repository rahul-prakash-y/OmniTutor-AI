import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[65vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center space-y-4 p-8 border border-slate-200 dark:border-slate-800">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto border border-indigo-200 dark:border-indigo-800/40">
          <FileQuestion className="w-8 h-8" />
        </div>

        <div>
          <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            404 Error
          </span>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-slate-900 dark:text-slate-100 mt-1">
            Page Not Found
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-2 leading-relaxed">
            The curriculum module or learning route you are searching for does not exist or has been relocated.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <Link to="/dashboard" className="w-full sm:w-auto">
            <Button variant="primary" size="md" className="w-full">
              <Home className="w-4 h-4 mr-1.5" />
              Go to Dashboard
            </Button>
          </Link>
          <Link to="/courses" className="w-full sm:w-auto">
            <Button variant="secondary" size="md" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Browse Courses
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
};
