'use client';

import { useState, useCallback, useMemo, useRef, useEffect, CSSProperties } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { spring, springSnappy } from '@/lib/motion';
import { CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import {
  selectAllFields,
  selectFormSchema,
  selectSteps,
  selectFormMode,
  selectFormSettings,
} from '@/store/slices/formSlice';
import {
  selectPreviewStepIndex,
  incrementPreviewStep,
  decrementPreviewStep,
  setPreviewStepIndex,
} from '@/store/slices/uiSlice';
import { selectBrandConfig } from '@/store/slices/brandSlice';
import { getCascadedVisibility } from '@/lib/conditionalEngine';
import type { FieldSchema } from '@/types/form';
import type { BrandConfig } from '@/types/brand';
import type { ValidationRule, StepIndicatorStyle } from '@/types/form';



const FONT_STACKS: Record<string, string> = {
  inter:       '"Inter", system-ui, sans-serif',
  roboto:      '"Roboto", system-ui, sans-serif',
  poppins:     '"Poppins", system-ui, sans-serif',
  'open-sans': '"Open Sans", system-ui, sans-serif',
  lato:        '"Lato", system-ui, sans-serif',
  montserrat:  '"Montserrat", system-ui, sans-serif',
  system:      'system-ui, -apple-system, sans-serif',
};

const INPUT_HEIGHT: Record<string, string> = { sm: '2rem', md: '2.25rem', lg: '2.75rem' };
const SPACING: Record<string, string> = { compact: '0.875rem', comfortable: '1.25rem', spacious: '1.75rem' };

function brandToCSSVars(brand: BrandConfig): CSSProperties {
  return {
    '--fp-primary':       brand.primaryColor,
    '--fp-primary-10':    `${brand.primaryColor}1a`,
    '--fp-primary-20':    `${brand.primaryColor}33`,
    '--fp-bg':            brand.backgroundColor,
    '--fp-surface':       brand.surfaceColor,
    '--fp-text':          brand.textColor,
    '--fp-text-muted':    `${brand.textColor}99`,
    '--fp-error':         brand.errorColor,
    '--fp-success':       brand.successColor,
    '--fp-border':        brand.borderColor,
    '--fp-radius':        `${brand.borderRadius}px`,
    '--fp-font':          FONT_STACKS[brand.fontFamily] ?? FONT_STACKS.inter,
    '--fp-input-h':       INPUT_HEIGHT[brand.inputSize] ?? '2.25rem',
    '--fp-gap':           SPACING[brand.spacingScale] ?? '1.25rem',
  } as CSSProperties;
}



function validateValue(value: unknown, rules: ValidationRule[]): string {
  for (const rule of rules) {
    if (!rule.enabled) continue;
    const str = value == null ? '' : String(value);
    const num = Number(value);

    switch (rule.type) {
      case 'required':
        if (Array.isArray(value) ? value.length === 0 : str.trim() === '' || value === false)
          return rule.message || 'This field is required';
        break;
      case 'minLength':
        if (str.length < Number(rule.value))
          return rule.message || `Must be at least ${rule.value} characters`;
        break;
      case 'maxLength':
        if (str.length > Number(rule.value))
          return rule.message || `Must be at most ${rule.value} characters`;
        break;
      case 'min':
        if (!isNaN(num) && num < Number(rule.value))
          return rule.message || `Must be at least ${rule.value}`;
        break;
      case 'max':
        if (!isNaN(num) && num > Number(rule.value))
          return rule.message || `Must be at most ${rule.value}`;
        break;
      case 'email':
        if (str && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str))
          return rule.message || 'Please enter a valid email address';
        break;
      case 'url':
        try { if (str) new URL(str); } catch {
          return rule.message || 'Please enter a valid URL';
        }
        break;
      case 'pattern':
        if (str && !new RegExp(String(rule.value)).test(str))
          return rule.message || 'Invalid format';
        break;
    }
  }
  return '';
}



function inputCls(hasError: boolean) {
  return cn(
    'w-full px-3 font-[var(--fp-font)] text-[0.875rem] text-[var(--fp-text)]',
    'border transition-colors duration-150 outline-none',
    'rounded-[var(--fp-radius)]',
    'h-[var(--fp-input-h)]',
    hasError
      ? 'border-[var(--fp-error)] bg-[color-mix(in_srgb,var(--fp-error)_5%,white)] focus:ring-2 focus:ring-[var(--fp-error)]/20'
      : 'border-[var(--fp-border)] bg-[var(--fp-surface)] focus:border-[var(--fp-primary)] focus:ring-2 focus:ring-[var(--fp-primary-10)]',
  );
}

function FieldLabel({ text, htmlFor, required, show }: { text: string; htmlFor: string; required: boolean; show: boolean }) {
  if (!show) return null;
  return (
    <label htmlFor={htmlFor} className="block text-[0.8125rem] font-medium mb-1.5" style={{ color: 'var(--fp-text)', fontFamily: 'var(--fp-font)' }}>
      {text}
      {required && <span className="ml-0.5" style={{ color: 'var(--fp-error)' }} aria-hidden="true">*</span>}
    </label>
  );
}

function HelperText({ text, id }: { text: string; id: string }) {
  if (!text) return null;
  return <p id={id} className="mt-1 text-[0.75rem]" style={{ color: 'var(--fp-text-muted)', fontFamily: 'var(--fp-font)' }}>{text}</p>;
}

function ErrorMsg({ text, id }: { text: string; id: string }) {
  if (!text) return null;
  return <p id={id} role="alert" className="mt-1 text-[0.75rem] font-medium" style={{ color: 'var(--fp-error)', fontFamily: 'var(--fp-font)' }}>{text}</p>;
}



interface FieldProps {
  field: FieldSchema;
  value: unknown;
  error: string;
  onChange: (v: unknown) => void;
  onBlur: () => void;
  showLabels: boolean;
}

function PreviewInputField({ field, value, error, onChange, onBlur, showLabels }: FieldProps) {
  const { type, label, placeholder, helperText, name } = field;
  const isRequired = field.validation.some((r) => r.enabled && r.type === 'required');
  const describedBy = [helperText && `${name}-helper`, error && `${name}-error`].filter(Boolean).join(' ');

  const inputTypeMap: Partial<Record<typeof type, string>> = {
    email: 'email', phone: 'tel', url: 'url',
    password: 'password', number: 'number',
    date: 'date', time: 'time',
  };

  if (type === 'divider') return <hr style={{ borderColor: 'var(--fp-border)' }} />;

  if (type === 'heading') {
    const Tag = `h${field.headingLevel}` as 'h1' | 'h2' | 'h3' | 'h4';
    const sizes: Record<number, string> = { 1: '1.75rem', 2: '1.375rem', 3: '1.125rem', 4: '1rem' };
    return <Tag className="font-semibold leading-tight" style={{ color: 'var(--fp-text)', fontFamily: 'var(--fp-font)', fontSize: sizes[field.headingLevel] }}>{field.content || label}</Tag>;
  }

  if (type === 'paragraph') {
    return <p className="text-[0.9375rem] leading-relaxed" style={{ color: 'var(--fp-text-muted)', fontFamily: 'var(--fp-font)' }}>{field.content}</p>;
  }

  if (type === 'hidden') return null;

  if (type === 'checkbox') {
    return (
      <label className="flex items-center gap-2.5 cursor-pointer select-none" style={{ fontFamily: 'var(--fp-font)' }}>
        <input type="checkbox" id={name} checked={!!value} onChange={(e) => { onChange(e.target.checked); onBlur(); }} aria-invalid={!!error} aria-required={isRequired} className="w-4 h-4 cursor-pointer rounded-[3px]" style={{ accentColor: 'var(--fp-primary)' }} />
        <span className="text-[0.9375rem]" style={{ color: 'var(--fp-text)' }}>
          {label}{isRequired && <span className="ml-0.5" style={{ color: 'var(--fp-error)' }}>*</span>}
        </span>
        {error && <ErrorMsg text={error} id={`${name}-error`} />}
      </label>
    );
  }

  if (type === 'textarea') {
    return (
      <div>
        <FieldLabel text={label} htmlFor={name} required={isRequired} show={showLabels} />
        <textarea id={name} value={String(value ?? '')} placeholder={placeholder} rows={4} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} aria-invalid={!!error} aria-required={isRequired} aria-describedby={describedBy || undefined} className={cn(inputCls(!!error), '!h-auto resize-y py-2')} style={{ fontFamily: 'var(--fp-font)' }} />
        <HelperText text={helperText} id={`${name}-helper`} />
        <ErrorMsg text={error} id={`${name}-error`} />
      </div>
    );
  }

  if (type === 'radio') {
    return (
      <fieldset>
        {showLabels && <legend className="text-[0.8125rem] font-medium mb-2" style={{ color: 'var(--fp-text)', fontFamily: 'var(--fp-font)' }}>{label}{isRequired && <span className="ml-0.5" style={{ color: 'var(--fp-error)' }}>*</span>}</legend>}
        <div className="space-y-2">
          {field.options.map((opt) => (
            <label key={opt.id} className="flex items-center gap-2 cursor-pointer" style={{ fontFamily: 'var(--fp-font)' }}>
              <input type="radio" name={name} value={opt.value} checked={value === opt.value} onChange={() => { onChange(opt.value); onBlur(); }} aria-invalid={!!error} className="w-4 h-4 cursor-pointer" style={{ accentColor: 'var(--fp-primary)' }} />
              <span className="text-[0.875rem]" style={{ color: 'var(--fp-text)' }}>{opt.label}</span>
            </label>
          ))}
        </div>
        <HelperText text={helperText} id={`${name}-helper`} />
        <ErrorMsg text={error} id={`${name}-error`} />
      </fieldset>
    );
  }

  if (type === 'checkboxGroup') {
    const selected = Array.isArray(value) ? (value as string[]) : [];
    const toggle = (v: string) => {
      const next = selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v];
      onChange(next); onBlur();
    };
    return (
      <fieldset>
        {showLabels && <legend className="text-[0.8125rem] font-medium mb-2" style={{ color: 'var(--fp-text)', fontFamily: 'var(--fp-font)' }}>{label}{isRequired && <span className="ml-0.5" style={{ color: 'var(--fp-error)' }}>*</span>}</legend>}
        <div className="space-y-2">
          {field.options.map((opt) => (
            <label key={opt.id} className="flex items-center gap-2 cursor-pointer" style={{ fontFamily: 'var(--fp-font)' }}>
              <input type="checkbox" value={opt.value} checked={selected.includes(opt.value)} onChange={() => toggle(opt.value)} aria-invalid={!!error} className="w-4 h-4 rounded-[3px] cursor-pointer" style={{ accentColor: 'var(--fp-primary)' }} />
              <span className="text-[0.875rem]" style={{ color: 'var(--fp-text)' }}>{opt.label}</span>
            </label>
          ))}
        </div>
        <HelperText text={helperText} id={`${name}-helper`} />
        <ErrorMsg text={error} id={`${name}-error`} />
      </fieldset>
    );
  }

  if (type === 'select') {
    return (
      <div>
        <FieldLabel text={label} htmlFor={name} required={isRequired} show={showLabels} />
        <div className="relative">
          <select id={name} value={String(value ?? '')} onChange={(e) => { onChange(e.target.value); onBlur(); }} aria-invalid={!!error} aria-required={isRequired} aria-describedby={describedBy || undefined} className={cn(inputCls(!!error), 'appearance-none pr-8 cursor-pointer')} style={{ fontFamily: 'var(--fp-font)' }}>
            <option value="">{placeholder || '— select —'}</option>
            {field.options.map((opt) => <option key={opt.id} value={opt.value}>{opt.label}</option>)}
          </select>
          <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--fp-text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
        </div>
        <HelperText text={helperText} id={`${name}-helper`} />
        <ErrorMsg text={error} id={`${name}-error`} />
      </div>
    );
  }

  if (type === 'multiselect') {
    const selected = Array.isArray(value) ? (value as string[]) : [];
    const toggle = (v: string) => { const next = selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v]; onChange(next); };
    return (
      <div>
        <FieldLabel text={label} htmlFor={name} required={isRequired} show={showLabels} />
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={label} aria-invalid={!!error} onBlur={onBlur}>
          {field.options.map((opt) => {
            const active = selected.includes(opt.value);
            return (
              <button key={opt.id} type="button" onClick={() => toggle(opt.value)} className="px-3 py-1 rounded-full text-[0.8125rem] border transition-colors duration-100" style={{ fontFamily: 'var(--fp-font)', background: active ? 'var(--fp-primary)' : 'var(--fp-surface)', color: active ? '#fff' : 'var(--fp-text)', borderColor: active ? 'var(--fp-primary)' : 'var(--fp-border)' }}>
                {opt.label}
              </button>
            );
          })}
        </div>
        <HelperText text={helperText} id={`${name}-helper`} />
        <ErrorMsg text={error} id={`${name}-error`} />
      </div>
    );
  }

  if (type === 'range') {
    const num = Number(value ?? field.min);
    return (
      <div>
        <FieldLabel text={label} htmlFor={name} required={isRequired} show={showLabels} />
        <div className="flex items-center gap-3">
          <input type="range" id={name} min={field.min} max={field.max} step={field.step} value={num} onChange={(e) => onChange(+e.target.value)} onMouseUp={onBlur} onTouchEnd={onBlur} className="flex-1" style={{ accentColor: 'var(--fp-primary)' }} />
          <span className="font-mono text-[0.8125rem] w-10 text-right shrink-0" style={{ color: 'var(--fp-text-muted)' }}>{num}</span>
        </div>
        <HelperText text={helperText} id={`${name}-helper`} />
        <ErrorMsg text={error} id={`${name}-error`} />
      </div>
    );
  }

  if (type === 'file') {
    const filename = typeof value === 'string' ? value : '';
    return (
      <div>
        <FieldLabel text={label} htmlFor={name} required={isRequired} show={showLabels} />
        <label htmlFor={name} className="flex flex-col items-center justify-center gap-2 p-6 cursor-pointer transition-colors duration-150 rounded-[var(--fp-radius)] border-2 border-dashed" style={{ borderColor: error ? 'var(--fp-error)' : 'var(--fp-border)', background: 'var(--fp-surface)' }}>
          <svg className="w-8 h-8" style={{ color: 'var(--fp-text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
          <span className="text-[0.8125rem]" style={{ color: filename ? 'var(--fp-text)' : 'var(--fp-text-muted)', fontFamily: 'var(--fp-font)' }}>{filename || placeholder || 'Click to upload or drag & drop'}</span>
          <input id={name} type="file" accept={field.accept || undefined} onChange={(e) => { onChange(e.target.files?.[0]?.name ?? ''); onBlur(); }} aria-invalid={!!error} aria-required={isRequired} className="sr-only" />
        </label>
        <HelperText text={helperText} id={`${name}-helper`} />
        <ErrorMsg text={error} id={`${name}-error`} />
      </div>
    );
  }

  const htmlType = inputTypeMap[type] ?? 'text';
  return (
    <div>
      <FieldLabel text={label} htmlFor={name} required={isRequired} show={showLabels} />
      <input type={htmlType} id={name} value={String(value ?? '')} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} aria-invalid={!!error} aria-required={isRequired} aria-describedby={describedBy || undefined} className={inputCls(!!error)} style={{ fontFamily: 'var(--fp-font)' }} />
      <HelperText text={helperText} id={`${name}-helper`} />
      <ErrorMsg text={error} id={`${name}-error`} />
    </div>
  );
}



interface ProgressProps {
  style: StepIndicatorStyle;
  current: number; // 0-indexed
  total: number;
  stepTitles: string[];
  isNarrow: boolean; // true at mobile widths → labelled collapses to dots
}

function ProgressIndicator({ style, current, total, stepTitles, isNarrow }: ProgressProps) {
  const resolved: StepIndicatorStyle = (style === 'labelled' && isNarrow) ? 'dots' : style;

  if (resolved === 'dots') {
    return (
      <div className="flex items-center justify-center gap-1.5" role="progressbar" aria-valuenow={current + 1} aria-valuemin={1} aria-valuemax={total}>
        {Array.from({ length: total }).map((_, i) => (
          <motion.div
            key={i}
            animate={{
              width:   i === current ? 20 : 8,
              opacity: i < current ? 0.5 : i === current ? 1 : 0.3,
            }}
            transition={spring}
            className="h-2 rounded-full"
            style={{ background: i <= current ? 'var(--fp-primary)' : 'var(--fp-border)' }}
          />
        ))}
      </div>
    );
  }

  if (resolved === 'numbered') {
    return (
      <div className="flex items-center justify-center gap-2" style={{ fontFamily: 'var(--fp-font)' }}>
        <span className="text-[0.8125rem] font-medium" style={{ color: 'var(--fp-text-muted)' }}>
          Step <span style={{ color: 'var(--fp-text)', fontWeight: 700 }}>{current + 1}</span> of {total}
        </span>
      </div>
    );
  }

  if (resolved === 'labelled') {
    return (
      <div className="flex items-center justify-center gap-0 overflow-hidden" style={{ fontFamily: 'var(--fp-font)' }}>
        {stepTitles.map((title, i) => (
          <div key={i} className="flex items-center min-w-0">
            {/* Node */}
            <div className="flex flex-col items-center gap-1 min-w-0">
              <motion.div
                animate={{ scale: i === current ? 1.15 : 1 }}
                transition={spring}
                className="flex items-center justify-center w-6 h-6 rounded-full shrink-0 text-[0.6rem] font-bold"
                style={{
                  background: i < current ? 'var(--fp-primary)' : i === current ? 'var(--fp-primary)' : 'var(--fp-border)',
                  color: i <= current ? '#fff' : 'var(--fp-text-muted)',
                  border: i === current ? '2px solid var(--fp-primary)' : '2px solid transparent',
                  boxShadow: i === current ? '0 0 0 3px var(--fp-primary-20)' : 'none',
                }}
              >
                {i < current ? (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                ) : (
                  i + 1
                )}
              </motion.div>
              <span
                className="text-[0.6rem] font-medium max-w-[56px] truncate text-center leading-tight"
                style={{ color: i === current ? 'var(--fp-primary)' : 'var(--fp-text-muted)' }}
              >
                {title}
              </span>
            </div>
            {/* Connector */}
            {i < stepTitles.length - 1 && (
              <div className="w-8 shrink-0 mx-1 h-0.5 mt-[-10px]" style={{ background: i < current ? 'var(--fp-primary)' : 'var(--fp-border)' }} />
            )}
          </div>
        ))}
      </div>
    );
  }

  // bar
  const pct = ((current + 1) / total) * 100;
  return (
    <div className="w-full space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[0.72rem] font-medium" style={{ color: 'var(--fp-text-muted)', fontFamily: 'var(--fp-font)' }}>
          Step {current + 1} of {total}
        </span>
        <span className="text-[0.72rem] font-semibold" style={{ color: 'var(--fp-primary)', fontFamily: 'var(--fp-font)' }}>
          {Math.round(pct)}%
        </span>
      </div>
      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--fp-border)' }}>
        <motion.div
          animate={{ width: `${pct}%` }}
          transition={spring}
          className="h-full rounded-full"
          style={{ background: 'var(--fp-primary)' }}
        />
      </div>
    </div>
  );
}



function ConfettiPiece({ i }: { i: number }) {
  const colors = ['var(--fp-primary)', '#f59e0b', '#10b981', '#f43f5e', '#8b5cf6', '#3b82f6'];
  const color = colors[i % colors.length];
  const x = -50 + (i * 37) % 140;
  const delay = (i * 0.07) % 0.6;
  const size = 6 + (i % 4) * 2;
  const rotate = (i * 47) % 360;

  return (
    <motion.div
      initial={{ y: 0, x: 0, opacity: 1, rotate: 0, scale: 1 }}
      animate={{ y: 120 + (i % 3) * 40, x: x, opacity: 0, rotate: rotate, scale: 0.5 }}
      transition={{ duration: 1.2 + delay, ease: [0.2, 0, 1, 1], delay }}
      className="absolute top-0 left-1/2 rounded-sm pointer-events-none"
      style={{ width: size, height: size * 0.4, background: color, marginLeft: -size / 2 }}
    />
  );
}

function SubmitSuccess({ onReset }: { onReset: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
      className="relative flex flex-col items-center justify-center gap-5 py-14 text-center overflow-hidden"
    >
      {/* Confetti burst */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 pointer-events-none">
        {Array.from({ length: 18 }).map((_, i) => <ConfettiPiece key={i} i={i} />)}
      </div>

      {/* Success icon */}
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.15, ...springSnappy }}
        className="relative w-20 h-20 rounded-full flex items-center justify-center z-10"
        style={{
          background: 'color-mix(in srgb, var(--fp-success) 12%, transparent)',
          border: '2px solid color-mix(in srgb, var(--fp-success) 35%, transparent)',
        }}
      >
        {/* Pulse ring */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0.8 }}
          animate={{ scale: 1.6, opacity: 0 }}
          transition={{ duration: 0.9, ease: 'easeOut', delay: 0.25 }}
          className="absolute inset-0 rounded-full"
          style={{ background: 'var(--fp-success)', opacity: 0.2 }}
        />
        <CheckCircle2 size={36} style={{ color: 'var(--fp-success)' }} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.25 }}
        className="space-y-2"
      >
        <p className="text-[1.25rem] font-bold" style={{ color: 'var(--fp-text)', fontFamily: 'var(--fp-font)' }}>
          All done! 🎉
        </p>
        <p className="text-[0.8125rem]" style={{ color: 'var(--fp-text-muted)', fontFamily: 'var(--fp-font)' }}>
          This is the preview mode — no data was actually sent.
        </p>
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.2 }}
        type="button"
        onClick={onReset}
        className="text-[0.8125rem] font-semibold underline underline-offset-2 transition-opacity hover:opacity-70"
        style={{ color: 'var(--fp-primary)', fontFamily: 'var(--fp-font)' }}
      >
        Start over
      </motion.button>
    </motion.div>
  );
}



function EmptyPreview() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="w-12 h-12 rounded-xl border-2 border-dashed flex items-center justify-center" style={{ borderColor: 'var(--fp-border)' }}>
        <svg className="w-5 h-5" style={{ color: 'var(--fp-text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      </div>
      <p className="text-[0.8125rem]" style={{ color: 'var(--fp-text-muted)', fontFamily: 'var(--fp-font)' }}>
        Add fields in the editor to see the live preview
      </p>
    </div>
  );
}



const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '60%' : '-60%',
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? '-60%' : '60%',
    opacity: 0,
  }),
};



interface MultiStepPreviewProps {
  brand: BrandConfig;
  showLabels: boolean;
  formValues: Record<string, unknown>;
  touched: Record<string, boolean>;
  errors: Record<string, string>;
  visibility: Record<string, boolean>;
  onChange: (name: string, value: unknown) => void;
  onBlur: (field: FieldSchema) => void;
  onSubmit: () => boolean;
  onReset: () => void;
  isNarrow: boolean;
}

function MultiStepFormPreview({
  brand, showLabels, formValues, touched, errors, visibility,
  onChange, onBlur, onSubmit, onReset, isNarrow,
}: MultiStepPreviewProps) {
  const dispatch        = useAppDispatch();
  const steps           = useAppSelector(selectSteps);
  const allFields       = useAppSelector(selectAllFields);
  const settings        = useAppSelector(selectFormSettings);
  const previewStepIdx  = useAppSelector(selectPreviewStepIndex);
  const schema          = useAppSelector(selectFormSchema);

  const [direction, setDirection] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});

  const currentStep = steps[previewStepIdx];
  const isLastStep  = previewStepIdx === steps.length - 1;
  const isFirstStep = previewStepIdx === 0;

  const stepFields = useMemo(() => {
    if (!currentStep) return [];
    return allFields.filter((f) => f.stepId === currentStep.id);
  }, [allFields, currentStep]);

  const inputStepFields = stepFields.filter(
    (f) => !['heading', 'paragraph', 'divider', 'hidden'].includes(f.type),
  );

  const stepTitles = steps.map((s, i) => s.title || `Step ${i + 1}`);

  const validateCurrentStep = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    let hasError = false;
    for (const field of stepFields) {
      if (!visibility[field.id]) continue;
      if (['heading', 'paragraph', 'divider', 'hidden'].includes(field.type)) continue;
      const err = validateValue(formValues[field.name], field.validation);
      if (err) { newErrors[field.name] = err; hasError = true; }
    }
    setStepErrors(newErrors);
    return !hasError;
  }, [stepFields, formValues, visibility]);

  const handleNext = useCallback(() => {
    if (!validateCurrentStep()) return;
    if (isLastStep) {
      if (onSubmit()) setSubmitted(true);
    } else {
      setDirection(1);
      dispatch(incrementPreviewStep(steps.length));
    }
  }, [validateCurrentStep, isLastStep, onSubmit, dispatch, steps.length]);

  const handleBack = useCallback(() => {
    setDirection(-1);
    setStepErrors({});
    dispatch(decrementPreviewStep());
  }, [dispatch]);

  const handleReset = useCallback(() => {
    setSubmitted(false);
    setStepErrors({});
    dispatch(setPreviewStepIndex(0));
    onReset();
  }, [dispatch, onReset]);

  const nextLabel = currentStep?.nextLabel || (isLastStep ? 'Submit' : 'Continue');
  const backLabel = currentStep?.backLabel || 'Back';
  const allowBack = currentStep?.allowBack ?? true;

  if (submitted) return <SubmitSuccess onReset={handleReset} />;

  if (steps.length === 0 || !currentStep) return <EmptyPreview />;

  return (
    <div className="flex flex-col gap-5">
      {/* Progress indicator */}
      <ProgressIndicator
        style={settings.stepIndicator}
        current={previewStepIdx}
        total={steps.length}
        stepTitles={stepTitles}
        isNarrow={isNarrow}
      />

      {/* Thin progress bar (optional) */}
      {settings.showProgressBar && settings.stepIndicator !== 'bar' && (
        <div className="w-full h-1 rounded-full overflow-hidden -mt-2" style={{ background: 'var(--fp-border)' }}>
          <motion.div
            animate={{ width: `${((previewStepIdx + 1) / steps.length) * 100}%` }}
            transition={spring}
            className="h-full rounded-full"
            style={{ background: 'var(--fp-primary)' }}
          />
        </div>
      )}

      {/* Step title + description */}
      {(currentStep.title || currentStep.description) && (
        <div>
          {currentStep.title && (
            <h2 className="text-[1.125rem] font-bold leading-tight" style={{ color: 'var(--fp-text)', fontFamily: 'var(--fp-font)' }}>
              {currentStep.title}
            </h2>
          )}
          {currentStep.description && (
            <p className="mt-1 text-[0.875rem] leading-relaxed" style={{ color: 'var(--fp-text-muted)', fontFamily: 'var(--fp-font)' }}>
              {currentStep.description}
            </p>
          )}
        </div>
      )}

      {/* Step fields — animated slide transition */}
      <div className="overflow-hidden">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={currentStep.id}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={spring}
          >
            {stepFields.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-[0.8125rem]" style={{ color: 'var(--fp-text-muted)', fontFamily: 'var(--fp-font)' }}>
                  This step has no fields yet.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--fp-gap)' }}>
                <AnimatePresence initial={false}>
                  {stepFields.map((field) => {
                    const visible = visibility[field.id] ?? true;
                    const err = stepErrors[field.name] || ((touched[field.name]) ? errors[field.name] : '');
                    return (
                      <motion.div
                        key={field.id}
                        layout
                        initial={false}
                        animate={visible ? { opacity: 1, height: 'auto' } : { opacity: 0, height: 0 }}
                        transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                        style={{ overflow: 'hidden' }}
                      >
                        <PreviewInputField
                          field={field}
                          value={formValues[field.name] ?? ''}
                          error={err ?? ''}
                          onChange={(v) => onChange(field.name, v)}
                          onBlur={() => onBlur(field)}
                          showLabels={showLabels}
                        />
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation buttons */}
      {inputStepFields.length > 0 || steps.length > 1 ? (
        <div className={cn('flex gap-2 mt-2', isFirstStep || !allowBack ? 'justify-end' : 'justify-between')}>
          {!isFirstStep && allowBack && (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-1.5 px-4 font-semibold text-[0.875rem] transition-all duration-150 hover:opacity-80 active:scale-[0.98] border"
              style={{
                height: 'calc(var(--fp-input-h) + 4px)',
                borderRadius: 'var(--fp-radius)',
                borderColor: 'var(--fp-border)',
                color: 'var(--fp-text)',
                fontFamily: 'var(--fp-font)',
                background: 'var(--fp-surface)',
              }}
            >
              <ChevronLeft size={15} />
              {backLabel}
            </button>
          )}
          <button
            type="button"
            onClick={handleNext}
            className="flex items-center gap-1.5 px-4 font-semibold text-[0.875rem] transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
            style={{
              height: 'calc(var(--fp-input-h) + 4px)',
              background: 'var(--fp-primary)',
              color: '#fff',
              borderRadius: 'var(--fp-radius)',
              fontFamily: 'var(--fp-font)',
              flex: isFirstStep || !allowBack ? 1 : undefined,
            }}
          >
            {nextLabel}
            {!isLastStep && <ChevronRight size={15} />}
          </button>
        </div>
      ) : null}
    </div>
  );
}



interface SingleStepPreviewProps {
  brand: BrandConfig;
  showLabels: boolean;
  formValues: Record<string, unknown>;
  touched: Record<string, boolean>;
  errors: Record<string, string>;
  visibility: Record<string, boolean>;
  onChange: (name: string, value: unknown) => void;
  onBlur: (field: FieldSchema) => void;
  onSubmit: (e: React.FormEvent) => void;
  onReset: () => void;
}

function SingleStepFormPreview({
  brand, showLabels, formValues, touched, errors, visibility, onChange, onBlur, onSubmit, onReset,
}: SingleStepPreviewProps) {
  const fields = useAppSelector(selectAllFields);
  const schema = useAppSelector(selectFormSchema);
  const [submitted, setSubmitted] = useState(false);

  const inputFields = fields.filter((f) => !['heading', 'paragraph', 'divider', 'hidden'].includes(f.type));

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(e);
  }, [onSubmit]);

  if (submitted) return <SubmitSuccess onReset={() => { setSubmitted(false); onReset(); }} />;

  if (fields.length === 0) return <EmptyPreview />;

  return (
    <motion.form
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onSubmit={(e) => { handleSubmit(e); }}
      noValidate
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--fp-gap)' }}>
        <AnimatePresence initial={false}>
          {fields.map((field) => {
            const visible = visibility[field.id] ?? true;
            const err = (touched[field.name] && errors[field.name]) ? errors[field.name] : '';
            return (
              <motion.div key={field.id} layout initial={false} animate={visible ? { opacity: 1, height: 'auto' } : { opacity: 0, height: 0 }} transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }} style={{ overflow: 'hidden' }}>
                <PreviewInputField field={field} value={formValues[field.name] ?? ''} error={err} onChange={(v) => onChange(field.name, v)} onBlur={() => onBlur(field)} showLabels={showLabels} />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      {inputFields.length > 0 && (
        <button
          type="submit"
          className="mt-7 w-full font-semibold text-[0.875rem] transition-opacity duration-150 hover:opacity-90 active:opacity-80"
          style={{ height: 'calc(var(--fp-input-h) + 4px)', background: 'var(--fp-primary)', color: '#fff', borderRadius: 'var(--fp-radius)', fontFamily: 'var(--fp-font)' }}
        >
          Submit
        </button>
      )}
    </motion.form>
  );
}



export function FormPreview() {
  const fields   = useAppSelector(selectAllFields);
  const schema   = useAppSelector(selectFormSchema);
  const brand    = useAppSelector(selectBrandConfig);
  const formMode = useAppSelector(selectFormMode);
  const steps    = useAppSelector(selectSteps);

  const isMulti = formMode === 'multi' && steps.length > 0;

  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [touched,    setTouched]    = useState<Record<string, boolean>>({});
  const [errors,     setErrors]     = useState<Record<string, string>>({});
  const [singleSubmitted, setSingleSubmitted] = useState(false);

  // Detect container width for responsive progress indicator
  const containerRef = useRef<HTMLDivElement>(null);
  const [isNarrow, setIsNarrow] = useState(false);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      setIsNarrow((entry.contentRect?.width ?? 400) < 420);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Re-initialise on field changes
  const prevFieldsRef = useRef(fields);
  useEffect(() => {
    if (prevFieldsRef.current !== fields) {
      setFormValues({});
      setTouched({});
      setErrors({});
      setSingleSubmitted(false);
      prevFieldsRef.current = fields;
    }
  }, [fields]);

  const visibility = useMemo(
    () => getCascadedVisibility(fields, formValues),
    [fields, formValues],
  );

  const handleChange = useCallback((name: string, value: unknown) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleBlur = useCallback((field: FieldSchema) => {
    setTouched((prev) => ({ ...prev, [field.name]: true }));
    const err = validateValue(formValues[field.name], field.validation);
    setErrors((prev) => ({ ...prev, [field.name]: err }));
  }, [formValues]);

  // For single-step submit — validates all visible fields
  const handleSingleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    const newTouched: Record<string, boolean> = {};
    let hasError = false;
    for (const field of fields) {
      if (!visibility[field.id]) continue;
      if (['heading', 'paragraph', 'divider', 'hidden'].includes(field.type)) continue;
      newTouched[field.name] = true;
      const err = validateValue(formValues[field.name], field.validation);
      newErrors[field.name] = err;
      if (err) hasError = true;
    }
    setTouched(newTouched);
    setErrors(newErrors);
    if (!hasError) setSingleSubmitted(true);
  }, [fields, formValues, visibility]);

  // For multi-step final submit — validates last step fields
  const handleMultiSubmit = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    let hasError = false;
    const lastStep = steps[steps.length - 1];
    if (!lastStep) return true;
    const lastStepFields = fields.filter((f) => f.stepId === lastStep.id);
    for (const field of lastStepFields) {
      if (!visibility[field.id]) continue;
      if (['heading', 'paragraph', 'divider', 'hidden'].includes(field.type)) continue;
      const err = validateValue(formValues[field.name], field.validation);
      if (err) { newErrors[field.name] = err; hasError = true; }
    }
    setErrors((prev) => ({ ...prev, ...newErrors }));
    return !hasError;
  }, [fields, steps, formValues, visibility]);

  const handleReset = useCallback(() => {
    setFormValues({});
    setTouched({});
    setErrors({});
    setSingleSubmitted(false);
  }, []);

  const brandVars = useMemo(() => brandToCSSVars(brand), [brand]);

  return (
    <div
      ref={containerRef}
      id="fp-form-preview"
      style={brandVars}
      className="w-full flex-1 min-h-0 rounded-[var(--fp-radius)] overflow-auto"
    >
      <div className="px-6 py-8 sm:px-8" style={{ background: 'var(--fp-bg)', minHeight: '100%' }}>

        {/* Form title + description */}
        {schema.title && (
          <div className="mb-7">
            <h1 className="text-[1.5rem] font-bold leading-tight tracking-tight" style={{ color: 'var(--fp-text)', fontFamily: 'var(--fp-font)' }}>
              {schema.title}
            </h1>
            {schema.description && (
              <p className="mt-1.5 text-[0.875rem] leading-relaxed" style={{ color: 'var(--fp-text-muted)', fontFamily: 'var(--fp-font)' }}>
                {schema.description}
              </p>
            )}
          </div>
        )}

        <AnimatePresence mode="wait">
          {isMulti ? (
            <motion.div key="multi" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <MultiStepFormPreview
                brand={brand}
                showLabels={brand.showLabels}
                formValues={formValues}
                touched={touched}
                errors={errors}
                visibility={visibility}
                onChange={handleChange}
                onBlur={handleBlur}
                onSubmit={handleMultiSubmit}
                onReset={handleReset}
                isNarrow={isNarrow}
              />
            </motion.div>
          ) : singleSubmitted ? (
            <SubmitSuccess key="success" onReset={handleReset} />
          ) : fields.length === 0 ? (
            <EmptyPreview key="empty" />
          ) : (
            <SingleStepFormPreview
              key="single"
              brand={brand}
              showLabels={brand.showLabels}
              formValues={formValues}
              touched={touched}
              errors={errors}
              visibility={visibility}
              onChange={handleChange}
              onBlur={handleBlur}
              onSubmit={handleSingleSubmit}
              onReset={handleReset}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
