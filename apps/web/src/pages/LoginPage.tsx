import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { toast } from '../stores/useToastStore';
import { useAppStore } from '../stores/useAppStore';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';

const LoginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof LoginSchema>;

export const LoginPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const { setUserProfile } = useAppStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: 'rahul.prakash@omnitutor.ai',
      password: 'password123',
      rememberMe: true,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    // Simulate brief client authentication
    await new Promise((r) => setTimeout(r, 600));
    setUserProfile({ email: data.email, name: 'Rahul Prakash' });
    toast.success('Successfully logged in! Welcome back.', 'Authentication Successful');
    navigate('/dashboard');
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;
    setIsResetting(true);
    await new Promise((r) => setTimeout(r, 600));
    setIsResetting(false);
    setForgotModalOpen(false);
    toast.info(`Password reset link sent to ${resetEmail}`, 'Reset Link Sent');
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-xl font-bold font-display text-slate-900 dark:text-slate-100">
          Sign in to your account
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Continue your personalized cognitive learning journey
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          id="login-email"
          label="Email Address"
          type="email"
          placeholder="student@example.com"
          leadingIcon={<Mail className="w-4 h-4" />}
          error={errors.email?.message}
          {...register('email')}
        />

        <div className="space-y-1">
          <Input
            id="login-password"
            label="Password"
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
        </div>

        <div className="flex items-center justify-between text-xs">
          <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-400">
            <input
              type="checkbox"
              className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
              {...register('rememberMe')}
            />
            <span>Remember me</span>
          </label>

          <button
            type="button"
            onClick={() => setForgotModalOpen(true)}
            className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
          >
            Forgot password?
          </button>
        </div>

        <Button
          id="btn-login-submit"
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          isLoading={isSubmitting}
        >
          <span>Sign In</span>
          <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      </form>

      <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
        Don&apos;t have an account?{' '}
        <Link
          to="/register"
          className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
        >
          Create account
        </Link>
      </div>

      {/* Forgot Password Dialog */}
      <Dialog
        open={forgotModalOpen}
        onClose={() => setForgotModalOpen(false)}
        title="Reset Password"
        description="Enter your registered email address to receive password reset instructions."
        footer={
          <>
            <Button variant="secondary" onClick={() => setForgotModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handlePasswordReset}
              isLoading={isResetting}
            >
              Send Instructions
            </Button>
          </>
        }
      >
        <form onSubmit={handlePasswordReset} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            placeholder="student@example.com"
            leadingIcon={<Mail className="w-4 h-4" />}
            required
          />
        </form>
      </Dialog>
    </div>
  );
};
