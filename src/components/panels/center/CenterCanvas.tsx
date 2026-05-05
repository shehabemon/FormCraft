'use client';

import { useMemo, useState, useCallback } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { AnimatePresence, motion } from 'framer-motion';
import { spring, springSnappy } from '@/lib/motion';
import { Monitor, Tablet, Smartphone, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import {
  selectAllFields,
  selectFormMode,
  selectSteps,
  setFormMode,
} from '@/store/slices/formSlice';
import {
  selectPreviewDevice, selectViewMode,
  setPreviewDevice, selectActiveStepId,
} from '@/store/slices/uiSlice';
import { getCascadedVisibility } from '@/lib/conditionalEngine';
import type { PreviewMode } from '@/types/ui';
import { EmptyCanvas } from './EmptyCanvas';
import { StepEmptyState } from './StepEmptyState';
import { FieldCard } from './FieldCard';
import { StepRail } from './StepRail';
import { FormPreview } from '@/components/preview/FormPreview';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';


const DEVICE_INFO: Record<PreviewMode, {
  icon: React.ElementType;
  label: string;
  px: number | null;
  frameClass: string;
}> = {
  desktop: { icon: Monitor,    label: 'Desktop', px: null, frameClass: '' },
  tablet:  { icon: Tablet,     label: 'Tablet',  px: 768,  frameClass: 'ring-1 ring-[var(--color-stone-300)]/60 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.18)]' },
  mobile:  { icon: Smartphone, label: 'Mobile',  px: 375,  frameClass: 'ring-1 ring-[var(--color-stone-300)]/60 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.22)]' },
};

const DEVICE_MAX_W: Record<PreviewMode, string> = {
  desktop: 'max-w-2xl w-full',
  tablet:  'w-[768px] max-w-full',
  mobile:  'w-[375px] max-w-full',
};



function DeviceSwitcher() {
  const dispatch = useAppDispatch();
  const current  = useAppSelector(selectPreviewDevice);

  return (
    <div className="flex items-center gap-px bg-[var(--color-stone-100)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-0.5">
      {(Object.entries(DEVICE_INFO) as [PreviewMode, typeof DEVICE_INFO[PreviewMode]][]).map(([id, info]) => (
        <button
          key={id}
          onClick={() => dispatch(setPreviewDevice(id))}
          title={info.px ? `${info.label} (${info.px}px)` : info.label}
          className={cn(
            'flex items-center justify-center w-7 h-7 rounded-[calc(var(--radius-md)-2px)]',
            'transition-all duration-150',
            current === id
              ? 'bg-white text-[var(--color-text-primary)] shadow-[var(--shadow-xs)]'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]',
          )}
        >
          <info.icon size={13} />
        </button>
      ))}
    </div>
  );
}



function MultiStepToggle() {
  const dispatch  = useAppDispatch();
  const formMode  = useAppSelector(selectFormMode);
  const isMulti   = formMode === 'multi';
  const [showConfirm, setShowConfirm] = useState(false);

  const handleToggle = useCallback((checked: boolean) => {
    if (checked) {
      dispatch(setFormMode('multi'));
    } else {
      setShowConfirm(true);
    }
  }, [dispatch]);

  return (
    <>
      <label className="flex items-center gap-2 cursor-pointer">
        <Layers size={12} className="text-[var(--color-text-muted)]" />
        <span className="font-sans text-[0.75rem] font-medium text-[var(--color-text-muted)]">
          Multi-step
        </span>
        <Switch
          size="sm"
          checked={isMulti}
          onCheckedChange={handleToggle}
        />
      </label>

      <Dialog open={showConfirm} onOpenChange={(o) => !o && setShowConfirm(false)}>
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>Merge all steps?</DialogTitle>
          </DialogHeader>
          <p className="font-sans text-[0.9375rem] text-[var(--color-text-secondary)]">
            This will merge all steps into a single form. Step assignments will be cleared, but your fields will be kept.
          </p>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={() => {
                dispatch(setFormMode('single'));
                setShowConfirm(false);
              }}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}



const CANVAS_DROP_ID = 'canvas-drop-zone';

function CanvasDropZone({
  children,
  isEmpty,
  isOver,
  dropId = CANVAS_DROP_ID,
}: {
  children: React.ReactNode;
  isEmpty: boolean;
  isOver: boolean;
  dropId?: string;
}) {
  const { setNodeRef } = useDroppable({ id: dropId });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'w-full min-h-[240px] flex flex-col gap-3',
        isEmpty && 'flex-1 items-center justify-center',
        isOver && !isEmpty && 'outline outline-2 outline-offset-4 outline-[var(--color-primary)]/30 rounded-[var(--radius-lg)]',
      )}
    >
      {children}
    </div>
  );
}

function DropIndicator({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scaleX: 0.5 }}
          animate={{ opacity: 1, scaleX: 1 }}
          exit={{ opacity: 0, scaleX: 0.5 }}
          className="h-0.5 rounded-full bg-[var(--color-primary)] mx-1"
          style={{ boxShadow: '0 0 6px var(--color-primary)' }}
        />
      )}
    </AnimatePresence>
  );
}



function DeviceFrame({ device, children }: { device: PreviewMode; children: React.ReactNode }) {
  if (device === 'desktop') return <>{children}</>;
  const info = DEVICE_INFO[device];
  return (
    <div className={cn('relative bg-[var(--color-stone-100)] rounded-[20px] overflow-hidden', info.frameClass)}>
      <div className="h-6 shrink-0 flex items-center justify-center bg-[var(--color-stone-200)]">
        <div className="w-16 h-1.5 rounded-full bg-[var(--color-stone-400)]/50" />
      </div>
      <div className="bg-white overflow-auto" style={{ maxHeight: '70vh' }}>
        {children}
      </div>
      <div className="h-5 shrink-0 flex items-center justify-center bg-[var(--color-stone-200)]">
        <div className="w-24 h-1 rounded-full bg-[var(--color-stone-400)]/50" />
      </div>
    </div>
  );
}



function StepCanvas({ isPaletteOver }: { isPaletteOver: boolean }) {
  const allFields    = useAppSelector(selectAllFields);
  const activeStepId = useAppSelector(selectActiveStepId);

  const stepFields = allFields.filter((f) => f.stepId === (activeStepId ?? ''));
  const fieldIds   = stepFields.map((f) => f.id);

  const visibility = useMemo(
    () => getCascadedVisibility(allFields, {}),
    [allFields],
  );

  const dropId = `step-canvas-${activeStepId ?? 'unassigned'}`;

  return (
    <SortableContext items={fieldIds} strategy={verticalListSortingStrategy}>
      <CanvasDropZone isEmpty={stepFields.length === 0} isOver={isPaletteOver} dropId={dropId}>
        {stepFields.length === 0 ? (
          <StepEmptyState isOver={isPaletteOver} />
        ) : (
          <>
            <DropIndicator visible={isPaletteOver && stepFields.length > 0} />

            <AnimatePresence initial={false}>
              {stepFields.map((field) => {
                const visible = visibility[field.id] ?? true;
                return (
                  <motion.div
                    key={field.id}
                    layout
                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                    transition={spring}
                    className="relative"
                  >
                    <div
                      className="transition-opacity duration-200"
                      style={{ opacity: visible ? 1 : 0.4 }}
                    >
                      <FieldCard field={field} />
                    </div>

                    {!visible && (
                      <div className="absolute inset-0 pointer-events-none rounded-[var(--radius-md)]">
                        <div className="absolute bottom-2 right-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-stone-800)]/85 backdrop-blur-sm pointer-events-none">
                          <svg className="w-3 h-3 text-white/70 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                          <span className="font-sans text-[0.68rem] font-semibold text-white/90 whitespace-nowrap">
                            Hidden by condition
                          </span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>

            <div className={cn(
              'w-full min-h-10 rounded-[var(--radius-md)] border-2 border-dashed flex items-center justify-center transition-all duration-150 mt-1',
              isPaletteOver
                ? 'border-[var(--color-primary)] bg-[var(--color-primary-subtle)]'
                : 'border-[var(--color-border)] opacity-40 hover:opacity-70',
            )}>
              <span className="font-sans text-[0.75rem] text-[var(--color-text-muted)]">
                {isPaletteOver ? '+ Drop here to append' : 'Drop field here'}
              </span>
            </div>
          </>
        )}
      </CanvasDropZone>
    </SortableContext>
  );
}



function SingleStepCanvas({ isPaletteOver }: { isPaletteOver: boolean }) {
  const fields  = useAppSelector(selectAllFields);
  const fieldIds = fields.map((f) => f.id);

  const visibility = useMemo(
    () => getCascadedVisibility(fields, {}),
    [fields],
  );

  return (
    <SortableContext items={fieldIds} strategy={verticalListSortingStrategy}>
      <CanvasDropZone isEmpty={fields.length === 0} isOver={isPaletteOver}>
        {fields.length === 0 ? (
          <EmptyCanvas isOver={isPaletteOver} />
        ) : (
          <>
            <DropIndicator visible={isPaletteOver && fields.length > 0} />

            <AnimatePresence initial={false}>
              {fields.map((field) => {
                const visible = visibility[field.id] ?? true;
                return (
                  <motion.div
                    key={field.id}
                    layout
                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                    transition={spring}
                    className="relative"
                  >
                    <div
                      className="transition-opacity duration-200"
                      style={{ opacity: visible ? 1 : 0.4 }}
                    >
                      <FieldCard field={field} />
                    </div>

                    {!visible && (
                      <div className="absolute inset-0 pointer-events-none rounded-[var(--radius-md)]">
                        <div className="absolute bottom-2 right-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-stone-800)]/85 backdrop-blur-sm pointer-events-none">
                          <svg className="w-3 h-3 text-white/70 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                          <span className="font-sans text-[0.68rem] font-semibold text-white/90 whitespace-nowrap">
                            Hidden by condition
                          </span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>

            <div className={cn(
              'w-full min-h-10 rounded-[var(--radius-md)] border-2 border-dashed flex items-center justify-center transition-all duration-150 mt-1',
              isPaletteOver
                ? 'border-[var(--color-primary)] bg-[var(--color-primary-subtle)]'
                : 'border-[var(--color-border)] opacity-40 hover:opacity-70',
            )}>
              <span className="font-sans text-[0.75rem] text-[var(--color-text-muted)]">
                {isPaletteOver ? '+ Drop here to append' : 'Drop field here'}
              </span>
            </div>
          </>
        )}
      </CanvasDropZone>
    </SortableContext>
  );
}



interface CenterCanvasProps {
  isPaletteOver?: boolean;
}

export function CenterCanvas({ isPaletteOver = false }: CenterCanvasProps) {
  const device    = useAppSelector(selectPreviewDevice);
  const viewMode  = useAppSelector(selectViewMode);
  const formMode  = useAppSelector(selectFormMode);

  const isPreview = viewMode === 'preview';
  const isMulti   = formMode === 'multi';

  const { icon: DeviceIcon, label: deviceLabel, px: devicePx } = DEVICE_INFO[device];

  return (
    <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden bg-[var(--color-stone-100)]">

      <div className="h-10 shrink-0 flex items-center justify-between px-4 border-b border-[var(--color-border)] bg-[var(--color-stone-50)]">
        <div className="flex items-center gap-2 min-w-0">
          <DeviceIcon size={13} className="text-[var(--color-text-muted)] shrink-0" />
          <span className="font-sans text-[0.75rem] text-[var(--color-text-muted)] font-medium">
            {deviceLabel}
            {devicePx && (
              <span className="ml-1.5 font-mono text-[0.65rem] opacity-70">{devicePx}px</span>
            )}
          </span>
          {isPreview && (
            <span className="ml-1 px-1.5 py-0.5 rounded-[var(--radius-sm)] bg-[var(--color-primary-subtle)] border border-[var(--color-primary)]/20 font-sans text-[0.65rem] font-semibold text-[var(--color-primary)] uppercase tracking-wide">
              Preview
            </span>
          )}
        </div>

        <AnimatePresence mode="wait">
          {isPreview ? (
            <motion.div
              key="device-switcher"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15 }}
            >
              <DeviceSwitcher />
            </motion.div>
          ) : (
            <motion.div
              key="multistep-toggle"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15 }}
            >
              <MultiStepToggle />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isMulti && !isPreview && (
          <motion.div
            key="step-rail"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
          >
            <StepRail />
          </motion.div>
        )}
      </AnimatePresence>

      <div className={cn(
        'flex-1 min-h-0 overflow-x-hidden custom-scrollbar relative',
        isPreview && device === 'desktop' ? 'overflow-hidden' : 'overflow-y-auto',
      )}>
        <div className={cn(
          isPreview && device === 'desktop'
            ? 'absolute inset-0 flex flex-col items-center px-6 py-8'
            : 'min-h-full flex flex-col items-center px-6 py-8',
        )}>
          <motion.div
            layout
            className={cn(
              'w-full transition-all duration-300',
              DEVICE_MAX_W[device],
              isPreview && device === 'desktop' && 'flex-1 min-h-0 flex flex-col',
            )}
          >
            <AnimatePresence mode="wait" initial={false}>
              {isPreview ? (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                  className={device === 'desktop' ? 'flex-1 min-h-0 flex flex-col' : undefined}
                >
                  <DeviceFrame device={device}>
                    <FormPreview />
                  </DeviceFrame>
                </motion.div>
              ) : isMulti ? (
                <motion.div
                  key="edit-multi"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                >
                  <StepCanvas isPaletteOver={isPaletteOver} />
                </motion.div>
              ) : (
                <motion.div
                  key="edit-single"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                >
                  <SingleStepCanvas isPaletteOver={isPaletteOver} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
