'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';


export function FieldRow({
  label,
  children,
  hint,
  horizontal = false,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  horizontal?: boolean;
}) {
  return (
    <div className={cn('flex gap-1.5', horizontal ? 'flex-row items-center' : 'flex-col')}>
      <label className="font-sans text-[0.72rem] font-semibold text-[var(--color-text-secondary)] uppercase tracking-[0.05em] shrink-0">
        {label}
      </label>
      {children}
      {hint && (
        <p className="font-sans text-[0.7rem] text-[var(--color-text-muted)] leading-snug">{hint}</p>
      )}
    </div>
  );
}


export function PanelInput({
  className,
  mono = false,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { mono?: boolean }) {
  return (
    <input
      {...props}
      className={cn(
        'w-full h-8 px-2.5 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-white',
        'font-sans text-[0.8125rem] text-[var(--color-text-default)] placeholder:text-[var(--color-text-placeholder)]',
        'focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15',
        'transition-all duration-150',
        mono && 'font-mono text-[0.75rem]',
        className
      )}
    />
  );
}


export function PanelTextarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        'w-full px-2.5 py-2 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-white resize-none',
        'font-sans text-[0.8125rem] text-[var(--color-text-default)] placeholder:text-[var(--color-text-placeholder)]',
        'focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15',
        'transition-all duration-150',
        className
      )}
    />
  );
}


export function PanelSection({
  label,
  children,
  className,
}: {
  label?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {label && (
        <p className="font-sans text-[0.68rem] font-semibold text-[var(--color-text-muted)] uppercase tracking-[0.07em]">
          {label}
        </p>
      )}
      {children}
    </div>
  );
}


export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex flex-col gap-0.5 min-w-0 mr-3">
        <span className="font-sans text-[0.8125rem] font-medium text-[var(--color-text-default)] truncate">{label}</span>
        {description && (
          <span className="font-sans text-[0.7rem] text-[var(--color-text-muted)] leading-snug">{description}</span>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative shrink-0 w-9 h-5 rounded-full transition-colors duration-200',
          checked ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-stone-300)]'
        )}
      >
        <div className={cn(
          'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200',
          checked ? 'left-[18px]' : 'left-0.5'
        )} />
      </button>
    </div>
  );
}


export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'sm',
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  size?: 'xs' | 'sm';
}) {
  return (
    <div className={cn(
      'flex p-0.5 rounded-[var(--radius-md)] bg-[var(--color-stone-100)] border border-[var(--color-border)]',
    )}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'flex-1 rounded-[5px] font-sans font-medium transition-all duration-100 whitespace-nowrap',
            size === 'xs' ? 'text-[0.65rem] h-6 px-1.5' : 'text-[0.75rem] h-7 px-2',
            value === opt.value
              ? 'bg-white text-[var(--color-text-default)] shadow-[var(--shadow-xs)]'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}


export function Accordion({
  title,
  children,
  defaultOpen = false,
  badge,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: number;
}) {
  return (
    <details open={defaultOpen} className="group/acc">
      <summary className={cn(
        'flex items-center justify-between cursor-pointer list-none select-none',
        'py-2 px-0 rounded-[var(--radius-sm)]',
        'font-sans text-[0.75rem] font-semibold text-[var(--color-text-secondary)]',
        'hover:text-[var(--color-text-default)] transition-colors duration-150'
      )}>
        <span className="flex items-center gap-2">
          {title}
          {badge !== undefined && badge > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[var(--color-primary-subtle)] text-[var(--color-primary)] text-[0.6rem] font-bold">
              {badge}
            </span>
          )}
        </span>
        <svg
          className="w-3.5 h-3.5 text-[var(--color-text-muted)] transition-transform duration-150 group-open/acc:rotate-180"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      <div className="pt-2 pb-1 flex flex-col gap-3">
        {children}
      </div>
    </details>
  );
}


export function ColourInput({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (hex: string) => void;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-2 h-8 px-2 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-white">
      <div className="relative w-5 h-5 rounded-[3px] overflow-hidden shrink-0 border border-[var(--color-border)] cursor-pointer">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-[200%] h-[200%] -top-1/2 -left-1/2 cursor-pointer border-none p-0 opacity-0"
          aria-label={label}
        />
        <div className="w-full h-full" style={{ background: value }} />
      </div>
      <input
        type="text"
        value={value.toUpperCase()}
        onChange={(e) => {
          const v = e.target.value;
          if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) onChange(v);
        }}
        maxLength={7}
        className="flex-1 min-w-0 font-mono text-[0.75rem] text-[var(--color-text-default)] bg-transparent border-none outline-none uppercase"
        spellCheck={false}
      />
    </div>
  );
}


export function PanelSlider({
  value,
  min,
  max,
  step = 1,
  onChange,
  unit = '',
  formatValue,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  unit?: string;
  formatValue?: (v: number) => string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  const display = formatValue ? formatValue(value) : `${value}${unit}`;

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1 h-5 flex items-center">
        <div className="w-full h-1 rounded-full bg-[var(--color-stone-200)] overflow-visible">
          <div
            className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-75"
            style={{ width: `${pct}%` }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(+e.target.value)}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
        />
        {/* Thumb */}
        <div
          className="absolute w-3.5 h-3.5 rounded-full border-2 border-[var(--color-primary)] bg-white shadow-sm pointer-events-none"
          style={{ left: `calc(${pct}% - 7px)` }}
        />
      </div>
      <span className="font-mono text-[0.72rem] text-[var(--color-text-muted)] w-10 text-right shrink-0">
        {display}
      </span>
    </div>
  );
}


export function EmptyPanelState({
  message,
  icon,
}: {
  message: string;
  icon?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
      className="flex flex-col items-center justify-center py-10 px-4 text-center gap-3"
    >
      <div className="w-11 h-11 rounded-[var(--radius-xl)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-stone-50)] flex items-center justify-center">
        {icon ?? (
          <svg className="w-5 h-5 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )}
      </div>
      <p className="font-sans text-[0.8125rem] text-[var(--color-text-muted)] leading-relaxed max-w-[200px]">{message}</p>
    </motion.div>
  );
}
