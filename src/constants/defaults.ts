import type { BrandConfig } from '@/types/brand';
import type { FormSchema, FormSettings } from '@/types/form';
import type { FieldConditional } from '@/types/form';
import type { FieldStyleConfig } from '@/types/brand';

export const DEFAULT_BRAND_CONFIG: BrandConfig = {
  primaryColor: '#2563eb',
  backgroundColor: '#ffffff',
  surfaceColor: '#f9fafb',
  textColor: '#111827',
  errorColor: '#dc2626',
  successColor: '#16a34a',
  borderColor: '#d1d5db',
  fontFamily: 'inter',
  borderRadius: 8,
  inputSize: 'md',
  labelPosition: 'top',
  spacingScale: 'comfortable',
  formMaxWidth: 640,
  showLabels: true,
};

export const DEFAULT_FORM_SETTINGS: FormSettings = {
  stepIndicator: 'numbered',
  stepTransition: 'slide',
  showProgressBar: true,
};

export const DEFAULT_FORM_SCHEMA: FormSchema = {
  id: '',
  title: 'Untitled Form',
  description: '',
  fields: [],
  mode: 'single',
  steps: [],
  settings: DEFAULT_FORM_SETTINGS,
  createdAt: '',
  updatedAt: '',
};

export const EMPTY_FIELD_CONDITIONAL: FieldConditional = {
  enabled: false,
  action: 'show',
  logic: 'all',
  rules: [],
};

export const DEFAULT_FIELD_STYLE: FieldStyleConfig = {
  width: 'full',
  customClassName: '',
  labelPositionOverride: null,
};

export const BRAND_PRESETS: Record<string, Partial<BrandConfig>> = {
  minimal: {
    borderRadius: 4,
    spacingScale: 'compact',
    labelPosition: 'top',
    fontFamily: 'inter',
  },
  rounded: {
    borderRadius: 12,
    spacingScale: 'comfortable',
    labelPosition: 'top',
    fontFamily: 'poppins',
  },
  sharp: {
    borderRadius: 0,
    spacingScale: 'comfortable',
    labelPosition: 'top',
    fontFamily: 'roboto',
  },
  editorial: {
    borderRadius: 2,
    spacingScale: 'spacious',
    labelPosition: 'left',
    fontFamily: 'montserrat',
  },
};
