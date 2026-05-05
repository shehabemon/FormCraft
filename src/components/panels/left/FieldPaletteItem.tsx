'use client';

import * as Icons from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import type { FieldType } from '@/types/form';
import { FIELD_META } from '@/lib/fieldRegistry';

/** Drag-data type used to identify palette→canvas drags. */
export const PALETTE_DRAG_TYPE = 'palette-field';

interface FieldPaletteItemProps {
  type: FieldType;
}

export function FieldPaletteItem({ type }: FieldPaletteItemProps) {
  const meta = FIELD_META[type];
  const IconComponent = (Icons as unknown as Record<string, React.ElementType>)[meta.icon];

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${type}`,
    data: { dragType: PALETTE_DRAG_TYPE, fieldType: type },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        'group flex items-center gap-2.5 px-2.5 py-2',
        'rounded-[var(--radius-md)] border border-transparent',
        'cursor-grab active:cursor-grabbing select-none touch-none',
        'transition-all duration-150',
        isDragging
          ? 'opacity-40 bg-[var(--color-stone-100)]'
          : 'hover:bg-[var(--color-stone-100)] hover:border-[var(--color-border)]'
      )}
    >
      <div className={cn(
        'w-6 h-6 shrink-0 rounded-[var(--radius-sm)] flex items-center justify-center',
        'transition-colors duration-150',
        isDragging
          ? 'bg-[var(--color-primary)] text-white'
          : 'bg-[var(--color-stone-100)] text-[var(--color-text-muted)] group-hover:bg-[var(--color-stone-200)] group-hover:text-[var(--color-text-secondary)]'
      )}>
        {IconComponent ? <IconComponent size={13} /> : <Icons.Square size={13} />}
      </div>
      <span className={cn(
        'font-sans text-[0.8125rem] font-medium leading-none',
        'transition-colors duration-150',
        isDragging
          ? 'text-[var(--color-primary)]'
          : 'text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-default)]'
      )}>
        {meta.label}
      </span>
    </div>
  );
}
