import { configureStore } from '@reduxjs/toolkit';
import formReducer, {
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
  clearForm,
  undo,
  redo,
  addStep,
  removeStep,
  updateStep,
  moveFieldToStep,
  setFormMode,
  updateFormSettings,
  selectAllForms,
  selectFormSchema,
  selectCanUndo,
  selectCanRedo,
  selectDbSyncStatus,
  loadFormsFromDB,
  type FormState,
} from '@/store/slices/formSlice';
import { makeForm, makeField, makeStep } from '../fixtures';


function makeStore(preloaded?: Partial<FormState>) {
  return configureStore({
    reducer: { form: formReducer },
    preloadedState: preloaded ? { form: preloaded as FormState } : undefined,
  });
}

/** Build a store that already has one active form. */
function storeWithActiveForm(fields = 0) {
  const schema = makeForm({ fields: Array.from({ length: fields }, (_, i) => makeField({ id: `f${i}`, name: `field_${i}` })) });
  const store = makeStore({
    forms: {
      [schema.id]: { schema, undoStack: [], redoStack: [], lastUndoPushAt: 0 },
    },
    activeFormId: schema.id,
    dbSyncStatus: 'idle',
  });
  return { store, schema };
}


describe('createForm', () => {
  it('adds the form and sets it as active', () => {
    const store = makeStore();
    const schema = makeForm();
    store.dispatch(createForm(schema));

    const state = store.getState().form;
    expect(state.forms[schema.id]).toBeDefined();
    expect(state.activeFormId).toBe(schema.id);
  });

  it('initialises undo/redo stacks empty', () => {
    const store = makeStore();
    const schema = makeForm();
    store.dispatch(createForm(schema));

    const entry = store.getState().form.forms[schema.id];
    expect(entry.undoStack).toHaveLength(0);
    expect(entry.redoStack).toHaveLength(0);
  });
});


describe('deleteForm', () => {
  it('removes the form', () => {
    const { store, schema } = storeWithActiveForm();
    store.dispatch(deleteForm(schema.id));
    expect(store.getState().form.forms[schema.id]).toBeUndefined();
  });

  it('clears activeFormId when the active form is deleted', () => {
    const { store, schema } = storeWithActiveForm();
    store.dispatch(deleteForm(schema.id));
    expect(store.getState().form.activeFormId).toBeNull();
  });

  it('does not clear activeFormId when a different form is deleted', () => {
    const { store, schema } = storeWithActiveForm();
    store.dispatch(deleteForm('nonexistent-id'));
    expect(store.getState().form.activeFormId).toBe(schema.id);
  });
});


describe('setActiveForm', () => {
  it('sets the active form when it exists', () => {
    const { store, schema } = storeWithActiveForm();
    store.dispatch(clearActiveForm());
    store.dispatch(setActiveForm(schema.id));
    expect(store.getState().form.activeFormId).toBe(schema.id);
  });

  it('ignores unknown ids', () => {
    const { store } = storeWithActiveForm();
    store.dispatch(setActiveForm('bogus'));
    // activeFormId stays on the real form
    expect(store.getState().form.activeFormId).toBe('form-abc');
  });
});

describe('clearActiveForm', () => {
  it('sets activeFormId to null', () => {
    const { store } = storeWithActiveForm();
    store.dispatch(clearActiveForm());
    expect(store.getState().form.activeFormId).toBeNull();
  });
});


describe('resetAllForms', () => {
  it('clears all forms and active id', () => {
    const { store } = storeWithActiveForm();
    store.dispatch(resetAllForms());
    const state = store.getState().form;
    expect(state.forms).toEqual({});
    expect(state.activeFormId).toBeNull();
  });
});


describe('addField', () => {
  it('appends a field when no index given', () => {
    const { store, schema } = storeWithActiveForm();
    const field = makeField({ id: 'new-field' });
    store.dispatch(addField({ field }));
    const fields = store.getState().form.forms[schema.id].schema.fields;
    expect(fields).toHaveLength(1);
    expect(fields[0].id).toBe('new-field');
  });

  it('inserts at the given index', () => {
    const { store, schema } = storeWithActiveForm(2);
    const field = makeField({ id: 'inserted' });
    store.dispatch(addField({ field, index: 1 }));
    const fields = store.getState().form.forms[schema.id].schema.fields;
    expect(fields[1].id).toBe('inserted');
    expect(fields).toHaveLength(3);
  });

  it('pushes an undo snapshot', () => {
    const { store, schema } = storeWithActiveForm();
    store.dispatch(addField({ field: makeField() }));
    expect(store.getState().form.forms[schema.id].undoStack).toHaveLength(1);
  });

  it('no-ops when no active form', () => {
    const store = makeStore({ forms: {}, activeFormId: null, dbSyncStatus: 'idle' });
    store.dispatch(addField({ field: makeField() }));
    expect(store.getState().form.forms).toEqual({});
  });
});


describe('removeField', () => {
  it('removes the specified field', () => {
    const { store, schema } = storeWithActiveForm(2);
    store.dispatch(removeField('f0'));
    const fields = store.getState().form.forms[schema.id].schema.fields;
    expect(fields).toHaveLength(1);
    expect(fields[0].id).toBe('f1');
  });

  it('disables conditional rules that reference the deleted field', () => {
    const dependentField = makeField({
      id: 'dep',
      name: 'dependent',
      conditional: {
        enabled: true,
        action: 'show',
        logic: 'all',
        rules: [{ id: 'r1', sourceFieldId: 'f0', operator: 'equals', value: 'yes' }],
      },
    });
    const schema = makeForm({ fields: [makeField({ id: 'f0', name: 'f0' }), dependentField] });
    const store = makeStore({
      forms: { [schema.id]: { schema, undoStack: [], redoStack: [], lastUndoPushAt: 0 } },
      activeFormId: schema.id,
      dbSyncStatus: 'idle',
    });

    store.dispatch(removeField('f0'));

    const depAfter = store.getState().form.forms[schema.id].schema.fields.find(f => f.id === 'dep')!;
    expect(depAfter.conditional.enabled).toBe(false);
    expect(depAfter.conditional.rules).toHaveLength(0);
  });

  it('pushes an undo snapshot', () => {
    const { store, schema } = storeWithActiveForm(1);
    store.dispatch(removeField('f0'));
    expect(store.getState().form.forms[schema.id].undoStack.length).toBeGreaterThan(0);
  });
});


describe('updateField', () => {
  it('merges changes into the target field', () => {
    const { store, schema } = storeWithActiveForm(1);
    store.dispatch(updateField({ id: 'f0', changes: { label: 'Updated Label' } }));
    const field = store.getState().form.forms[schema.id].schema.fields[0];
    expect(field.label).toBe('Updated Label');
  });

  it('ignores unknown field ids', () => {
    const { store, schema } = storeWithActiveForm(1);
    const fieldsBefore = store.getState().form.forms[schema.id].schema.fields;
    store.dispatch(updateField({ id: 'nonexistent', changes: { label: 'x' } }));
    expect(store.getState().form.forms[schema.id].schema.fields).toEqual(fieldsBefore);
  });
});


describe('reorderFields', () => {
  it('moves a field from one index to another', () => {
    const { store, schema } = storeWithActiveForm(3);
    const before = store.getState().form.forms[schema.id].schema.fields.map(f => f.id);
    store.dispatch(reorderFields({ activeIndex: 0, overIndex: 2 }));
    const after = store.getState().form.forms[schema.id].schema.fields.map(f => f.id);
    expect(after[2]).toBe(before[0]);
    expect(after[0]).toBe(before[1]);
  });

  it('no-ops when activeIndex === overIndex', () => {
    const { store, schema } = storeWithActiveForm(2);
    const before = store.getState().form.forms[schema.id].schema.fields.map(f => f.id);
    store.dispatch(reorderFields({ activeIndex: 0, overIndex: 0 }));
    expect(store.getState().form.forms[schema.id].schema.fields.map(f => f.id)).toEqual(before);
  });

  it('no-ops on out-of-bounds indices', () => {
    const { store, schema } = storeWithActiveForm(2);
    const before = store.getState().form.forms[schema.id].schema.fields.map(f => f.id);
    store.dispatch(reorderFields({ activeIndex: 0, overIndex: 99 }));
    expect(store.getState().form.forms[schema.id].schema.fields.map(f => f.id)).toEqual(before);
  });
});


describe('duplicateField', () => {
  it('inserts a copy immediately after the original', () => {
    const { store, schema } = storeWithActiveForm(2);
    store.dispatch(duplicateField({ id: 'f0', newId: 'f0-copy', newName: 'field_0_copy' }));
    const ids = store.getState().form.forms[schema.id].schema.fields.map(f => f.id);
    expect(ids).toEqual(['f0', 'f0-copy', 'f1']);
  });

  it('resets conditional rules on the duplicate', () => {
    const field = makeField({
      id: 'src',
      name: 'src',
      conditional: { enabled: true, action: 'show', logic: 'all', rules: [{ id: 'r1', sourceFieldId: 'x', operator: 'equals', value: 'y' }] },
    });
    const schema = makeForm({ fields: [field] });
    const store = makeStore({
      forms: { [schema.id]: { schema, undoStack: [], redoStack: [], lastUndoPushAt: 0 } },
      activeFormId: schema.id,
      dbSyncStatus: 'idle',
    });
    store.dispatch(duplicateField({ id: 'src', newId: 'src-copy', newName: 'src_copy' }));
    const copy = store.getState().form.forms[schema.id].schema.fields.find(f => f.id === 'src-copy')!;
    expect(copy.conditional.enabled).toBe(false);
    expect(copy.conditional.rules).toHaveLength(0);
  });
});


describe('setFormMeta', () => {
  it('updates title', () => {
    const { store, schema } = storeWithActiveForm();
    store.dispatch(setFormMeta({ title: 'New Title' }));
    expect(store.getState().form.forms[schema.id].schema.title).toBe('New Title');
  });

  it('updates description independently', () => {
    const { store, schema } = storeWithActiveForm();
    store.dispatch(setFormMeta({ description: 'Desc' }));
    expect(store.getState().form.forms[schema.id].schema.description).toBe('Desc');
    expect(store.getState().form.forms[schema.id].schema.title).toBe('Test Form');
  });
});


describe('clearForm', () => {
  it('removes all fields and resets title', () => {
    const { store, schema } = storeWithActiveForm(3);
    store.dispatch(setFormMeta({ title: 'My Form' }));
    store.dispatch(clearForm());
    const s = store.getState().form.forms[schema.id].schema;
    expect(s.fields).toHaveLength(0);
    expect(s.title).toBe('Untitled Form');
  });
});


describe('undo/redo', () => {
  it('reverts the last mutation', () => {
    const { store, schema } = storeWithActiveForm();
    store.dispatch(addField({ field: makeField({ id: 'new' }) }));
    expect(store.getState().form.forms[schema.id].schema.fields).toHaveLength(1);

    store.dispatch(undo());
    expect(store.getState().form.forms[schema.id].schema.fields).toHaveLength(0);
  });

  it('redo re-applies after undo', () => {
    const { store, schema } = storeWithActiveForm();
    store.dispatch(addField({ field: makeField({ id: 'new' }) }));
    store.dispatch(undo());
    store.dispatch(redo());
    expect(store.getState().form.forms[schema.id].schema.fields).toHaveLength(1);
  });

  it('clears redo stack on new mutation after undo', () => {
    const { store, schema } = storeWithActiveForm();
    store.dispatch(addField({ field: makeField({ id: 'a' }) }));
    store.dispatch(undo());
    store.dispatch(addField({ field: makeField({ id: 'b' }) }));
    expect(selectCanRedo({ form: store.getState().form } as never)).toBe(false);
  });

  it('no-ops undo when stack is empty', () => {
    const { store, schema } = storeWithActiveForm(1);
    store.dispatch(undo()); // stack is empty
    expect(store.getState().form.forms[schema.id].schema.fields).toHaveLength(1);
  });

  it('selectCanUndo / selectCanRedo are correct', () => {
    const { store } = storeWithActiveForm();
    expect(selectCanUndo({ form: store.getState().form } as never)).toBe(false);
    store.dispatch(addField({ field: makeField() }));
    expect(selectCanUndo({ form: store.getState().form } as never)).toBe(true);
    store.dispatch(undo());
    expect(selectCanRedo({ form: store.getState().form } as never)).toBe(true);
  });
});


describe('addStep / removeStep / updateStep', () => {
  it('addStep appends a step', () => {
    const { store, schema } = storeWithActiveForm();
    const step = makeStep();
    store.dispatch(addStep(step));
    expect(store.getState().form.forms[schema.id].schema.steps).toHaveLength(1);
  });

  it('removeStep removes by id', () => {
    const step = makeStep();
    const formSchema = makeForm({ steps: [step] });
    const store = makeStore({
      forms: { [formSchema.id]: { schema: formSchema, undoStack: [], redoStack: [], lastUndoPushAt: 0 } },
      activeFormId: formSchema.id,
      dbSyncStatus: 'idle',
    });
    store.dispatch(removeStep('step-1'));
    expect(store.getState().form.forms[formSchema.id].schema.steps).toHaveLength(0);
  });

  it('updateStep merges changes', () => {
    const step = makeStep();
    const formSchema = makeForm({ steps: [step] });
    const store = makeStore({
      forms: { [formSchema.id]: { schema: formSchema, undoStack: [], redoStack: [], lastUndoPushAt: 0 } },
      activeFormId: formSchema.id,
      dbSyncStatus: 'idle',
    });
    store.dispatch(updateStep({ id: 'step-1', changes: { title: 'Updated' } }));
    expect(store.getState().form.forms[formSchema.id].schema.steps[0].title).toBe('Updated');
  });
});


describe('moveFieldToStep', () => {
  it('assigns the stepId on the field', () => {
    const { store, schema } = storeWithActiveForm(1);
    store.dispatch(moveFieldToStep({ fieldId: 'f0', stepId: 'step-x' }));
    expect(store.getState().form.forms[schema.id].schema.fields[0].stepId).toBe('step-x');
  });
});


describe('setFormMode', () => {
  it('switches mode to multi', () => {
    const { store, schema } = storeWithActiveForm();
    store.dispatch(setFormMode('multi'));
    expect(store.getState().form.forms[schema.id].schema.mode).toBe('multi');
  });
});


describe('updateFormSettings', () => {
  it('merges partial settings', () => {
    const { store, schema } = storeWithActiveForm();
    store.dispatch(updateFormSettings({ showProgressBar: false }));
    const settings = store.getState().form.forms[schema.id].schema.settings;
    expect(settings.showProgressBar).toBe(false);
    expect(settings.stepIndicator).toBe('numbered');
  });
});


describe('loadFormsFromDB thunk', () => {
  it('sets dbSyncStatus to loading on pending', () => {
    const store = makeStore();
    store.dispatch({ type: loadFormsFromDB.pending.type });
    expect(store.getState().form.dbSyncStatus).toBe('loading');
  });

  it('replaces forms map on fulfilled', () => {
    const { store } = storeWithActiveForm(2);
    const dbForms = [makeForm({ id: 'db-form-1', title: 'From DB' })];
    store.dispatch({ type: loadFormsFromDB.fulfilled.type, payload: dbForms });

    const state = store.getState().form;
    expect(Object.keys(state.forms)).toEqual(['db-form-1']);
    expect(state.dbSyncStatus).toBe('idle');
  });

  it('preserves undo/redo stacks for the form that was active', () => {
    const { store, schema } = storeWithActiveForm();
    // Give the active form an undo entry
    store.dispatch(addField({ field: makeField() }));
    const undoBefore = store.getState().form.forms[schema.id].undoStack.length;

    // DB returns the same form id
    const dbForms = [makeForm({ id: schema.id })];
    store.dispatch({ type: loadFormsFromDB.fulfilled.type, payload: dbForms });

    expect(store.getState().form.forms[schema.id].undoStack.length).toBe(undoBefore);
  });

  it('clears activeFormId when active form is absent from DB result', () => {
    const { store } = storeWithActiveForm();
    store.dispatch({ type: loadFormsFromDB.fulfilled.type, payload: [] });
    expect(store.getState().form.activeFormId).toBeNull();
  });

  it('sets dbSyncStatus to error on rejected', () => {
    const store = makeStore();
    store.dispatch({ type: loadFormsFromDB.rejected.type });
    expect(store.getState().form.dbSyncStatus).toBe('error');
  });
});


describe('selectors', () => {
  it('selectAllForms returns schemas sorted by updatedAt descending', () => {
    const older = makeForm({ id: 'old', updatedAt: '2024-01-01T00:00:00.000Z' });
    const newer = makeForm({ id: 'new', updatedAt: '2024-06-01T00:00:00.000Z' });
    const store = makeStore({
      forms: {
        old: { schema: older, undoStack: [], redoStack: [], lastUndoPushAt: 0 },
        new: { schema: newer, undoStack: [], redoStack: [], lastUndoPushAt: 0 },
      },
      activeFormId: null,
      dbSyncStatus: 'idle',
    });
    const all = selectAllForms(store.getState() as never);
    expect(all[0].id).toBe('new');
  });

  it('selectFormSchema falls back to DEFAULT_FORM_SCHEMA when no active form', () => {
    const store = makeStore({ forms: {}, activeFormId: null, dbSyncStatus: 'idle' });
    const schema = selectFormSchema(store.getState() as never);
    expect(schema.id).toBe('');
  });

  it('selectDbSyncStatus reflects current status', () => {
    const store = makeStore({ forms: {}, activeFormId: null, dbSyncStatus: 'loading' });
    expect(selectDbSyncStatus(store.getState() as never)).toBe('loading');
  });
});
