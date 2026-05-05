'use client';

import { useState, useRef, useCallback } from 'react';
import { useAppSelector } from '@/store/hooks';
import { selectFormSchema } from '@/store/slices/formSlice';
import { useEffect } from 'react';

/**
 * Returns a boolean that flashes true briefly after any form state change.
 * The flag stays true for 2.5 s after the last change (debounced).
 */
export function useSaveIndicator(): boolean {
  const schema   = useAppSelector(selectFormSchema);
  const [show, setShow]  = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialRef = useRef(true);

  const trigger = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setShow(true);
    timerRef.current = setTimeout(() => setShow(false), 2500);
  }, []);

  useEffect(() => {
    // Skip the very first render (rehydration from persist)
    if (initialRef.current) { initialRef.current = false; return; }
    trigger();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema.updatedAt]);

  return show;
}
