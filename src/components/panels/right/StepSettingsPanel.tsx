'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import {
  selectStepById,
  selectSteps,
  updateStep,
  updateFormSettings,
  selectFormSettings,
} from '@/store/slices/formSlice';
import { selectActiveStepId } from '@/store/slices/uiSlice';
import type { StepIndicatorStyle } from '@/types/form';
import { FieldRow, PanelInput, PanelTextarea, PanelSection, Toggle } from './Shared';
import { useDebounce } from '@/hooks/useDebounce';



function DotsPreview({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-150"
          style={{
            width:  i === current ? 16 : 6,
            height: 6,
            background: i <= current ? 'var(--color-primary)' : 'var(--color-stone-300)',
            opacity: i === current ? 1 : i < current ? 0.6 : 0.35,
          }}
        />
      ))}
    </div>
  );
}

function NumberedPreview({ total, current }: { total: number; current: number }) {
  return (
    <span className="font-sans text-[0.65rem] font-semibold text-[var(--color-text-secondary)]">
      Step {current + 1} of {total}
    </span>
  );
}

function LabelledPreview({ labels, current }: { labels: string[]; current: number }) {
  const visible = labels.slice(0, 3);
  return (
    <div className="flex items-center gap-0.5 overflow-hidden">
      {visible.map((label, i) => (
        <div key={i} className="flex items-center gap-0.5 min-w-0">
          <div
            className="flex items-center justify-center w-3 h-3 rounded-full shrink-0"
            style={{ background: i <= current ? 'var(--color-primary)' : 'var(--color-stone-300)' }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-white/70" />
          </div>
          <span
            className="font-sans text-[0.55rem] font-medium max-w-[28px] truncate"
            style={{ color: i === current ? 'var(--color-primary)' : 'var(--color-text-muted)' }}
          >
            {label}
          </span>
          {i < visible.length - 1 && (
            <div className="w-3 h-px bg-[var(--color-border-strong)]" />
          )}
        </div>
      ))}
    </div>
  );
}

function BarPreview({ total, current }: { total: number; current: number }) {
  const pct = Math.round(((current + 1) / total) * 100);
  return (
    <div className="w-full h-1.5 rounded-full bg-[var(--color-stone-200)] overflow-hidden">
      <div
        className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

const INDICATOR_OPTIONS: { value: StepIndicatorStyle; label: string }[] = [
  { value: 'dots',     label: 'Dots'     },
  { value: 'numbered', label: 'Number'   },
  { value: 'labelled', label: 'Labelled' },
  { value: 'bar',      label: 'Bar'      },
];

interface IndicatorCardProps {
  variant: StepIndicatorStyle;
  label: string;
  isActive: boolean;
  total: number;
  current: number;
  stepLabels: string[];
  onClick: () => void;
}

function IndicatorCard({ variant, label, isActive, total, current, stepLabels, onClick }: IndicatorCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex flex-col items-start gap-2 w-full px-2.5 py-2 rounded-[var(--radius-md)] border text-left',
        'transition-all duration-150',
        isActive
          ? 'border-[var(--color-primary)] bg-[var(--color-primary-subtle)] shadow-[0_0_0_1px_var(--color-primary)]'
          : 'border-[var(--color-border)] bg-[var(--color-stone-50)] hover:border-[var(--color-border-strong)]',
      ].join(' ')}
    >
      <span className={`font-sans text-[0.68rem] font-semibold uppercase tracking-wide ${isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`}>
        {label}
      </span>
      <div className="w-full">
        {variant === 'dots'     && <DotsPreview    total={total}  current={current} />}
        {variant === 'numbered' && <NumberedPreview total={total} current={current} />}
        {variant === 'labelled' && <LabelledPreview labels={stepLabels} current={current} />}
        {variant === 'bar'      && <BarPreview      total={total}  current={current} />}
      </div>
    </button>
  );
}



export function StepSettingsPanel() {
  const dispatch     = useAppDispatch();
  const activeStepId = useAppSelector(selectActiveStepId);
  const steps        = useAppSelector(selectSteps);
  const settings     = useAppSelector(selectFormSettings);

  const step = useAppSelector((state) =>
    activeStepId ? selectStepById(state, activeStepId) : undefined
  );

  const [title,       setTitle]       = useState(step?.title ?? '');
  const [description, setDescription] = useState(step?.description ?? '');
  const [nextLabel,   setNextLabel]   = useState(step?.nextLabel ?? '');
  const [backLabel,   setBackLabel]   = useState(step?.backLabel ?? '');
  const [allowBack,   setAllowBack]   = useState(step?.allowBack ?? true);

  // Reset local state when the selected step changes
  useEffect(() => {
    setTitle(step?.title ?? '');
    setDescription(step?.description ?? '');
    setNextLabel(step?.nextLabel ?? '');
    setBackLabel(step?.backLabel ?? '');
    setAllowBack(step?.allowBack ?? true);
  }, [step?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced dispatch helpers
  const dispatchTitle = useDebounce(
    useCallback((v: string) => {
      if (activeStepId) dispatch(updateStep({ id: activeStepId, changes: { title: v } }));
    }, [activeStepId, dispatch]),
    300,
  );

  const dispatchDescription = useDebounce(
    useCallback((v: string) => {
      if (activeStepId) dispatch(updateStep({ id: activeStepId, changes: { description: v } }));
    }, [activeStepId, dispatch]),
    300,
  );

  const dispatchNextLabel = useDebounce(
    useCallback((v: string) => {
      if (activeStepId) dispatch(updateStep({ id: activeStepId, changes: { nextLabel: v } }));
    }, [activeStepId, dispatch]),
    300,
  );

  const dispatchBackLabel = useDebounce(
    useCallback((v: string) => {
      if (activeStepId) dispatch(updateStep({ id: activeStepId, changes: { backLabel: v } }));
    }, [activeStepId, dispatch]),
    300,
  );

  const handleAllowBackChange = useCallback((v: boolean) => {
    setAllowBack(v);
    if (activeStepId) dispatch(updateStep({ id: activeStepId, changes: { allowBack: v } }));
  }, [activeStepId, dispatch]);

  if (!step) return null;

  const stepIndex  = steps.findIndex((s) => s.id === step.id);
  const isLastStep = stepIndex === steps.length - 1;
  const stepLabels = steps.map((s, i) => s.title || `Step ${i + 1}`);
  const previewCurrent = Math.min(1, steps.length - 1);

  return (
    <div className="flex flex-col gap-5">

      <PanelSection>
        <FieldRow label="Step title">
          <PanelInput
            value={title}
            onChange={(e) => { setTitle(e.target.value); dispatchTitle(e.target.value); }}
            placeholder="Untitled Step"
          />
        </FieldRow>
        <FieldRow label="Description">
          <PanelTextarea
            value={description}
            onChange={(e) => { setDescription(e.target.value); dispatchDescription(e.target.value); }}
            placeholder="Optional subtitle shown below the title"
            rows={2}
          />
        </FieldRow>
      </PanelSection>

      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-[var(--color-border)]" />
        <span className="font-sans text-[0.68rem] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
          Navigation
        </span>
        <div className="h-px flex-1 bg-[var(--color-border)]" />
      </div>

      <PanelSection>
        <Toggle
          checked={allowBack}
          onChange={handleAllowBackChange}
          label="Allow back navigation"
          description="When off, the back button is hidden for this step"
        />
        <FieldRow label={isLastStep ? 'Submit button label' : 'Next button label'}>
          <PanelInput
            value={nextLabel}
            onChange={(e) => { setNextLabel(e.target.value); dispatchNextLabel(e.target.value); }}
            placeholder={isLastStep ? 'Submit' : 'Continue'}
          />
        </FieldRow>
        {allowBack && stepIndex > 0 && (
          <FieldRow label="Back button label">
            <PanelInput
              value={backLabel}
              onChange={(e) => { setBackLabel(e.target.value); dispatchBackLabel(e.target.value); }}
              placeholder="Back"
            />
          </FieldRow>
        )}
      </PanelSection>

      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-[var(--color-border)]" />
        <span className="font-sans text-[0.68rem] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
          Progress indicator
        </span>
        <div className="h-px flex-1 bg-[var(--color-border)]" />
      </div>

      <PanelSection>
        <p className="font-sans text-[0.72rem] text-[var(--color-text-muted)] leading-snug -mt-1">
          Applies to the whole form, not just this step.
        </p>

        <div className="grid grid-cols-2 gap-1.5">
          {INDICATOR_OPTIONS.map(({ value, label }) => (
            <IndicatorCard
              key={value}
              variant={value}
              label={label}
              isActive={settings.stepIndicator === value}
              total={Math.max(steps.length, 3)}
              current={previewCurrent}
              stepLabels={stepLabels}
              onClick={() => dispatch(updateFormSettings({ stepIndicator: value }))}
            />
          ))}
        </div>

        <Toggle
          checked={settings.showProgressBar}
          onChange={(v) => dispatch(updateFormSettings({ showProgressBar: v }))}
          label="Show progress bar"
          description="Thin bar under the indicator showing overall progress"
        />
      </PanelSection>

    </div>
  );
}
