'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setActiveForm, clearActiveForm, selectAllForms } from '@/store/slices/formSlice';
import { selectField } from '@/store/slices/uiSlice';
import { FormBuilder } from '@/components/layout/FormBuilder';

export default function BuilderClient() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useAppDispatch();

  const formId = typeof params.formId === 'string' ? params.formId : '';
  const allForms = useAppSelector(selectAllForms);
  const form = allForms.find((f) => f.id === formId);
  const formExists = !!form;

  // Update the browser tab title to the actual form name once Redux has it.
  useEffect(() => {
    if (!form?.title) return;
    const label = form.title.trim() || 'Untitled Form';
    document.title = `${label} — FormCraft`;
    return () => { document.title = 'FormCraft — Drag and Drop Form Builder'; };
  }, [form?.title]);

  useEffect(() => {
    if (!formId) {
      router.replace('/');
      return;
    }
    if (!formExists) {
      toast.error('Form not found', { description: 'It may have been deleted.' });
      router.replace('/');
      return;
    }
    dispatch(setActiveForm(formId));

    return () => {
      dispatch(selectField(null));
      dispatch(clearActiveForm());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId]);

  if (!formExists) return null;

  return <FormBuilder />;
}
