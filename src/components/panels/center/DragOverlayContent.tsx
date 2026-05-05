'use client';

import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FIELD_META } from '@/lib/fieldRegistry';
import type { FieldType } from '@/types/form';
import type { FieldSchema } from '@/types/form';


export function PaletteGhost({ type }: { type: FieldType }) {
  const meta = FIELD_META[type];
  const IconComponent = (Icons as unknown as Record<string, React.ElementType>)[meta.icon];

  return (
    <motion.div
      initial={{ rotate: 0, scale: 1 }}
      animate={{ rotate: -2, scale: 1.03 }}
      transition={{ duration: 0.12, ease: [0.2, 0, 0, 1] }}
      className={cn(
        'flex items-center gap-2.5 px-2.5 py-2 w-[220px]',
        'rounded-[var(--radius-md)] border border-[var(--color-primary)]',
        'bg-[var(--color-primary-subtle)]',
        'select-none cursor-grabbing',
      )}
      style={{ boxShadow: '0 16px 32px -4px rgba(14,124,107,0.22), 0 4px 12px -2px rgba(14,124,107,0.14)' }}
    >
      <div className="w-6 h-6 shrink-0 rounded-[var(--radius-sm)] flex items-center justify-center bg-[var(--color-primary)] text-white">
        {IconComponent ? <IconComponent size={13} /> : <Icons.Square size={13} />}
      </div>
      <span className="font-sans text-[0.8125rem] font-medium text-[var(--color-primary)]">
        {meta.label}
      </span>
    </motion.div>
  );
}


export function CanvasGhost({ field }: { field: FieldSchema }) {
  const meta = FIELD_META[field.type];

  return (
    <motion.div
      initial={{ rotate: 0, scale: 1 }}
      animate={{ rotate: 1.5, scale: 1.02 }}
      transition={{ duration: 0.12, ease: [0.2, 0, 0, 1] }}
      className={cn(
        'relative bg-white border border-[var(--color-primary)] rounded-[var(--radius-md)] px-4 py-3.5',
        'opacity-96 cursor-grabbing select-none',
        'ring-1 ring-[var(--color-primary)]/20',
      )}
      style={{ boxShadow: '0 20px 40px -6px rgba(28,27,24,0.18), 0 6px 16px -4px rgba(14,124,107,0.12)' }}
    >
      {/* Left accent bar */}
      <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-r-full bg-[var(--color-primary)]" />

      <div className="pl-1 flex items-center gap-2">
        <GripVertical size={14} className="text-[var(--color-stone-400)] shrink-0" />
        <span className="font-sans text-[0.8125rem] font-medium text-[var(--color-text-secondary)]">
          {field.label || meta.label}
        </span>
        <span className="ml-auto font-sans text-[0.7rem] text-[var(--color-text-muted)]">
          {meta.label}
        </span>
      </div>
    </motion.div>
  );
}
