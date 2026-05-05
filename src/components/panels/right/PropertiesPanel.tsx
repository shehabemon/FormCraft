'use client';

import { useState, useCallback, useEffect } from 'react';
import { nanoid } from 'nanoid';
import { Plus, X, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { selectFieldById, updateField, setFormMeta, selectFormMeta } from '@/store/slices/formSlice';
import { selectSelectedFieldId } from '@/store/slices/uiSlice';
import { FIELD_META } from '@/lib/fieldRegistry';
import { useDebounce } from '@/hooks/useDebounce';
import {
  FieldRow, PanelInput, PanelTextarea, PanelSection, Toggle,
  Accordion, EmptyPanelState,
} from './Shared';
import type { FieldSchema, FieldOption, FieldType } from '@/types/form';
import type { ValidationRule, ValidationType } from '@/types/form';


const CHOICE_TYPES = new Set<FieldType>(['select', 'multiselect', 'radio', 'checkboxGroup']);
const LAYOUT_TYPES = new Set<FieldType>(['heading', 'paragraph', 'divider']);
const NO_LABEL_TYPES = new Set<FieldType>(['heading', 'paragraph', 'divider', 'hidden']);

const VALIDATION_TYPE_OPTIONS: { value: ValidationType; label: string; hasValue: boolean }[] = [
  { value: 'required',   label: 'Required',       hasValue: false },
  { value: 'minLength',  label: 'Min length',      hasValue: true  },
  { value: 'maxLength',  label: 'Max length',      hasValue: true  },
  { value: 'min',        label: 'Min value',       hasValue: true  },
  { value: 'max',        label: 'Max value',       hasValue: true  },
  { value: 'pattern',    label: 'Regex pattern',   hasValue: true  },
  { value: 'email',      label: 'Email format',    hasValue: false },
  { value: 'url',        label: 'URL format',      hasValue: false },
];

const FILE_ACCEPT_OPTIONS = [
  { value: 'image/*',       label: 'Images' },
  { value: 'application/pdf', label: 'PDF' },
  { value: '.doc,.docx',    label: 'Word' },
  { value: 'video/*',       label: 'Video' },
  { value: 'audio/*',       label: 'Audio' },
  { value: '.csv,.xlsx',    label: 'Spreadsheet' },
];


function OptionChip({
  option,
  index,
  total,
  onLabelChange,
  onRemove,
  onMove,
}: {
  option: FieldOption;
  index: number;
  total: number;
  onLabelChange: (label: string) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 group/chip">
      <div className="flex flex-col gap-px opacity-0 group-hover/chip:opacity-60 transition-opacity">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => onMove(-1)}
          className="w-3 h-3 flex items-center justify-center text-[var(--color-stone-400)] disabled:opacity-20 hover:text-[var(--color-text-secondary)] transition-colors"
        >
          <ChevronUp size={10} />
        </button>
        <button
          type="button"
          disabled={index === total - 1}
          onClick={() => onMove(1)}
          className="w-3 h-3 flex items-center justify-center text-[var(--color-stone-400)] disabled:opacity-20 hover:text-[var(--color-text-secondary)] transition-colors"
        >
          <ChevronDown size={10} />
        </button>
      </div>

      <input
        value={option.label}
        onChange={(e) => onLabelChange(e.target.value)}
        placeholder={`Option ${index + 1}`}
        className={cn(
          'flex-1 min-w-0 h-7 px-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white',
          'font-sans text-[0.8125rem] text-[var(--color-text-default)] placeholder:text-[var(--color-text-placeholder)]',
          'focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/20',
          'transition-colors duration-100'
        )}
      />

      <button
        type="button"
        onClick={onRemove}
        disabled={total <= 1}
        className="w-5 h-5 flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:bg-[#FFF1F2] hover:text-[var(--color-error)] disabled:opacity-20 transition-colors duration-100"
      >
        <X size={11} />
      </button>
    </div>
  );
}

function OptionsEditor({ field, onPatch }: { field: FieldSchema; onPatch: (changes: Partial<FieldSchema>) => void }) {
  const updateOptions = useCallback((newOptions: FieldOption[]) => {
    onPatch({ options: newOptions });
  }, [onPatch]);

  const addOption = useCallback(() => {
    const id = nanoid();
    const label = `Option ${field.options.length + 1}`;
    updateOptions([...field.options, { id, label, value: label.toLowerCase().replace(/\s+/g, '_') }]);
  }, [field.options, updateOptions]);

  const removeOption = useCallback((id: string) => {
    updateOptions(field.options.filter((o) => o.id !== id));
  }, [field.options, updateOptions]);

  const changeLabel = useCallback((id: string, label: string) => {
    updateOptions(field.options.map((o) =>
      o.id === id ? { ...o, label, value: label.toLowerCase().replace(/\s+/g, '_') } : o
    ));
  }, [field.options, updateOptions]);

  const moveOption = useCallback((index: number, dir: -1 | 1) => {
    const next = [...field.options];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    updateOptions(next);
  }, [field.options, updateOptions]);

  return (
    <div className="flex flex-col gap-1.5">
      {field.options.map((opt, i) => (
        <OptionChip
          key={opt.id}
          option={opt}
          index={i}
          total={field.options.length}
          onLabelChange={(label) => changeLabel(opt.id, label)}
          onRemove={() => removeOption(opt.id)}
          onMove={(dir) => moveOption(i, dir)}
        />
      ))}
      <button
        type="button"
        onClick={addOption}
        className={cn(
          'flex items-center gap-1.5 h-7 px-2 rounded-[var(--radius-sm)] w-full justify-center mt-0.5',
          'border border-dashed border-[var(--color-border-strong)]',
          'font-sans text-[0.75rem] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-primary-subtle)]',
          'transition-all duration-150'
        )}
      >
        <Plus size={11} />
        Add option
      </button>
    </div>
  );
}


function ValidationRuleRow({
  rule,
  onChange,
  onRemove,
}: {
  rule: ValidationRule;
  onChange: (updated: ValidationRule) => void;
  onRemove: () => void;
}) {
  const typeMeta = VALIDATION_TYPE_OPTIONS.find((t) => t.value === rule.type);

  return (
    <div className={cn(
      'flex flex-col gap-2 p-2.5 rounded-[var(--radius-md)] border transition-colors',
      rule.enabled
        ? 'border-[var(--color-border)] bg-[var(--color-stone-50)]'
        : 'border-dashed border-[var(--color-border)] bg-white opacity-60'
    )}>
      <div className="flex items-center gap-1.5">
        <select
          value={rule.type}
          onChange={(e) => onChange({ ...rule, type: e.target.value as ValidationType })}
          className={cn(
            'flex-1 min-w-0 h-7 px-2 rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] bg-white',
            'font-sans text-[0.75rem] text-[var(--color-text-default)]',
            'focus:outline-none focus:border-[var(--color-primary)]',
            'appearance-none cursor-pointer'
          )}
        >
          {VALIDATION_TYPE_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => onChange({ ...rule, enabled: !rule.enabled })}
          title={rule.enabled ? 'Disable rule' : 'Enable rule'}
          className={cn(
            'w-6 h-6 flex items-center justify-center rounded-[var(--radius-sm)] shrink-0 transition-colors duration-100',
            rule.enabled
              ? 'bg-[var(--color-primary-subtle)] text-[var(--color-primary)]'
              : 'bg-[var(--color-stone-100)] text-[var(--color-text-muted)]'
          )}
        >
          <div className={cn('w-2 h-2 rounded-full', rule.enabled ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-stone-300)]')} />
        </button>

        <button
          type="button"
          onClick={onRemove}
          className="w-6 h-6 flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:bg-[#FFF1F2] hover:text-[var(--color-error)] shrink-0 transition-colors duration-100"
        >
          <X size={11} />
        </button>
      </div>

      {typeMeta?.hasValue && (
        <input
          value={String(rule.value)}
          onChange={(e) => onChange({ ...rule, value: rule.type === 'pattern' ? e.target.value : Number(e.target.value) })}
          type={rule.type === 'pattern' ? 'text' : 'number'}
          placeholder={rule.type === 'pattern' ? 'e.g. ^[a-zA-Z]+$' : 'Value'}
          className={cn(
            'w-full h-7 px-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white',
            'font-sans text-[0.8125rem] text-[var(--color-text-default)] placeholder:text-[var(--color-text-placeholder)]',
            'focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/20',
            rule.type === 'pattern' && 'font-mono text-[0.75rem]'
          )}
        />
      )}

      <input
        value={rule.message}
        onChange={(e) => onChange({ ...rule, message: e.target.value })}
        placeholder="Custom error message (optional)"
        className={cn(
          'w-full h-7 px-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white',
          'font-sans text-[0.75rem] text-[var(--color-text-default)] placeholder:text-[var(--color-text-placeholder)]',
          'focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/20'
        )}
      />
    </div>
  );
}

function ValidationSection({ field, onPatch }: { field: FieldSchema; onPatch: (c: Partial<FieldSchema>) => void }) {
  const addRule = useCallback(() => {
    const newRule: ValidationRule = {
      id: nanoid(),
      type: 'required',
      value: '',
      message: 'This field is required',
      enabled: true,
    };
    onPatch({ validation: [...field.validation, newRule] });
  }, [field.validation, onPatch]);

  const updateRule = useCallback((updated: ValidationRule) => {
    onPatch({ validation: field.validation.map((r) => r.id === updated.id ? updated : r) });
  }, [field.validation, onPatch]);

  const removeRule = useCallback((id: string) => {
    onPatch({ validation: field.validation.filter((r) => r.id !== id) });
  }, [field.validation, onPatch]);

  return (
    <Accordion title="Validation" defaultOpen={field.validation.length > 0} badge={field.validation.filter(r => r.enabled).length}>
      <div className="flex flex-col gap-2">
        {field.validation.map((rule) => (
          <ValidationRuleRow
            key={rule.id}
            rule={rule}
            onChange={updateRule}
            onRemove={() => removeRule(rule.id)}
          />
        ))}
        <button
          type="button"
          onClick={addRule}
          className={cn(
            'flex items-center gap-1.5 h-7 px-2 rounded-[var(--radius-sm)] w-full justify-center',
            'border border-dashed border-[var(--color-border-strong)]',
            'font-sans text-[0.75rem] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-primary-subtle)]',
            'transition-all duration-150'
          )}
        >
          <Plus size={11} />
          Add rule
        </button>
      </div>
    </Accordion>
  );
}


function FileAcceptPicker({
  accept,
  onChange,
}: {
  accept: string;
  onChange: (v: string) => void;
}) {
  const selected = accept
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const toggle = (val: string) => {
    const next = selected.includes(val)
      ? selected.filter((v) => v !== val)
      : [...selected, val];
    onChange(next.join(','));
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {FILE_ACCEPT_OPTIONS.map((opt) => {
        const active = selected.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className={cn(
              'px-2 py-0.5 rounded-full font-sans text-[0.72rem] font-medium transition-all duration-100 border',
              active
                ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                : 'bg-white text-[var(--color-text-muted)] border-[var(--color-border-strong)] hover:border-[var(--color-primary)]/50 hover:text-[var(--color-primary)]'
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}


function FormSettingsPanel() {
  const dispatch = useAppDispatch();
  const meta = useAppSelector(selectFormMeta);

  const [localTitle, setLocalTitle] = useState(meta.title);
  const [localDesc, setLocalDesc] = useState(meta.description);

  useEffect(() => { setLocalTitle(meta.title); }, [meta.title]);
  useEffect(() => { setLocalDesc(meta.description); }, [meta.description]);

  const commitTitle = useCallback(() => {
    dispatch(setFormMeta({ title: localTitle }));
  }, [dispatch, localTitle]);

  const commitDesc = useCallback(() => {
    dispatch(setFormMeta({ description: localDesc }));
  }, [dispatch, localDesc]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 px-2.5 py-2 rounded-[var(--radius-md)] bg-[var(--color-stone-100)] border border-[var(--color-border)]">
        <div className="w-5 h-5 rounded-[var(--radius-sm)] bg-[var(--color-primary-subtle)] flex items-center justify-center shrink-0">
          <svg className="w-3 h-3 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <span className="font-sans text-[0.8125rem] font-medium text-[var(--color-text-secondary)]">Form Settings</span>
      </div>

      <PanelSection label="General">
        <FieldRow label="Title">
          <PanelInput
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => e.key === 'Enter' && commitTitle()}
            placeholder="Form title"
          />
        </FieldRow>

        <FieldRow label="Description">
          <PanelTextarea
            value={localDesc}
            onChange={(e) => setLocalDesc(e.target.value)}
            onBlur={commitDesc}
            rows={3}
            placeholder="Optional description shown beneath the title"
          />
        </FieldRow>
      </PanelSection>
    </div>
  );
}


function FieldPropertiesPanel({ fieldId }: { fieldId: string }) {
  const dispatch = useAppDispatch();
  const field = useAppSelector((s) => selectFieldById(s, fieldId));

  if (!field) return <EmptyPanelState message="Field not found" />;

  const meta = FIELD_META[field.type];
  const isLayout = LAYOUT_TYPES.has(field.type);
  const isChoice = CHOICE_TYPES.has(field.type);
  const isInput = !isLayout;

  const patch = useCallback(
    (changes: Partial<FieldSchema>) => dispatch(updateField({ id: fieldId, changes })),
    [dispatch, fieldId]
  );

  // Local state for debounced text fields
  const [localLabel, setLocalLabel] = useState(field.label);
  const [localPlaceholder, setLocalPlaceholder] = useState(field.placeholder);
  const [localHelper, setLocalHelper] = useState(field.helperText);
  const [localContent, setLocalContent] = useState(field.content);
  const [localName, setLocalName] = useState(field.name);

  // Sync when field selection changes
  useEffect(() => {
    setLocalLabel(field.label);
    setLocalPlaceholder(field.placeholder);
    setLocalHelper(field.helperText);
    setLocalContent(field.content);
    setLocalName(field.name);
  }, [fieldId, field.label, field.placeholder, field.helperText, field.content, field.name]);

  const debouncedPatch = useDebounce((changes: Partial<FieldSchema>) => patch(changes), 300);

  const isRequired = field.validation.some((r) => r.type === 'required' && r.enabled);

  const toggleRequired = useCallback(() => {
    if (isRequired) {
      patch({ validation: field.validation.filter((r) => r.type !== 'required') });
    } else {
      patch({
        validation: [
          ...field.validation,
          { id: nanoid(), type: 'required' as const, value: '', message: 'This field is required', enabled: true },
        ],
      });
    }
  }, [isRequired, field.validation, patch]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 px-2.5 py-2 rounded-[var(--radius-md)] bg-[var(--color-stone-100)] border border-[var(--color-border)]">
        <div className="w-5 h-5 rounded-[var(--radius-sm)] bg-[var(--color-primary-subtle)] flex items-center justify-center shrink-0">
          <span className="text-[var(--color-primary)] text-[8px] font-bold uppercase">{field.type.slice(0, 2)}</span>
        </div>
        <span className="font-sans text-[0.8125rem] font-medium text-[var(--color-text-secondary)]">{meta.label}</span>
        <span className="ml-auto font-mono text-[0.68rem] text-[var(--color-text-muted)]">{field.id.slice(0, 8)}</span>
      </div>

      {(field.type === 'heading' || field.type === 'paragraph') && (
        <PanelSection label="Content">
          {field.type === 'heading' && (
            <FieldRow label="Heading Level">
              <div className="flex gap-1">
                {([1, 2, 3, 4] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => patch({ headingLevel: l })}
                    className={cn(
                      'flex-1 h-7 rounded-[var(--radius-sm)] font-display text-[0.8125rem] font-semibold transition-all duration-100',
                      field.headingLevel === l
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'bg-[var(--color-stone-100)] text-[var(--color-text-secondary)] hover:bg-[var(--color-stone-150)] border border-[var(--color-border)]'
                    )}
                  >
                    H{l}
                  </button>
                ))}
              </div>
            </FieldRow>
          )}
          <FieldRow label="Text">
            <PanelTextarea
              value={localContent}
              rows={field.type === 'paragraph' ? 4 : 2}
              onChange={(e) => {
                setLocalContent(e.target.value);
                debouncedPatch({ content: e.target.value });
              }}
              placeholder={field.type === 'heading' ? 'Section heading' : 'Paragraph text'}
            />
          </FieldRow>
        </PanelSection>
      )}

      {!NO_LABEL_TYPES.has(field.type) && (
        <PanelSection label="Field">
          <FieldRow label="Label">
            <PanelInput
              value={localLabel}
              onChange={(e) => {
                setLocalLabel(e.target.value);
                debouncedPatch({ label: e.target.value });
              }}
              placeholder="Field label"
            />
          </FieldRow>

          <FieldRow label="Field Name" hint="Used as the key in form submission data">
            <PanelInput
              mono
              value={localName}
              onChange={(e) => {
                setLocalName(e.target.value);
                debouncedPatch({ name: e.target.value });
              }}
              placeholder="fieldName"
            />
          </FieldRow>

          {!['checkbox', 'radio', 'checkboxGroup', 'date', 'time', 'file', 'range'].includes(field.type) && (
            <FieldRow label="Placeholder">
              <PanelInput
                value={localPlaceholder}
                onChange={(e) => {
                  setLocalPlaceholder(e.target.value);
                  debouncedPatch({ placeholder: e.target.value });
                }}
                placeholder="Placeholder text"
              />
            </FieldRow>
          )}

          <FieldRow label="Helper Text">
            <PanelInput
              value={localHelper}
              onChange={(e) => {
                setLocalHelper(e.target.value);
                debouncedPatch({ helperText: e.target.value });
              }}
              placeholder="Guidance for users"
            />
          </FieldRow>
        </PanelSection>
      )}

      {isChoice && (
        <PanelSection label="Options">
          <OptionsEditor field={field} onPatch={patch} />
        </PanelSection>
      )}

      {(field.type === 'number' || field.type === 'range') && (
        <PanelSection label="Bounds">
          <div className="grid grid-cols-3 gap-2">
            <FieldRow label="Min">
              <PanelInput
                type="number"
                value={field.min}
                onChange={(e) => patch({ min: +e.target.value })}
              />
            </FieldRow>
            <FieldRow label="Max">
              <PanelInput
                type="number"
                value={field.max}
                onChange={(e) => patch({ max: +e.target.value })}
              />
            </FieldRow>
            <FieldRow label="Step">
              <PanelInput
                type="number"
                value={field.step}
                onChange={(e) => patch({ step: +e.target.value })}
              />
            </FieldRow>
          </div>
        </PanelSection>
      )}

      {field.type === 'file' && (
        <PanelSection label="File Constraints">
          <FieldRow label="Accepted Types">
            <FileAcceptPicker
              accept={field.accept}
              onChange={(v) => patch({ accept: v })}
            />
            <PanelInput
              value={field.accept}
              onChange={(e) => patch({ accept: e.target.value })}
              placeholder=".pdf,.jpg (custom)"
              className="mt-1.5 font-mono text-[0.72rem]"
            />
          </FieldRow>
          <FieldRow label="Max File Size (MB)">
            <PanelInput
              type="number"
              min={0}
              value={field.maxFileSize === 0 ? '' : field.maxFileSize / 1_000_000}
              onChange={(e) => patch({ maxFileSize: +e.target.value * 1_000_000 })}
              placeholder="No limit"
            />
          </FieldRow>
        </PanelSection>
      )}

      {isInput && !['hidden'].includes(field.type) && (
        <div className="border-t border-[var(--color-border)] pt-3">
          <Toggle
            checked={isRequired}
            onChange={toggleRequired}
            label="Required"
            description="Must be filled before submit"
          />
        </div>
      )}

      {isInput && !['hidden', 'divider', 'heading', 'paragraph', 'checkbox'].includes(field.type) && (
        <div className="border-t border-[var(--color-border)] pt-3">
          <ValidationSection field={field} onPatch={patch} />
        </div>
      )}
    </div>
  );
}


export function PropertiesPanel() {
  const selectedId = useAppSelector(selectSelectedFieldId);

  if (selectedId) {
    return <FieldPropertiesPanel fieldId={selectedId} />;
  }
  return <FormSettingsPanel />;
}
