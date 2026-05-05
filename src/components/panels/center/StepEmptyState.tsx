'use client';

import { motion } from 'framer-motion';
import { ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StepEmptyState({ isOver }: { isOver?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: [0, 0, 0.2, 1] }}
      className="flex flex-col items-center justify-center min-h-[240px] px-8 text-center select-none"
    >
      <motion.div
        animate={isOver ? { scale: 1.12, y: -3 } : { scale: 1, y: 0 }}
        transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
        className={cn(
          'flex items-center justify-center w-12 h-12 rounded-[var(--radius-xl)] mb-4',
          'border-2 border-dashed transition-colors duration-150',
          isOver
            ? 'border-[var(--color-primary)] bg-[var(--color-primary-subtle)]'
            : 'border-[var(--color-border-strong)] bg-[var(--color-stone-50)]',
        )}
      >
        {isOver ? (
          <motion.span
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            className="text-[var(--color-primary)] font-bold text-xl leading-none"
          >
            +
          </motion.span>
        ) : (
          <ArrowLeftRight size={18} className="text-[var(--color-text-muted)]" />
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.2 }}
        className="space-y-1.5"
      >
        <h3 className="font-display text-[0.9375rem] font-semibold text-[var(--color-text-secondary)] tracking-[-0.01em]">
          {isOver ? 'Drop to add to this step' : 'This step is empty'}
        </h3>
        {!isOver && (
          <p className="font-sans text-[0.8125rem] text-[var(--color-text-muted)] leading-relaxed max-w-[200px]">
            Drag fields here or drop them from another step
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}
