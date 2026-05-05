import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from './database.types';
import type { FormSchema } from '@/types/form';

type Client = SupabaseClient<Database>;

/**
 * Fetch all forms owned by the authenticated user, ordered by most recently
 * updated. The `content` JSONB column is the full serialised FormSchema.
 */
export async function fetchUserForms(client: Client): Promise<FormSchema[]> {
  const { data, error } = await client
    .from('forms')
    .select('content')
    .order('updated_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => row.content as unknown as FormSchema);
}

/**
 * Insert or update a single form row. The form's Redux-generated UUID is used
 * as the primary key so IDs are stable across DB and client.
 *
 * user_id is resolved from the current session (no network call — reads from
 * the cached auth token).
 */
export async function upsertForm(client: Client, form: FormSchema): Promise<void> {
  const {
    data: { session },
  } = await client.auth.getSession();

  if (!session) return; // no-op if session has already expired

  const { error } = await client.from('forms').upsert(
    {
      id: form.id,
      user_id: session.user.id,
      title: form.title,
      content: form as unknown as Json,
    },
    { onConflict: 'id' },
  );

  if (error) throw error;
}

/**
 * Hard-delete a form row. Silently no-ops if the row does not exist (e.g.
 * the form was created locally and never synced).
 */
export async function deleteForm(client: Client, formId: string): Promise<void> {
  const { error } = await client.from('forms').delete().eq('id', formId);

  if (error) throw error;
}

/**
 * Bulk-upsert an array of forms. Used for the localStorage→Supabase migration
 * flow: all local forms are sent in a single round-trip.
 */
export async function importForms(
  client: Client,
  forms: FormSchema[],
): Promise<void> {
  if (forms.length === 0) return;

  const {
    data: { session },
  } = await client.auth.getSession();

  if (!session) return;

  const rows = forms.map((form) => ({
    id: form.id,
    user_id: session.user.id,
    title: form.title,
    content: form as unknown as Json,
  }));

  const { error } = await client.from('forms').upsert(rows, { onConflict: 'id' });

  if (error) throw error;
}
