import { z } from 'zod';
import { nanoid } from 'nanoid';
import type { FormSchema, FieldSchema, FieldType } from '@/types/form';
import { isMultiStepForm } from '@/types/form';
import { EMPTY_FIELD_CONDITIONAL, DEFAULT_FIELD_STYLE } from '@/constants/defaults';

const validationRuleSchema = z.object({
  id: z.string(),
  type: z.enum([
    'required', 'minLength', 'maxLength', 'min', 'max', 'pattern', 'email', 'url',
  ]),
  value: z.union([z.string(), z.number()]),
  message: z.string(),
  enabled: z.boolean(),
});

const conditionalRuleSchema = z.object({
  id: z.string(),
  sourceFieldId: z.string(),
  operator: z.enum([
    'equals', 'notEquals', 'contains', 'notContains',
    'greaterThan', 'lessThan', 'greaterThanOrEquals', 'lessThanOrEquals',
    'isEmpty', 'isNotEmpty', 'startsWith', 'endsWith',
  ]),
  value: z.union([z.string(), z.number(), z.boolean()]),
});

const fieldConditionalSchema = z.object({
  enabled: z.boolean(),
  action: z.enum(['show', 'hide', 'require']),
  logic: z.enum(['all', 'any']),
  rules: z.array(conditionalRuleSchema),
});

const fieldStyleConfigSchema = z.object({
  width: z.enum(['full', 'half', 'third']),
  customClassName: z.string(),
  labelPositionOverride: z.enum(['top', 'left', 'floating']).nullable(),
});

const fieldOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
});

const fieldTypeValues = [
  'text', 'textarea', 'number', 'email', 'phone', 'url', 'password',
  'select', 'multiselect', 'radio', 'checkbox', 'checkboxGroup',
  'date', 'time', 'file', 'range', 'heading', 'paragraph', 'divider', 'hidden',
] as const;

const fieldSchemaValidator = z.object({
  id: z.string(),
  type: z.enum(fieldTypeValues),
  label: z.string(),
  name: z.string(),
  placeholder: z.string(),
  helperText: z.string(),
  defaultValue: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
  options: z.array(fieldOptionSchema),
  content: z.string(),
  headingLevel: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  min: z.number(),
  max: z.number(),
  step: z.number(),
  accept: z.string(),
  maxFileSize: z.number(),
  validation: z.array(validationRuleSchema),
  conditional: fieldConditionalSchema,
  style: fieldStyleConfigSchema,
  stepId: z.string().default(''),
});

const stepSchemaValidator = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().default(''),
  nextLabel: z.string().default(''),
  backLabel: z.string().default(''),
  allowBack: z.boolean().default(true),
});

const formSettingsValidator = z.object({
  stepIndicator: z.enum(['dots', 'numbered', 'labelled', 'bar']).default('numbered'),
  stepTransition: z.enum(['slide', 'fade', 'none']).default('slide'),
  showProgressBar: z.boolean().default(true),
});

const formSchemaValidator = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  fields: z.array(fieldSchemaValidator),
  mode: z.enum(['single', 'multi']).default('single'),
  steps: z.array(stepSchemaValidator).default([]),
  settings: formSettingsValidator.default({
    stepIndicator: 'numbered',
    stepTransition: 'slide',
    showProgressBar: true,
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export function validateSchema(
  json: unknown
): { success: true; data: FormSchema } | { success: false; error: string } {
  const result = formSchemaValidator.safeParse(json);
  if (result.success) {
    return { success: true, data: result.data as FormSchema };
  }
  const first = result.error.issues[0];
  const path = first?.path.join('.') ?? 'unknown';
  return {
    success: false,
    error: `Validation failed at "${path}": ${first?.message ?? 'unknown error'}`,
  };
}

export function exportToJSONSchema(form: FormSchema): object {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const field of form.fields) {
    if (['heading', 'paragraph', 'divider'].includes(field.type)) continue;

    const prop: Record<string, unknown> = {
      title: field.label,
    };

    if (field.helperText) prop.description = field.helperText;

    switch (field.type) {
      case 'number':
      case 'range':
        prop.type = 'number';
        if (field.min !== 0 || field.type === 'range') prop.minimum = field.min;
        if (field.max !== 0 || field.type === 'range') prop.maximum = field.max;
        break;
      case 'checkbox':
        prop.type = 'boolean';
        break;
      case 'multiselect':
      case 'checkboxGroup':
        prop.type = 'array';
        prop.items = { type: 'string' };
        if (field.options.length > 0) {
          prop.items = { type: 'string', enum: field.options.map((o) => o.value) };
        }
        break;
      case 'select':
      case 'radio':
        prop.type = 'string';
        if (field.options.length > 0) {
          prop.enum = field.options.map((o) => o.value);
        }
        break;
      default:
        prop.type = 'string';
        if (field.type === 'email') prop.format = 'email';
        if (field.type === 'url') prop.format = 'uri';
        if (field.type === 'date') prop.format = 'date';
        if (field.type === 'time') prop.format = 'time';
    }

    for (const rule of field.validation) {
      if (!rule.enabled) continue;
      if (rule.type === 'required') required.push(field.name);
      if (rule.type === 'minLength') prop.minLength = Number(rule.value);
      if (rule.type === 'maxLength') prop.maxLength = Number(rule.value);
      if (rule.type === 'min') prop.minimum = Number(rule.value);
      if (rule.type === 'max') prop.maximum = Number(rule.value);
      if (rule.type === 'pattern') prop.pattern = String(rule.value);
    }

    if (isMultiStepForm(form) && field.stepId) {
      const stepIndex = form.steps.findIndex((s) => s.id === field.stepId);
      if (stepIndex !== -1) prop['x-formcraft-step'] = stepIndex;
    }

    properties[field.name] = prop;
  }

  const base: Record<string, unknown> = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: form.title,
    description: form.description || undefined,
    type: 'object',
    properties,
    required: required.length > 0 ? required : undefined,
    additionalProperties: false,
  };

  if (isMultiStepForm(form)) {
    base['x-formcraft-steps'] = form.steps.map((s, i) => ({
      index: i,
      title: s.title || `Step ${i + 1}`,
      description: s.description || undefined,
    }));
    base['x-formcraft-navigation'] = {
      indicator: form.settings.stepIndicator,
      transition: form.settings.stepTransition,
      showProgressBar: form.settings.showProgressBar,
    };
  }

  return base;
}

export function importFromJSONSchema(
  json: unknown
): { success: true; data: FormSchema } | { success: false; error: string } {
  const result = validateSchema(json);
  if (!result.success) return result;

  const schema = result.data;
  schema.fields = schema.fields.map((field) => ({
    ...generateDefaultField(field.type),
    ...field,
  }));

  return { success: true, data: schema };
}

export function generateDefaultField(type: FieldType): FieldSchema {
  const base: FieldSchema = {
    id: nanoid(),
    type,
    label: '',
    name: '',
    placeholder: '',
    helperText: '',
    defaultValue: '',
    options: [],
    content: '',
    headingLevel: 2,
    min: 0,
    max: 100,
    step: 1,
    accept: '',
    maxFileSize: 0,
    validation: [],
    conditional: { ...EMPTY_FIELD_CONDITIONAL },
    style: { ...DEFAULT_FIELD_STYLE },
    stepId: '',
  };

  switch (type) {
    case 'checkbox':
      base.defaultValue = false;
      break;
    case 'multiselect':
    case 'checkboxGroup':
      base.defaultValue = [];
      break;
    case 'number':
    case 'range':
      base.defaultValue = 0;
      break;
    case 'heading':
      base.content = 'Section Heading';
      base.headingLevel = 2;
      break;
    case 'paragraph':
      base.content = 'Enter your description text here.';
      break;
    case 'range':
      base.min = 0;
      base.max = 100;
      base.step = 1;
      break;
  }

  return base;
}
