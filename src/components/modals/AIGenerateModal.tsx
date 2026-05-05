'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { spring, springSnappy } from '@/lib/motion';
import { Sparkles, X, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { selectIsAIModalOpen, closeAIModal } from '@/store/slices/uiSlice';
import { selectAllFields, loadSchema } from '@/store/slices/formSlice';
import type { FormSchema } from '@/types/form';


const EXAMPLE_CHIPS = [
  {
    label: 'Contact Form',
    prompt: 'A simple contact form with first name, last name, email, phone number, subject dropdown, and message',
  },
  {
    label: 'Job Application',
    prompt: 'Job application form with personal info section (name, email, phone), work experience section (current role, years of experience, company name), education section (highest degree, field of study), and a resume file upload',
  },
  {
    label: 'Event Registration',
    prompt: 'Event registration form with attendee name, email, organization, ticket type (standard, VIP, student), dietary requirements (vegetarian, vegan, gluten-free, no restrictions), number of guests, and any special accommodations',
  },
  {
    label: 'Feedback Survey',
    prompt: 'Customer feedback survey with overall satisfaction rating (1-5 range), what they liked most (text), what could be improved (text), would they recommend us (yes/no radio), and any additional comments',
  },
  {
    label: 'Newsletter Signup',
    prompt: 'Newsletter signup with email, first name, topics of interest (multi-select: technology, business, design, lifestyle), and consent checkbox for marketing emails',
  },
  {
    label: 'Bug Report',
    prompt: 'Software bug report form with title, description, steps to reproduce (textarea), expected behaviour, actual behaviour, severity dropdown (critical, major, minor, cosmetic), browser/OS info, and optional screenshot upload',
  },
];


const LOADING_MESSAGES = [
  'Analysing your description…',
  'Designing field structure…',
  'Choosing the right field types…',
  'Applying validation rules…',
  'Structuring the form layout…',
  'Almost there…',
];


type ModalState = 'idle' | 'loading' | 'success' | 'error';


function GeneratingView() {
  const [msgIndex, setMsgIndex] = useState(0);
  const [dotCount, setDotCount] = useState(0);

  useEffect(() => {
    const msgTimer = setInterval(() => {
      setMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 2200);
    const dotTimer = setInterval(() => {
      setDotCount((d) => (d + 1) % 4);
    }, 400);
    return () => { clearInterval(msgTimer); clearInterval(dotTimer); };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-8 py-10">
      {/* Animated orb cluster */}
      <div className="relative w-20 h-20">
        {/* Outer pulse ring */}
        <motion.div
          className="absolute inset-0 rounded-full border border-[var(--color-ai-accent)]/30"
          animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute inset-2 rounded-full border border-[var(--color-ai-accent)]/20"
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
        />
        {/* Core orb */}
        <motion.div
          className="absolute inset-4 rounded-full bg-gradient-to-br from-[var(--color-ai-accent)] to-[var(--color-primary)]"
          animate={{
            boxShadow: [
              '0 0 16px 2px var(--color-ai-accent-subtle)',
              '0 0 32px 8px var(--color-ai-accent-subtle)',
              '0 0 16px 2px var(--color-ai-accent-subtle)',
            ],
            rotate: [0, 180, 360],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
        {/* Sparkle icon on top */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles size={18} className="text-white drop-shadow-sm" />
        </div>

        {/* Orbiting dots */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-[var(--color-ai-accent)]"
            style={{
              top: '50%',
              left: '50%',
              marginTop: -4,
              marginLeft: -4,
            }}
            animate={{ rotate: 360 }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              ease: 'linear',
              delay: i * 0.8,
            }}
          >
            <motion.div
              className="w-2 h-2 rounded-full bg-[var(--color-ai-accent)]"
              style={{ transformOrigin: '-24px 4px' }}
              animate={{ rotate: -360 }}
              transition={{
                duration: 2.4,
                repeat: Infinity,
                ease: 'linear',
                delay: i * 0.8,
              }}
            />
          </motion.div>
        ))}
      </div>

      {/* Cycling status text */}
      <div className="text-center space-y-2">
        <div className="h-6 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.p
              key={msgIndex}
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -16, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
              className="font-sans text-[0.875rem] text-[var(--color-text-secondary)] font-medium"
            >
              {LOADING_MESSAGES[msgIndex]}
            </motion.p>
          </AnimatePresence>
        </div>
        <p className="font-mono text-[0.75rem] text-[var(--color-text-muted)]">
          Generating{'.'.repeat(dotCount)}
        </p>
      </div>

      {/* Animated waveform-style bars */}
      <div className="flex items-end gap-1 h-8">
        {Array.from({ length: 12 }, (_, i) => (
          <motion.div
            key={i}
            className="w-1.5 rounded-full bg-[var(--color-ai-accent)]/60"
            animate={{ height: ['6px', `${8 + Math.sin(i) * 12 + 8}px`, '6px'] }}
            transition={{
              duration: 0.9 + (i % 3) * 0.2,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.07,
            }}
          />
        ))}
      </div>
    </div>
  );
}


function SuccessView({ fieldCount }: { fieldCount: number }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-10">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={springSnappy}
        className="w-14 h-14 rounded-full bg-[var(--color-success-subtle)] border border-[var(--color-success)]/30 flex items-center justify-center"
      >
        <CheckCircle2 size={28} className="text-[var(--color-success)]" />
      </motion.div>
      <div className="text-center space-y-1">
        <motion.p
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="font-display text-[1rem] font-semibold text-[var(--color-text-primary)]"
        >
          Form generated!
        </motion.p>
        <motion.p
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="font-sans text-[0.8125rem] text-[var(--color-text-muted)]"
        >
          {fieldCount} field{fieldCount !== 1 ? 's' : ''} added to your form
        </motion.p>
      </div>
    </div>
  );
}


function ErrorView({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 p-3.5 rounded-[var(--radius-md)] bg-[#FFF8F7] border border-[var(--color-error)]/20"
    >
      <AlertTriangle size={15} className="text-[var(--color-error)] shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-sans text-[0.8125rem] text-[var(--color-error)] font-medium leading-snug">
          {message}
        </p>
      </div>
      <button
        onClick={onRetry}
        className="shrink-0 flex items-center gap-1 font-sans text-[0.75rem] text-[var(--color-error)] hover:underline"
      >
        <RefreshCw size={11} />
        Retry
      </button>
    </motion.div>
  );
}


export function AIGenerateModal() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector(selectIsAIModalOpen);
  const existingFields = useAppSelector(selectAllFields);

  const [prompt, setPrompt] = useState('');
  const [modalState, setModalState] = useState<ModalState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [generatedFieldCount, setGeneratedFieldCount] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setModalState('idle');
      setErrorMessage('');
      setTimeout(() => textareaRef.current?.focus(), 80);
    }
  }, [isOpen]);

  // Cleanup on unmount
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const close = useCallback(() => {
    if (modalState === 'loading') {
      abortRef.current?.abort();
    }
    dispatch(closeAIModal());
    // Defer reset so exit animation doesn't flash
    setTimeout(() => {
      setModalState('idle');
      setErrorMessage('');
      setPrompt('');
    }, 300);
  }, [dispatch, modalState]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') close();
  }, [close]);

  const generate = useCallback(async () => {
    if (!prompt.trim() || modalState === 'loading') return;

    setModalState('loading');
    setErrorMessage('');

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
        signal: abortRef.current.signal,
      });

      const data = (await res.json()) as { success: boolean; schema?: FormSchema; error?: string };

      if (data.success && data.schema) {
        dispatch(loadSchema(data.schema));
        setGeneratedFieldCount(data.schema.fields.length);
        setModalState('success');
        toast.success(`Form generated — ${data.schema.fields.length} fields added`, {
          description: data.schema.title,
        });
        setTimeout(close, 1800);
      } else {
        setErrorMessage(data.error ?? 'Something went wrong. Please try again.');
        setModalState('error');
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setErrorMessage('Network error. Please check your connection and try again.');
      setModalState('error');
    }
  }, [prompt, modalState, dispatch, close]);

  const handleRetry = useCallback(() => {
    setModalState('idle');
    setErrorMessage('');
  }, []);

  const isLoading = modalState === 'loading';
  const isSuccess = modalState === 'success';
  const isError = modalState === 'error';
  const charCount = prompt.length;
  const canGenerate = prompt.trim().length >= 3 && !isLoading;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
            onClick={close}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="pointer-events-auto w-full max-w-lg bg-white rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] border border-[var(--color-border)] overflow-hidden"
              onKeyDown={handleKeyDown}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[var(--color-border)]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-[var(--radius-md)] bg-gradient-to-br from-[var(--color-ai-accent)] to-[var(--color-primary)] flex items-center justify-center shadow-sm">
                    <Sparkles size={15} className="text-white" />
                  </div>
                  <div>
                    <h2 className="font-display text-[0.9375rem] font-semibold text-[var(--color-text-primary)] leading-tight">
                      Generate Form with AI
                    </h2>
                    <p className="font-sans text-[0.75rem] text-[var(--color-text-muted)]">
                      Powered by Gemini 1.5 Flash
                    </p>
                  </div>
                </div>
                <button
                  onClick={close}
                  className="flex items-center justify-center w-7 h-7 rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:bg-[var(--color-stone-100)] hover:text-[var(--color-text-secondary)] transition-colors duration-150"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Body */}
              <div className="px-5 py-5 space-y-4">
                <AnimatePresence mode="wait">
                  {isLoading ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <GeneratingView />
                    </motion.div>
                  ) : isSuccess ? (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <SuccessView fieldCount={generatedFieldCount} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="idle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-4"
                    >
                      {/* Textarea */}
                      <div className="space-y-1.5">
                        <label className="block font-sans text-[0.8125rem] font-medium text-[var(--color-text-default)]">
                          Describe your form
                        </label>
                        <div className="relative">
                          <textarea
                            ref={textareaRef}
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value.slice(0, 1000))}
                            placeholder="e.g., A job application form with personal info, work experience, education, and a file upload for resume"
                            rows={4}
                            disabled={isLoading}
                            className={cn(
                              'w-full resize-none rounded-[var(--radius-md)] border bg-white px-3 py-2.5',
                              'font-sans text-[0.875rem] text-[var(--color-text-default)] placeholder:text-[var(--color-text-placeholder)]',
                              'focus:outline-none focus:border-[var(--color-ai-accent)] focus:ring-2 focus:ring-[var(--color-ai-accent)]/15',
                              'transition-colors duration-150',
                              isError
                                ? 'border-[var(--color-error)]/50'
                                : 'border-[var(--color-border-strong)]',
                            )}
                          />
                          <span className={cn(
                            'absolute bottom-2.5 right-3 font-mono text-[0.65rem]',
                            charCount > 900 ? 'text-[var(--color-warning)]' : 'text-[var(--color-text-muted)]',
                          )}>
                            {charCount} / 1000
                          </span>
                        </div>
                      </div>

                      {/* Error banner */}
                      {isError && (
                        <ErrorView message={errorMessage} onRetry={handleRetry} />
                      )}

                      {/* Example chips */}
                      <div className="space-y-2">
                        <p className="font-sans text-[0.75rem] text-[var(--color-text-muted)]">
                          Try an example
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {EXAMPLE_CHIPS.map((chip) => (
                            <button
                              key={chip.label}
                              type="button"
                              onClick={() => setPrompt(chip.prompt)}
                              className={cn(
                                'px-2.5 py-1 rounded-full border font-sans text-[0.75rem] font-medium',
                                'transition-colors duration-100',
                                prompt === chip.prompt
                                  ? 'bg-[var(--color-ai-accent-subtle)] border-[var(--color-ai-accent)]/40 text-[var(--color-ai-accent)]'
                                  : 'bg-white border-[var(--color-border-strong)] text-[var(--color-text-secondary)] hover:border-[var(--color-ai-accent)]/50 hover:text-[var(--color-text-default)]',
                              )}
                            >
                              {chip.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Existing fields warning */}
                      {existingFields.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="flex items-start gap-2.5 px-3 py-2.5 rounded-[var(--radius-md)] bg-[#FFFBEB] border border-[var(--color-warning)]/30"
                        >
                          <AlertTriangle size={13} className="text-[var(--color-warning)] shrink-0 mt-0.5" />
                          <p className="font-sans text-[0.75rem] text-[#92400E] leading-relaxed">
                            Your current form has <strong>{existingFields.length} field{existingFields.length !== 1 ? 's' : ''}</strong>.
                            {' '}Generating will replace them. You can undo this action.
                          </p>
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              {!isLoading && !isSuccess && (
                <div className="flex items-center justify-end gap-2.5 px-5 pb-5">
                  <button
                    onClick={close}
                    className="h-9 px-4 rounded-[var(--radius-md)] font-sans text-[0.875rem] font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-stone-100)] transition-colors duration-150"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={generate}
                    disabled={!canGenerate}
                    className={cn(
                      'h-9 px-4 rounded-[var(--radius-md)] font-sans text-[0.875rem] font-semibold',
                      'flex items-center gap-2 transition-all duration-150',
                      canGenerate
                        ? 'bg-gradient-to-r from-[var(--color-ai-accent)] to-[#D97706] text-white shadow-sm hover:opacity-90 hover:shadow-md'
                        : 'bg-[var(--color-stone-200)] text-[var(--color-stone-400)] cursor-not-allowed',
                    )}
                  >
                    <Sparkles size={14} />
                    Generate
                  </button>
                </div>
              )}

              {/* Loading footer */}
              {isLoading && (
                <div className="flex items-center justify-center pb-5">
                  <button
                    onClick={() => { abortRef.current?.abort(); setModalState('idle'); }}
                    className="font-sans text-[0.75rem] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] underline underline-offset-2 transition-colors"
                  >
                    Cancel generation
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
