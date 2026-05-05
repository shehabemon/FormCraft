import { createSlice, createSelector, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type { FieldSchema, FormSchema, StepSchema, FormMode, FormSettings } from '@/types/form';
import { DEFAULT_FORM_SCHEMA } from '@/constants/defaults';

export const loadFormsFromDB = createAsyncThunk<FormSchema[], void>(
  'form/loadFormsFromDB',
  async (_, { rejectWithValue }) => {
    try {
      const [{ createClient }, { fetchUserForms }] = await Promise.all([
        import('@/lib/supabase/client'),
        import('@/lib/supabase/formSync'),
      ]);
      const client = createClient();
      return await fetchUserForms(client);
    } catch (err) {
      return rejectWithValue(
        err instanceof Error ? err.message : 'Failed to load forms from database',
      );
    }
  },
);

const MAX_UNDO_HISTORY = 50;
const UNDO_DEBOUNCE_MS = 500;

interface FormSnapshot {
  fields: FieldSchema[];
  steps: StepSchema[];
  mode: FormMode;
}

interface FormEntry {
  schema: FormSchema;
  undoStack: FormSnapshot[];
  redoStack: FormSnapshot[];
  lastUndoPushAt: number;
}

export interface FormState {
  forms: Record<string, FormEntry>;
  activeFormId: string | null;
  dbSyncStatus: 'idle' | 'loading' | 'error';
}

const initialState: FormState = {
  forms: {},
  activeFormId: null,
  dbSyncStatus: 'idle',
};

function getActive(state: FormState): FormEntry | null {
  if (!state.activeFormId) return null;
  return state.forms[state.activeFormId] ?? null;
}

function snapshotOf(schema: FormSchema): FormSnapshot {
  return {
    fields: JSON.parse(JSON.stringify(schema.fields)) as FieldSchema[],
    steps: JSON.parse(JSON.stringify(schema.steps)) as StepSchema[],
    mode: schema.mode,
  };
}

function pushUndo(entry: FormEntry): void {
  entry.undoStack.push(snapshotOf(entry.schema));
  if (entry.undoStack.length > MAX_UNDO_HISTORY) {
    entry.undoStack.shift();
  }
  entry.redoStack = [];
  entry.lastUndoPushAt = Date.now();
}

function restoreSnapshot(schema: FormSchema, snapshot: FormSnapshot): void {
  schema.fields = snapshot.fields;
  schema.steps = snapshot.steps;
  schema.mode = snapshot.mode;
}

export const formSlice = createSlice({
  name: 'form',
  initialState,
  reducers: {
    createForm(state, action: PayloadAction<FormSchema>) {
      const schema = action.payload;
      state.forms[schema.id] = {
        schema,
        undoStack: [],
        redoStack: [],
        lastUndoPushAt: 0,
      };
      state.activeFormId = schema.id;
    },

    deleteForm(state, action: PayloadAction<string>) {
      const id = action.payload;
      delete state.forms[id];
      if (state.activeFormId === id) {
        state.activeFormId = null;
      }
    },

    setActiveForm(state, action: PayloadAction<string>) {
      if (state.forms[action.payload]) {
        state.activeFormId = action.payload;
      }
    },

    clearActiveForm(state) {
      state.activeFormId = null;
    },

    resetAllForms(state) {
      state.forms = {};
      state.activeFormId = null;
    },

    addField(
      state,
      action: PayloadAction<{ field: FieldSchema; index?: number }>,
    ) {
      const entry = getActive(state);
      if (!entry) return;
      pushUndo(entry);
      const { field, index } = action.payload;
      if (index !== undefined && index >= 0 && index <= entry.schema.fields.length) {
        entry.schema.fields.splice(index, 0, field);
      } else {
        entry.schema.fields.push(field);
      }
      entry.schema.updatedAt = new Date().toISOString();
    },

    removeField(state, action: PayloadAction<string>) {
      const entry = getActive(state);
      if (!entry) return;
      pushUndo(entry);
      const deletedId = action.payload;
      entry.schema.fields = entry.schema.fields.filter((f) => f.id !== deletedId);

      for (const field of entry.schema.fields) {
        if (!field.conditional.enabled) continue;
        const before = field.conditional.rules.length;
        field.conditional.rules = field.conditional.rules.filter(
          (r) => r.sourceFieldId !== deletedId,
        );
        if (field.conditional.rules.length === 0 && before > 0) {
          field.conditional.enabled = false;
        }
      }
      entry.schema.updatedAt = new Date().toISOString();
    },

    updateField(
      state,
      action: PayloadAction<{ id: string; changes: Partial<FieldSchema> }>,
    ) {
      const entry = getActive(state);
      if (!entry) return;
      const { id, changes } = action.payload;
      const idx = entry.schema.fields.findIndex((f) => f.id === id);
      if (idx === -1) return;
      if (Date.now() - entry.lastUndoPushAt >= UNDO_DEBOUNCE_MS) pushUndo(entry);
      entry.schema.fields[idx] = { ...entry.schema.fields[idx], ...changes };
      entry.schema.updatedAt = new Date().toISOString();
    },

    reorderFields(
      state,
      action: PayloadAction<{ activeIndex: number; overIndex: number }>,
    ) {
      const entry = getActive(state);
      if (!entry) return;
      const { activeIndex, overIndex } = action.payload;
      const fields = entry.schema.fields;
      if (
        activeIndex < 0 || overIndex < 0 ||
        activeIndex >= fields.length || overIndex >= fields.length ||
        activeIndex === overIndex
      ) return;
      pushUndo(entry);
      const [moved] = fields.splice(activeIndex, 1);
      fields.splice(overIndex, 0, moved);
      entry.schema.updatedAt = new Date().toISOString();
    },

    duplicateField(
      state,
      action: PayloadAction<{ id: string; newId: string; newName: string }>,
    ) {
      const entry = getActive(state);
      if (!entry) return;
      const { id, newId, newName } = action.payload;
      const idx = entry.schema.fields.findIndex((f) => f.id === id);
      if (idx === -1) return;
      pushUndo(entry);
      const original = entry.schema.fields[idx];
      const clone: FieldSchema = {
        ...JSON.parse(JSON.stringify(original)) as FieldSchema,
        id: newId,
        name: newName,
        conditional: { enabled: false, action: 'show', logic: 'all', rules: [] },
      };
      entry.schema.fields.splice(idx + 1, 0, clone);
      entry.schema.updatedAt = new Date().toISOString();
    },

    setFormMeta(
      state,
      action: PayloadAction<{ title?: string; description?: string }>,
    ) {
      const entry = getActive(state);
      if (!entry) return;
      const { title, description } = action.payload;
      if (title !== undefined) entry.schema.title = title;
      if (description !== undefined) entry.schema.description = description;
      entry.schema.updatedAt = new Date().toISOString();
    },

    loadSchema(state, action: PayloadAction<FormSchema>) {
      const entry = getActive(state);
      if (!entry) return;
      pushUndo(entry);
      entry.schema = { ...action.payload, id: entry.schema.id };
      entry.schema.updatedAt = new Date().toISOString();
    },

    clearForm(state) {
      const entry = getActive(state);
      if (!entry) return;
      pushUndo(entry);
      entry.schema.fields = [];
      entry.schema.title = 'Untitled Form';
      entry.schema.description = '';
      entry.schema.updatedAt = new Date().toISOString();
    },

    undo(state) {
      const entry = getActive(state);
      if (!entry || entry.undoStack.length === 0) return;
      entry.redoStack.push(snapshotOf(entry.schema));
      restoreSnapshot(entry.schema, entry.undoStack.pop()!);
      entry.schema.updatedAt = new Date().toISOString();
    },

    redo(state) {
      const entry = getActive(state);
      if (!entry || entry.redoStack.length === 0) return;
      entry.undoStack.push(snapshotOf(entry.schema));
      restoreSnapshot(entry.schema, entry.redoStack.pop()!);
      entry.schema.updatedAt = new Date().toISOString();
    },


    addStep(state, action: PayloadAction<StepSchema>) {
      const entry = getActive(state);
      if (!entry) return;
      pushUndo(entry);
      entry.schema.steps.push(action.payload);
      entry.schema.updatedAt = new Date().toISOString();
    },

    removeStep(state, action: PayloadAction<string>) {
      const entry = getActive(state);
      if (!entry) return;
      pushUndo(entry);
      const stepId = action.payload;
      entry.schema.steps = entry.schema.steps.filter((s) => s.id !== stepId);
      // Unassign fields that belonged to the deleted step
      for (const field of entry.schema.fields) {
        if (field.stepId === stepId) field.stepId = '';
      }
      entry.schema.updatedAt = new Date().toISOString();
    },

    reorderSteps(
      state,
      action: PayloadAction<{ activeIndex: number; overIndex: number }>,
    ) {
      const entry = getActive(state);
      if (!entry) return;
      const { activeIndex, overIndex } = action.payload;
      const steps = entry.schema.steps;
      if (
        activeIndex < 0 || overIndex < 0 ||
        activeIndex >= steps.length || overIndex >= steps.length ||
        activeIndex === overIndex
      ) return;
      pushUndo(entry);
      const [moved] = steps.splice(activeIndex, 1);
      steps.splice(overIndex, 0, moved);
      entry.schema.updatedAt = new Date().toISOString();
    },

    updateStep(
      state,
      action: PayloadAction<{ id: string; changes: Partial<StepSchema> }>,
    ) {
      const entry = getActive(state);
      if (!entry) return;
      const { id, changes } = action.payload;
      const idx = entry.schema.steps.findIndex((s) => s.id === id);
      if (idx === -1) return;
      entry.schema.steps[idx] = { ...entry.schema.steps[idx], ...changes };
      entry.schema.updatedAt = new Date().toISOString();
    },

    moveFieldToStep(
      state,
      action: PayloadAction<{ fieldId: string; stepId: string }>,
    ) {
      const entry = getActive(state);
      if (!entry) return;
      const { fieldId, stepId } = action.payload;
      const field = entry.schema.fields.find((f) => f.id === fieldId);
      if (!field) return;
      pushUndo(entry);
      field.stepId = stepId;
      entry.schema.updatedAt = new Date().toISOString();
    },

    setFormMode(state, action: PayloadAction<FormMode>) {
      const entry = getActive(state);
      if (!entry) return;
      pushUndo(entry);
      entry.schema.mode = action.payload;
      entry.schema.updatedAt = new Date().toISOString();
    },

    updateFormSettings(state, action: PayloadAction<Partial<FormSettings>>) {
      const entry = getActive(state);
      if (!entry) return;
      entry.schema.settings = { ...entry.schema.settings, ...action.payload };
      entry.schema.updatedAt = new Date().toISOString();
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadFormsFromDB.pending, (state) => {
        state.dbSyncStatus = 'loading';
      })
      .addCase(loadFormsFromDB.fulfilled, (state, action) => {
        state.dbSyncStatus = 'idle';
        // DB is authoritative — replace the forms map wholesale.
        // Preserve undo/redo stacks for any form that was already open.
        const next: Record<string, FormEntry> = {};
        for (const schema of action.payload) {
          const existing = state.forms[schema.id];
          next[schema.id] = {
            schema,
            // Carry over undo/redo stacks for the active form so the user
            // doesn't lose their in-session history on a re-fetch.
            undoStack: existing?.undoStack ?? [],
            redoStack: existing?.redoStack ?? [],
            lastUndoPushAt: existing?.lastUndoPushAt ?? 0,
          };
        }
        state.forms = next;
        // If the previously active form no longer exists in the DB, clear it.
        if (state.activeFormId && !next[state.activeFormId]) {
          state.activeFormId = null;
        }
      })
      .addCase(loadFormsFromDB.rejected, (state) => {
        state.dbSyncStatus = 'error';
      });
  },
});

export const {
  createForm,
  deleteForm,
  setActiveForm,
  clearActiveForm,
  resetAllForms,
  addField,
  removeField,
  updateField,
  reorderFields,
  duplicateField,
  setFormMeta,
  loadSchema,
  clearForm,
  undo,
  redo,
  addStep,
  removeStep,
  reorderSteps,
  updateStep,
  moveFieldToStep,
  setFormMode,
  updateFormSettings,
} = formSlice.actions;

export const selectActiveFormId = (state: RootState): string | null =>
  state.form.activeFormId;

export const selectAllForms = createSelector(
  (state: RootState) => state.form.forms,
  (forms): FormSchema[] =>
    Object.values(forms)
      .map((e) => e.schema)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
);

// Falls back to empty schema when no form is active — avoids null checks in every consumer.
export const selectFormSchema = (state: RootState): FormSchema =>
  state.form.activeFormId
    ? (state.form.forms[state.form.activeFormId]?.schema ?? DEFAULT_FORM_SCHEMA)
    : DEFAULT_FORM_SCHEMA;

export const selectAllFields = (state: RootState): FieldSchema[] =>
  selectFormSchema(state).fields;

export const selectFormMeta = createSelector(
  selectFormSchema,
  (schema): Pick<FormSchema, 'title' | 'description'> => ({
    title: schema.title,
    description: schema.description,
  }),
);

export const selectFieldCount = (state: RootState): number =>
  selectAllFields(state).length;

export const selectFieldById = (
  state: RootState,
  fieldId: string,
): FieldSchema | undefined =>
  selectAllFields(state).find((f) => f.id === fieldId);

export const selectCanUndo = (state: RootState): boolean => {
  const entry = state.form.activeFormId
    ? state.form.forms[state.form.activeFormId]
    : null;
  return (entry?.undoStack.length ?? 0) > 0;
};

export const selectCanRedo = (state: RootState): boolean => {
  const entry = state.form.activeFormId
    ? state.form.forms[state.form.activeFormId]
    : null;
  return (entry?.redoStack.length ?? 0) > 0;
};

export const selectFieldsReferencingField = (
  state: RootState,
  fieldId: string,
): FieldSchema[] =>
  selectAllFields(state).filter((f) =>
    f.conditional.rules.some((r) => r.sourceFieldId === fieldId),
  );

export const selectInputFields = createSelector(
  selectAllFields,
  (fields): FieldSchema[] =>
    fields.filter((f) => !['heading', 'paragraph', 'divider'].includes(f.type)),
);


export const selectSteps = (state: RootState): StepSchema[] =>
  selectFormSchema(state).steps;

export const selectStepCount = (state: RootState): number =>
  selectSteps(state).length;

export const selectFormMode = (state: RootState): FormMode =>
  selectFormSchema(state).mode;

export const selectFormSettings = (state: RootState): FormSettings =>
  selectFormSchema(state).settings;

export const selectStepById = (
  state: RootState,
  stepId: string,
): StepSchema | undefined =>
  selectSteps(state).find((s) => s.id === stepId);

export const selectFieldsByStepId = createSelector(
  selectAllFields,
  (_: RootState, stepId: string) => stepId,
  (fields, stepId): FieldSchema[] =>
    fields.filter((f) => f.stepId === stepId),
);

export const selectActiveStepFields = (
  state: RootState,
  activeStepId: string,
): FieldSchema[] =>
  selectAllFields(state).filter((f) => f.stepId === activeStepId);

export const selectDbSyncStatus = (
  state: RootState,
): FormState['dbSyncStatus'] => state.form.dbSyncStatus;

export default formSlice.reducer;
