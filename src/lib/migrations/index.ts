import type { MigrationManifest, PersistedState } from 'redux-persist';
import type { FormSchema, LegacyFormSchema } from '@/types/form';
import { migrateV1toV2 } from './v1toV2';

// Migrations keyed by the version they produce (redux-persist convention).
// createMigrate(migrations) in store/index.ts calls migrations[newVersion](state).
export const migrations: MigrationManifest = {
  2: (state: PersistedState): PersistedState => {
    if (!state || typeof state !== 'object') return state;
    const s = state as Record<string, unknown>;

    const forms = s.forms as Record<string, { schema: unknown }> | undefined;
    if (!forms) return state;

    const migratedForms: Record<string, unknown> = {};
    for (const [id, entry] of Object.entries(forms)) {
      const schema = entry.schema as LegacyFormSchema;
      const isAlreadyV2 =
        'mode' in schema && 'steps' in schema && 'settings' in schema;

      migratedForms[id] = {
        ...entry,
        schema: isAlreadyV2
          ? (schema as unknown as FormSchema)
          : migrateV1toV2(schema),
        // Undo/redo stacks used a different snapshot shape — clear them.
        undoStack: [],
        redoStack: [],
      };
    }

    return { ...s, forms: migratedForms } as unknown as PersistedState;
  },
};
