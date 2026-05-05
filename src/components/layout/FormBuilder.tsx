'use client';

import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { nanoid } from 'nanoid';
import { Header } from './Header';
import { LeftPanel } from '@/components/panels/left/LeftPanel';
import { CenterCanvas } from '@/components/panels/center/CenterCanvas';
import { RightPanel } from '@/components/panels/right/RightPanel';
import { PaletteGhost, CanvasGhost } from '@/components/panels/center/DragOverlayContent';
import { AIGenerateModal } from '@/components/modals/AIGenerateModal';
import { ExportModal } from '@/components/modals/ExportModal';
import { ShortcutsModal } from '@/components/modals/ShortcutsModal';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { PALETTE_DRAG_TYPE } from '@/components/panels/left/FieldPaletteItem';
import { useFormSensors } from '@/lib/dndSensors';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { addField, reorderFields, selectAllFields, selectFormMode } from '@/store/slices/formSlice';
import { selectActiveStepId } from '@/store/slices/uiSlice';
import { generateDefaultField } from '@/lib/schemaUtils';
import { FIELD_META } from '@/lib/fieldRegistry';
import type { FieldType } from '@/types/form';
import type { FieldSchema } from '@/types/form';

/**
 * Main three-panel layout.
 * DndContext lives here so DragOverlay can float above all three panels.
 */
export function FormBuilder() {
  const dispatch     = useAppDispatch();
  const sensors      = useFormSensors();
  const fields       = useAppSelector(selectAllFields);
  const formMode     = useAppSelector(selectFormMode);
  const activeStepId = useAppSelector(selectActiveStepId);

  useKeyboardShortcuts();

  // Track what is being dragged for the overlay
  const [activePaletteType, setActivePaletteType] = useState<FieldType | null>(null);
  const [activeCanvasField, setActiveCanvasField] = useState<FieldSchema | null>(null);
  // Whether the active palette item is over the canvas
  const [isPaletteOver, setIsPaletteOver] = useState(false);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.dragType === PALETTE_DRAG_TYPE) {
      setActivePaletteType(data.fieldType as FieldType);
    } else {
      // Canvas sortable item
      const field = fields.find((f) => f.id === event.active.id);
      setActiveCanvasField(field ?? null);
    }
  }, [fields]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const data = event.active.data.current;
    if (data?.dragType === PALETTE_DRAG_TYPE) {
      setIsPaletteOver(!!event.over);
    }
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    const data = active.data.current;

    setActivePaletteType(null);
    setActiveCanvasField(null);
    setIsPaletteOver(false);

    if (!over) return;

    if (data?.dragType === PALETTE_DRAG_TYPE) {
      const type = data.fieldType as FieldType;
      const meta = FIELD_META[type];
      const field = generateDefaultField(type);
      field.id = nanoid();

      // Set sensible label/name defaults
      if (!['heading', 'paragraph', 'divider'].includes(type)) {
        field.label = meta.label;
        field.name = type + '_' + field.id.slice(0, 4);
      }

      // In multi-step mode, assign the new field to the active step
      if (formMode === 'multi' && activeStepId) {
        field.stepId = activeStepId;
      }

      // Determine insert position: if dropped onto an existing field, insert after it
      // In multi-step mode, only consider fields in the active step
      const visibleFields = formMode === 'multi' && activeStepId
        ? fields.filter((f) => f.stepId === activeStepId)
        : fields;
      let insertIndex: number | undefined;
      const dropZoneId = `step-canvas-${activeStepId ?? 'unassigned'}`;
      if (over.id !== 'canvas-drop-zone' && over.id !== dropZoneId) {
        const overInVisible = visibleFields.findIndex((f) => f.id === over.id);
        if (overInVisible !== -1) {
          // Map back to global index
          const globalOver = fields.findIndex((f) => f.id === visibleFields[overInVisible].id);
          insertIndex = globalOver + 1;
        }
      }

      dispatch(addField({ field, index: insertIndex }));
      return;
    }

    if (active.id !== over.id) {
      const oldIndex = fields.findIndex((f) => f.id === active.id);
      const newIndex = fields.findIndex((f) => f.id === over.id);
      // In multi-step mode only reorder within the same step
      if (oldIndex !== -1 && newIndex !== -1) {
        const activeField = fields[oldIndex];
        const overField   = fields[newIndex];
        if (formMode !== 'multi' || activeField.stepId === overField.stepId) {
          dispatch(reorderFields({ activeIndex: oldIndex, overIndex: newIndex }));
        }
      }
    }
  }, [dispatch, fields]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div
        className="flex flex-col h-dvh min-w-[1280px] overflow-hidden bg-[var(--color-background)]"
        style={{ display: 'grid', gridTemplateRows: '48px 1fr' }}
      >
        <Header />

        <div className="flex min-h-0 overflow-hidden">
          <LeftPanel />
          <CenterCanvas isPaletteOver={isPaletteOver} />
          <RightPanel />
        </div>
      </div>

      <DragOverlay dropAnimation={{ duration: 150, easing: 'cubic-bezier(0.2, 0, 0, 1)' }}>
        {activePaletteType && <PaletteGhost type={activePaletteType} />}
        {activeCanvasField && <CanvasGhost field={activeCanvasField} />}
      </DragOverlay>

      <AIGenerateModal />
      <ExportModal />
      <ShortcutsModal />
    </DndContext>
  );
}
