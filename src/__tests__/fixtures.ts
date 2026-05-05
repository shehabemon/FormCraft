import type { FormSchema, FieldSchema, StepSchema } from '@/types/form';

export function makeField(overrides: Partial<FieldSchema> = {}): FieldSchema {
  return {
    id: 'field-1',
    type: 'text',
    label: 'Name',
    name: 'name',
    placeholder: '',
    helperText: '',
    defaultValue: '',
    options: [],
    content: '',
    headingLevel: 1,
    min: 0,
    max: 100,
    step: 1,
    accept: '',
    maxFileSize: 5,
    validation: [],
    conditional: { enabled: false, action: 'show', logic: 'all', rules: [] },
    style: { width: 'full', customClassName: '', labelPositionOverride: null },
    stepId: '',
    ...overrides,
  };
}

export function makeStep(overrides: Partial<StepSchema> = {}): StepSchema {
  return {
    id: 'step-1',
    title: 'Step 1',
    description: '',
    nextLabel: '',
    backLabel: '',
    allowBack: true,
    ...overrides,
  };
}

export function makeForm(overrides: Partial<FormSchema> = {}): FormSchema {
  return {
    id: 'form-abc',
    title: 'Test Form',
    description: '',
    fields: [],
    mode: 'single',
    steps: [],
    settings: {
      stepIndicator: 'numbered',
      stepTransition: 'slide',
      showProgressBar: true,
    },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}
