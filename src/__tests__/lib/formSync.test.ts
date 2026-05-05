import { fetchUserForms, upsertForm, deleteForm, importForms } from '@/lib/supabase/formSync';
import { makeForm } from '../fixtures';
import type { SupabaseClient } from '@supabase/supabase-js';


function makeMockClient(overrides: {
  selectResult?: { data: unknown; error: unknown };
  upsertResult?: { error: unknown };
  deleteResult?: { error: unknown };
  session?: unknown;
} = {}): SupabaseClient {
  const {
    selectResult = { data: [], error: null },
    upsertResult = { error: null },
    deleteResult = { error: null },
    session = { user: { id: 'user-123' } },
  } = overrides;

  const deleteBuilder = { eq: jest.fn().mockResolvedValue(deleteResult) };
  const selectBuilder = {
    select: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue(selectResult),
  };

  return {
    from: jest.fn().mockImplementation((table: string) => {
      if (table === 'forms') {
        return {
          select: jest.fn().mockReturnValue(selectBuilder),
          upsert: jest.fn().mockResolvedValue(upsertResult),
          delete: jest.fn().mockReturnValue(deleteBuilder),
        };
      }
      return {};
    }),
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session } }),
    },
  } as unknown as SupabaseClient;
}


describe('fetchUserForms', () => {
  it('returns parsed FormSchema array from content column', async () => {
    const form = makeForm();
    const client = makeMockClient({
      selectResult: { data: [{ content: form }], error: null },
    });
    const result = await fetchUserForms(client);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(form.id);
  });

  it('returns empty array when no rows returned', async () => {
    const client = makeMockClient({ selectResult: { data: [], error: null } });
    const result = await fetchUserForms(client);
    expect(result).toEqual([]);
  });

  it('throws when Supabase returns an error', async () => {
    const client = makeMockClient({
      selectResult: { data: null, error: new Error('DB error') },
    });
    await expect(fetchUserForms(client)).rejects.toThrow('DB error');
  });
});


describe('upsertForm', () => {
  it('calls upsert with correct row shape', async () => {
    const form = makeForm();
    const client = makeMockClient();
    const fromSpy = client.from as jest.Mock;

    await upsertForm(client, form);

    expect(fromSpy).toHaveBeenCalledWith('forms');
    const upsertCall = fromSpy.mock.results[0].value.upsert;
    expect(upsertCall).toHaveBeenCalledWith(
      expect.objectContaining({
        id: form.id,
        user_id: 'user-123',
        title: form.title,
      }),
      { onConflict: 'id' },
    );
  });

  it('no-ops when session is null', async () => {
    const form = makeForm();
    const client = makeMockClient({ session: null });
    const fromSpy = client.from as jest.Mock;

    await upsertForm(client, form);
    // upsert should never be called
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('throws when upsert returns an error', async () => {
    const form = makeForm();
    const client = makeMockClient({ upsertResult: { error: new Error('write fail') } });
    await expect(upsertForm(client, form)).rejects.toThrow('write fail');
  });
});


describe('deleteForm', () => {
  it('calls delete with the form id', async () => {
    const client = makeMockClient();
    const fromSpy = client.from as jest.Mock;

    await deleteForm(client, 'form-abc');

    expect(fromSpy).toHaveBeenCalledWith('forms');
    const deleteBuilder = fromSpy.mock.results[0].value.delete();
    expect(deleteBuilder.eq).toHaveBeenCalledWith('id', 'form-abc');
  });

  it('throws when delete returns an error', async () => {
    const client = makeMockClient({ deleteResult: { error: new Error('delete fail') } });
    await expect(deleteForm(client, 'form-abc')).rejects.toThrow('delete fail');
  });
});


describe('importForms', () => {
  it('no-ops when forms array is empty', async () => {
    const client = makeMockClient();
    const fromSpy = client.from as jest.Mock;
    await importForms(client, []);
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('bulk-upserts all forms', async () => {
    const forms = [makeForm({ id: 'f1' }), makeForm({ id: 'f2' })];
    const client = makeMockClient();
    const fromSpy = client.from as jest.Mock;

    await importForms(client, forms);

    expect(fromSpy).toHaveBeenCalledWith('forms');
    const upsertCall = fromSpy.mock.results[0].value.upsert;
    expect(upsertCall).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'f1', user_id: 'user-123' }),
        expect.objectContaining({ id: 'f2', user_id: 'user-123' }),
      ]),
      { onConflict: 'id' },
    );
  });

  it('no-ops when session is null', async () => {
    const forms = [makeForm()];
    const client = makeMockClient({ session: null });
    const fromSpy = client.from as jest.Mock;
    await importForms(client, forms);
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('throws when upsert returns an error', async () => {
    const forms = [makeForm()];
    const client = makeMockClient({ upsertResult: { error: new Error('bulk fail') } });
    await expect(importForms(client, forms)).rejects.toThrow('bulk fail');
  });
});
