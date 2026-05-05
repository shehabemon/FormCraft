'use client';

import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // Base — FormCraft solid feel, no gradients, precise
  [
    'inline-flex shrink-0 items-center justify-center gap-2',
    'font-sans text-sm font-medium tracking-[0.01em] whitespace-nowrap',
    'rounded-[var(--radius-md)] border border-transparent',
    'transition-all duration-[150ms] ease-out',
    'cursor-pointer select-none',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'active:scale-[0.98]',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-4',
  ],
  {
    variants: {
      variant: {
        // Primary — verdigris teal, no shadow, solid feel
        default: [
          'bg-[var(--color-primary)] text-white',
          'hover:bg-[var(--color-primary-hover)]',
          'active:bg-[var(--color-primary-active)]',
        ],
        // Secondary — stone-100 surface, stone-300 border
        secondary: [
          'bg-[var(--color-stone-100)] text-[var(--color-text-default)]',
          'border-[var(--color-border-strong)]',
          'hover:bg-[var(--color-stone-150)]',
        ],
        // Ghost — invisible until hovered
        ghost: [
          'bg-transparent text-[var(--color-text-secondary)]',
          'hover:bg-[var(--color-stone-100)] hover:text-[var(--color-text-default)]',
        ],
        // Destructive — rose, not default red
        destructive: [
          'bg-[var(--color-error)] text-white',
          'hover:bg-[#9F1239]',
        ],
        // AI — burnished amber, ONLY for AI features
        ai: [
          'bg-[var(--color-accent)] text-white',
          'hover:bg-[var(--color-accent-hover)]',
        ],
        // Outline — border only
        outline: [
          'bg-transparent text-[var(--color-text-default)]',
          'border-[var(--color-border-strong)]',
          'hover:bg-[var(--color-stone-100)]',
        ],
        // Link style
        link: [
          'bg-transparent text-[var(--color-primary)] underline-offset-4',
          'hover:underline hover:text-[var(--color-primary-hover)]',
          'active:scale-100',
        ],
      },
      size: {
        sm: 'h-9 px-3 text-[0.8125rem]',
        default: 'h-10 px-4',
        lg: 'h-11 px-5 text-[0.9375rem]',
        icon: 'size-10',
        'icon-sm': 'size-9',
        'icon-lg': 'size-11',
        xs: 'h-7 px-2.5 text-xs rounded-[var(--radius-sm)]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends ButtonPrimitive.Props,
    VariantProps<typeof buttonVariants> {}

function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
