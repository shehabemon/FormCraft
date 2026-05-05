import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  // Base — compact, 4px radius (not pill), semibold uppercase label style
  [
    'inline-flex h-5 w-fit items-center justify-center gap-1',
    'rounded-[var(--radius-sm)] px-2',
    'font-sans text-[0.6875rem] font-semibold leading-none tracking-[0.04em] uppercase',
    'whitespace-nowrap transition-colors duration-[150ms]',
    '[&>svg]:pointer-events-none [&>svg]:size-3',
  ],
  {
    variants: {
      variant: {
        // Default — teal (primary state indicator)
        default: 'bg-[var(--color-primary-subtle)] text-[var(--color-primary-active)] border border-[var(--color-primary-subtle-hover)]',
        // Secondary — stone surface
        secondary: 'bg-[var(--color-stone-100)] text-[var(--color-text-secondary)] border border-[var(--color-border)]',
        // Destructive — rose subtle
        destructive: 'bg-[var(--color-error-subtle)] text-[var(--color-error)] border border-[#FECDD3]',
        // Outline — no fill
        outline: 'bg-transparent text-[var(--color-text-secondary)] border border-[var(--color-border-strong)]',
        // Success
        success: 'bg-[var(--color-success-subtle)] text-[var(--color-success)] border border-[#A7F3D0]',
        // Warning
        warning: 'bg-[var(--color-warning-subtle)] text-[var(--color-warning)] border border-[#FDE68A]',
        // AI — amber accent, only for AI features
        ai: 'bg-[var(--color-accent-subtle)] text-[var(--color-accent)] border border-[#FCD34D]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

function Badge({
  className,
  variant = 'default',
  render,
  ...props
}: useRender.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: 'span',
    props: mergeProps<'span'>(
      { className: cn(badgeVariants({ variant }), className) },
      props
    ),
    render,
    state: { slot: 'badge', variant },
  });
}

export { Badge, badgeVariants };
