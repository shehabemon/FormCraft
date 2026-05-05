'use client';

import { cn } from '@/lib/utils';
import type { FieldSchema } from '@/types/form';


const inputCls = cn(
  'w-full h-9 px-3 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-white',
  'font-sans text-[0.875rem] text-[var(--color-text-default)] placeholder:text-[var(--color-text-placeholder)]',
  'focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15',
  'transition-colors duration-150',
);

function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <label className="block font-sans text-[0.8125rem] font-medium text-[var(--color-text-default)] mb-1.5">
      {text}
      {required && <span className="text-[var(--color-error)] ml-0.5">*</span>}
    </label>
  );
}

function HelperText({ text }: { text: string }) {
  if (!text) return null;
  return (
    <p className="font-sans text-[0.75rem] text-[var(--color-text-muted)] mt-1">{text}</p>
  );
}


interface PreviewFieldProps {
  field: FieldSchema;
  value: unknown;
  onChange: (v: unknown) => void;
}

export function PreviewField({ field, value, onChange }: PreviewFieldProps) {
  const { type, label, placeholder, helperText, options } = field;
  const isRequired = field.validation.some((r) => r.enabled && r.type === 'required');


  if (type === 'divider') {
    return <hr className="border-t border-[var(--color-border)] my-2" />;
  }

  if (type === 'heading') {
    const Tag = `h${field.headingLevel}` as 'h1' | 'h2' | 'h3' | 'h4';
    const sizes: Record<number, string> = { 1: 'text-2xl', 2: 'text-xl', 3: 'text-lg', 4: 'text-base' };
    return (
      <Tag className={cn('font-display font-semibold text-[var(--color-text-primary)] tracking-tight', sizes[field.headingLevel])}>
        {field.content || label}
      </Tag>
    );
  }

  if (type === 'paragraph') {
    return (
      <p className="font-sans text-[0.9375rem] text-[var(--color-text-secondary)] leading-relaxed">
        {field.content}
      </p>
    );
  }

  if (type === 'hidden') return null;


  if (type === 'checkbox') {
    return (
      <label className="flex items-center gap-2.5 cursor-pointer group">
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          className="w-4 h-4 rounded-[3px] border border-[var(--color-border-strong)] accent-[var(--color-primary)] cursor-pointer"
        />
        <span className="font-sans text-[0.9375rem] text-[var(--color-text-default)]">
          {label}
          {isRequired && <span className="text-[var(--color-error)] ml-0.5">*</span>}
        </span>
      </label>
    );
  }

  if (type === 'textarea') {
    return (
      <div>
        <Label text={label} required={isRequired} />
        <textarea
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
          className={cn(
            inputCls, 'h-auto resize-y py-2',
          )}
        />
        <HelperText text={helperText} />
      </div>
    );
  }

  if (type === 'radio') {
    return (
      <div>
        <Label text={label} required={isRequired} />
        <div className="space-y-2">
          {options.map((opt) => (
            <label key={opt.id} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={field.id}
                value={opt.value}
                checked={value === opt.value}
                onChange={() => onChange(opt.value)}
                className="w-4 h-4 accent-[var(--color-primary)] cursor-pointer"
              />
              <span className="font-sans text-[0.875rem] text-[var(--color-text-default)]">{opt.label}</span>
            </label>
          ))}
        </div>
        <HelperText text={helperText} />
      </div>
    );
  }

  if (type === 'checkboxGroup') {
    const selected = Array.isArray(value) ? (value as string[]) : [];
    const toggle = (v: string) =>
      onChange(selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v]);

    return (
      <div>
        <Label text={label} required={isRequired} />
        <div className="space-y-2">
          {options.map((opt) => (
            <label key={opt.id} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                value={opt.value}
                checked={selected.includes(opt.value)}
                onChange={() => toggle(opt.value)}
                className="w-4 h-4 rounded-[3px] accent-[var(--color-primary)] cursor-pointer"
              />
              <span className="font-sans text-[0.875rem] text-[var(--color-text-default)]">{opt.label}</span>
            </label>
          ))}
        </div>
        <HelperText text={helperText} />
      </div>
    );
  }

  if (type === 'select' || type === 'multiselect') {
    if (type === 'multiselect') {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      const toggle = (v: string) =>
        onChange(selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v]);
      return (
        <div>
          <Label text={label} required={isRequired} />
          <div className="flex flex-wrap gap-1.5">
            {options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => toggle(opt.value)}
                className={cn(
                  'px-3 py-1 rounded-full font-sans text-[0.8125rem] border transition-colors duration-100',
                  selected.includes(opt.value)
                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                    : 'bg-white text-[var(--color-text-secondary)] border-[var(--color-border-strong)] hover:border-[var(--color-primary)]/50',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <HelperText text={helperText} />
        </div>
      );
    }

    return (
      <div>
        <Label text={label} required={isRequired} />
        <div className="relative">
          <select
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            className={cn(inputCls, 'appearance-none pr-8 cursor-pointer')}
          >
            <option value="">{placeholder || '— select —'}</option>
            {options.map((opt) => (
              <option key={opt.id} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        <HelperText text={helperText} />
      </div>
    );
  }

  if (type === 'range') {
    const num = Number(value ?? field.min);
    return (
      <div>
        <Label text={label} required={isRequired} />
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={field.min}
            max={field.max}
            step={field.step}
            value={num}
            onChange={(e) => onChange(+e.target.value)}
            className="flex-1 accent-[var(--color-primary)]"
          />
          <span className="font-mono text-[0.8125rem] text-[var(--color-text-secondary)] w-10 text-right shrink-0">{num}</span>
        </div>
        <HelperText text={helperText} />
      </div>
    );
  }

  if (type === 'file') {
    return (
      <div>
        <Label text={label} required={isRequired} />
        <label className={cn(
          'flex flex-col items-center justify-center gap-2 p-6 rounded-[var(--radius-md)]',
          'border-2 border-dashed border-[var(--color-border-strong)] bg-[var(--color-stone-50)]',
          'cursor-pointer hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-primary-subtle)] transition-colors duration-150',
        )}>
          <svg className="w-8 h-8 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <span className="font-sans text-[0.8125rem] text-[var(--color-text-muted)]">
            {placeholder || 'Click to upload or drag & drop'}
          </span>
          <input
            type="file"
            accept={field.accept || undefined}
            onChange={(e) => onChange(e.target.files?.[0]?.name ?? '')}
            className="sr-only"
          />
        </label>
        <HelperText text={helperText} />
      </div>
    );
  }


  const inputTypeMap: Partial<Record<typeof type, string>> = {
    email: 'email', phone: 'tel', url: 'url',
    password: 'password', number: 'number',
    date: 'date', time: 'time',
  };
  const htmlType = inputTypeMap[type] ?? 'text';

  return (
    <div>
      <Label text={label} required={isRequired} />
      <input
        type={htmlType}
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputCls}
      />
      <HelperText text={helperText} />
    </div>
  );
}
