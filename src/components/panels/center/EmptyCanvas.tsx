'use client';

import { motion } from 'framer-motion';
import { springSnappy } from '@/lib/motion';
import { Sparkles } from 'lucide-react';
import { useAppDispatch } from '@/store/hooks';
import { openAIModal } from '@/store/slices/uiSlice';


function PlaceholderField({ delay, wide = false }: { delay: number; wide?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.25, ease: [0.2, 0, 0, 1] }}
      className="space-y-1"
    >
      <div className="h-1.5 rounded-full bg-[var(--color-stone-200)]" style={{ width: wide ? '55%' : '35%' }} />
      <div className="h-7 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-stone-50)]" />
    </motion.div>
  );
}


export function EmptyCanvas({ isOver }: { isOver?: boolean }) {
  const dispatch = useAppDispatch();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] }}
      className="flex flex-col items-center justify-center h-full min-h-[320px] px-8 text-center select-none"
    >
      {/* Animated form mockup */}
      <div className="relative mb-7">
        <motion.div
          animate={isOver
            ? { scale: 1.04, borderColor: 'var(--color-primary)', y: -2 }
            : { scale: 1, borderColor: 'var(--color-border)', y: 0 }
          }
          transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
          className="w-52 rounded-[var(--radius-xl)] border-2 border-dashed bg-white px-5 pt-5 pb-4 space-y-3 shadow-[var(--shadow-md)]"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {/* Form title mock */}
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.2 }}
            className="h-3 w-28 rounded-full bg-[var(--color-stone-300)]"
          />

          <PlaceholderField delay={0.1} wide />
          <PlaceholderField delay={0.17} />
          <PlaceholderField delay={0.24} wide />

          {/* Submit button mock */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="h-7 rounded-[var(--radius-md)] bg-[var(--color-primary)] mt-1"
            style={{ opacity: 0.7 }}
          />
        </motion.div>

        {/* Drop indicator */}
        {isOver && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[var(--color-primary)] flex items-center justify-center shadow-[var(--shadow-md)]"
          >
            <span className="text-white text-sm font-bold leading-none">+</span>
          </motion.div>
        )}

        {/* AI sparkle badge */}
        {!isOver && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6, rotate: -10 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ delay: 0.4, ...springSnappy }}
            className="absolute -top-3 -right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--color-ai-accent)] shadow-[var(--shadow-sm)]"
          >
            <Sparkles size={9} className="text-white" />
            <span className="font-sans text-[0.6rem] font-bold text-white tracking-wide">AI</span>
          </motion.div>
        )}
      </div>

      {/* Text */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.25 }}
        className="space-y-1.5 mb-5"
      >
        <h3 className="font-display text-[1.0625rem] font-semibold text-[var(--color-text-secondary)] tracking-[-0.01em]">
          {isOver ? 'Drop to add field' : 'Start building your form'}
        </h3>
        {!isOver && (
          <p className="font-sans text-[0.8125rem] text-[var(--color-text-muted)] leading-relaxed max-w-[220px]">
            Drag a field from the left panel, or generate a complete form with AI
          </p>
        )}
      </motion.div>

      {/* CTA */}
      {!isOver && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32, duration: 0.2 }}
          className="flex flex-col items-center gap-3"
        >
          <button
            onClick={() => dispatch(openAIModal())}
            aria-label="Generate form with AI"
            className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] bg-[var(--color-ai-accent-subtle)] border border-[var(--color-ai-accent)]/30 text-[var(--color-ai-accent)] font-sans text-[0.8125rem] font-semibold hover:bg-[var(--color-ai-accent)] hover:text-white transition-all duration-150 active:scale-[0.98]"
          >
            <Sparkles size={13} />
            Generate with AI
          </button>
          <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
            <div className="h-px w-8 bg-[var(--color-border)]" />
            <span className="font-sans text-[0.72rem]">or drag a field from the left</span>
            <div className="h-px w-8 bg-[var(--color-border)]" />
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
