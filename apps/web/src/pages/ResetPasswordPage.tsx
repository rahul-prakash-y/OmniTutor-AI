import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { toast } from '../stores/useToastStore';
import { apiClient } from '../services/apiClient';
import { Lock, Eye, EyeOff, CheckCircle2, ArrowRight } from 'lucide-react';

const ResetPasswordFormSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof ResetPasswordFormSchema>;

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [showPassword, setShowPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(ResetPasswordFormSchema),
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setServerError('Reset token is missing or invalid. Please request a new password reset.');
      return;
    }

    setServerError(null);
    const res = await apiClient.resetPassword({
      token,
      newPassword: data.password,
    });

    if (res.success) {
      setIsSuccess(true);
      toast.success('Your password has been successfully reset.', 'Password Changed');
    } else {
      setServerError(res.error?.message || 'Failed to reset password. The link may have expired.');
    }
  };

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <h1 className="text-xl font-bold font-display text-slate-900 dark:text-slate-100">
          Invalid Password Reset Link
        </h1>
        <p className="text-xs text-slate-500">
          This password reset link is missing a valid security token.
        </p>
        <Link to="/login">
          <Button variant="primary" size="md">
            Return to Login
          </Button>
        </Link>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold font-display text-slate-900 dark:text-slate-100">
          Password Reset Complete
        </h1>
        <p className="text-xs text-slate-500">
          Your new password has been set and previous active sessions were invalidated for security.
        </p>
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={() => navigate('/login')}
        >
          <span>Sign In With New Password</span>
          <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-xl font-bold font-display text-slate-900 dark:text-slate-100">
          Set New Password
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Enter a strong password with at least 8 characters
        </p>
      </div>

      {serverError && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          id="new-password"
          label="New Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="••••••••"
          leadingIcon={<Lock className="w-4 h-4" />}
          trailingIcon={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
          error={errors.password?.message}
          {...register('password')}
        />

        <Input
          id="confirm-password"
          label="Confirm New Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="••••••••"
          leadingIcon={<Lock className="w-4 h-4" />}
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <Button
          id="btn-reset-submit"
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          isLoading={isSubmitting}
        >
          <span>Update Password</span>
          <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      </form>

      <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
        <Link
          to="/login"
          className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
        >
          Back to Sign In
        </Link>
      </div>
    </div>
  );
};
