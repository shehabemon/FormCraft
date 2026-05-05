import type { FieldStyleConfig } from './brand';

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'email'
  | 'phone'
  | 'url'
  | 'password'
  | 'select'
  | 'multiselect'
  | 'radio'
  | 'checkbox'
  | 'checkboxGroup'
  | 'date'
  | 'time'
  | 'file'
  | 'range'
  | 'heading'
  | 'paragraph'
  | 'divider'
  | 'hidden';

export type FieldCategory = 'input' | 'choice' | 'layout' | 'advanced';

export interface FieldOption {
  id: string;
  label: string;
  value: string;
}

export type ValidationType =
  | 'required'
  | 'minLength'
  | 'maxLength'
  | 'min'
  | 'max'
  | 'pattern'
  | 'email'
  | 'url';

export interface ValidationRule {
  id: string;
  type: ValidationType;
  value: string | number;
  message: string;
  enabled: boolean;
}

export type ConditionalOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'greaterThan'
  | 'lessThan'
  | 'greaterThanOrEquals'
  | 'lessThanOrEquals'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'startsWith'
  | 'endsWith';

export type ConditionalAction = 'show' | 'hide' | 'require';

export interface ConditionalRule {
  id: string;
  sourceFieldId: string;
  operator: ConditionalOperator;
  value: string | number | boolean;
}

export interface FieldConditional {
  enabled: boolean;
  action: ConditionalAction;
  logic: 'all' | 'any';
  rules: ConditionalRule[];
}


export type FormMode = 'single' | 'multi';

export type StepIndicatorStyle = 'dots' | 'numbered' | 'labelled' | 'bar';

export type StepTransition = 'slide' | 'fade' | 'none';

export interface StepSchema {
  id: string;
  title: string;
  description: string;
  /** Label for the "Next" button on this step. Empty string = use default. */
  nextLabel: string;
  /** Label for the "Back" button on this step. Empty string = use default. */
  backLabel: string;
  /** When false, the back button is hidden for this step. */
  allowBack: boolean;
}

export interface FormSettings {
  stepIndicator: StepIndicatorStyle;
  stepTransition: StepTransition;
  showProgressBar: boolean;
}


export interface FieldSchema {
  id: string;
  type: FieldType;
  label: string;
  name: string;
  placeholder: string;
  helperText: string;
  defaultValue: string | number | boolean | string[];
  options: FieldOption[];
  content: string;
  headingLevel: 1 | 2 | 3 | 4;
  min: number;
  max: number;
  step: number;
  accept: string;
  maxFileSize: number;
  validation: ValidationRule[];
  conditional: FieldConditional;
  style: FieldStyleConfig;
  /** References StepSchema.id. Empty string = unassigned / single-step form. */
  stepId: string;
}


export interface FormSchema {
  id: string;
  title: string;
  description: string;
  fields: FieldSchema[];
  mode: FormMode;
  steps: StepSchema[];
  settings: FormSettings;
  createdAt: string;
  updatedAt: string;
}

export interface FieldRegistryEntry {
  type: FieldType;
  label: string;
  icon: string;
  category: FieldCategory;
  defaultConfig: Partial<FieldSchema>;
  isInputField: boolean;
}


export function isMultiStepForm(form: FormSchema): boolean {
  return form.mode === 'multi' && form.steps.length >= 2;
}


/** FieldSchema shape before v2 (no stepId). */
export interface LegacyFieldSchema {
  id: string;
  type: FieldType;
  label: string;
  name: string;
  placeholder: string;
  helperText: string;
  defaultValue: string | number | boolean | string[];
  options: FieldOption[];
  content: string;
  headingLevel: 1 | 2 | 3 | 4;
  min: number;
  max: number;
  step: number;
  accept: string;
  maxFileSize: number;
  validation: ValidationRule[];
  conditional: FieldConditional;
  style: FieldStyleConfig;
}

/** FormSchema shape before v2 (no mode / steps / settings). */
export interface LegacyFormSchema {
  id: string;
  title: string;
  description: string;
  fields: LegacyFieldSchema[];
  createdAt: string;
  updatedAt: string;
}
