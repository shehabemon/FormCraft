import * as React from 'react';
import { Input as InputPrimitive } from '@base-ui/react/input';
import { cn } from '@/lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        // Base shape — 6px radius, white bg, stone-300 border
        'h-10 w-full min-w-0',
        'rounded-[var(--radius-md)] border border-[var(--color-border-strong)]',
        'bg-white px-3 py-2',
        // Typography — Plus Jakarta Sans, 15px, stone-800
        'font-sans text-[0.9375rem] font-normal text-[var(--color-text-default)]',
        'placeholder:text-[var(--color-text-placeholder)]',
        // Transitions
        'transition-[border-color,box-shadow] duration-[150ms] ease-out',
        // Focus — teal ring, no inner shadow
        'outline-none',
        'focus:border-[var(--color-primary)]',
        'focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2',
        // Error state
        'aria-invalid:border-[var(--color-error)]',
        'aria-invalid:ring-2 aria-invalid:ring-[var(--color-error)] aria-invalid:ring-offset-2',
        // Disabled
        'disabled:cursor-not-allowed disabled:opacity-60',
        'disabled:bg-[var(--color-stone-100)] disabled:text-[var(--color-text-placeholder)]',
        // File input
        'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[var(--color-text-default)]',
        className
      )}
      {...props}
    />
  );
}

export { Input };
