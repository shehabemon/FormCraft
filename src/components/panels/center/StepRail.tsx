'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AnimatePresence, motion } from 'framer-motion';
import { spring, springSnappy } from '@/lib/motion';
import { Plus, MoreHorizontal, Pencil, Copy, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { nanoid } from 'nanoid';
import { cn } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  addStep,
  removeStep,
  reorderSteps,
  updateStep,
  moveFieldToStep,
  selectSteps,
  selectFieldsByStepId,
  selectFormSchema,
} from '@/store/slices/formSlice';
import { selectActiveStepId, setActiveStepId } from '@/store/slices/uiSlice';
import type { StepSchema } from '@/types/form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/DropdownMenu';


interface DeleteStepDialogProps {
  open: boolean;
  step: StepSchema | null;
  fieldCount: number;
  otherSteps: StepSchema[];
  onConfirm: (deleteFields: boolean, moveToStepId?: string) => void;
  onCancel: () => void;
}

function DeleteStepDialog({
  open,
  step,
  fieldCount,
  otherSteps,
  onConfirm,
  onCancel,
}: DeleteStepDialogProps) {
  const [moveToStepId, setMoveToStepId] = useState<string>(otherSteps[0]?.id ?? '');

  useEffect(() => {
    setMoveToStepId(otherSteps[0]?.id ?? '');
  }, [otherSteps]);

  if (!step) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent showCloseButton>
        <DialogHeader>
          <DialogTitle>Delete "{step.title || 'Untitled Step'}"?</DialogTitle>
        </DialogHeader>

        {fieldCount > 0 ? (
          <div className="space-y-4">
            <p className="font-sans text-[0.9375rem] text-[var(--color-text-secondary)]">
              This step contains <span className="font-semibold text-[var(--color-text-primary)]">{fieldCount} field{fieldCount !== 1 ? 's' : ''}</span>. What would you like to do with them?
            </p>

            {otherSteps.length > 0 && (
              <div className="space-y-2">
                <label className="font-sans text-[0.8125rem] font-medium text-[var(--color-text-default)]">
                  Move fields to
                </label>
                <select
                  value={moveToStepId}
                  onChange={(e) => setMoveToStepId(e.target.value)}
                  className="w-full h-9 px-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white font-sans text-[0.875rem] text-[var(--color-text-default)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                >
                  {otherSteps.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title || 'Untitled Step'}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        ) : (
          <p className="font-sans text-[0.9375rem] text-[var(--color-text-secondary)]">
            This step is empty. Are you sure you want to delete it?
          </p>
        )}

        <DialogFooter>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          {fieldCount > 0 && otherSteps.length > 0 && (
            <Button
              variant="secondary"
              onClick={() => onConfirm(false, moveToStepId)}
            >
              Move fields &amp; delete
            </Button>
          )}
          <Button
            variant="destructive"
            onClick={() => onConfirm(true)}
          >
            Delete {fieldCount > 0 ? 'fields too' : 'step'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


interface StepTitleEditorProps {
  stepId: string;
  title: string;
  onCommit: () => void;
}

function StepTitleEditor({ stepId, title, onCommit }: StepTitleEditorProps) {
  const dispatch = useAppDispatch();
  const [value, setValue] = useState(title);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  const commit = useCallback(() => {
    const trimmed = value.trim();
    dispatch(updateStep({ id: stepId, changes: { title: trimmed || 'Untitled Step' } }));
    onCommit();
  }, [dispatch, stepId, value, onCommit]);

  return (
    <input
      ref={ref}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') onCommit();
        e.stopPropagation();
      }}
      onClick={(e) => e.stopPropagation()}
      className="w-full bg-transparent font-sans text-[0.78rem] font-semibold text-[var(--color-text-primary)] outline-none border-b border-[var(--color-primary)] focus:border-[var(--color-primary)] min-w-0"
      style={{ maxWidth: 120 }}
    />
  );
}


interface StepPillProps {
  step: StepSchema;
  index: number;
  total: number;
  isActive: boolean;
  fieldCount: number;
  onSelect: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  isEditing: boolean;
  onEditCommit: () => void;
}

function StepPill({
  step,
  index,
  total,
  isActive,
  fieldCount,
  onSelect,
  onRename,
  onDuplicate,
  onDelete,
  onMoveLeft,
  onMoveRight,
  isEditing,
  onEditCommit,
}: StepPillProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, scale: 0.85, x: -8 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.85, x: -8 }}
      transition={spring}
      className="relative shrink-0 group/pill"
      {...attributes}
    >
      <button
        {...listeners}
        onClick={onSelect}
        className={cn(
          'relative flex items-center gap-1.5 h-8 pl-3 pr-1.5 rounded-[var(--radius-md)]',
          'font-sans text-[0.78rem] font-semibold transition-all duration-150 cursor-pointer',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-1',
          isActive
            ? 'bg-[var(--color-primary)] text-white shadow-[var(--shadow-sm)]'
            : 'bg-white border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]',
        )}
      >
        <span className={cn(
          'flex items-center justify-center w-4 h-4 rounded-full text-[0.6rem] font-bold shrink-0',
          isActive ? 'bg-white/25 text-white' : 'bg-[var(--color-stone-100)] text-[var(--color-text-muted)]',
        )}>
          {index + 1}
        </span>

        {isEditing ? (
          <StepTitleEditor
            stepId={step.id}
            title={step.title}
            onCommit={onEditCommit}
          />
        ) : (
          <span className="max-w-[112px] truncate">
            {step.title || 'Untitled Step'}
          </span>
        )}

        {fieldCount > 0 && !isEditing && (
          <span className={cn(
            'flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[0.6rem] font-bold shrink-0',
            isActive
              ? 'bg-white/25 text-white'
              : 'bg-[var(--color-stone-200)] text-[var(--color-text-muted)]',
          )}>
            {fieldCount}
          </span>
        )}
      </button>

      {!isEditing && (
        <DropdownMenu>
          <DropdownMenuTrigger
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'absolute -top-1.5 -right-1.5 flex items-center justify-center w-5 h-5 rounded-full',
              'bg-white border border-[var(--color-border)] shadow-[var(--shadow-xs)]',
              'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]',
              'transition-all duration-150',
              'opacity-0 group-hover/pill:opacity-100',
              isActive && 'opacity-100',
            )}
            aria-label="Step options"
          >
            <MoreHorizontal size={10} />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="bottom" align="start" sideOffset={6} className="min-w-[168px]">
            <DropdownMenuItem onClick={onRename}>
              <Pencil size={13} />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy size={13} />
              Duplicate step
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onMoveLeft} disabled={index === 0}>
              <ChevronLeft size={13} />
              Move left
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onMoveRight} disabled={index === total - 1}>
              <ChevronRight size={13} />
              Move right
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2 size={13} />
              Delete step
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {isActive && (
        <motion.div
          layoutId="step-rail-underline"
          className="absolute -bottom-[9px] left-0 right-0 h-0.5 rounded-full bg-[var(--color-primary)]"
          transition={spring}
        />
      )}
    </motion.div>
  );
}


export function StepRail() {
  const dispatch = useAppDispatch();
  const steps = useAppSelector(selectSteps);
  const activeStepId = useAppSelector(selectActiveStepId);
  const formSchema = useAppSelector(selectFormSchema);

  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StepSchema | null>(null);

  // Field counts per step
  const fieldCountsMap = Object.fromEntries(
    steps.map((s) => [s.id, formSchema.fields.filter((f) => f.stepId === s.id).length]),
  );

  // dnd-kit sensors scoped to just this rail
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = steps.findIndex((s) => s.id === active.id);
    const newIndex = steps.findIndex((s) => s.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      dispatch(reorderSteps({ activeIndex: oldIndex, overIndex: newIndex }));
    }
  }, [dispatch, steps]);

  const handleAddStep = useCallback(() => {
    const id = nanoid();
    const newStep: StepSchema = {
      id,
      title: `Step ${steps.length + 1}`,
      description: '',
      nextLabel: '',
      backLabel: '',
      allowBack: true,
    };
    dispatch(addStep(newStep));
    dispatch(setActiveStepId(id));
    // Auto-focus the new step title for rename
    setTimeout(() => setEditingStepId(id), 80);
  }, [dispatch, steps.length]);

  const handleDuplicate = useCallback((step: StepSchema) => {
    const newId = nanoid();
    const newStep: StepSchema = { ...step, id: newId, title: `${step.title || 'Step'} (copy)` };
    dispatch(addStep(newStep));
    // Copy fields to new step
    formSchema.fields
      .filter((f) => f.stepId === step.id)
      .forEach((f) => dispatch(moveFieldToStep({ fieldId: f.id, stepId: newId })));
    dispatch(setActiveStepId(newId));
  }, [dispatch, formSchema.fields]);

  const handleDeleteConfirm = useCallback((deleteFields: boolean, moveToStepId?: string) => {
    if (!deleteTarget) return;
    const stepId = deleteTarget.id;

    if (!deleteFields && moveToStepId) {
      formSchema.fields
        .filter((f) => f.stepId === stepId)
        .forEach((f) => dispatch(moveFieldToStep({ fieldId: f.id, stepId: moveToStepId })));
    }

    dispatch(removeStep(stepId));

    // Select adjacent step after deletion
    if (activeStepId === stepId) {
      const idx = steps.findIndex((s) => s.id === stepId);
      const next = steps[idx + 1] ?? steps[idx - 1];
      dispatch(setActiveStepId(next?.id ?? null));
    }
    setDeleteTarget(null);
  }, [dispatch, deleteTarget, formSchema.fields, activeStepId, steps]);

  // Ensure there's always an active step
  useEffect(() => {
    if (steps.length > 0 && !activeStepId) {
      dispatch(setActiveStepId(steps[0].id));
    }
  }, [steps, activeStepId, dispatch]);

  const otherSteps = deleteTarget
    ? steps.filter((s) => s.id !== deleteTarget.id)
    : [];

  return (
    <>
      <div className="shrink-0 flex items-center gap-1.5 px-4 pb-0 pt-3 border-b border-[var(--color-border)] bg-[var(--color-stone-50)] overflow-x-auto custom-scrollbar">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={steps.map((s) => s.id)} strategy={horizontalListSortingStrategy}>
            <div className="flex items-center gap-1.5 pb-2">
              <AnimatePresence initial={false}>
                {steps.map((step, index) => (
                  <StepPill
                    key={step.id}
                    step={step}
                    index={index}
                    total={steps.length}
                    isActive={activeStepId === step.id}
                    fieldCount={fieldCountsMap[step.id] ?? 0}
                    isEditing={editingStepId === step.id}
                    onEditCommit={() => setEditingStepId(null)}
                    onSelect={() => {
                      dispatch(setActiveStepId(step.id));
                      dispatch({ type: 'ui/selectField', payload: null });
                    }}
                    onRename={() => setEditingStepId(step.id)}
                    onDuplicate={() => handleDuplicate(step)}
                    onDelete={() => setDeleteTarget(step)}
                    onMoveLeft={() => index > 0 && dispatch(reorderSteps({ activeIndex: index, overIndex: index - 1 }))}
                    onMoveRight={() => index < steps.length - 1 && dispatch(reorderSteps({ activeIndex: index, overIndex: index + 1 }))}
                  />
                ))}
              </AnimatePresence>

              <motion.button
                layout
                onClick={handleAddStep}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.96 }}
                className={cn(
                  'flex items-center gap-1 h-8 px-2.5 rounded-[var(--radius-md)] pb-0 mb-2',
                  'border border-dashed border-[var(--color-border-strong)]',
                  'font-sans text-[0.75rem] font-medium text-[var(--color-text-muted)]',
                  'hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)]',
                  'transition-colors duration-150',
                )}
                title="Add step"
              >
                <Plus size={12} />
                Add step
              </motion.button>
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <DeleteStepDialog
        open={!!deleteTarget}
        step={deleteTarget}
        fieldCount={deleteTarget ? (fieldCountsMap[deleteTarget.id] ?? 0) : 0}
        otherSteps={otherSteps}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
