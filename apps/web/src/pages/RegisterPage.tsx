import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { toast } from '../stores/useToastStore';
import { useAuthStore } from '../stores/useAuthStore';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';

const RegisterSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  preferredDifficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the terms of service' }),
  }),
});

type RegisterFormData = z.infer<typeof RegisterSchema>;

export const RegisterPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const { register: registerUser } = useAuthStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      preferredDifficulty: 'intermediate',
      termsAccepted: true,
    },
  });

  const selectedDifficulty = watch('preferredDifficulty');

  const onSubmit = async (data: RegisterFormData) => {
    setServerError(null);
    const result = await registerUser({
      fullName: data.fullName,
      email: data.email,
      password: data.password,
      preferences: {
        preferredDifficulty: data.preferredDifficulty,
      },
    });

    if (result.success) {
      toast.success(
        `Welcome to OmniTutor, ${data.fullName}! A verification email has been sent.`,
        'Account Created'
      );
      navigate('/dashboard');
    } else {
      setServerError(result.error || 'Registration failed. Please check your details.');
      toast.error(result.error || 'Registration failed.', 'Account Creation Failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-xl font-bold font-display text-slate-900 dark:text-slate-100">
          Create your account
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Start personalized adaptive learning tailored to your cognitive pacing
        </p>
      </div>

      {serverError && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
          <div className="flex-1">
            <span className="font-semibold">Registration failed: </span>
            {serverError}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          id="register-name"
          label="Full Name"
          type="text"
          placeholder="Jane Doe"
          leadingIcon={<User className="w-4 h-4" />}
          error={errors.fullName?.message}
          {...register('fullName')}
        />

        <Input
          id="register-email"
          label="Email Address"
          type="email"
          placeholder="jane.doe@example.com"
          leadingIcon={<Mail className="w-4 h-4" />}
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          id="register-password"
          label="Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="At least 8 characters"
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

        {/* Initial Pacing Preference */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Starting Pacing Level
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['beginner', 'intermediate', 'advanced'] as const).map((diff) => (
              <button
                key={diff}
                type="button"
                onClick={() => setValue('preferredDifficulty', diff)}
                className={`p-2 rounded-xl border text-xs font-semibold capitalize transition-all text-center cursor-pointer ${
                  selectedDifficulty === diff
                    ? 'bg-indigo-50 dark:bg-indigo-950/80 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {diff}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <label className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
              {...register('termsAccepted')}
            />
            <span>
              I agree to the Terms of Service and Privacy Policy.
            </span>
          </label>
          {errors.termsAccepted && (
            <p className="text-xs text-rose-500 font-medium">
              {errors.termsAccepted.message}
            </p>
          )}
        </div>

        <Button
          id="btn-register-submit"
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          isLoading={isSubmitting}
        >
          <span>Create Account</span>
          <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      </form>

      <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
        Already have an account?{' '}
        <Link
          to="/login"
          className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
};
