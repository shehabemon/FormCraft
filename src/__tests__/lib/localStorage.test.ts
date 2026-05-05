import { readLocalForms, getStorageUsage, clearAllForms, exportAllForms } from '@/lib/localStorage';
import { makeForm } from '../fixtures';

const PERSIST_KEY = 'persist:formcraft';

function writePersistedForms(forms: Record<string, { schema: ReturnType<typeof makeForm> }>) {
  const inner = JSON.stringify({ forms });
  const outer = JSON.stringify({ form: inner });
  localStorage.setItem(PERSIST_KEY, outer);
}

beforeEach(() => {
  localStorage.clear();
});


describe('readLocalForms', () => {
  it('returns empty array when localStorage is empty', () => {
    expect(readLocalForms()).toEqual([]);
  });

  it('returns empty array when persist key is missing', () => {
    localStorage.setItem('some-other-key', 'data');
    expect(readLocalForms()).toEqual([]);
  });

  it('returns empty array when form slice is absent from persist blob', () => {
    localStorage.setItem(PERSIST_KEY, JSON.stringify({ brand: '{}' }));
    expect(readLocalForms()).toEqual([]);
  });

  it('returns empty array when form slice has no forms', () => {
    const inner = JSON.stringify({ forms: {} });
    localStorage.setItem(PERSIST_KEY, JSON.stringify({ form: inner }));
    expect(readLocalForms()).toEqual([]);
  });

  it('parses and returns form schemas from double-serialised persist blob', () => {
    const form1 = makeForm({ id: 'f1', title: 'Form One' });
    const form2 = makeForm({ id: 'f2', title: 'Form Two' });
    writePersistedForms({
      f1: { schema: form1 },
      f2: { schema: form2 },
    });

    const result = readLocalForms();
    expect(result).toHaveLength(2);
    const ids = result.map(f => f.id).sort();
    expect(ids).toEqual(['f1', 'f2']);
  });

  it('returns empty array when outer JSON is malformed', () => {
    localStorage.setItem(PERSIST_KEY, 'not-json{{{');
    expect(readLocalForms()).toEqual([]);
  });

  it('returns empty array when inner form JSON is malformed', () => {
    localStorage.setItem(PERSIST_KEY, JSON.stringify({ form: 'not-json{{{' }));
    expect(readLocalForms()).toEqual([]);
  });
});


describe('getStorageUsage', () => {
  it('returns the correct shape with total = 5 MiB', () => {
    const usage = getStorageUsage();
    expect(typeof usage.used).toBe('number');
    expect(typeof usage.percent).toBe('number');
    expect(usage.total).toBe(5 * 1024 * 1024);
  });

  it('percent is always between 0 and 100', () => {
    const form = makeForm();
    writePersistedForms({ [form.id]: { schema: form } });
    const usage = getStorageUsage();
    expect(usage.percent).toBeGreaterThanOrEqual(0);
    expect(usage.percent).toBeLessThanOrEqual(100);
  });

  it('used is always a non-negative number', () => {
    const form = makeForm();
    writePersistedForms({ [form.id]: { schema: form } });
    const usage = getStorageUsage();
    expect(usage.used).toBeGreaterThanOrEqual(0);
  });

  it('percent is consistent with used/total', () => {
    const form = makeForm();
    writePersistedForms({ [form.id]: { schema: form } });
    const { used, total, percent } = getStorageUsage();
    expect(percent).toBe(Math.round((used / total) * 100));
  });
});


describe('clearAllForms', () => {
  it('removes the persist key from localStorage', () => {
    const form = makeForm();
    writePersistedForms({ [form.id]: { schema: form } });
    expect(localStorage.getItem(PERSIST_KEY)).not.toBeNull();

    clearAllForms();
    expect(localStorage.getItem(PERSIST_KEY)).toBeNull();
  });

  it('does not throw when key is already absent', () => {
    expect(() => clearAllForms()).not.toThrow();
  });
});


describe('exportAllForms', () => {
  it('returns "{}" when persist key is absent', () => {
    expect(exportAllForms()).toBe('{}');
  });

  it('returns a JSON string containing the form data', () => {
    const form = makeForm({ id: 'export-test', title: 'Exported' });
    writePersistedForms({ [form.id]: { schema: form } });

    const result = exportAllForms();
    const parsed = JSON.parse(result) as Record<string, unknown>;

    // The function expands the inner form slice JSON
    expect(parsed).toHaveProperty('form');
    const formSlice = parsed['form'] as { forms: Record<string, { schema: ReturnType<typeof makeForm> }> };
    expect(formSlice.forms['export-test'].schema.title).toBe('Exported');
  });

  it('preserves _persist key as-is (not double-parsed)', () => {
    const inner = JSON.stringify({ forms: {} });
    const persistMeta = JSON.stringify({ version: 2, rehydrated: true });
    localStorage.setItem(PERSIST_KEY, JSON.stringify({ form: inner, _persist: persistMeta }));

    const result = exportAllForms();
    const parsed = JSON.parse(result) as Record<string, unknown>;
    // _persist is kept as its raw string value
    expect(parsed['_persist']).toBe(persistMeta);
  });

  it('handles keys with non-JSON values gracefully', () => {
    localStorage.setItem(PERSIST_KEY, JSON.stringify({ someKey: 'not-json{{{' }));
    const result = exportAllForms();
    const parsed = JSON.parse(result) as Record<string, unknown>;
    // Falls back to the raw string when inner parse fails
    expect(parsed['someKey']).toBe('not-json{{{');
  });

  it('returns "{}" when the outer blob is malformed', () => {
    localStorage.setItem(PERSIST_KEY, 'corrupted{');
    expect(exportAllForms()).toBe('{}');
  });
});
