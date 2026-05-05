import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'FormCraft — Sign in',
};

const LogoIcon = () => (
  <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"
    />
  </svg>
);

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[var(--color-stone-50)] flex">
      <div className="hidden lg:flex lg:w-[44%] xl:w-[40%] flex-col bg-[var(--color-stone-900)] relative overflow-hidden shrink-0">
        <div className="relative z-10 p-10">
          <Link href="/" className="flex items-center gap-2.5 w-fit">
            <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--color-primary)] flex items-center justify-center shadow-sm">
              <LogoIcon />
            </div>
            <span className="font-display text-[1rem] font-bold tracking-[-0.02em] text-white">
              FormCraft
            </span>
          </Link>
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-center px-10 pb-10">
          <p className="font-display text-[1.75rem] font-bold text-white leading-[1.2] tracking-[-0.025em]">
            Build beautiful forms
            <br />
            <span className="text-[var(--color-primary)]">in minutes.</span>
          </p>
          <p className="font-sans text-[0.9375rem] text-[var(--color-stone-400)] leading-relaxed max-w-xs mt-3">
            Drag-and-drop builder, AI generation, conditional logic, and clean React code export.
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="lg:hidden mb-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--color-primary)] flex items-center justify-center">
              <LogoIcon />
            </div>
            <span className="font-display text-[1rem] font-bold tracking-[-0.02em] text-[var(--color-text-primary)]">
              FormCraft
            </span>
          </Link>
        </div>
        <div className="w-full max-w-[400px]">{children}</div>
      </div>
    </div>
  );
}
