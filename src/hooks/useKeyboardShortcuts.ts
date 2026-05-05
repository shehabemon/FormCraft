'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  selectCanUndo, selectCanRedo,
  undo, redo,
  removeField,
  clearActiveForm,
} from '@/store/slices/formSlice';
import {
  selectSelectedFieldId, selectIsAIModalOpen, selectIsExportModalOpen,
  selectIsShortcutsModalOpen,
  selectViewMode,
  selectField, setViewMode,
  openAIModal, openExportModal, openShortcutsModal,
  closeShortcutsModal,
} from '@/store/slices/uiSlice';

export function useKeyboardShortcuts() {
  const dispatch = useAppDispatch();
  const router           = useRouter();
  const canUndo          = useAppSelector(selectCanUndo);
  const canRedo          = useAppSelector(selectCanRedo);
  const selectedFieldId  = useAppSelector(selectSelectedFieldId);
  const viewMode         = useAppSelector(selectViewMode);
  const isAIOpen         = useAppSelector(selectIsAIModalOpen);
  const isExportOpen     = useAppSelector(selectIsExportModalOpen);
  const isShortcutsOpen  = useAppSelector(selectIsShortcutsModalOpen);

  const anyModalOpen = isAIOpen || isExportOpen || isShortcutsOpen;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const tag = (e.target as HTMLElement)?.tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      // ? — show shortcuts modal (never blocked)
      if (e.key === '?' && !isInput && !mod) {
        e.preventDefault();
        if (isShortcutsOpen) dispatch(closeShortcutsModal());
        else dispatch(openShortcutsModal());
        return;
      }

      // Escape — close shortcuts, deselect field
      if (e.key === 'Escape') {
        if (isShortcutsOpen) { dispatch(closeShortcutsModal()); return; }
        if (selectedFieldId && !anyModalOpen) {
          dispatch(selectField(null));
          return;
        }
      }

      // Modals swallow shortcuts while open
      if (anyModalOpen && !isShortcutsOpen) return;

      if (mod) {
        // Cmd/Ctrl+Z — undo
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          if (canUndo) dispatch(undo());
          return;
        }
        // Cmd/Ctrl+Shift+Z — redo
        if (e.key === 'z' && e.shiftKey) {
          e.preventDefault();
          if (canRedo) dispatch(redo());
          return;
        }
        // Cmd/Ctrl+P — toggle preview
        if (e.key === 'p') {
          e.preventDefault();
          dispatch(setViewMode(viewMode === 'preview' ? 'edit' : 'preview'));
          return;
        }
        // Cmd/Ctrl+E — export
        if (e.key === 'e') {
          e.preventDefault();
          dispatch(openExportModal());
          return;
        }
        // Cmd/Ctrl+G — AI generate
        if (e.key === 'g') {
          e.preventDefault();
          dispatch(openAIModal());
          return;
        }
        // Cmd/Ctrl+H — go home
        if (e.key === 'h') {
          e.preventDefault();
          dispatch(selectField(null));
          dispatch(clearActiveForm());
          router.push('/');
          return;
        }
      }

      // Delete/Backspace — delete selected field (not in input)
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isInput && selectedFieldId) {
        e.preventDefault();
        dispatch(removeField(selectedFieldId));
        dispatch(selectField(null));
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    dispatch, router, canUndo, canRedo, selectedFieldId, viewMode,
    isAIOpen, isExportOpen, isShortcutsOpen, anyModalOpen,
  ]);
}
