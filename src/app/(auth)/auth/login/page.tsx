'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, AlertCircle, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const inputCn = (hasError: boolean) =>
  cn(
    'h-10 w-full rounded-[var(--radius-md)] border bg-white px-3',
    'font-sans text-[0.9375rem] text-[var(--color-text-default)]',
    'placeholder:text-[var(--color-text-placeholder)]',
    'transition-[border-color,box-shadow] duration-150 outline-none',
    'focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2',
    hasError
      ? 'border-[var(--color-error)] ring-2 ring-[var(--color-error)] ring-offset-2'
      : 'border-[var(--color-border-strong)]',
  );

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') ?? '/';
  const urlError = searchParams.get('error');

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(urlError);
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const handleDemoLogin = async () => {
    setIsDemoLoading(true);
    setServerError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: 'demo@formcraft.app',
      password: 'FormCraft2024!',
    });
    if (error) {
      setServerError('Demo login failed. Please try again.');
      setIsDemoLoading(false);
      return;
    }
    router.push(redirectTo);
    router.refresh();
  };

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    setServerError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    if (error) {
      setServerError(
        error.message === 'Invalid login credentials'
          ? 'Incorrect email or password.'
          : error.message,
      );
      setIsLoading(false);
      return;
    }
    router.push(redirectTo);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="font-display text-[1.625rem] font-bold tracking-[-0.025em] text-[var(--color-text-primary)]">
          Sign in
        </h1>
        <p className="font-sans text-[0.875rem] text-[var(--color-text-muted)]">
          Sign in to your FormCraft account
        </p>
      </div>

      {serverError && (
        <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-[var(--radius-md)] bg-[var(--color-error-subtle)] border border-[var(--color-error)]/20">
          <AlertCircle size={15} className="shrink-0 text-[var(--color-error)] mt-0.5" />
          <p className="font-sans text-[0.8125rem] text-[var(--color-error)] leading-snug">
            {serverError}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="font-sans text-[0.8125rem] font-medium text-[var(--color-text-secondary)]">
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={!!errors.email}
            className={inputCn(!!errors.email)}
            {...register('email')}
          />
          {errors.email && (
            <p className="font-sans text-[0.75rem] text-[var(--color-error)]">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="font-sans text-[0.8125rem] font-medium text-[var(--color-text-secondary)]">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              aria-invalid={!!errors.password}
              className={cn(inputCn(!!errors.password), 'pr-10')}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {errors.password && (
            <p className="font-sans text-[0.75rem] text-[var(--color-error)]">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={cn(
            'w-full h-10 rounded-[var(--radius-md)]',
            'bg-[var(--color-primary)] text-white',
            'font-sans text-[0.875rem] font-semibold',
            'hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)]',
            'transition-all duration-150 active:scale-[0.99]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2',
            'disabled:opacity-60 disabled:pointer-events-none',
            'flex items-center justify-center gap-2',
          )}
        >
          {isLoading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Signing in…
            </>
          ) : (
            'Sign in'
          )}
        </button>
      </form>

      <div className="relative flex items-center gap-3">
        <div className="flex-1 h-px bg-[var(--color-border)]" />
        <span className="font-sans text-[0.75rem] text-[var(--color-text-muted)] shrink-0">or</span>
        <div className="flex-1 h-px bg-[var(--color-border)]" />
      </div>

      <button
        type="button"
        onClick={handleDemoLogin}
        disabled={isDemoLoading || isLoading}
        className={cn(
          'w-full h-10 rounded-[var(--radius-md)]',
          'border border-[var(--color-border-strong)] bg-white',
          'font-sans text-[0.875rem] font-medium text-[var(--color-text-secondary)]',
          'hover:bg-[var(--color-stone-50)] hover:border-[var(--color-stone-400)]',
          'transition-all duration-150 active:scale-[0.99]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2',
          'disabled:opacity-60 disabled:pointer-events-none',
          'flex items-center justify-center gap-2',
        )}
      >
        {isDemoLoading ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Signing in…
          </>
        ) : (
          <>
            <User size={15} className="text-[var(--color-text-muted)]" />
            Continue with Demo Account
          </>
        )}
      </button>

      <p className="font-sans text-[0.8125rem] text-center text-[var(--color-text-muted)]">
        Don&apos;t have an account?{' '}
        <Link
          href="/auth/register"
          className="font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition-colors"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
