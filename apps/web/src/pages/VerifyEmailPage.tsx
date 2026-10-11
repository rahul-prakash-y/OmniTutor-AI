import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { apiClient } from '../services/apiClient';
import { useAuthStore } from '../stores/useAuthStore';
import { CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState<string>('');
  const { init } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Missing email verification token.');
      return;
    }

    let isMounted = true;
    apiClient
      .verifyEmail({ token })
      .then((res) => {
        if (!isMounted) return;
        if (res.success) {
          setStatus('success');
          init(); // Refresh current auth state
        } else {
          setStatus('error');
          setMessage(res.error?.message || 'Verification token is invalid or has expired.');
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setStatus('error');
        setMessage('Network failure attempting to verify email.');
      });

    return () => {
      isMounted = false;
    };
  }, [token, init]);

  return (
    <div className="space-y-6 text-center">
      {status === 'verifying' && (
        <div className="space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 animate-pulse flex items-center justify-center text-white font-bold text-lg mx-auto shadow-md">
            OT
          </div>
          <h1 className="text-xl font-bold font-display text-slate-900 dark:text-slate-100">
            Verifying Your Email
          </h1>
          <p className="text-xs text-slate-400">
            Confirming your single-use verification token with the security server...
          </p>
        </div>
      )}

      {status === 'success' && (
        <div className="space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold font-display text-slate-900 dark:text-slate-100">
            Email Verified Successfully!
          </h1>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Your OmniTutor AI account is now verified. You have full access to adaptive learning sessions and cognitive assessments.
          </p>
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={() => navigate('/dashboard')}
          >
            <span>Continue to Dashboard</span>
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center">
            <XCircle className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold font-display text-slate-900 dark:text-slate-100">
            Verification Failed
          </h1>
          <p className="text-xs text-rose-600 dark:text-rose-400 max-w-sm mx-auto">
            {message}
          </p>
          <div className="pt-2">
            <Link to="/login">
              <Button variant="outline" size="md">
                Return to Login
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
