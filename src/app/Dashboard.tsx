'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { springSnappy } from '@/lib/motion';
import {
  Plus, Sparkles, FileText, Trash2, ExternalLink,
  AlignLeft, ToggleLeft, ChevronsUpDown, Hash, CheckSquare,
  Calendar, Minus, Heading1, Sliders, Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn, makeNewForm } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { createForm, deleteForm, resetAllForms, selectAllForms, selectDbSyncStatus } from '@/store/slices/formSlice';
import { selectAuthUser, selectIsAuthenticated } from '@/store/slices/authSlice';
import { UserMenu } from '@/components/auth/UserMenu';
import type { FormSchema, FieldSchema, FieldType } from '@/types/form';

function relativeTime(iso: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
}

const TYPE_ICON: Partial<Record<FieldType, React.ElementType>> = {
  text: AlignLeft, textarea: AlignLeft, number: Hash,
  email: AlignLeft, phone: Hash, url: AlignLeft,
  select: ChevronsUpDown, multiselect: ChevronsUpDown,
  radio: ToggleLeft, checkbox: CheckSquare, checkboxGroup: CheckSquare,
  date: Calendar, time: Clock, range: Sliders,
  heading: Heading1, divider: Minus,
};

function MiniField({ field }: { field: FieldSchema }) {
  const Icon = TYPE_ICON[field.type] ?? FileText;
  const isLayout = ['heading', 'paragraph', 'divider'].includes(field.type);

  if (field.type === 'divider') {
    return <div className="w-full h-px bg-[var(--color-border)] my-0.5" />;
  }

  if (isLayout) {
    return (
      <div className="flex items-center gap-1.5">
        <Icon size={9} className="text-[var(--color-text-muted)] shrink-0" />
        <div className="h-2 rounded-sm bg-[var(--color-stone-300)] flex-1 max-w-24" />
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      <div className="h-1.5 rounded-sm bg-[var(--color-stone-300)] w-16" />
      <div className="flex items-center gap-1 h-4 px-1.5 rounded bg-[var(--color-stone-100)] border border-[var(--color-border)]">
        <Icon size={7} className="text-[var(--color-stone-400)] shrink-0" />
        <div className="h-1 rounded-sm bg-[var(--color-stone-200)] flex-1" />
      </div>
    </div>
  );
}


function DeleteConfirmPopup({
  title,
  onConfirm,
  onCancel,
}: {
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: -4 }}
      transition={{ duration: 0.12 }}
      className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] bg-white/95 backdrop-blur-sm border border-[var(--color-error)]/20 p-4 text-center"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="w-8 h-8 rounded-full bg-[var(--color-error)]/10 flex items-center justify-center">
        <Trash2 size={14} className="text-[var(--color-error)]" />
      </div>
      <div>
        <p className="font-sans text-[0.8125rem] font-semibold text-[var(--color-text-primary)]">
          Delete "{title}"?
        </p>
        <p className="font-sans text-[0.72rem] text-[var(--color-text-muted)] mt-0.5">
          This cannot be undone.
        </p>
      </div>
      <div className="flex items-center gap-2 w-full">
        <button
          onClick={onCancel}
          className="flex-1 h-7 rounded-[var(--radius-md)] border border-[var(--color-border)] font-sans text-[0.75rem] text-[var(--color-text-secondary)] hover:bg-[var(--color-stone-100)] transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 h-7 rounded-[var(--radius-md)] bg-[var(--color-error)] font-sans text-[0.75rem] font-semibold text-white hover:opacity-90 transition-opacity"
        >
          Delete
        </button>
      </div>
    </motion.div>
  );
}


function FormCard({ form }: { form: FormSchema }) {
  const dispatch = useAppDispatch();
  const router   = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const inputCount = form.fields.filter(
    (f) => !['heading', 'paragraph', 'divider'].includes(f.type),
  ).length;
  const totalCount = form.fields.length;
  const preview    = form.fields.slice(0, 4);

  const handleOpen = useCallback(() => {
    router.push(`/builder/${form.id}`);
  }, [form.id, router]);

  const handleDelete = useCallback(() => {
    dispatch(deleteForm(form.id));
    toast.success(`"${form.title}" deleted`);
  }, [dispatch, form.id, form.title]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
      className="group relative bg-white rounded-[var(--radius-lg)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/40 hover:shadow-[var(--shadow-md)] transition-all duration-200 cursor-pointer overflow-hidden"
      onClick={() => !confirmDelete && handleOpen()}
    >
      <div className="px-4 pt-4 pb-3 min-h-[120px]">
        <div className="space-y-1.5">
          {preview.length > 0 ? (
            preview.map((f) => <MiniField key={f.id} field={f} />)
          ) : (
            <div className="flex items-center justify-center h-16 text-center">
              <p className="font-sans text-[0.72rem] text-[var(--color-text-muted)]">
                No fields yet
              </p>
            </div>
          )}
          {form.fields.length > 4 && (
            <p className="font-sans text-[0.68rem] text-[var(--color-text-muted)]">
              +{form.fields.length - 4} more
            </p>
          )}
        </div>
      </div>

      <div className="h-px bg-[var(--color-border)]" />

      <div className="px-4 py-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-sans text-[0.875rem] font-semibold text-[var(--color-text-primary)] truncate leading-tight">
            {form.title || 'Untitled Form'}
          </p>
          <p className="font-sans text-[0.72rem] text-[var(--color-text-muted)] mt-0.5">
            {totalCount === 0
              ? 'Empty form'
              : `${inputCount} field${inputCount !== 1 ? 's' : ''}`}
            {' · '}
            {relativeTime(form.updatedAt)}
          </p>
        </div>
      </div>

      <div
        className={cn(
          'absolute inset-x-0 bottom-0 flex items-center justify-between px-3 py-2',
          'bg-gradient-to-t from-white via-white to-transparent',
          'opacity-0 group-hover:opacity-100 transition-opacity duration-150',
          confirmDelete && 'opacity-0 pointer-events-none',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleOpen}
          className="flex items-center gap-1.5 h-7 px-2.5 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-white font-sans text-[0.75rem] font-semibold hover:bg-[var(--color-primary-hover)] transition-colors"
        >
          <ExternalLink size={11} />
          Open
        </button>
        <button
          onClick={() => setConfirmDelete(true)}
          className="flex items-center justify-center w-7 h-7 rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:bg-[#FFF1F2] hover:text-[var(--color-error)] transition-colors"
          title="Delete form"
        >
          <Trash2 size={13} />
        </button>
      </div>

      <AnimatePresence>
        {confirmDelete && (
          <DeleteConfirmPopup
            title={form.title || 'Untitled Form'}
            onConfirm={handleDelete}
            onCancel={() => setConfirmDelete(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}


function NewFormCard() {
  const dispatch = useAppDispatch();
  const router   = useRouter();

  const handleCreate = useCallback(() => {
    const schema = makeNewForm();
    dispatch(createForm(schema));
    router.push(`/builder/${schema.id}`);
  }, [dispatch, router]);

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
      onClick={handleCreate}
      className={cn(
        'group relative flex flex-col items-center justify-center gap-3',
        'bg-white rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--color-border)]',
        'hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)]',
        'transition-all duration-200 cursor-pointer p-8',
        'min-h-[200px]',
      )}
    >
      <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--color-stone-100)] group-hover:bg-[var(--color-primary)] flex items-center justify-center transition-colors duration-200">
        <Plus size={18} className="text-[var(--color-text-muted)] group-hover:text-white transition-colors duration-200" />
      </div>
      <div className="text-center">
        <p className="font-display text-[0.875rem] font-semibold text-[var(--color-text-secondary)] group-hover:text-[var(--color-primary)] transition-colors duration-200">
          New Form
        </p>
        <p className="font-sans text-[0.75rem] text-[var(--color-text-muted)] mt-0.5">
          New form
        </p>
      </div>
    </motion.button>
  );
}


function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
      className="flex flex-col items-center justify-center gap-8 py-24 px-8 text-center"
    >
      <div className="relative">
        <div className="w-32 h-40 rounded-[var(--radius-xl)] bg-white border border-[var(--color-border)] shadow-[var(--shadow-lg)] flex flex-col gap-2 px-4 py-4 overflow-hidden">
          {[70, 100, 60, 80].map((w, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.07 }}
            >
              <div className="h-1.5 rounded-full bg-[var(--color-stone-200)] mb-1" style={{ width: `${w * 0.5}%` }} />
              <div className="h-5 rounded-[4px] bg-[var(--color-stone-100)] border border-[var(--color-border)] w-full" />
            </motion.div>
          ))}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-auto h-5 rounded-[4px] bg-[var(--color-primary)] w-full"
          />
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, ...springSnappy }}
          className="absolute -top-3 -right-4 flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--color-ai-accent)] shadow-sm"
        >
          <Sparkles size={9} className="text-white" />
          <span className="font-sans text-[0.65rem] font-semibold text-white">AI</span>
        </motion.div>
      </div>

      <div className="max-w-sm space-y-3">
        <h2 className="font-display text-[1.5rem] font-bold text-[var(--color-text-primary)] tracking-[-0.02em]">
          No forms yet
        </h2>
        <p className="font-sans text-[0.9375rem] text-[var(--color-text-muted)] leading-relaxed">
          Create one to get started.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onCreate}
          className="flex items-center gap-2 h-10 px-5 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-white font-sans text-[0.875rem] font-semibold hover:bg-[var(--color-primary-hover)] transition-colors shadow-sm"
        >
          <Plus size={15} />
          New form
        </button>
      </div>
    </motion.div>
  );
}


function StoragePopover() {
  const [open, setOpen] = useState(false);
  const [usage, setUsage] = useState({ used: 0, total: 5 * 1024 * 1024, percent: 0 });
  const [confirmClear, setConfirmClear] = useState(false);
  const dispatch = useAppDispatch();

  const refreshUsage = useCallback(() => {
    if (typeof window === 'undefined') return;
    import('@/lib/localStorage').then(({ getStorageUsage }) => {
      setUsage(getStorageUsage());
    });
  }, []);

  const fmt = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const handleExport = useCallback(() => {
    import('@/lib/localStorage').then(({ downloadAllForms }) => {
      downloadAllForms();
      toast.success('Backup downloaded');
    });
  }, []);

  const handleClear = useCallback(() => {
    dispatch(resetAllForms());
    import('@/lib/localStorage').then(({ clearAllForms }) => {
      clearAllForms();
    });
    setConfirmClear(false);
    setOpen(false);
    toast.success('All forms cleared');
  }, [dispatch]);

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); refreshUsage(); }}
        className="flex items-center gap-1.5 h-7 px-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white font-sans text-[0.75rem] text-[var(--color-text-muted)] hover:bg-[var(--color-stone-100)] hover:text-[var(--color-text-secondary)] transition-colors"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Settings
      </button>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setConfirmClear(false); }} />

      <motion.div
        initial={{ opacity: 0, y: -6, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: 0.97 }}
        transition={{ duration: 0.14 }}
        className="absolute top-full right-0 mt-1.5 z-50 w-72 bg-white rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-lg)] p-4 space-y-4"
      >
        <div>
          <p className="font-sans text-[0.8125rem] font-semibold text-[var(--color-text-primary)]">
            Storage
          </p>
          <div className="mt-2.5 space-y-2">
            <div className="h-1.5 w-full rounded-full bg-[var(--color-stone-200)] overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(usage.percent, 100)}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{
                  background: usage.percent > 80
                    ? 'var(--color-error)'
                    : usage.percent > 60
                    ? 'var(--color-warning)'
                    : 'var(--color-primary)',
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="font-sans text-[0.72rem] text-[var(--color-text-muted)]">
                {fmt(usage.used)} used
              </span>
              <span className="font-sans text-[0.72rem] text-[var(--color-text-muted)]">
                ~{fmt(usage.total)} limit
              </span>
            </div>
            {usage.percent > 80 && (
              <p className="font-sans text-[0.72rem] text-[var(--color-warning)] font-medium">
                ⚠ Storage is almost full. Consider exporting or clearing old forms.
              </p>
            )}
          </div>
        </div>

        <div className="h-px bg-[var(--color-border)]" />

        <div className="space-y-2">
          <button
            onClick={handleExport}
            className="w-full h-8 px-3 rounded-[var(--radius-md)] bg-[var(--color-stone-100)] border border-[var(--color-border)] font-sans text-[0.8125rem] text-[var(--color-text-secondary)] hover:bg-[var(--color-stone-200)] transition-colors text-left flex items-center gap-2"
          >
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export all forms (JSON backup)
          </button>

          {!confirmClear ? (
            <button
              onClick={() => setConfirmClear(true)}
              className="w-full h-8 px-3 rounded-[var(--radius-md)] border border-[var(--color-error)]/30 font-sans text-[0.8125rem] text-[var(--color-error)] hover:bg-[var(--color-error)]/5 transition-colors text-left flex items-center gap-2"
            >
              <Trash2 size={13} className="shrink-0" />
              Clear all forms
            </button>
          ) : (
            <div className="space-y-1.5">
              <p className="font-sans text-[0.75rem] text-[var(--color-text-muted)] px-1">
                This will permanently delete all forms. Are you sure?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmClear(false)}
                  className="flex-1 h-7 rounded-[var(--radius-md)] border border-[var(--color-border)] font-sans text-[0.75rem] text-[var(--color-text-secondary)] hover:bg-[var(--color-stone-100)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClear}
                  className="flex-1 h-7 rounded-[var(--radius-md)] bg-[var(--color-error)] font-sans text-[0.75rem] font-semibold text-white hover:opacity-90 transition-opacity"
                >
                  Delete all
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}


function GuestBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
      className="flex items-center justify-between gap-4 px-4 py-3 mb-6 rounded-[var(--radius-lg)] bg-[var(--color-primary-subtle)] border border-[var(--color-primary)]/20"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-7 h-7 rounded-full bg-[var(--color-primary)]/15 flex items-center justify-center shrink-0">
          <svg className="w-3.5 h-3.5 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <p className="font-sans text-[0.8125rem] text-[var(--color-primary)] leading-snug">
          <span className="font-semibold">Forms are saved locally.</span>{' '}
          <span className="hidden sm:inline">Sign in to sync them across all your devices.</span>
        </p>
      </div>
      <a
        href="/auth/login"
        className="shrink-0 inline-flex items-center h-7 px-3 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-white font-sans text-[0.75rem] font-semibold hover:bg-[var(--color-primary-hover)] transition-colors"
      >
        Sign in
      </a>
    </motion.div>
  );
}


function FormCardSkeleton() {
  return (
    <div className="bg-white rounded-[var(--radius-lg)] border border-[var(--color-border)] overflow-hidden">
      <div className="px-4 pt-4 pb-3 min-h-[120px] space-y-2.5">
        {[72, 100, 55, 85].map((w, i) => (
          <div key={i} className="space-y-1">
            <div
              className="h-1.5 rounded-full bg-[var(--color-stone-200)] animate-pulse"
              style={{ width: `${w * 0.45}%` }}
            />
            <div className="h-4 rounded-[var(--radius-sm)] bg-[var(--color-stone-100)] animate-pulse w-full" />
          </div>
        ))}
      </div>
      <div className="h-px bg-[var(--color-border)]" />
      <div className="px-4 py-3 space-y-1.5">
        <div className="h-3 rounded-full bg-[var(--color-stone-200)] animate-pulse w-2/3" />
        <div className="h-2.5 rounded-full bg-[var(--color-stone-100)] animate-pulse w-1/3" />
      </div>
    </div>
  );
}


export default function Dashboard() {
  const router          = useRouter();
  const dispatch        = useAppDispatch();
  const forms           = useAppSelector(selectAllForms);
  const dbSyncStatus    = useAppSelector(selectDbSyncStatus);
  const authUser        = useAppSelector(selectAuthUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  const isLoadingForms = isAuthenticated && dbSyncStatus === 'loading';

  const handleCreateForm = useCallback(() => {
    const schema = makeNewForm();
    dispatch(createForm(schema));
    router.push(`/builder/${schema.id}`);
  }, [dispatch, router]);

  return (
    <div className="min-h-dvh bg-[var(--color-stone-50)]" style={{ fontFamily: 'var(--font-sans)' }}>

      <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-white/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-7 h-7 rounded-[var(--radius-md)] bg-[var(--color-primary)] flex items-center justify-center shadow-sm">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
            </div>
            <div>
              <span className="font-display text-[0.9375rem] font-bold tracking-[-0.02em] text-[var(--color-text-primary)]">
                FormCraft
              </span>
              <span className="hidden sm:inline font-sans text-[0.72rem] text-[var(--color-text-muted)] ml-2">
                Visual form builder
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 relative">
            <StoragePopover />
            <button
              onClick={handleCreateForm}
              className="flex items-center gap-1.5 h-8 px-3 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-white font-sans text-[0.8125rem] font-semibold hover:bg-[var(--color-primary-hover)] transition-colors shadow-sm"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">New Form</span>
            </button>
            <UserMenu compact />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">

        {!isAuthenticated && <GuestBanner />}

        {isLoadingForms ? (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="h-5 w-28 rounded-full bg-[var(--color-stone-200)] animate-pulse" />
                <div className="h-3.5 w-16 rounded-full bg-[var(--color-stone-100)] animate-pulse mt-2" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <FormCardSkeleton key={i} />
              ))}
            </div>
          </>
        ) : forms.length === 0 ? (
          <EmptyState onCreate={handleCreateForm} />
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="font-display text-[1.25rem] font-bold text-[var(--color-text-primary)] tracking-[-0.02em]">
                  {isAuthenticated && authUser
                    ? `Welcome back${authUser.name ? `, ${authUser.name.split(' ')[0]}` : ''}`
                    : 'My Forms'}
                </h1>
                <p className="font-sans text-[0.8125rem] text-[var(--color-text-muted)] mt-0.5">
                  {forms.length} form{forms.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <motion.div
              layout
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            >
              <NewFormCard />
              <AnimatePresence mode="popLayout">
                {forms.map((form) => (
                  <FormCard key={form.id} form={form} />
                ))}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </main>
    </div>
  );
}
