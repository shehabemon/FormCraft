import {
  createListenerMiddleware,
  addListener,
  isAnyOf,
} from '@reduxjs/toolkit';
import type { TypedAddListener, TypedStartListening } from '@reduxjs/toolkit';
import { toast } from 'sonner';

// Import types only — never import the store object here (circular dependency).
import type { RootState, AppDispatch } from './index';

import {
  createForm,
  deleteForm as deleteFormAction,
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
  loadFormsFromDB,
} from './slices/formSlice';

import { initAuth, setUser } from './slices/authSlice';

export const listenerMiddleware = createListenerMiddleware();

type AppStartListening = TypedStartListening<RootState, AppDispatch>;
const startListening = listenerMiddleware.startListening as AppStartListening;

export type AppAddListener = TypedAddListener<RootState, AppDispatch>;
export const addAppListener = addListener as AppAddListener;

function isAuthenticated(state: RootState): boolean {
  return state.auth.status === 'authenticated';
}

/** Lazily build the Supabase browser client. Returns null if env vars are absent. */
async function getSupabaseClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return null;
  }
  const { createClient } = await import('@/lib/supabase/client');
  return createClient();
}

// On sign-in (boot via initAuth or live change via setUser): load forms from DB.
startListening({
  matcher: isAnyOf(initAuth.fulfilled, setUser),
  effect: async (action, listenerApi) => {
    const state = listenerApi.getState();
    if (!isAuthenticated(state)) return;
    if (action.type === setUser.type && action.payload === null) return;
    listenerApi.dispatch(loadFormsFromDB());
  },
});

startListening({
  actionCreator: createForm,
  effect: async (action, listenerApi) => {
    if (!isAuthenticated(listenerApi.getState())) return;
    const client = await getSupabaseClient();
    if (!client) return;
    try {
      const { upsertForm } = await import('@/lib/supabase/formSync');
      await upsertForm(client, action.payload);
    } catch (err) {
      console.error('[sync] createForm upsert failed:', err);
      toast.error('Could not save form to cloud.', { duration: 4000 });
    }
  },
});

startListening({
  actionCreator: deleteFormAction,
  effect: async (action, listenerApi) => {
    if (!isAuthenticated(listenerApi.getState())) return;
    const client = await getSupabaseClient();
    if (!client) return;
    try {
      const { deleteForm: dbDeleteForm } = await import('@/lib/supabase/formSync');
      await dbDeleteForm(client, action.payload);
    } catch (err) {
      console.error('[sync] deleteForm failed:', err);
      toast.error('Could not delete form from cloud.', { duration: 4000 });
    }
  },
});

// Debounced upsert for all other mutations — avoids a DB write per keystroke.
const DEBOUNCE_MS = 1000;

startListening({
  matcher: isAnyOf(
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
  ),
  effect: async (_action, listenerApi) => {
    if (!isAuthenticated(listenerApi.getState())) return;

    // Cancel any in-flight invocation so we only sync DEBOUNCE_MS after the last mutation.
    listenerApi.cancelActiveListeners();
    await listenerApi.delay(DEBOUNCE_MS);

    const state = listenerApi.getState();
    if (!isAuthenticated(state)) return;

    const { activeFormId, forms } = state.form;
    if (!activeFormId || !forms[activeFormId]) return;

    const schema = forms[activeFormId].schema;
    const client = await getSupabaseClient();
    if (!client) return;

    try {
      const { upsertForm } = await import('@/lib/supabase/formSync');
      await upsertForm(client, schema);
    } catch (err) {
      console.error('[sync] upsert failed:', err);
      toast.error('Cloud sync failed — changes saved locally.', { duration: 4000 });
    }
  },
});
