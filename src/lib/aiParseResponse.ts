import { z } from 'zod';
import { nanoid } from 'nanoid';
import type { FormSchema, FieldSchema, FieldType } from '@/types/form';
import { DEFAULT_FORM_SETTINGS } from '@/constants/defaults';

function extractJSON(raw: string): string {
  let text = raw.trim();

  // Strip markdown code fences (Gemini sometimes adds them despite instructions)
  text = text.replace(/^```(?:json)?\s*\n?/i, '');
  text = text.replace(/\n?\s*```\s*$/i, '');

  // Strip leading/trailing non-JSON text
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.substring(firstBrace, lastBrace + 1);
  }

  return text;
}

const VALID_FIELD_TYPES: FieldType[] = [
  'text', 'textarea', 'number', 'email', 'phone', 'url', 'password',
  'select', 'multiselect', 'radio', 'checkbox', 'checkboxGroup',
  'date', 'time', 'file', 'range', 'heading', 'paragraph', 'divider', 'hidden',
];

const VALID_VALIDATION_TYPES = [
  'required', 'minLength', 'maxLength', 'min', 'max', 'pattern', 'email', 'url',
] as const;

const aiOptionSchema = z.object({
  label: z.string().min(1).max(200),
  value: z.string().min(1).max(200),
});

const aiValidationRuleSchema = z.object({
  type: z.enum(VALID_VALIDATION_TYPES),
  value: z.union([z.string(), z.number()]).default(''),
  message: z.string().max(500).default(''),
  enabled: z.boolean().default(true),
});

const aiFieldSchema = z.object({
  type: z.enum(VALID_FIELD_TYPES as [string, ...string[]]),
  label: z.string().max(200).default(''),
  placeholder: z.string().max(500).default(''),
  helperText: z.string().max(500).default(''),
  defaultValue: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]).default(''),
  options: z.array(aiOptionSchema).default([]),
  content: z.string().max(2000).default(''),
  headingLevel: z.number().min(0).max(4).default(0),
  min: z.number().default(0),
  max: z.number().default(100),
  step: z.number().default(1),
  accept: z.string().max(200).default(''),
  maxFileSize: z.number().default(0),
  validation: z.array(aiValidationRuleSchema).default([]),
});

const aiFormSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(500).default(''),
  fields: z.array(aiFieldSchema).min(1).max(30),
});

const TYPE_ALIASES: Record<string, FieldType> = {
  'dropdown': 'select',
  'drop-down': 'select',
  'textbox': 'text',
  'text-area': 'textarea',
  'text_area': 'textarea',
  'email_input': 'email',
  'emailInput': 'email',
  'phone_number': 'phone',
  'phoneNumber': 'phone',
  'tel': 'phone',
  'check': 'checkbox',
  'check_box': 'checkbox',
  'radio_group': 'radio',
  'radioGroup': 'radio',
  'multi_select': 'multiselect',
  'multi-select': 'multiselect',
  'slider': 'range',
  'file_upload': 'file',
  'fileUpload': 'file',
  'h1': 'heading',
  'h2': 'heading',
  'h3': 'heading',
  'section': 'heading',
  'separator': 'divider',
  'hr': 'divider',
  'line': 'divider',
  'description': 'paragraph',
  'text_block': 'paragraph',
  'info': 'paragraph',
};

function normaliseFieldType(raw: string): FieldType {
  const lower = raw.toLowerCase().trim();
  if (VALID_FIELD_TYPES.includes(lower as FieldType)) return lower as FieldType;
  if (lower in TYPE_ALIASES) return TYPE_ALIASES[lower];
  return 'text';
}

function validateSemantics(data: z.infer<typeof aiFormSchema>): string[] {
  const warnings: string[] = [];

  for (const field of data.fields) {
    const layoutTypes = ['heading', 'paragraph', 'divider'];

    // Layout fields use `content` as their display text — label is optional for them.
    // For input fields, derive a fallback label from content if label is missing.
    if (!field.label || field.label.trim() === '') {
      if (layoutTypes.includes(field.type)) {
        field.label = field.content || field.type;
      } else {
        // Derive from content, placeholder, or type name as last resort
        field.label = field.content || field.placeholder || field.type;
        warnings.push(`${field.type}: missing label, derived from content/placeholder`);
      }
    }

    const choiceTypes = ['select', 'multiselect', 'radio', 'checkboxGroup'];

    if (choiceTypes.includes(field.type)) {
      if (!field.options || field.options.length === 0) {
        field.options = [
          { label: 'Option 1', value: 'option1' },
          { label: 'Option 2', value: 'option2' },
          { label: 'Option 3', value: 'option3' },
        ];
        warnings.push(`${field.label}: choice field had no options, defaults added`);
      }
    } else {
      field.options = [];
    }

    if (field.type === 'heading' && !field.content) {
      field.content = field.label;
    }

    if (field.type === 'paragraph' && !field.content) {
      field.content = field.label;
    }

    if (field.type === 'heading') {
      if (field.headingLevel < 1 || field.headingLevel > 4) {
        field.headingLevel = 2;
      }
    }

    if (field.type === 'range') {
      if (field.min >= field.max) { field.min = 0; field.max = 100; }
      if (field.step <= 0) field.step = 1;
    }

    // Deduplicate validation types
    const seenTypes = new Set<string>();
    field.validation = field.validation.filter((rule) => {
      if (seenTypes.has(rule.type)) return false;
      seenTypes.add(rule.type);
      return true;
    });

    // Remove text validations from numeric fields
    const textValidations = ['minLength', 'maxLength', 'pattern', 'email', 'url'];
    if (['number', 'range'].includes(field.type)) {
      field.validation = field.validation.filter(
        (r) => !textValidations.includes(r.type),
      );
    }
    if (['select', 'radio', 'checkbox', 'date', 'time', 'file'].includes(field.type)) {
      field.validation = field.validation.filter((r) => r.type === 'required');
    }
  }

  return warnings;
}

function toCamelCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, char: string) => char.toUpperCase())
    .replace(/^[A-Z]/, (char) => char.toLowerCase());
}

function generateFieldName(label: string, type: string, existingNames: Set<string>): string {
  let base = toCamelCase(label || type || 'field');
  if (!base) base = 'field';
  let name = base;
  let counter = 2;
  while (existingNames.has(name)) {
    name = `${base}${counter}`;
    counter++;
  }
  existingNames.add(name);
  return name;
}

function transformToFormSchema(validated: z.infer<typeof aiFormSchema>): FormSchema {
  const existingNames = new Set<string>();

  const fields: FieldSchema[] = validated.fields.map((aiField) => {
    const type = normaliseFieldType(aiField.type);
    const name = generateFieldName(aiField.label, type, existingNames);

    return {
      id: nanoid(),
      type,
      label: aiField.label,
      name,
      placeholder: aiField.placeholder,
      helperText: aiField.helperText,
      defaultValue: aiField.defaultValue,
      options: aiField.options.map((opt) => ({
        id: nanoid(),
        label: opt.label,
        value: opt.value,
      })),
      content: aiField.content,
      headingLevel: (type === 'heading' ? (aiField.headingLevel || 2) : 2) as 1 | 2 | 3 | 4,
      min: aiField.min,
      max: aiField.max,
      step: aiField.step,
      accept: aiField.accept,
      maxFileSize: aiField.maxFileSize,
      validation: aiField.validation.map((rule) => ({
        id: nanoid(),
        type: rule.type,
        value: rule.value,
        message: rule.message || `${aiField.label} validation failed`,
        enabled: rule.enabled,
      })),
      conditional: {
        enabled: false,
        action: 'show' as const,
        logic: 'all' as const,
        rules: [],
      },
      style: {
        width: 'full' as const,
        customClassName: '',
        labelPositionOverride: null,
      },
      stepId: '',
    };
  });

  return {
    id: nanoid(),
    title: validated.title,
    description: validated.description,
    fields,
    mode: 'single' as const,
    steps: [],
    settings: { ...DEFAULT_FORM_SETTINGS },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

interface ParseSuccess {
  success: true;
  schema: FormSchema;
}

interface ParseError {
  success: false;
  error: string;
}

export function parseAndValidateAIResponse(raw: string): ParseSuccess | ParseError {
  if (!raw || raw.trim().length === 0) {
    return { success: false, error: 'AI returned an empty response. Please try again.' };
  }

  const jsonText = extractJSON(raw);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return {
      success: false,
      error: 'AI returned invalid JSON. Please try again with a clearer description.',
    };
  }

  // Pre-process: normalise field types before Zod enum check
  if (parsed && typeof parsed === 'object' && 'fields' in parsed) {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.fields)) {
      obj.fields = obj.fields.map((f: unknown) => {
        if (f && typeof f === 'object' && 'type' in f) {
          const field = f as Record<string, unknown>;
          field.type = normaliseFieldType(String(field.type));
        }
        return f;
      });
    }
  }

  const zodResult = aiFormSchema.safeParse(parsed);
  if (!zodResult.success) {
    const firstIssue = zodResult.error.issues[0];
    const path = firstIssue.path.join('.');
    return {
      success: false,
      error: `AI generated an invalid form structure at "${path}": ${firstIssue.message}. Please try again.`,
    };
  }

  validateSemantics(zodResult.data);

  const schema = transformToFormSchema(zodResult.data);
  return { success: true, schema };
}
