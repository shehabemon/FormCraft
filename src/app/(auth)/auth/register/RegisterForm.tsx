'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const registerSchema = z
  .object({
    email: z.string().email('Enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

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

function PasswordField({
  id,
  label,
  placeholder,
  autoComplete,
  registration,
  error,
}: {
  id: string;
  label: string;
  placeholder: string;
  autoComplete: string;
  registration: UseFormRegisterReturn;
  error?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="font-sans text-[0.8125rem] font-medium text-[var(--color-text-secondary)]">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={!!error}
          className={cn(inputCn(!!error), 'pr-10')}
          {...registration}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      {error && <p className="font-sans text-[0.75rem] text-[var(--color-error)]">{error}</p>}
    </div>
  );
}

export default function RegisterForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const { register, handleSubmit, getValues, formState: { errors } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setIsLoading(true);
    setServerError(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/` },
    });
    if (error) {
      setServerError(error.message);
      setIsLoading(false);
      return;
    }
    if (data.session) {
      router.push('/');
      router.refresh();
      return;
    }
    setEmailSent(true);
    setIsLoading(false);
  };

  if (emailSent) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-full bg-[var(--color-success-subtle)] flex items-center justify-center">
            <CheckCircle2 size={28} className="text-[var(--color-success)]" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="font-display text-[1.625rem] font-bold tracking-[-0.025em] text-[var(--color-text-primary)]">
            Check your inbox
          </h1>
          <p className="font-sans text-[0.875rem] text-[var(--color-text-muted)] leading-relaxed">
            We sent a confirmation link to{' '}
            <span className="font-medium text-[var(--color-text-secondary)]">{getValues('email')}</span>.
            Click it to activate your account.
          </p>
        </div>
        <p className="font-sans text-[0.8125rem] text-[var(--color-text-muted)]">
          Already confirmed?{' '}
          <Link href="/auth/login" className="font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="font-display text-[1.625rem] font-bold tracking-[-0.025em] text-[var(--color-text-primary)]">
          Create an account
        </h1>
        <p className="font-sans text-[0.875rem] text-[var(--color-text-muted)]">
          Save and sync your forms across devices
        </p>
      </div>

      {serverError && (
        <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-[var(--radius-md)] bg-[var(--color-error-subtle)] border border-[var(--color-error)]/20">
          <AlertCircle size={15} className="shrink-0 text-[var(--color-error)] mt-0.5" />
          <p className="font-sans text-[0.8125rem] text-[var(--color-error)] leading-snug">{serverError}</p>
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

        <PasswordField
          id="password"
          label="Password"
          placeholder="At least 8 characters"
          autoComplete="new-password"
          registration={register('password')}
          error={errors.password?.message}
        />

        <PasswordField
          id="confirmPassword"
          label="Confirm password"
          placeholder="••••••••"
          autoComplete="new-password"
          registration={register('confirmPassword')}
          error={errors.confirmPassword?.message}
        />

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
              Creating account…
            </>
          ) : (
            'Create account'
          )}
        </button>
      </form>

      <p className="font-sans text-[0.8125rem] text-center text-[var(--color-text-muted)]">
        Already have an account?{' '}
        <Link href="/auth/login" className="font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}
