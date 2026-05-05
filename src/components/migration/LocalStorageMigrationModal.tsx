'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Upload, Trash2, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { useAppDispatch } from '@/store/hooks';
import { resetAllForms } from '@/store/slices/formSlice';
import { clearAllForms } from '@/lib/localStorage';
import { createClient } from '@/lib/supabase/client';
import { importForms } from '@/lib/supabase/formSync';
import type { FormSchema } from '@/types/form';

const MIGRATION_FLAG_PREFIX = 'formcraft_migrated_';

/** Mark this user's migration as done so the modal never re-appears. */
export function setMigrationFlag(userId: string): void {
  try {
    localStorage.setItem(`${MIGRATION_FLAG_PREFIX}${userId}`, '1');
  } catch {
    // localStorage unavailable — ignore
  }
}

/** Returns true if this user has not yet been through the migration flow. */
export function needsMigration(userId: string, localForms: FormSchema[]): boolean {
  if (localForms.length === 0) return false;
  try {
    return !localStorage.getItem(`${MIGRATION_FLAG_PREFIX}${userId}`);
  } catch {
    return false;
  }
}

interface Props {
  open: boolean;
  forms: FormSchema[];
  onDone: () => void;
}

export function LocalStorageMigrationModal({ open, forms, onDone }: Props) {
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);

  /** Wipe local Redux + localStorage state and resolve the modal. */
  const clearLocal = () => {
    dispatch(resetAllForms());
    clearAllForms();
  };

  const handleImport = async () => {
    setLoading(true);
    try {
      const client = createClient();
      await importForms(client, forms);
      clearLocal();
      toast.success(
        `${forms.length} form${forms.length !== 1 ? 's' : ''} imported successfully`,
      );
    } catch (err) {
      console.error('[migration] import failed:', err);
      toast.error('Import failed — your forms are still saved locally.');
      // Don't set the flag: let the user retry next time.
      setLoading(false);
      return;
    }
    onDone();
  };

  const handleDiscard = () => {
    clearLocal();
    onDone();
  };

  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false} className="max-w-md">
        <DialogHeader>
          {/* Icon badge */}
          <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--color-primary-subtle)] flex items-center justify-center mb-2">
            <Upload size={18} className="text-[var(--color-primary)]" />
          </div>

          <DialogTitle>Import your saved forms?</DialogTitle>
          <DialogDescription>
            We found{' '}
            <span className="font-semibold text-[var(--color-text-default)]">
              {forms.length} form{forms.length !== 1 ? 's' : ''}
            </span>{' '}
            saved on this device from before you signed in. Import them into your
            account to access them anywhere.
          </DialogDescription>
        </DialogHeader>

        {/* Form list preview — up to 4 items */}
        <ul className="space-y-1.5 my-1">
          {forms.slice(0, 4).map((form) => (
            <li
              key={form.id}
              className="flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-md)] bg-[var(--color-stone-50)] border border-[var(--color-border)]"
            >
              <FileText
                size={13}
                className="shrink-0 text-[var(--color-text-muted)]"
              />
              <span className="font-sans text-[0.8125rem] text-[var(--color-text-secondary)] truncate">
                {form.title || 'Untitled Form'}
              </span>
              <span className="ml-auto font-sans text-[0.72rem] text-[var(--color-text-muted)] shrink-0">
                {form.fields.length} field{form.fields.length !== 1 ? 's' : ''}
              </span>
            </li>
          ))}
          {forms.length > 4 && (
            <li className="font-sans text-[0.75rem] text-[var(--color-text-muted)] pl-3">
              +{forms.length - 4} more
            </li>
          )}
        </ul>

        <DialogFooter className="mt-4">
          {/* Discard */}
          <button
            type="button"
            onClick={handleDiscard}
            disabled={loading}
            className="
              inline-flex items-center gap-1.5
              h-9 px-3 rounded-[var(--radius-md)]
              font-sans text-[0.8125rem] text-[var(--color-text-muted)]
              hover:text-[var(--color-error)] hover:bg-[var(--color-error-subtle)]
              transition-colors duration-150
              disabled:opacity-50 disabled:pointer-events-none
            "
          >
            <Trash2 size={13} />
            Discard and continue
          </button>

          {/* Import */}
          <Button
            variant="default"
            size="sm"
            onClick={handleImport}
            disabled={loading}
            className="gap-2 min-w-[120px]"
          >
            {loading ? (
              <>
                <svg
                  className="w-3.5 h-3.5 animate-spin shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Importing…
              </>
            ) : (
              <>
                <Upload size={13} />
                Import forms
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
