'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  PanelLeftClose, ChevronRight, GitBranch,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { selectLeftPanelCollapsed, toggleLeftPanel, selectSelectedFieldId } from '@/store/slices/uiSlice';
import { selectFieldById, selectAllFields } from '@/store/slices/formSlice';
import { FIELD_CATEGORIES, FIELD_META } from '@/lib/fieldRegistry';
import { FieldPaletteItem } from './FieldPaletteItem';
import type { FieldType } from '@/types/form';


function CategorySection({
  label,
  types,
  index,
}: {
  label: string;
  types: FieldType[];
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
      className="mb-4"
    >
      <p className="text-label uppercase tracking-[0.06em] text-[var(--color-text-muted)] font-semibold text-[0.6875rem] mb-1.5 px-1">
        {label}
      </p>
      <div className="flex flex-col gap-0.5">
        {types.map((type) => (
          <FieldPaletteItem key={type} type={type} />
        ))}
      </div>
    </motion.div>
  );
}


function ConditionalSummary() {
  const selectedId = useAppSelector(selectSelectedFieldId);
  const allFields = useAppSelector(selectAllFields);
  const selectedField = useAppSelector((s) =>
    selectedId ? selectFieldById(s, selectedId) : undefined
  );

  if (!selectedField) return null;

  const meta = FIELD_META[selectedField.type];
  const cond = selectedField.conditional;
  const ruleCount = cond.rules.length;

  // Find fields this one depends on
  const sourceFields = cond.enabled
    ? cond.rules
        .map((r) => allFields.find((f) => f.id === r.sourceFieldId))
        .filter(Boolean)
    : [];

  return (
    <div className="border-t border-[var(--color-border)] pt-3 mt-2">
      <p className="text-label uppercase tracking-[0.06em] text-[var(--color-text-muted)] font-semibold text-[0.6875rem] mb-2 px-1">
        Selected Field
      </p>
      <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-stone-50)] p-3">
        <p className="font-sans text-[0.8125rem] font-medium text-[var(--color-text-default)] truncate mb-1">
          {selectedField.label || meta.label}
        </p>
        <p className="font-mono text-[0.7rem] text-[var(--color-text-muted)] mb-2">
          {selectedField.name || '—'}
        </p>

        {cond.enabled && ruleCount > 0 ? (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <GitBranch size={11} className="text-[var(--color-primary)] shrink-0" />
              <span className="font-sans text-[0.75rem] text-[var(--color-primary)] font-medium">
                {cond.action === 'show' ? 'Show' : cond.action === 'hide' ? 'Hide' : 'Require'} when {cond.logic === 'all' ? 'all' : 'any'} match
              </span>
            </div>
            {sourceFields.slice(0, 2).map((f) => f && (
              <div key={f.id} className="flex items-center gap-1.5 pl-4">
                <div className="w-1 h-1 rounded-full bg-[var(--color-stone-400)]" />
                <span className="font-sans text-[0.7rem] text-[var(--color-text-muted)] truncate">
                  {f.label || FIELD_META[f.type].label}
                </span>
              </div>
            ))}
            {sourceFields.length > 2 && (
              <p className="font-sans text-[0.7rem] text-[var(--color-text-muted)] pl-4">
                +{sourceFields.length - 2} more
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-stone-300)]" />
            <span className="font-sans text-[0.75rem] text-[var(--color-text-muted)]">
              No conditions set
            </span>
          </div>
        )}
      </div>
    </div>
  );
}


function CollapsedStrip({ onExpand }: { onExpand: () => void }) {
  return (
    <motion.div
      key="collapsed"
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 32, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col items-center pt-3 gap-2 border-r border-[var(--color-border)] bg-white overflow-hidden"
    >
      <button
        onClick={onExpand}
        className="flex items-center justify-center w-7 h-7 rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:bg-[var(--color-stone-100)] hover:text-[var(--color-text-secondary)] transition-colors duration-150"
        title="Expand panel"
      >
        <ChevronRight size={14} />
      </button>
    </motion.div>
  );
}


export function LeftPanel() {
  const dispatch = useAppDispatch();
  const collapsed = useAppSelector(selectLeftPanelCollapsed);

  return (
    <AnimatePresence initial={false} mode="sync">
      {collapsed ? (
        <CollapsedStrip key="collapsed" onExpand={() => dispatch(toggleLeftPanel())} />
      ) : (
        <motion.aside
          key="expanded"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 248, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0 h-full bg-white border-r border-[var(--color-border)] flex flex-col overflow-hidden"
          style={{ width: 248 }}
        >
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 h-10 border-b border-[var(--color-border-subtle)] shrink-0">
            <span className="font-display text-[0.8125rem] font-semibold text-[var(--color-text-secondary)] tracking-[-0.01em]">
              Fields
            </span>
            <button
              onClick={() => dispatch(toggleLeftPanel())}
              className="flex items-center justify-center w-6 h-6 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:bg-[var(--color-stone-100)] hover:text-[var(--color-text-secondary)] transition-colors duration-150"
            >
              <PanelLeftClose size={13} />
            </button>
          </div>

          {/* Scrollable palette */}
          <div className="flex-1 overflow-y-auto px-3 pt-3 min-h-0 custom-scrollbar">
            {FIELD_CATEGORIES.map((cat, i) => (
              <CategorySection
                key={cat.category}
                label={cat.label}
                types={cat.types}
                index={i}
              />
            ))}
          </div>

          {/* Conditional summary for selected field */}
          <div className="px-3 pb-3 shrink-0">
            <ConditionalSummary />
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
