import type { FormSchema, LegacyFormSchema } from '@/types/form';
import { DEFAULT_FORM_SETTINGS } from '@/constants/defaults';

export function migrateV1toV2(legacy: LegacyFormSchema): FormSchema {
  return {
    ...legacy,
    mode: 'single',
    steps: [],
    settings: { ...DEFAULT_FORM_SETTINGS },
    fields: legacy.fields.map((field) => ({ ...field, stepId: '' })),
  };
}
