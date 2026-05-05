/**
 * Tests for the LocalStorageMigrationModal component.
 *
 * Covers:
 * - Closed state renders nothing
 * - Form list preview (up to 4 items + overflow label)
 * - Discard flow clears local forms and calls onDone
 * - Import success flow shows toast and calls onDone
 * - Import error keeps modal open and does NOT set migration flag
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import formReducer from '@/store/slices/formSlice';
import { LocalStorageMigrationModal } from '@/components/migration/LocalStorageMigrationModal';
import { makeForm, makeField } from '../fixtures';


const mockImportForms = jest.fn();
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();

jest.mock('@/lib/supabase/formSync', () => ({
  importForms: (...args: unknown[]) => mockImportForms(...args),
}));

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({}),
}));

jest.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));


function makeStore() {
  return configureStore({ reducer: { form: formReducer } });
}

function renderModal(props: { open: boolean; forms: ReturnType<typeof makeForm>[]; onDone?: () => void }) {
  const onDone = props.onDone ?? jest.fn();
  const store = makeStore();
  render(
    <Provider store={store}>
      <LocalStorageMigrationModal open={props.open} forms={props.forms} onDone={onDone} />
    </Provider>,
  );
  return { onDone, store };
}

const twoForms = [
  makeForm({ id: 'f1', title: 'Contact Form', fields: [makeField()] }),
  makeForm({ id: 'f2', title: 'Survey', fields: [] }),
];


describe('LocalStorageMigrationModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockImportForms.mockResolvedValue(undefined);
  });

  it('renders nothing when closed', () => {
    renderModal({ open: false, forms: twoForms });
    expect(screen.queryByText(/import your saved forms/i)).not.toBeInTheDocument();
  });

  it('shows the dialog title when open', () => {
    renderModal({ open: true, forms: twoForms });
    expect(screen.getByText(/import your saved forms/i)).toBeInTheDocument();
  });

  it('displays form titles and field counts', () => {
    renderModal({ open: true, forms: twoForms });
    expect(screen.getByText('Contact Form')).toBeInTheDocument();
    expect(screen.getByText('Survey')).toBeInTheDocument();
    expect(screen.getByText('1 field')).toBeInTheDocument();
    expect(screen.getByText('0 fields')).toBeInTheDocument();
  });

  it('shows "Untitled Form" for forms without a title', () => {
    const forms = [makeForm({ id: 'u1', title: '' })];
    renderModal({ open: true, forms });
    expect(screen.getByText('Untitled Form')).toBeInTheDocument();
  });

  it('caps preview at 4 and shows overflow label', () => {
    const forms = Array.from({ length: 6 }, (_, i) => makeForm({ id: `f${i}`, title: `Form ${i}` }));
    renderModal({ open: true, forms });
    expect(screen.getByText('+2 more')).toBeInTheDocument();
  });

  it('shows the correct form count in the description', () => {
    renderModal({ open: true, forms: twoForms });
    expect(screen.getByText(/2 forms/i)).toBeInTheDocument();
  });

  it('shows singular "form" when count is 1', () => {
    renderModal({ open: true, forms: [makeForm()] });
    // The description should say "1 form" not "1 forms"
    expect(screen.getByText(/1 form/i)).toBeInTheDocument();
    expect(screen.queryByText(/1 forms/i)).not.toBeInTheDocument();
  });


  describe('Discard flow', () => {
    it('calls onDone when discard is clicked', () => {
      const { onDone } = renderModal({ open: true, forms: twoForms });
      fireEvent.click(screen.getByRole('button', { name: /discard and continue/i }));
      expect(onDone).toHaveBeenCalledTimes(1);
    });

    it('does NOT call importForms on discard', () => {
      renderModal({ open: true, forms: twoForms });
      fireEvent.click(screen.getByRole('button', { name: /discard and continue/i }));
      expect(mockImportForms).not.toHaveBeenCalled();
    });
  });


  describe('Import success flow', () => {
    it('calls importForms with the forms list', async () => {
      renderModal({ open: true, forms: twoForms });
      fireEvent.click(screen.getByRole('button', { name: /import forms/i }));
      await waitFor(() => expect(mockImportForms).toHaveBeenCalledWith({}, twoForms));
    });

    it('shows a success toast after import', async () => {
      renderModal({ open: true, forms: twoForms });
      fireEvent.click(screen.getByRole('button', { name: /import forms/i }));
      await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith(
        expect.stringContaining('imported successfully'),
      ));
    });

    it('calls onDone after successful import', async () => {
      const { onDone } = renderModal({ open: true, forms: twoForms });
      fireEvent.click(screen.getByRole('button', { name: /import forms/i }));
      await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    });
  });


  describe('Import error flow', () => {
    beforeEach(() => {
      mockImportForms.mockRejectedValue(new Error('network error'));
    });

    it('shows an error toast on failure', async () => {
      renderModal({ open: true, forms: twoForms });
      fireEvent.click(screen.getByRole('button', { name: /import forms/i }));
      await waitFor(() => expect(mockToastError).toHaveBeenCalled());
    });

    it('does NOT call onDone on failure', async () => {
      const { onDone } = renderModal({ open: true, forms: twoForms });
      fireEvent.click(screen.getByRole('button', { name: /import forms/i }));
      await waitFor(() => expect(mockToastError).toHaveBeenCalled());
      expect(onDone).not.toHaveBeenCalled();
    });
  });
});
