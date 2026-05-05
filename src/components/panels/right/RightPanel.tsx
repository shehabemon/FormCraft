'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Settings2, Layers, GitBranch, ListOrdered } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import {
  selectRightPanelCollapsed, selectRightPanelTab, selectSelectedFieldId,
  toggleRightPanel, setRightPanelTab, selectActiveStepId,
} from '@/store/slices/uiSlice';
import { selectFormMode } from '@/store/slices/formSlice';
import type { PanelTab } from '@/types/ui';
import { PropertiesPanel } from './PropertiesPanel';
import { StylePanel } from './StylePanel';
import { LogicPanel } from './LogicPanel';
import { StepSettingsPanel } from './StepSettingsPanel';


const TABS: { id: PanelTab; label: string; icon: React.ElementType }[] = [
  { id: 'general',     label: 'Properties', icon: Settings2 },
  { id: 'style',       label: 'Style',      icon: Layers    },
  { id: 'conditional', label: 'Logic',      icon: GitBranch },
];





export function RightPanel() {
  const dispatch   = useAppDispatch();
  const collapsed  = useAppSelector(selectRightPanelCollapsed);
  const activeTab  = useAppSelector(selectRightPanelTab);
  const selectedId = useAppSelector(selectSelectedFieldId);
  const activeStepId = useAppSelector(selectActiveStepId);
  const formMode   = useAppSelector(selectFormMode);

  // In multi-step mode with no field selected but a step active: show step settings.
  const showStepSettings = formMode === 'multi' && !selectedId && !!activeStepId;

  if (collapsed) {
    return (
      <motion.div
        key="collapsed"
        initial={{ width: 0 }}
        animate={{ width: 32 }}
        exit={{ width: 0 }}
        className="shrink-0 h-full bg-white border-l border-[var(--color-border)] flex flex-col items-center pt-3"
      >
        <button
          onClick={() => dispatch(toggleRightPanel())}
          className="flex items-center justify-center w-7 h-7 rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:bg-[var(--color-stone-100)] hover:text-[var(--color-text-secondary)] transition-colors duration-150"
          title="Expand panel"
        >
          <ChevronLeft size={14} />
        </button>
      </motion.div>
    );
  }

  return (
    <motion.aside
      key="expanded"
      initial={{ width: 0 }}
      animate={{ width: 288 }}
      exit={{ width: 0 }}
      transition={{ duration: 0.2 }}
      className="shrink-0 h-full bg-white border-l border-[var(--color-border)] flex flex-col overflow-hidden"
      style={{ width: 288 }}
    >
      {/* Tab bar — hidden when showing step settings */}
      {!showStepSettings && (
        <div className="shrink-0 border-b border-[var(--color-border)]">
          <div className="flex items-center justify-between px-3 pt-2 pb-0">
            <div className="flex gap-0">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => dispatch(setRightPanelTab(id))}
                  className={cn(
                    'relative flex items-center gap-1.5 h-9 px-2.5 font-sans text-[0.78rem] font-medium',
                    'border-b-2 -mb-px transition-all duration-150',
                    activeTab === id
                      ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                      : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
                  )}
                >
                  <Icon size={12} />
                  {label}
                  {selectedId && id === 'general' && (
                    <div className="absolute top-2 right-1 w-1 h-1 rounded-full bg-[var(--color-primary)] opacity-60" />
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={() => dispatch(toggleRightPanel())}
              className="flex items-center justify-center w-6 h-6 mb-1 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:bg-[var(--color-stone-100)] hover:text-[var(--color-text-secondary)] transition-colors duration-150"
              title="Collapse panel"
            >
              <ChevronLeft size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Step settings header */}
      {showStepSettings && (
        <div className="shrink-0 border-b border-[var(--color-border)]">
          <div className="flex items-center justify-between px-3 h-10">
            <div className="flex items-center gap-2">
              <ListOrdered size={13} className="text-[var(--color-primary)]" />
              <span className="font-sans text-[0.78rem] font-semibold text-[var(--color-text-primary)]">
                Step settings
              </span>
            </div>
            <button
              onClick={() => dispatch(toggleRightPanel())}
              className="flex items-center justify-center w-6 h-6 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:bg-[var(--color-stone-100)] hover:text-[var(--color-text-secondary)] transition-colors duration-150"
              title="Collapse panel"
            >
              <ChevronLeft size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0 custom-scrollbar">
        <AnimatePresence mode="wait">
          {showStepSettings ? (
            <motion.div
              key={`step-${activeStepId}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
            >
              <StepSettingsPanel />
            </motion.div>
          ) : (
            <motion.div
              key={`${activeTab}-${selectedId ?? 'none'}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
            >
              {activeTab === 'general'     && <PropertiesPanel />}
              {activeTab === 'style'       && <StylePanel />}
              {activeTab === 'conditional' && <LogicPanel />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.aside>
  );
}
