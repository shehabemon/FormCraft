'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Undo2, Redo2, Sparkles, Download, Eye, PencilLine,
  Monitor, Tablet, Smartphone, HardDrive, Save, Keyboard, Check,
  ChevronRight, ChevronDown, Plus, FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/Tooltip';
import { UserMenu } from '@/components/auth/UserMenu';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import {
  selectFormMeta, selectCanUndo, selectCanRedo, setFormMeta, undo, redo,
  selectAllForms, selectActiveFormId, clearActiveForm, createForm, setActiveForm,
} from '@/store/slices/formSlice';
import {
  selectViewMode, selectPreviewDevice,
  setViewMode, setPreviewDevice,
  openAIModal, openExportModal, openShortcutsModal,
  selectField,
} from '@/store/slices/uiSlice';
import { getStorageUsage } from '@/lib/localStorage';
import { useSaveIndicator } from '@/hooks/useSaveIndicator';
import type { PreviewMode } from '@/types/ui';
import { cn, makeNewForm } from '@/lib/utils';


function InlineTitle() {
  const dispatch = useAppDispatch();
  const { title } = useAppSelector(selectFormMeta);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(title); }, [title]);

  const commit = useCallback(() => {
    const trimmed = draft.trim() || 'Untitled Form';
    dispatch(setFormMeta({ title: trimmed }));
    setDraft(trimmed);
    setEditing(false);
  }, [draft, dispatch]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') { setDraft(title); setEditing(false); }
  };

  useEffect(() => {
    if (editing) {
      inputRef.current?.select();
    }
  }, [editing]);

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          className={cn(
            'min-w-0 w-48 max-w-64 h-7 px-2',
            'rounded-[var(--radius-md)] border border-[var(--color-primary)]',
            'bg-white text-[var(--color-text-primary)]',
            'font-display text-[0.9375rem] font-semibold tracking-[-0.01em]',
            'ring-2 ring-[var(--color-primary)] ring-offset-1 outline-none',
            'transition-all duration-150'
          )}
          maxLength={80}
          autoFocus
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          className={cn(
            'group flex items-center gap-1.5 min-w-0 h-7 px-2 -mx-2',
            'rounded-[var(--radius-md)]',
            'hover:bg-[var(--color-stone-100)]',
            'transition-colors duration-150'
          )}
        >
          <span className="font-display text-[0.9375rem] font-semibold tracking-[-0.01em] text-[var(--color-text-primary)] truncate max-w-52">
            {title}
          </span>
          <PencilLine
            size={12}
            className="shrink-0 text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity duration-150"
          />
        </button>
      )}
    </div>
  );
}


function StorageIndicator() {
  const [usage, setUsage] = useState({ used: 0, total: 5 * 1024 * 1024, percent: 0 });

  useEffect(() => {
    const update = () => setUsage(getStorageUsage());
    update();
    const id = setInterval(update, 8000);
    return () => clearInterval(id);
  }, []);

  const fmt = (bytes: number) => {
    if (bytes < 1024) return `${bytes}b`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}kb`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}mb`;
  };

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-[var(--radius-sm)] bg-[var(--color-stone-100)] border border-[var(--color-border)]">
      <HardDrive size={11} className="text-[var(--color-text-muted)] shrink-0" />
      <span className="font-sans text-[0.6875rem] font-medium text-[var(--color-text-muted)] tracking-[0.02em]">
        {fmt(usage.used)} saved
      </span>
      {usage.percent > 60 && (
        <div
          className="w-8 h-1 rounded-full overflow-hidden bg-[var(--color-stone-200)]"
          title={`${usage.percent}% of storage used`}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${usage.percent}%`,
              backgroundColor: usage.percent > 80 ? 'var(--color-error)' : 'var(--color-warning)',
            }}
          />
        </div>
      )}
    </div>
  );
}


const DEVICES: { id: PreviewMode; icon: React.ElementType; label: string }[] = [
  { id: 'desktop', icon: Monitor, label: 'Desktop' },
  { id: 'tablet', icon: Tablet, label: 'Tablet (768px)' },
  { id: 'mobile', icon: Smartphone, label: 'Mobile (375px)' },
];

function DeviceSwitcher() {
  const dispatch = useAppDispatch();
  const current = useAppSelector(selectPreviewDevice);

  return (
    <div className="flex items-center gap-px bg-[var(--color-stone-100)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-0.5">
      {DEVICES.map(({ id, icon: Icon, label }) => (
        <Tooltip key={id}>
          <TooltipTrigger
            render={
              <button
                onClick={() => dispatch(setPreviewDevice(id))}
                className={cn(
                  'flex items-center justify-center w-7 h-7 rounded-[calc(var(--radius-md)-2px)]',
                  'transition-all duration-150',
                  current === id
                    ? 'bg-white text-[var(--color-text-primary)] shadow-[var(--shadow-xs)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-stone-150)]'
                )}
              />
            }
          >
            <Icon size={14} />
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}


function UndoRedoButtons() {
  const dispatch = useAppDispatch();
  const canUndo = useAppSelector(selectCanUndo);
  const canRedo = useAppSelector(selectCanRedo);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); if (canUndo) dispatch(undo()); }
      if ((e.key === 'z' && e.shiftKey) || e.key === 'y') { e.preventDefault(); if (canRedo) dispatch(redo()); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canUndo, canRedo, dispatch]);

  return (
    <div className="flex items-center gap-px">
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              onClick={() => dispatch(undo())}
              disabled={!canUndo}
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-[var(--radius-md)]',
                'transition-all duration-150',
                canUndo
                  ? 'text-[var(--color-text-secondary)] hover:bg-[var(--color-stone-100)] hover:text-[var(--color-text-default)]'
                  : 'text-[var(--color-stone-300)] cursor-not-allowed'
              )}
            />
          }
        >
          <Undo2 size={15} />
        </TooltipTrigger>
        <TooltipContent>Undo <span className="opacity-60 font-mono text-[0.65rem] ml-1">⌘Z</span></TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              onClick={() => dispatch(redo())}
              disabled={!canRedo}
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-[var(--radius-md)]',
                'transition-all duration-150',
                canRedo
                  ? 'text-[var(--color-text-secondary)] hover:bg-[var(--color-stone-100)] hover:text-[var(--color-text-default)]'
                  : 'text-[var(--color-stone-300)] cursor-not-allowed'
              )}
            />
          }
        >
          <Redo2 size={15} />
        </TooltipTrigger>
        <TooltipContent>Redo <span className="opacity-60 font-mono text-[0.65rem] ml-1">⌘⇧Z</span></TooltipContent>
      </Tooltip>
    </div>
  );
}


function HDivider() {
  return <div className="w-px h-5 bg-[var(--color-border)] shrink-0" />;
}


function SavedIndicator() {
  const show = useSaveIndicator();

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="saved"
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -6 }}
          transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
          className="flex items-center gap-1.5 px-2 py-1 rounded-[var(--radius-sm)] bg-[var(--color-success-subtle)] border border-[var(--color-success)]/20"
          aria-live="polite"
          aria-label="Changes saved"
        >
          <Check size={11} className="text-[var(--color-success)] shrink-0" strokeWidth={2.5} />
          <span className="font-sans text-[0.6875rem] font-medium text-[var(--color-success)] tracking-[0.01em]">
            Saved
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


function FormSwitcher({ title }: { title: string }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const forms = useAppSelector(selectAllForms);
  const activeId = useAppSelector(selectActiveFormId);
  const [open, setOpen] = useState(false);

  const truncated = title.length > 24 ? title.slice(0, 24) + '…' : title;

  const handleSwitch = useCallback((id: string) => {
    setOpen(false);
    dispatch(selectField(null));
    dispatch(setActiveForm(id));
    router.push(`/builder/${id}`);
  }, [dispatch, router]);

  const handleNew = useCallback(() => {
    setOpen(false);
    const schema = makeNewForm();
    dispatch(selectField(null));
    dispatch(createForm(schema));
    router.push(`/builder/${schema.id}`);
  }, [dispatch, router]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1 h-7 px-1.5 -mx-1.5 rounded-[var(--radius-md)]',
          'hover:bg-[var(--color-stone-100)] transition-colors duration-150',
          'group',
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="font-display text-[0.875rem] font-semibold tracking-[-0.01em] text-[var(--color-text-primary)]">
          {truncated}
        </span>
        <ChevronDown
          size={12}
          className="text-[var(--color-text-muted)] opacity-60 group-hover:opacity-100 transition-opacity duration-150 shrink-0"
        />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.13, ease: [0.2, 0, 0, 1] }}
              role="listbox"
              className={cn(
                'absolute top-full left-0 mt-1.5 z-50',
                'w-64 bg-white rounded-[var(--radius-lg)]',
                'border border-[var(--color-border)] shadow-[var(--shadow-lg)]',
                'overflow-hidden',
              )}
            >
              {/* Form list */}
              <div className="max-h-[260px] overflow-y-auto py-1">
                {forms.length === 0 && (
                  <p className="px-3 py-2 font-sans text-[0.8125rem] text-[var(--color-text-muted)]">No saved forms</p>
                )}
                {forms.map((f) => {
                  const isActive = f.id === activeId;
                  const fieldCount = f.fields.filter(
                    (fld) => !['heading', 'paragraph', 'divider'].includes(fld.type),
                  ).length;
                  return (
                    <button
                      key={f.id}
                      role="option"
                      aria-selected={isActive}
                      onClick={() => handleSwitch(f.id)}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-3 py-2 text-left',
                        'hover:bg-[var(--color-stone-50)] transition-colors duration-100',
                        isActive && 'bg-[var(--color-primary-subtle)]',
                      )}
                    >
                      <FileText size={13} className={cn('shrink-0', isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]')} />
                      <div className="min-w-0 flex-1">
                        <p className={cn(
                          'font-sans text-[0.8125rem] font-medium truncate leading-tight',
                          isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-primary)]',
                        )}>
                          {f.title || 'Untitled Form'}
                        </p>
                        <p className="font-sans text-[0.7rem] text-[var(--color-text-muted)]">
                          {fieldCount} field{fieldCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                      {isActive && (
                        <Check size={12} className="shrink-0 text-[var(--color-primary)]" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Divider */}
              <div className="h-px bg-[var(--color-border)]" />

              {/* New form */}
              <button
                onClick={handleNew}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-[var(--color-stone-50)] transition-colors duration-100"
              >
                <Plus size={13} className="shrink-0 text-[var(--color-text-muted)]" />
                <span className="font-sans text-[0.8125rem] font-medium text-[var(--color-text-secondary)]">
                  New form
                </span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}


export function Header() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const viewMode = useAppSelector(selectViewMode);
  const isPreview = viewMode === 'preview';
  const { title } = useAppSelector(selectFormMeta);

  const navigateHome = useCallback(() => {
    dispatch(selectField(null));
    dispatch(clearActiveForm());
    router.push('/');
  }, [dispatch, router]);

  return (
    <TooltipProvider delay={600}>
      <header className="h-12 shrink-0 bg-white border-b border-[var(--color-border)] flex items-center px-4 gap-3 z-40 relative">
        {/* Logo — click to go home */}
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                onClick={navigateHome}
                aria-label="All forms"
                className={cn(
                  'flex items-center gap-2 shrink-0 mr-1 h-8 px-1.5 -mx-1.5',
                  'rounded-[var(--radius-md)]',
                  'hover:bg-[var(--color-stone-100)] transition-colors duration-150',
                )}
              />
            }
          >
            <div className="w-6 h-6 rounded-[var(--radius-sm)] bg-[var(--color-primary)] flex items-center justify-center shrink-0">
              <Save size={13} className="text-white" />
            </div>
            <span className="font-display text-[0.875rem] font-bold tracking-[-0.02em] text-[var(--color-text-primary)] hidden sm:block">
              FormCraft
            </span>
          </TooltipTrigger>
          <TooltipContent>All forms</TooltipContent>
        </Tooltip>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={navigateHome}
            className={cn(
              'font-sans text-[0.8125rem] text-[var(--color-text-muted)]',
              'hover:text-[var(--color-text-secondary)] transition-colors duration-150',
            )}
          >
            My Forms
          </button>
          <ChevronRight size={13} className="text-[var(--color-stone-300)] shrink-0" />
          <FormSwitcher title={title} />
        </div>

        <HDivider />

        {/* Title (inline edit) */}
        <InlineTitle />

        <HDivider />

        {/* Undo / Redo */}
        <UndoRedoButtons />

        <HDivider />

        {/* Storage indicator */}
        <StorageIndicator />

        {/* Save indicator */}
        <SavedIndicator />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Preview device switcher (preview mode only) */}
        <AnimatePresence>
          {isPreview && (
            <motion.div
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15 }}
            >
              <DeviceSwitcher />
            </motion.div>
          )}
        </AnimatePresence>

        {/* View mode toggle */}
        <div className="flex items-center gap-px bg-[var(--color-stone-100)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-0.5">
          {(['edit', 'preview'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => dispatch(setViewMode(mode))}
              className={cn(
                'flex items-center gap-1.5 h-7 px-3 rounded-[calc(var(--radius-md)-2px)]',
                'font-sans text-[0.8125rem] font-medium',
                'transition-all duration-150',
                viewMode === mode
                  ? 'bg-white text-[var(--color-text-primary)] shadow-[var(--shadow-xs)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
              )}
            >
              {mode === 'edit' ? <PencilLine size={12} /> : <Eye size={12} />}
              <span className="capitalize">{mode}</span>
            </button>
          ))}
        </div>

        <HDivider />

        {/* AI Generate */}
        <Button
          variant="default"
          size="sm"
          onClick={() => dispatch(openAIModal())}
          className="gap-1.5 font-medium"
        >
          <Sparkles size={13} />
          AI Generate
        </Button>

        {/* Export */}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => dispatch(openExportModal())}
          aria-label="Export form (⌘E)"
          className="gap-1.5"
        >
          <Download size={13} />
          Export
        </Button>

        <HDivider />

        {/* Keyboard shortcuts */}
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                onClick={() => dispatch(openShortcutsModal())}
                aria-label="Keyboard shortcuts (?)"
                className="flex items-center justify-center w-8 h-8 rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:bg-[var(--color-stone-100)] hover:text-[var(--color-text-secondary)] transition-colors duration-150"
              />
            }
          >
            <Keyboard size={15} />
          </TooltipTrigger>
          <TooltipContent>Keyboard shortcuts <span className="opacity-60 font-mono text-[0.65rem] ml-1">?</span></TooltipContent>
        </Tooltip>

        <HDivider />

        {/* User account */}
        <UserMenu compact />
      </header>
    </TooltipProvider>
  );
}
