'use client';

import { useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { selectFieldById, updateField } from '@/store/slices/formSlice';
import { selectBrandConfig, selectBrandPreset, updateBrand, applyPreset, resetBrand } from '@/store/slices/brandSlice';
import { selectSelectedFieldId } from '@/store/slices/uiSlice';
import {
  FieldRow, PanelSection, SegmentedControl, ColourInput,
  PanelSlider, EmptyPanelState, Accordion,
} from './Shared';
import type { FieldSchema } from '@/types/form';
import type { StyleConfig } from '@/types/brand';
import type { BrandConfig, FontFamily, LabelPosition, RadiusPreset, InputSize } from '@/types/brand';


const DEFAULT_STYLE_CONFIG: StyleConfig = {
  labelFontSize: '0.8125rem',
  labelFontWeight: '500',
  labelColour: '',
  inputBorderStyle: 'solid',
  inputBorderRadius: -1, // -1 = inherit from brand
  inputPadding: '',
  inputFontSize: '0.875rem',
  placeholderColour: '',
  focusRingColour: '',
  errorColour: '',
  helperTextSize: '0.75rem',
  fieldSpacing: 0,
  variant: 'outlined',
};


const FORM_CONTAINER_ID = 'fc-form-preview';

function applyBrandCSSVars(brand: BrandConfig) {
  const el = document.getElementById(FORM_CONTAINER_ID);
  const target: HTMLElement = el ?? document.documentElement;

  const fontMap: Record<FontFamily, string> = {
    inter:       '"Inter", sans-serif',
    roboto:      '"Roboto", sans-serif',
    poppins:     '"Poppins", sans-serif',
    'open-sans': '"Open Sans", sans-serif',
    lato:        '"Lato", sans-serif',
    montserrat:  '"Montserrat", sans-serif',
    system:      'system-ui, sans-serif',
  };

  const spacingMap: Record<string, string> = {
    compact:     '0.75rem',
    comfortable: '1.25rem',
    spacious:    '2rem',
  };

  const sizeMap: Record<InputSize, string> = {
    sm: '2rem',
    md: '2.25rem',
    lg: '2.75rem',
  };

  target.style.setProperty('--fc-brand-primary',     brand.primaryColor);
  target.style.setProperty('--fc-brand-bg',          brand.backgroundColor);
  target.style.setProperty('--fc-brand-surface',     brand.surfaceColor);
  target.style.setProperty('--fc-brand-text',        brand.textColor);
  target.style.setProperty('--fc-brand-error',       brand.errorColor);
  target.style.setProperty('--fc-brand-border',      brand.borderColor);
  target.style.setProperty('--fc-brand-radius',      `${brand.borderRadius}px`);
  target.style.setProperty('--fc-brand-font',        fontMap[brand.fontFamily]);
  target.style.setProperty('--fc-brand-spacing',     spacingMap[brand.spacingScale] ?? '1.25rem');
  target.style.setProperty('--fc-brand-input-h',     sizeMap[brand.inputSize]);
  target.style.setProperty('--fc-brand-max-width',   `${brand.formMaxWidth}px`);
}


const GOOGLE_FONT_URLS: Partial<Record<FontFamily, string>> = {
  roboto:      'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600&display=swap',
  poppins:     'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap',
  'open-sans': 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600&display=swap',
  lato:        'https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap',
  montserrat:  'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600&display=swap',
};

function ensureFontLoaded(family: FontFamily) {
  const url = GOOGLE_FONT_URLS[family];
  if (!url) return;
  const id = `gf-${family}`;
  if (!document.getElementById(id)) {
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = url;
    document.head.appendChild(link);
  }
}


function VariantPreview({ variant, active, onClick }: { variant: StyleConfig['variant']; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1.5 p-2 rounded-[var(--radius-md)] border transition-all duration-150',
        active
          ? 'border-[var(--color-primary)] bg-[var(--color-primary-subtle)]'
          : 'border-[var(--color-border)] bg-white hover:border-[var(--color-border-strong)]'
      )}
    >
      {/* Mini input preview */}
      <div className="w-full">
        {variant === 'outlined' && (
          <div className={cn(
            'w-full h-6 rounded-[4px] border-2 bg-white',
            active ? 'border-[var(--color-primary)]' : 'border-[var(--color-stone-300)]'
          )} />
        )}
        {variant === 'filled' && (
          <div className={cn(
            'w-full h-6 rounded-[4px] border-0',
            active ? 'bg-[var(--color-primary-subtle)] ring-2 ring-[var(--color-primary)]/40' : 'bg-[var(--color-stone-200)]'
          )} />
        )}
        {variant === 'underlined' && (
          <div className={cn(
            'w-full h-6 bg-transparent border-b-2',
            active ? 'border-[var(--color-primary)]' : 'border-[var(--color-stone-300)]'
          )} />
        )}
      </div>
      <span className={cn(
        'font-sans text-[0.68rem] font-medium capitalize',
        active ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'
      )}>
        {variant}
      </span>
    </button>
  );
}


function LabelPositionPreview({
  pos,
  active,
  onClick,
}: {
  pos: LabelPosition;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-start gap-1 p-2 rounded-[var(--radius-md)] border transition-all duration-150',
        active
          ? 'border-[var(--color-primary)] bg-[var(--color-primary-subtle)]'
          : 'border-[var(--color-border)] bg-white hover:border-[var(--color-border-strong)]'
      )}
    >
      {pos === 'top' && (
        <>
          <div className={cn('h-1.5 w-8 rounded-full', active ? 'bg-[var(--color-primary)]/60' : 'bg-[var(--color-stone-300)]')} />
          <div className={cn('h-4 w-full rounded-[3px] border', active ? 'border-[var(--color-primary)]/40' : 'border-[var(--color-stone-200)]')} />
        </>
      )}
      {pos === 'left' && (
        <div className="flex items-center gap-1 w-full">
          <div className={cn('h-1.5 w-5 rounded-full shrink-0', active ? 'bg-[var(--color-primary)]/60' : 'bg-[var(--color-stone-300)]')} />
          <div className={cn('h-4 flex-1 rounded-[3px] border', active ? 'border-[var(--color-primary)]/40' : 'border-[var(--color-stone-200)]')} />
        </div>
      )}
      {pos === 'floating' && (
        <div className="relative w-full h-5">
          <div className={cn('absolute top-0 left-1.5 h-1.5 w-6 rounded-full -translate-y-1/2', active ? 'bg-[var(--color-primary)]/60' : 'bg-[var(--color-stone-300)]')} />
          <div className={cn('absolute inset-0 rounded-[3px] border', active ? 'border-[var(--color-primary)]/40' : 'border-[var(--color-stone-200)]')} />
        </div>
      )}
      <span className={cn(
        'font-sans text-[0.65rem] font-medium capitalize w-full text-center mt-0.5',
        active ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'
      )}>
        {pos}
      </span>
    </button>
  );
}


const FONT_OPTIONS: { value: FontFamily; label: string }[] = [
  { value: 'inter',       label: 'Inter' },
  { value: 'roboto',      label: 'Roboto' },
  { value: 'poppins',     label: 'Poppins' },
  { value: 'open-sans',   label: 'Open Sans' },
  { value: 'lato',        label: 'Lato' },
  { value: 'montserrat',  label: 'Montserrat' },
  { value: 'system',      label: 'System UI' },
];

const RADIUS_PRESETS: { value: RadiusPreset; label: string; radius: number }[] = [
  { value: 'sharp',    label: 'Sharp',    radius: 0  },
  { value: 'minimal',  label: 'Default',  radius: 6  },
  { value: 'rounded',  label: 'Rounded',  radius: 12 },
  { value: 'editorial',label: 'Pill',     radius: 24 },
];

function GlobalBrandPanel() {
  const dispatch = useAppDispatch();
  const brand = useAppSelector(selectBrandConfig);
  const activePreset = useAppSelector(selectBrandPreset);

  // Inject CSS vars on every brand change
  useEffect(() => { applyBrandCSSVars(brand); }, [brand]);
  useEffect(() => { ensureFontLoaded(brand.fontFamily); }, [brand.fontFamily]);

  const update = useCallback((changes: Partial<BrandConfig>) => dispatch(updateBrand(changes)), [dispatch]);

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 px-2.5 py-2 flex-1 rounded-[var(--radius-md)] bg-[var(--color-stone-100)] border border-[var(--color-border)]">
          <div className="w-5 h-5 rounded-[var(--radius-sm)] bg-[var(--color-accent-subtle)] flex items-center justify-center shrink-0">
            <svg className="w-3 h-3 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
          </div>
          <span className="font-sans text-[0.8125rem] font-medium text-[var(--color-text-secondary)]">Brand &amp; Style</span>
          <button
            type="button"
            onClick={() => dispatch(resetBrand())}
            className="ml-auto font-sans text-[0.72rem] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Colours */}
      <PanelSection label="Colours">
        <FieldRow label="Primary">
          <ColourInput value={brand.primaryColor} onChange={(v) => update({ primaryColor: v })} label="Primary colour" />
        </FieldRow>
        <div className="grid grid-cols-2 gap-2">
          <FieldRow label="Background">
            <ColourInput value={brand.backgroundColor} onChange={(v) => update({ backgroundColor: v })} label="Background colour" />
          </FieldRow>
          <FieldRow label="Surface">
            <ColourInput value={brand.surfaceColor} onChange={(v) => update({ surfaceColor: v })} label="Surface colour" />
          </FieldRow>
          <FieldRow label="Text">
            <ColourInput value={brand.textColor} onChange={(v) => update({ textColor: v })} label="Text colour" />
          </FieldRow>
          <FieldRow label="Border">
            <ColourInput value={brand.borderColor} onChange={(v) => update({ borderColor: v })} label="Border colour" />
          </FieldRow>
          <FieldRow label="Error">
            <ColourInput value={brand.errorColor} onChange={(v) => update({ errorColor: v })} label="Error colour" />
          </FieldRow>
        </div>
      </PanelSection>

      {/* Typography */}
      <PanelSection label="Typography">
        <FieldRow label="Font Family">
          <div className="grid grid-cols-2 gap-1">
            {FONT_OPTIONS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => { update({ fontFamily: f.value }); ensureFontLoaded(f.value); }}
                className={cn(
                  'h-8 px-2 rounded-[var(--radius-sm)] font-sans text-[0.78rem] font-medium text-left truncate transition-all duration-100 border',
                  brand.fontFamily === f.value
                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                    : 'bg-white text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-primary)]/40'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </FieldRow>
      </PanelSection>

      {/* Shape */}
      <PanelSection label="Shape">
        <FieldRow label="Border Radius Preset">
          <div className="grid grid-cols-4 gap-1">
            {RADIUS_PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => dispatch(applyPreset(p.value))}
                className={cn(
                  'flex flex-col items-center gap-1.5 p-2 rounded-[var(--radius-sm)] border transition-all duration-100',
                  activePreset === p.value
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-subtle)]'
                    : 'border-[var(--color-border)] bg-white hover:border-[var(--color-border-strong)]'
                )}
              >
                <div
                  className={cn(
                    'w-6 h-6 border-2 transition-colors',
                    activePreset === p.value ? 'border-[var(--color-primary)]' : 'border-[var(--color-stone-400)]'
                  )}
                  style={{ borderRadius: `${p.radius}px` }}
                />
                <span className={cn(
                  'font-sans text-[0.65rem] font-medium',
                  activePreset === p.value ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'
                )}>
                  {p.label}
                </span>
              </button>
            ))}
          </div>
        </FieldRow>
        <FieldRow label={`Radius — ${brand.borderRadius}px`}>
          <PanelSlider
            value={brand.borderRadius}
            min={0}
            max={24}
            onChange={(v) => update({ borderRadius: v })}
            unit="px"
          />
        </FieldRow>
      </PanelSection>

      {/* Layout */}
      <PanelSection label="Layout">
        <FieldRow label="Input Size">
          <SegmentedControl
            options={[
              { value: 'sm' as InputSize, label: 'SM' },
              { value: 'md' as InputSize, label: 'MD' },
              { value: 'lg' as InputSize, label: 'LG' },
            ]}
            value={brand.inputSize}
            onChange={(v) => update({ inputSize: v })}
          />
        </FieldRow>

        <FieldRow label="Field Spacing">
          <SegmentedControl
            options={[
              { value: 'compact', label: 'Compact' },
              { value: 'comfortable', label: 'Normal' },
              { value: 'spacious', label: 'Spacious' },
            ]}
            value={brand.spacingScale}
            onChange={(v) => update({ spacingScale: v as BrandConfig['spacingScale'] })}
          />
        </FieldRow>

        <FieldRow label="Label Position">
          <div className="grid grid-cols-3 gap-1.5">
            {(['top', 'left', 'floating'] as LabelPosition[]).map((pos) => (
              <LabelPositionPreview
                key={pos}
                pos={pos}
                active={brand.labelPosition === pos}
                onClick={() => update({ labelPosition: pos })}
              />
            ))}
          </div>
        </FieldRow>

        <FieldRow label={`Form Max Width — ${brand.formMaxWidth}px`}>
          <PanelSlider
            value={brand.formMaxWidth}
            min={480}
            max={960}
            step={20}
            onChange={(v) => update({ formMaxWidth: v })}
            unit="px"
          />
        </FieldRow>
      </PanelSection>
    </div>
  );
}


function FieldStylePanel({ fieldId }: { fieldId: string }) {
  const dispatch = useAppDispatch();
  const field = useAppSelector((s) => selectFieldById(s, fieldId));
  const brand = useAppSelector(selectBrandConfig);

  if (!field) return <EmptyPanelState message="Field not found" />;

  // Merge stored styleConfig with defaults — field.style only has FieldStyleConfig (layout),
  // Stash granular style tokens under _advanced rather than widening FieldSchema.
  // Avoids a migration on every persisted form just to support a power-user panel.
  const extStyle: StyleConfig = {
    ...DEFAULT_STYLE_CONFIG,
    ...((field.style as unknown as { _advanced?: Partial<StyleConfig> })._advanced ?? {}),
  };

  const patchAdvanced = useCallback((changes: Partial<StyleConfig>) => {
    const current = (field.style as unknown as { _advanced?: Partial<StyleConfig> })._advanced ?? {};
    dispatch(updateField({
      id: fieldId,
      changes: {
        style: {
          ...field.style,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          _advanced: { ...current, ...changes } as any,
        } as typeof field.style,
      },
    }));
  }, [dispatch, fieldId, field.style]);

  const patchLayout = useCallback((changes: Partial<typeof field.style>) => {
    dispatch(updateField({ id: fieldId, changes: { style: { ...field.style, ...changes } } }));
  }, [dispatch, fieldId, field.style]);

  return (
    <div className="flex flex-col gap-5">
      {/* Type badge */}
      <div className="flex items-center gap-2 px-2.5 py-2 rounded-[var(--radius-md)] bg-[var(--color-stone-100)] border border-[var(--color-border)]">
        <div className="w-5 h-5 rounded-[var(--radius-sm)] bg-[var(--color-primary-subtle)] flex items-center justify-center shrink-0">
          <span className="text-[var(--color-primary)] text-[8px] font-bold uppercase">{field.type.slice(0, 2)}</span>
        </div>
        <span className="font-sans text-[0.8125rem] font-medium text-[var(--color-text-secondary)]">
          {field.label || 'Unlabelled field'} — Style
        </span>
      </div>

      {/* Input variant */}
      {!['heading', 'paragraph', 'divider', 'checkbox'].includes(field.type) && (
        <PanelSection label="Input Variant">
          <div className="grid grid-cols-3 gap-1.5">
            {(['outlined', 'filled', 'underlined'] as StyleConfig['variant'][]).map((v) => (
              <VariantPreview
                key={v}
                variant={v}
                active={extStyle.variant === v}
                onClick={() => patchAdvanced({ variant: v })}
              />
            ))}
          </div>
        </PanelSection>
      )}

      {/* Layout */}
      <PanelSection label="Field Layout">
        <FieldRow label="Width">
          <SegmentedControl
            options={[
              { value: 'full' as const, label: 'Full' },
              { value: 'half' as const, label: '½' },
              { value: 'third' as const, label: '⅓' },
            ]}
            value={field.style.width}
            onChange={(v) => patchLayout({ width: v })}
          />
        </FieldRow>

        <FieldRow label="Label Position">
          <SegmentedControl
            options={[
              { value: 'inherit' as LabelPosition, label: 'Inherit' },
              { value: 'top' as LabelPosition,     label: 'Top' },
              { value: 'left' as LabelPosition,    label: 'Left' },
            ]}
            value={field.style.labelPositionOverride ?? ('inherit' as LabelPosition)}
            onChange={(v) => patchLayout({ labelPositionOverride: v === ('inherit' as string) ? null : v as LabelPosition })}
          />
        </FieldRow>
      </PanelSection>

      {/* Border */}
      <PanelSection label="Border">
        <FieldRow label="Style">
          <SegmentedControl
            options={[
              { value: 'solid' as const, label: 'Solid' },
              { value: 'dashed' as const, label: 'Dashed' },
              { value: 'none' as const, label: 'None' },
            ]}
            value={extStyle.inputBorderStyle}
            onChange={(v) => patchAdvanced({ inputBorderStyle: v })}
          />
        </FieldRow>

        <FieldRow label={`Radius${extStyle.inputBorderRadius >= 0 ? ` — ${extStyle.inputBorderRadius}px` : ' — inherit'}`}>
          <PanelSlider
            value={extStyle.inputBorderRadius >= 0 ? extStyle.inputBorderRadius : brand.borderRadius}
            min={0}
            max={24}
            onChange={(v) => patchAdvanced({ inputBorderRadius: v })}
            unit="px"
          />
        </FieldRow>
      </PanelSection>

      {/* Colours */}
      <PanelSection label="Colours">
        <Accordion title="Advanced colours" defaultOpen={false}>
          <FieldRow label="Focus Ring">
            <ColourInput
              value={extStyle.focusRingColour || brand.primaryColor}
              onChange={(v) => patchAdvanced({ focusRingColour: v })}
              label="Focus ring colour"
            />
          </FieldRow>
          <FieldRow label="Error">
            <ColourInput
              value={extStyle.errorColour || brand.errorColor}
              onChange={(v) => patchAdvanced({ errorColour: v })}
              label="Error colour"
            />
          </FieldRow>
          <FieldRow label="Label Text">
            <ColourInput
              value={extStyle.labelColour || brand.textColor}
              onChange={(v) => patchAdvanced({ labelColour: v })}
              label="Label text colour"
            />
          </FieldRow>
          <FieldRow label="Placeholder">
            <ColourInput
              value={extStyle.placeholderColour || '#A9A49B'}
              onChange={(v) => patchAdvanced({ placeholderColour: v })}
              label="Placeholder colour"
            />
          </FieldRow>
        </Accordion>
      </PanelSection>

      {/* Spacing */}
      <PanelSection label="Spacing">
        <FieldRow label={`Bottom Margin — ${extStyle.fieldSpacing}px`}>
          <PanelSlider
            value={extStyle.fieldSpacing}
            min={0}
            max={64}
            step={4}
            onChange={(v) => patchAdvanced({ fieldSpacing: v })}
            unit="px"
          />
        </FieldRow>
      </PanelSection>
    </div>
  );
}


export function StylePanel() {
  const selectedId = useAppSelector(selectSelectedFieldId);

  if (selectedId) {
    return <FieldStylePanel fieldId={selectedId} />;
  }
  return <GlobalBrandPanel />;
}
