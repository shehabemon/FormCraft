/**
 * Utility functions for the Settings / Storage panel.
 * All functions are client-side only — never call during SSR.
 */

import type { FormSchema } from '@/types/form';

const PERSIST_KEY = 'persist:formcraft';

/**
 * Parse the redux-persist localStorage entry and return all FormSchema objects
 * found in it. Used by the migration modal to detect guest forms before DB
 * hydration has overwritten the Redux store.
 *
 * Returns an empty array when localStorage is unavailable or contains no forms.
 */
export function readLocalForms(): FormSchema[] {
  try {
    const raw = localStorage.getItem(PERSIST_KEY);
    if (!raw) return [];

    const outer = JSON.parse(raw) as Record<string, string>;
    if (!outer['form']) return [];

    // redux-persist double-serialises slice state
    const formSlice = JSON.parse(outer['form']) as {
      forms?: Record<string, { schema: FormSchema }>;
    };

    const entries = Object.values(formSlice.forms ?? {});
    return entries.map((e) => e.schema);
  } catch {
    return [];
  }
}


interface StorageUsage {
  /** Bytes used by the FormCraft persist key. */
  used: number;
  /** Approximate total localStorage capacity in bytes (typically 5MB). */
  total: number;
  /** Percentage of total used by FormCraft (0–100). */
  percent: number;
}

/**
 * Returns how much localStorage FormCraft is consuming.
 * Uses 5 242 880 bytes (5 MiB) as the conventional browser quota.
 */
export function getStorageUsage(): StorageUsage {
  const QUOTA = 5 * 1024 * 1024;
  try {
    const raw = localStorage.getItem(PERSIST_KEY) ?? '';
    const used = new Blob([raw]).size;
    return {
      used,
      total: QUOTA,
      percent: Math.round((used / QUOTA) * 100),
    };
  } catch {
    return { used: 0, total: QUOTA, percent: 0 };
  }
}


/**
 * Removes the FormCraft persist key from localStorage, wiping all saved form data.
 * The Redux store in memory is NOT touched — page reload picks up the empty state.
 */
export function clearAllForms(): void {
  try {
    localStorage.removeItem(PERSIST_KEY);
  } catch {
    // Silently fail — the Settings panel can show a toast on error
  }
}


/**
 * Serialise the raw persisted FormCraft data to a JSON string suitable for
 * file download. Returns an empty JSON object string if no data exists.
 *
 * The returned string is the content to write to a `.json` file.
 */
export function exportAllForms(): string {
  try {
    const raw = localStorage.getItem(PERSIST_KEY);
    if (!raw) return '{}';

    const parsed = JSON.parse(raw) as Record<string, string>;
    // redux-persist double-serialises each slice — parse inner JSON for readability
    const expanded: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (key === '_persist') {
        expanded[key] = value;
        continue;
      }
      try {
        expanded[key] = JSON.parse(value);
      } catch {
        expanded[key] = value;
      }
    }

    return JSON.stringify(expanded, null, 2);
  } catch {
    return '{}';
  }
}


/**
 * Convenience wrapper: calls exportAllForms() and triggers a browser download.
 * The filename includes the current date for easy identification.
 */
export function downloadAllForms(): void {
  const content = exportAllForms();
  const date = new Date().toISOString().slice(0, 10);
  const filename = `formcraft-backup-${date}.json`;

  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
