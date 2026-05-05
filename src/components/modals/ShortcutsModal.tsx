'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { selectIsShortcutsModalOpen, closeShortcutsModal } from '@/store/slices/uiSlice';


const GROUPS = [
  {
    title: 'History',
    shortcuts: [
      { keys: ['⌘', 'Z'],       label: 'Undo' },
      { keys: ['⌘', '⇧', 'Z'],  label: 'Redo' },
    ],
  },
  {
    title: 'View',
    shortcuts: [
      { keys: ['⌘', 'P'],  label: 'Toggle preview mode' },
      { keys: ['⌘', 'E'],  label: 'Open export modal' },
      { keys: ['⌘', 'G'],  label: 'Open AI generate modal' },
      { keys: ['⌘', 'H'],  label: 'Go to all forms' },
    ],
  },
  {
    title: 'Fields',
    shortcuts: [
      { keys: ['Del'],       label: 'Delete selected field' },
      { keys: ['Esc'],       label: 'Deselect field' },
      { keys: ['↑', '↓'],   label: 'Move field (keyboard)' },
    ],
  },
  {
    title: 'General',
    shortcuts: [
      { keys: ['?'],   label: 'Show / hide this panel' },
      { keys: ['Esc'], label: 'Close modal / deselect' },
    ],
  },
];


function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className={cn(
      'inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5',
      'rounded-[var(--radius-sm)] border border-[var(--color-border-strong)]',
      'bg-[var(--color-stone-100)] shadow-[0_1px_0_var(--color-stone-300)]',
      'font-mono text-[0.7rem] font-medium text-[var(--color-text-secondary)]',
    )}>
      {children}
    </kbd>
  );
}


export function ShortcutsModal() {
  const dispatch = useAppDispatch();
  const isOpen   = useAppSelector(selectIsShortcutsModalOpen);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) closeRef.current?.focus();
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="shortcuts-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-[var(--color-surface-overlay)]"
            onClick={() => dispatch(closeShortcutsModal())}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            key="shortcuts-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Keyboard shortcuts"
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
            className={cn(
              'fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
              'w-full max-w-md',
              'bg-white rounded-[var(--radius-xl)] border border-[var(--color-border)]',
              'shadow-[var(--shadow-modal)]',
              'overflow-hidden',
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-[var(--radius-md)] bg-[var(--color-stone-100)] flex items-center justify-center">
                  <Keyboard size={14} className="text-[var(--color-text-secondary)]" />
                </div>
                <div>
                  <h2 className="font-display text-[0.9375rem] font-semibold text-[var(--color-text-primary)] tracking-[-0.01em]">
                    Keyboard Shortcuts
                  </h2>
                  <p className="font-sans text-[0.72rem] text-[var(--color-text-muted)]">
                    Press <Kbd>?</Kbd> anytime to toggle
                  </p>
                </div>
              </div>
              <button
                ref={closeRef}
                onClick={() => dispatch(closeShortcutsModal())}
                aria-label="Close shortcuts modal"
                className="flex items-center justify-center w-7 h-7 rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:bg-[var(--color-stone-100)] hover:text-[var(--color-text-secondary)] transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Groups */}
            <div className="p-5 grid grid-cols-2 gap-x-6 gap-y-5">
              {GROUPS.map((group) => (
                <div key={group.title}>
                  <p className="font-sans text-[0.67rem] font-semibold text-[var(--color-text-muted)] uppercase tracking-[0.07em] mb-2.5">
                    {group.title}
                  </p>
                  <div className="space-y-2">
                    {group.shortcuts.map((s) => (
                      <div key={s.label} className="flex items-center justify-between gap-2">
                        <span className="font-sans text-[0.8125rem] text-[var(--color-text-secondary)]">
                          {s.label}
                        </span>
                        <div className="flex items-center gap-0.5 shrink-0">
                          {s.keys.map((k, i) => (
                            <Kbd key={i}>{k}</Kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer hint */}
            <div className="px-5 pb-4">
              <p className="font-sans text-[0.72rem] text-[var(--color-text-muted)] text-center">
                On Windows/Linux use <Kbd>Ctrl</Kbd> instead of <Kbd>⌘</Kbd>
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
