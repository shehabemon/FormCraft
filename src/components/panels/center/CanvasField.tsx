'use client';

import {
  GripVertical, Copy, Trash2, Mail, Type, Hash, Phone, Link2, Lock,
  AlignLeft, ChevronsUpDown, ListChecks, CircleDot, CheckSquare,
  SquareStack, Calendar, Clock, Paperclip, SlidersHorizontal,
  Heading1, Pilcrow, Minus, EyeOff,
} from 'lucide-react';
import { nanoid } from 'nanoid';
import { cn } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectField } from '@/store/slices/uiSlice';
import { duplicateField, removeField } from '@/store/slices/formSlice';
import { selectSelectedFieldId } from '@/store/slices/uiSlice';
import { FIELD_META } from '@/lib/fieldRegistry';
import type { FieldSchema } from '@/types/form';


const ICON_MAP: Record<string, React.ElementType> = {
  Type, Hash, Mail, Phone, Link2, Lock, AlignLeft,
  ChevronsUpDown, ListChecks, CircleDot, CheckSquare, SquareStack,
  Calendar, Clock, Paperclip, SlidersHorizontal,
  Heading1, Pilcrow, Minus, EyeOff,
};


function FieldPreview({ field }: { field: FieldSchema }) {
  const { type, label, placeholder, options, content, headingLevel } = field;

  if (type === 'divider') {
    return <div className="w-full h-px bg-[var(--color-border)] my-1" />;
  }

  if (type === 'heading') {
    const Tag = `h${headingLevel}` as 'h1' | 'h2' | 'h3' | 'h4';
    const sizes: Record<number, string> = { 1: 'text-2xl', 2: 'text-xl', 3: 'text-lg', 4: 'text-base' };
    return (
      <Tag className={cn('font-display font-semibold text-[var(--color-text-primary)] tracking-tight', sizes[headingLevel])}>
        {content || label || 'Heading'}
      </Tag>
    );
  }

  if (type === 'paragraph') {
    return (
      <p className="font-sans text-[0.9375rem] text-[var(--color-text-secondary)] leading-relaxed">
        {content || 'Paragraph text'}
      </p>
    );
  }

  const labelEl = (
    <label className="block font-sans text-[0.8125rem] font-medium text-[var(--color-text-default)] mb-1.5">
      {label || FIELD_META[type].label}
    </label>
  );

  const inputMock = "w-full h-9 px-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white font-sans text-[0.875rem] text-[var(--color-text-placeholder)] pointer-events-none flex items-center";

  if (type === 'textarea') {
    return (
      <div>
        {labelEl}
        <div className="w-full h-20 px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white font-sans text-[0.875rem] text-[var(--color-text-placeholder)] pointer-events-none">
          {placeholder || 'Enter text…'}
        </div>
      </div>
    );
  }

  if (type === 'radio' || type === 'checkboxGroup') {
    const opts = options.length > 0
      ? options.slice(0, 3)
      : [{ id: '1', label: 'Option 1', value: 'opt1' }, { id: '2', label: 'Option 2', value: 'opt2' }];
    return (
      <div>
        {labelEl}
        <div className="space-y-1.5">
          {opts.map((opt) => (
            <div key={opt.id} className="flex items-center gap-2">
              <div className={cn('w-4 h-4 shrink-0 border border-[var(--color-border-strong)] bg-white', type === 'radio' ? 'rounded-full' : 'rounded-[3px]')} />
              <span className="font-sans text-[0.875rem] text-[var(--color-text-secondary)]">{opt.label}</span>
            </div>
          ))}
          {options.length > 3 && <p className="font-sans text-[0.75rem] text-[var(--color-text-muted)]">+{options.length - 3} more</p>}
        </div>
      </div>
    );
  }

  if (type === 'checkbox') {
    return (
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 shrink-0 rounded-[3px] border border-[var(--color-border-strong)] bg-white" />
        <span className="font-sans text-[0.9375rem] text-[var(--color-text-secondary)]">{label || 'Checkbox label'}</span>
      </div>
    );
  }

  if (type === 'range') {
    return (
      <div>
        {labelEl}
        <div className="relative h-5 flex items-center mt-1">
          <div className="w-full h-1.5 rounded-full bg-[var(--color-stone-200)]">
            <div className="w-2/5 h-full rounded-full bg-[var(--color-primary)]" />
          </div>
          <div className="absolute left-[40%] -translate-x-1/2 w-4 h-4 rounded-full border-2 border-[var(--color-primary)] bg-white shadow-sm" />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="font-sans text-[0.6875rem] text-[var(--color-text-muted)]">{field.min}</span>
          <span className="font-sans text-[0.6875rem] text-[var(--color-text-muted)]">{field.max}</span>
        </div>
      </div>
    );
  }

  if (type === 'hidden') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] bg-[var(--color-stone-100)] border border-dashed border-[var(--color-border-strong)]">
        <EyeOff size={13} className="text-[var(--color-text-muted)]" />
        <span className="font-mono text-[0.75rem] text-[var(--color-text-muted)]">hidden: {field.name || 'field'}</span>
      </div>
    );
  }

  return (
    <div>
      {labelEl}
      <div className={inputMock}>{placeholder || FIELD_META[type].description}</div>
    </div>
  );
}


export function CanvasField({ field }: { field: FieldSchema }) {
  const dispatch = useAppDispatch();
  const selectedId = useAppSelector(selectSelectedFieldId);
  const isSelected = selectedId === field.id;

  return (
    <div
      onClick={() => dispatch(selectField(isSelected ? null : field.id))}
      className={cn(
        'group relative bg-white border rounded-[var(--radius-md)] px-4 py-3.5',
        'cursor-pointer transition-all duration-150',
        isSelected
          ? 'border-[var(--color-primary)] shadow-[var(--shadow-card-hover)] ring-1 ring-[var(--color-primary)]/20'
          : 'border-[var(--color-border)] shadow-[var(--shadow-xs)] hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-sm)]'
      )}
    >
      {/* Selected left accent bar */}
      {isSelected && (
        <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-r-full bg-[var(--color-primary)]" />
      )}

      {/* Drag handle (shown by Reorder.Item — just visual affordance) */}
      <div
        className="absolute left-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-60 transition-opacity duration-150 text-[var(--color-stone-400)] cursor-grab active:cursor-grabbing z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical size={14} />
      </div>

      {/* Field content */}
      <div className="pl-1">
        <FieldPreview field={field} />
      </div>

      {/* Action buttons */}
      <div
        className={cn(
          'absolute right-2 top-2 flex items-center gap-0.5',
          'opacity-0 group-hover:opacity-100 transition-opacity duration-150',
          isSelected && 'opacity-100'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => dispatch(duplicateField({ id: field.id, newId: nanoid(), newName: `${field.name}Copy` }))}
          className="flex items-center justify-center w-6 h-6 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:bg-[var(--color-stone-100)] hover:text-[var(--color-text-secondary)] transition-colors duration-150"
          title="Duplicate"
        >
          <Copy size={12} />
        </button>
        <button
          onClick={() => dispatch(removeField(field.id))}
          className="flex items-center justify-center w-6 h-6 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:bg-[#FFF1F2] hover:text-[var(--color-error)] transition-colors duration-150"
          title="Delete"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Required asterisk */}
      {field.validation.some(r => r.enabled && r.type === 'required') && (
        <span className="absolute top-2 left-3.5 text-[var(--color-error)] text-xs leading-none" title="Required">*</span>
      )}
    </div>
  );
}
