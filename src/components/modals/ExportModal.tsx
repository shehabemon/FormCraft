'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Copy, Check, Download,
  Code2, Globe, FileCode, Layers, ListOrdered,
} from 'lucide-react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { atomOneLight } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { cn } from '@/lib/utils';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { selectIsExportModalOpen, closeExportModal } from '@/store/slices/uiSlice';
import { selectFormSchema } from '@/store/slices/formSlice';
import { isMultiStepForm } from '@/types/form';
import {
  generateReactCode,
  generateHTMLSnippet,
  generateHTMLPage,
  toKebabCase,
} from '@/lib/codeGenerator';


type ExportTab = 'react' | 'html';
type ValidationLib = 'zod' | 'yup';
type HtmlMode = 'snippet' | 'page';


const hlStyle: React.CSSProperties = {
  fontFamily: 'var(--font-jetbrains-mono, "JetBrains Mono", "Fira Code", ui-monospace, monospace)',
  fontSize: '0.8rem',
  lineHeight: '1.65',
  background: 'transparent',
  padding: '0',
  margin: '0',
};


function OptionCard({
  selected,
  onClick,
  icon: Icon,
  label,
  desc,
  badge,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  desc: string;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-3 py-2.5 rounded-[var(--radius-md)] border transition-all duration-150',
        'flex items-start gap-2.5',
        selected
          ? 'border-[var(--color-primary)] bg-[var(--color-primary-subtle)] shadow-[0_0_0_1px_var(--color-primary)]'
          : 'border-[var(--color-border)] bg-white hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-stone-50)]',
      )}
    >
      <div className={cn(
        'w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0 mt-0.5',
        selected ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-stone-100)] text-[var(--color-text-muted)]',
      )}>
        <Icon size={13} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={cn(
            'font-sans text-[0.8125rem] font-semibold leading-tight',
            selected ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-primary)]',
          )}>
            {label}
          </span>
          {badge && (
            <span className="font-mono text-[0.6rem] font-bold px-1 py-px rounded bg-[var(--color-stone-100)] text-[var(--color-text-muted)] uppercase tracking-wide border border-[var(--color-border)]">
              {badge}
            </span>
          )}
        </div>
        <p className="font-sans text-[0.72rem] text-[var(--color-text-muted)] mt-0.5 leading-snug">
          {desc}
        </p>
      </div>
      {selected && (
        <div className="shrink-0 w-4 h-4 rounded-full bg-[var(--color-primary)] flex items-center justify-center mt-0.5">
          <Check size={9} className="text-white" strokeWidth={3} />
        </div>
      )}
    </button>
  );
}


function CodePane({ code, language, animate }: { code: string; language: string; animate: string }) {
  const lineCount = code.split('\n').length;

  return (
    <motion.div
      key={animate}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      className="flex h-full min-h-0 overflow-hidden"
    >
      {/* Line numbers */}
      <div
        className="shrink-0 select-none bg-[#F0F0EE] border-r border-[var(--color-border)] py-4 px-3 text-right min-w-[2.75rem]"
        aria-hidden="true"
      >
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i} className="font-mono text-[0.7rem] leading-[1.65] text-[var(--color-stone-400)]">
            {i + 1}
          </div>
        ))}
      </div>

      {/* Highlighted code */}
      <div className="flex-1 overflow-auto py-4 pl-4 pr-6">
        <SyntaxHighlighter
          language={language}
          style={atomOneLight}
          customStyle={hlStyle}
          useInlineStyles
          wrapLines={false}
          PreTag="div"
          CodeTag="code"
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </motion.div>
  );
}


function EmptyCodeState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
      <div className="w-12 h-12 rounded-[var(--radius-lg)] bg-[var(--color-stone-100)] border border-[var(--color-border)] flex items-center justify-center">
        <Layers size={20} className="text-[var(--color-text-muted)]" />
      </div>
      <div className="space-y-1.5 max-w-[260px]">
        <p className="font-display text-[0.9375rem] font-semibold text-[var(--color-text-primary)]">
          No fields yet
        </p>
        <p className="font-sans text-[0.8125rem] text-[var(--color-text-muted)] leading-relaxed">
          Add fields to your form to see the export code here.
        </p>
      </div>
    </div>
  );
}


export function ExportModal() {
  const dispatch = useAppDispatch();
  const isOpen   = useAppSelector(selectIsExportModalOpen);
  const schema   = useAppSelector(selectFormSchema);

  const [exportTab, setExportTab]             = useState<ExportTab>('react');
  const [validation, setValidation]    = useState<ValidationLib>('zod');
  const [htmlMode, setHtmlMode] = useState<HtmlMode>('snippet');
  const [copied, setCopied]     = useState(false);

  const close = useCallback(() => dispatch(closeExportModal()), [dispatch]);

  const hasFields = schema.fields.some(
    (f) => !['heading', 'paragraph', 'divider', 'hidden'].includes(f.type),
  );

  // Derive a stable "options key" so the code only re-renders when something changes
  const optKey = `${exportTab}-${validation}-${htmlMode}`;

  const isMultiStep = isMultiStepForm(schema);

  const { code, language, filename, footerNote } = useMemo(() => {
    const safe = toKebabCase(schema.title || 'form');
    if (exportTab === 'react') {
      const c = generateReactCode(schema, validation);
      const multiStepNote = isMultiStep ? 'multi-step · ' : '';
      return {
        code: c,
        language: 'typescript',
        filename: validation === 'zod' ? `${safe}.zod.tsx` : `${safe}.yup.tsx`,
        footerNote: `${multiStepNote}${isMultiStep ? 'useState + zod' : `react-hook-form + ${validation}`}`,
      };
    }
    if (htmlMode === 'snippet') {
      return {
        code: generateHTMLSnippet(schema),
        language: 'html',
        filename: `${safe}-snippet.html`,
        footerNote: 'HTML snippet — no dependencies',
      };
    }
    return {
      code: generateHTMLPage(schema),
      language: 'html',
      filename: `${safe}.html`,
      footerNote: 'Complete HTML page — CSS + vanilla JS included',
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema, optKey]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }, [code, filename]);

  const lineCount = code.split('\n').length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="export-bd"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
            onClick={close}
          />

          {/* Modal */}
          <motion.div
            key="export-modal"
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 6 }}
            transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none"
          >
            <div
              className="pointer-events-auto w-full max-w-4xl flex flex-col bg-white rounded-[var(--radius-2xl)] shadow-[var(--shadow-modal)] border border-[var(--color-border)] overflow-hidden"
              style={{ height: 'min(82vh, 760px)' }}
              onKeyDown={(e) => e.key === 'Escape' && close()}
            >
              <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
                <div>
                  <h2 className="font-display text-[0.9375rem] font-semibold text-[var(--color-text-primary)]">
                    Export Form
                  </h2>
                  <p className="font-sans text-[0.75rem] text-[var(--color-text-muted)] mt-0.5">
                    {schema.title || 'Untitled Form'}
                    {' · '}
                    {schema.fields.length} field{schema.fields.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  onClick={close}
                  className="flex items-center justify-center w-7 h-7 rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:bg-[var(--color-stone-100)] hover:text-[var(--color-text-secondary)] transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="flex-1 min-h-0 flex">

                {/* Left column */}
                <div className="shrink-0 w-[252px] flex flex-col border-r border-[var(--color-border)] bg-[var(--color-stone-50)] p-4 gap-5 overflow-y-auto">

                  {/* Level 1: Export as */}
                  <div>
                    <p className="font-sans text-[0.67rem] font-semibold text-[var(--color-text-muted)] uppercase tracking-[0.07em] mb-2">
                      Export as
                    </p>
                    <div className="flex flex-col gap-2">
                      <OptionCard
                        selected={exportTab === 'react'}
                        onClick={() => setExportTab('react')}
                        icon={Code2}
                        label="React Component"
                        desc="TSX component with react-hook-form"
                      />
                      <OptionCard
                        selected={exportTab === 'html'}
                        onClick={() => setExportTab('html')}
                        icon={Globe}
                        label="HTML"
                        desc="Semantic HTML5 form markup"
                      />
                    </div>
                  </div>

                  {/* Multi-step banner (React tab only) */}
                  <AnimatePresence initial={false}>
                    {exportTab === 'react' && isMultiStep && (
                      <motion.div
                        key="multistep-banner"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div className="flex items-start gap-2 px-2.5 py-2 rounded-[var(--radius-md)] bg-[var(--color-primary-subtle)] border border-[var(--color-primary)]/25">
                          <ListOrdered size={12} className="text-[var(--color-primary)] shrink-0 mt-0.5" />
                          <p className="font-sans text-[0.72rem] text-[var(--color-primary)] leading-snug">
                            This form has <strong>{schema.steps.length} steps</strong>. The exported component includes built-in step navigation and per-step validation.
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Level 2: Validation (React only) */}
                  <AnimatePresence initial={false}>
                    {exportTab === 'react' && (
                      <motion.div
                        key="react-opts"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
                        style={{ overflow: 'hidden' }}
                      >
                        {!isMultiStep && (
                          <>
                            <p className="font-sans text-[0.67rem] font-semibold text-[var(--color-text-muted)] uppercase tracking-[0.07em] mb-2">
                              Validation
                            </p>
                            <div className="flex flex-col gap-2">
                              <OptionCard
                                selected={validation === 'zod'}
                                onClick={() => setValidation('zod')}
                                icon={FileCode}
                                label="Zod"
                                badge="ts"
                                desc="Type-safe schema validation"
                              />
                              <OptionCard
                                selected={validation === 'yup'}
                                onClick={() => setValidation('yup')}
                                icon={FileCode}
                                label="Yup"
                                badge="js"
                                desc="Object schema validation"
                              />
                            </div>
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Level 2: Output type (HTML only) */}
                  <AnimatePresence initial={false}>
                    {exportTab === 'html' && (
                      <motion.div
                        key="html-opts"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
                        style={{ overflow: 'hidden' }}
                      >
                        <p className="font-sans text-[0.67rem] font-semibold text-[var(--color-text-muted)] uppercase tracking-[0.07em] mb-2">
                          Output type
                        </p>
                        <div className="flex flex-col gap-2">
                          <OptionCard
                            selected={htmlMode === 'snippet'}
                            onClick={() => setHtmlMode('snippet')}
                            icon={FileCode}
                            label="Snippet"
                            desc="Form markup only — drop into any page"
                          />
                          <OptionCard
                            selected={htmlMode === 'page'}
                            onClick={() => setHtmlMode('page')}
                            icon={Globe}
                            label="Complete Page"
                            desc="Full HTML with CSS and JS included"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Spacer */}
                  <div className="flex-1" />

                  {/* Divider */}
                  <div className="h-px bg-[var(--color-border)]" />

                  {/* Action buttons */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={handleCopy}
                      disabled={!hasFields}
                      className={cn(
                        'flex items-center justify-center gap-2 h-8 px-3 rounded-[var(--radius-md)]',
                        'font-sans text-[0.8125rem] font-semibold transition-all duration-150',
                        'disabled:opacity-40 disabled:cursor-not-allowed',
                        copied
                          ? 'bg-[var(--color-success-subtle)] text-[var(--color-success)] border border-[var(--color-success)]/30'
                          : 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]',
                      )}
                    >
                      <AnimatePresence mode="wait" initial={false}>
                        {copied ? (
                          <motion.span key="c" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} transition={{ duration: 0.12 }} className="flex items-center gap-1.5">
                            <Check size={13} strokeWidth={2.5} />
                            Copied!
                          </motion.span>
                        ) : (
                          <motion.span key="n" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} transition={{ duration: 0.12 }} className="flex items-center gap-1.5">
                            <Copy size={13} />
                            Copy to clipboard
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </button>

                    <button
                      onClick={handleDownload}
                      disabled={!hasFields}
                      className="flex items-center justify-center gap-2 h-8 px-3 rounded-[var(--radius-md)] font-sans text-[0.8125rem] font-medium bg-white border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-stone-100)] hover:text-[var(--color-text-primary)] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Download size={13} />
                      Download file
                    </button>
                  </div>

                  {/* Metadata line */}
                  <p className="font-sans text-[0.68rem] text-[var(--color-text-muted)] text-center leading-snug">
                    {exportTab === 'react'
                      ? isMultiStep
                        ? 'Uses react + framer-motion + zod'
                        : `Uses react-hook-form + ${validation}`
                      : 'No dependencies required'}
                  </p>
                </div>

                {/* Right column — code pane */}
                <div className="flex-1 min-w-0 flex flex-col bg-[#F8F8F7]">
                  {/* Pane header */}
                  <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-[var(--color-border)] bg-white">
                    {/* File tab */}
                    <div className="flex items-center gap-2 px-2.5 py-1 rounded-[var(--radius-sm)] bg-[#F8F8F7] border border-[var(--color-border)]">
                      <div className={cn(
                        'w-2 h-2 rounded-full shrink-0',
                        exportTab === 'react' ? 'bg-blue-400' : 'bg-amber-400',
                      )} />
                      <span className="font-mono text-[0.72rem] text-[var(--color-text-muted)]">
                        {filename}
                      </span>
                    </div>
                    {/* Line count */}
                    <span className="font-mono text-[0.68rem] text-[var(--color-stone-400)]">
                      {lineCount} lines
                    </span>
                  </div>

                  {/* Code area */}
                  <div className="flex-1 min-h-0 overflow-hidden">
                    {hasFields ? (
                      <CodePane code={code} language={language} animate={optKey} />
                    ) : (
                      <EmptyCodeState />
                    )}
                  </div>

                  {/* Footer note */}
                  <div className="shrink-0 px-4 py-2 border-t border-[var(--color-border)] bg-white flex items-center justify-between">
                    <span className="font-sans text-[0.72rem] text-[var(--color-text-muted)]">
                      {footerNote}
                    </span>
                    <span className="font-sans text-[0.68rem] text-[var(--color-stone-400)]">
                      Generated by FormCraft
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
