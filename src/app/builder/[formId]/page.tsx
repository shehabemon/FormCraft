'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setActiveForm, clearActiveForm, selectAllForms } from '@/store/slices/formSlice';
import { selectField } from '@/store/slices/uiSlice';
import { FormBuilder } from '@/components/layout/FormBuilder';

export default function BuilderPage() {
  const params   = useParams();
  const router   = useRouter();
  const dispatch = useAppDispatch();

  const formId = typeof params.formId === 'string' ? params.formId : '';
  const allForms = useAppSelector(selectAllForms);
  const formExists = allForms.some((f) => f.id === formId);

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

  // Don't render the builder until we know the form exists
  if (!formExists) return null;

  return <FormBuilder />;
}
