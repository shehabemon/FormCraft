'use client';

import { useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { spring, springSnappy } from '@/lib/motion';
import { nanoid } from 'nanoid';
import { Plus, X, GitBranch, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { selectAllFields, selectFieldById, updateField } from '@/store/slices/formSlice';
import { selectSelectedFieldId } from '@/store/slices/uiSlice';
import { FIELD_META } from '@/lib/fieldRegistry';
import {
  detectCircularReferences,
  OPERATOR_META,
  OPERATORS_BY_TYPE,
} from '@/lib/conditionalEngine';
import type { FieldSchema } from '@/types/form';
import type { ConditionalOperator, ConditionalRule, ConditionalAction, FieldConditional } from '@/types/form';


function PanelSelect({
  value,
  onChange,
  children,
  disabled = false,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          'w-full h-8 pl-2.5 pr-7 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-white',
          'font-sans text-[0.8125rem] text-[var(--color-text-default)] appearance-none cursor-pointer',
          'focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15',
          'transition-colors duration-150',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        {children}
      </select>
      <svg
        className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-muted)] pointer-events-none"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
}


function RuleValueInput({
  sourceField,
  value,
  operator,
  onChange,
}: {
  sourceField: FieldSchema | undefined;
  value: string | number | boolean;
  operator: ConditionalOperator;
  onChange: (v: string | number | boolean) => void;
}) {
  const noValueOps: ConditionalOperator[] = ['isEmpty', 'isNotEmpty'];
  if (noValueOps.includes(operator)) {
    return (
      <div className="h-8 px-2.5 rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] bg-[var(--color-stone-50)] flex items-center">
        <span className="font-sans text-[0.75rem] text-[var(--color-text-muted)] italic">no value needed</span>
      </div>
    );
  }

  if (!sourceField) {
    return (
      <input
        disabled
        placeholder="Select a field first"
        className="w-full h-8 px-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-stone-50)] font-sans text-[0.8125rem] text-[var(--color-text-placeholder)] opacity-60"
      />
    );
  }

  // Select / radio / multiselect / checkboxGroup → options dropdown
  if (['select', 'radio', 'multiselect', 'checkboxGroup'].includes(sourceField.type)) {
    const opts = sourceField.options;
    if (opts.length > 0) {
      return (
        <PanelSelect value={String(value)} onChange={onChange}>
          <option value="">— choose —</option>
          {opts.map((o) => (
            <option key={o.id} value={o.value}>{o.label}</option>
          ))}
        </PanelSelect>
      );
    }
  }

  // Checkbox → true / false
  if (sourceField.type === 'checkbox') {
    return (
      <PanelSelect value={String(value)} onChange={(v) => onChange(v === 'true')}>
        <option value="true">Checked</option>
        <option value="false">Unchecked</option>
      </PanelSelect>
    );
  }

  // Number / range → numeric input
  if (['number', 'range'].includes(sourceField.type)) {
    return (
      <input
        type="number"
        value={value as number}
        onChange={(e) => onChange(+e.target.value)}
        className={cn(
          'w-full h-8 px-2.5 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-white',
          'font-sans text-[0.8125rem] text-[var(--color-text-default)]',
          'focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15',
          'transition-colors duration-150',
        )}
      />
    );
  }

  // Default: text input
  return (
    <input
      type="text"
      value={String(value)}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Value…"
      className={cn(
        'w-full h-8 px-2.5 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-white',
        'font-sans text-[0.8125rem] text-[var(--color-text-default)] placeholder:text-[var(--color-text-placeholder)]',
        'focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15',
        'transition-colors duration-150',
      )}
    />
  );
}


function RuleRow({
  rule,
  index,
  availableFields,
  allFields,
  onUpdate,
  onRemove,
}: {
  rule: ConditionalRule;
  index: number;
  availableFields: FieldSchema[];  // fields before target in order
  allFields: FieldSchema[];
  onUpdate: (r: ConditionalRule) => void;
  onRemove: () => void;
}) {
  const sourceField = allFields.find((f) => f.id === rule.sourceFieldId);
  const validOperators = sourceField
    ? OPERATORS_BY_TYPE[sourceField.type].map((op) => OPERATOR_META.find((m) => m.value === op)!).filter(Boolean)
    : OPERATOR_META;

  const handleSourceChange = useCallback((id: string) => {
    const newSource = allFields.find((f) => f.id === id);
    const defaultOp = newSource ? OPERATORS_BY_TYPE[newSource.type][0] ?? 'equals' : 'equals';
    onUpdate({ ...rule, sourceFieldId: id, operator: defaultOp, value: '' });
  }, [allFields, rule, onUpdate]);

  const handleOperatorChange = useCallback((op: string) => {
    onUpdate({ ...rule, operator: op as ConditionalOperator, value: '' });
  }, [rule, onUpdate]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.97 }}
      transition={spring}
      className="flex flex-col gap-2 p-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-stone-50)]"
    >
      <div className="flex items-center justify-between">
        <span className="font-sans text-[0.68rem] font-semibold text-[var(--color-text-muted)] uppercase tracking-[0.06em]">
          Condition {index + 1}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="w-5 h-5 flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:bg-[#FFF1F2] hover:text-[var(--color-error)] transition-colors duration-100"
          aria-label="Remove condition"
        >
          <X size={11} />
        </button>
      </div>

      <PanelSelect value={rule.sourceFieldId} onChange={handleSourceChange}>
        <option value="">— select a field —</option>
        {availableFields.map((f) => (
          <option key={f.id} value={f.id}>
            {f.label || FIELD_META[f.type].label}
          </option>
        ))}
      </PanelSelect>

      <PanelSelect
        value={rule.operator}
        onChange={handleOperatorChange}
        disabled={!rule.sourceFieldId}
      >
        {validOperators.map((op) => (
          <option key={op.value} value={op.value}>{op.label}</option>
        ))}
      </PanelSelect>

      <RuleValueInput
        sourceField={sourceField}
        value={rule.value}
        operator={rule.operator}
        onChange={(v) => onUpdate({ ...rule, value: v })}
      />
    </motion.div>
  );
}


function CycleWarning({ cycles, allFields }: { cycles: string[][]; allFields: FieldSchema[] }) {
  if (cycles.length === 0) return null;

  const label = (id: string) => {
    const f = allFields.find((x) => x.id === id);
    return f ? (f.label || FIELD_META[f.type].label) : id.slice(0, 8);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="flex gap-2.5 p-3 rounded-[var(--radius-md)] bg-[#FFF7ED] border border-[#F97316]/30"
    >
      <AlertTriangle size={14} className="text-[#F97316] shrink-0 mt-0.5" />
      <div className="flex flex-col gap-1">
        <p className="font-sans text-[0.78rem] font-semibold text-[#9A3412]">
          Circular reference detected
        </p>
        {cycles.map((cycle, i) => (
          <p key={i} className="font-sans text-[0.75rem] text-[#C2410C] leading-snug">
            {cycle.slice(0, -1).map((id) => label(id)).join(' → ')} loops back
          </p>
        ))}
        <p className="font-sans text-[0.72rem] text-[#9A3412] opacity-80 mt-0.5">
          These rules will be skipped at render time to prevent infinite loops.
        </p>
      </div>
    </motion.div>
  );
}


const ACTION_OPTIONS: { value: ConditionalAction; label: string }[] = [
  { value: 'show',    label: 'Show this field' },
  { value: 'hide',    label: 'Hide this field' },
  { value: 'require', label: 'Require this field' },
];

function LogicHeader({
  conditional,
  onUpdate,
}: {
  conditional: FieldConditional;
  onUpdate: (patch: Partial<FieldConditional>) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <PanelSelect
        value={conditional.action}
        onChange={(v) => onUpdate({ action: v as ConditionalAction })}
      >
        {ACTION_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </PanelSelect>

      {conditional.rules.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="font-sans text-[0.78rem] text-[var(--color-text-muted)] shrink-0">when</span>
          <div className="flex p-0.5 rounded-[var(--radius-md)] bg-[var(--color-stone-100)] border border-[var(--color-border)]">
            {(['all', 'any'] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => onUpdate({ logic: opt })}
                className={cn(
                  'flex-1 h-6 px-3 rounded-[5px] font-sans text-[0.75rem] font-medium transition-all duration-100',
                  conditional.logic === opt
                    ? 'bg-white text-[var(--color-text-default)] shadow-[var(--shadow-xs)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
                )}
              >
                {opt === 'all' ? 'ALL conditions' : 'ANY condition'}
              </button>
            ))}
          </div>
          <span className="font-sans text-[0.78rem] text-[var(--color-text-muted)] shrink-0">are met</span>
        </div>
      )}
    </div>
  );
}


function LogicEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col items-center gap-3 py-6 px-2 text-center"
    >
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-[var(--radius-xl)] bg-[var(--color-primary-subtle)] border border-[var(--color-primary)]/20" />
        <div className="absolute inset-0 flex items-center justify-center">
          <GitBranch size={18} className="text-[var(--color-primary)]/60" />
        </div>
        <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[var(--color-stone-200)] border-2 border-white flex items-center justify-center">
          <div className="w-1 h-1 rounded-full bg-[var(--color-stone-400)]" />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <p className="font-sans text-[0.8125rem] font-medium text-[var(--color-text-secondary)]">
          Always visible
        </p>
        <p className="font-sans text-[0.75rem] text-[var(--color-text-muted)] leading-relaxed max-w-[200px]">
          This field always shows. Add a condition to make it appear only when certain criteria are met.
        </p>
      </div>
      <button
        type="button"
        onClick={onAdd}
        aria-label="Add conditional rule"
        className={cn(
          'flex items-center gap-1.5 h-8 px-3 rounded-[var(--radius-md)]',
          'bg-[var(--color-primary-subtle)] border border-[var(--color-primary)]/30',
          'font-sans text-[0.8125rem] font-medium text-[var(--color-primary)]',
          'hover:bg-[var(--color-primary)] hover:text-white transition-all duration-150',
        )}
      >
        <Plus size={13} />
        Add condition
      </button>
    </motion.div>
  );
}


function NoFieldSelected() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col items-center justify-center py-10 px-4 text-center gap-3"
    >
      <div className="relative w-12 h-12 flex items-center justify-center">
        <div className="absolute inset-0 rounded-[var(--radius-xl)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-stone-50)]" />
        <GitBranch size={18} className="relative text-[var(--color-text-muted)]" />
      </div>
      <div>
        <p className="font-sans text-[0.8125rem] font-medium text-[var(--color-text-secondary)] mb-0.5">
          No field selected
        </p>
        <p className="font-sans text-[0.75rem] text-[var(--color-text-muted)] leading-relaxed max-w-[200px]">
          Click a field on the canvas to configure conditional visibility rules.
        </p>
      </div>
    </motion.div>
  );
}


function FirstFieldNotice() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col items-center justify-center py-8 px-4 text-center gap-3"
    >
      <div className="w-11 h-11 rounded-[var(--radius-xl)] bg-[var(--color-stone-100)] border border-[var(--color-border)] flex items-center justify-center">
        <GitBranch size={16} className="text-[var(--color-text-muted)]" />
      </div>
      <div>
        <p className="font-sans text-[0.8125rem] font-medium text-[var(--color-text-secondary)] mb-0.5">
          No fields to reference
        </p>
        <p className="font-sans text-[0.75rem] text-[var(--color-text-muted)] leading-relaxed max-w-[200px]">
          Conditional rules can only reference fields that appear before this one.
        </p>
      </div>
    </motion.div>
  );
}


export function LogicPanel() {
  const dispatch   = useAppDispatch();
  const selectedId = useAppSelector(selectSelectedFieldId);
  const allFields  = useAppSelector(selectAllFields);
  const field      = useAppSelector((s) => selectedId ? selectFieldById(s, selectedId) : undefined);

  // Fields that appear before the selected field (valid sources for rules)
  const availableFields = useMemo(() => {
    if (!field) return [];
    const idx = allFields.findIndex((f) => f.id === field.id);
    return allFields
      .slice(0, idx)
      .filter((f) => !['heading', 'paragraph', 'divider'].includes(f.type));
  }, [field, allFields]);

  // Cycle detection runs on every render but is pure + cheap for typical form sizes
  const cycles = useMemo(() => detectCircularReferences(allFields), [allFields]);

  const patchConditional = useCallback((patch: Partial<FieldConditional>) => {
    if (!field) return;
    dispatch(updateField({
      id: field.id,
      changes: {
        conditional: { ...field.conditional, ...patch },
      },
    }));
  }, [dispatch, field]);

  const addRule = useCallback(() => {
    if (!field) return;
    const firstSource = availableFields[0];
    const defaultOp = firstSource ? OPERATORS_BY_TYPE[firstSource.type][0] ?? 'equals' : 'equals';
    const newRule: ConditionalRule = {
      id: nanoid(),
      sourceFieldId: firstSource?.id ?? '',
      operator: defaultOp,
      value: '',
    };
    const wasEnabled = field.conditional.enabled;
    patchConditional({
      enabled: true,
      rules: [...field.conditional.rules, newRule],
      // Set sensible defaults when enabling for the first time
      action: wasEnabled ? field.conditional.action : 'show',
      logic:  wasEnabled ? field.conditional.logic  : 'all',
    });
  }, [field, availableFields, patchConditional]);

  const updateRule = useCallback((updated: ConditionalRule) => {
    if (!field) return;
    patchConditional({
      rules: field.conditional.rules.map((r) => r.id === updated.id ? updated : r),
    });
  }, [field, patchConditional]);

  const removeRule = useCallback((id: string) => {
    if (!field) return;
    const nextRules = field.conditional.rules.filter((r) => r.id !== id);
    patchConditional({
      rules: nextRules,
      enabled: nextRules.length > 0,
    });
  }, [field, patchConditional]);


  if (!selectedId || !field) return <NoFieldSelected />;
  if (availableFields.length === 0 && field.conditional.rules.length === 0) return <FirstFieldNotice />;

  const { conditional } = field;
  const hasRules = conditional.rules.length > 0;

  // Filter cycles to only those involving the current field
  const fieldCycles = cycles.filter((c) => c.includes(field.id));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 px-2.5 py-2 rounded-[var(--radius-md)] bg-[var(--color-stone-100)] border border-[var(--color-border)]">
        <div className="w-5 h-5 rounded-[var(--radius-sm)] bg-[var(--color-primary-subtle)] flex items-center justify-center shrink-0">
          <GitBranch size={11} className="text-[var(--color-primary)]" />
        </div>
        <span className="font-sans text-[0.8125rem] font-medium text-[var(--color-text-secondary)] truncate">
          {field.label || FIELD_META[field.type].label}
        </span>
        {hasRules && (
          <span className={cn(
            'ml-auto shrink-0 font-sans text-[0.68rem] font-semibold px-1.5 py-0.5 rounded-full',
            conditional.enabled
              ? 'bg-[var(--color-primary-subtle)] text-[var(--color-primary)]'
              : 'bg-[var(--color-stone-200)] text-[var(--color-text-muted)]'
          )}>
            {conditional.rules.length} rule{conditional.rules.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <AnimatePresence>
        {fieldCycles.length > 0 && (
          <CycleWarning cycles={fieldCycles} allFields={allFields} />
        )}
      </AnimatePresence>

      {!hasRules && <LogicEmptyState onAdd={addRule} />}

      {hasRules && (
        <>
          <LogicHeader conditional={conditional} onUpdate={patchConditional} />

          <div className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {conditional.rules.map((rule, i) => (
                <RuleRow
                  key={rule.id}
                  rule={rule}
                  index={i}
                  availableFields={availableFields}
                  allFields={allFields}
                  onUpdate={updateRule}
                  onRemove={() => removeRule(rule.id)}
                />
              ))}
            </AnimatePresence>
          </div>

          <button
            type="button"
            onClick={addRule}
            disabled={availableFields.length === 0}
            className={cn(
              'flex items-center gap-1.5 h-8 px-3 rounded-[var(--radius-md)] w-full justify-center',
              'border border-dashed border-[var(--color-border-strong)]',
              'font-sans text-[0.78rem] text-[var(--color-text-muted)]',
              'hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-primary-subtle)]',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              'transition-all duration-150',
            )}
          >
            <Plus size={12} />
            Add condition
          </button>
        </>
      )}
    </div>
  );
}
