import { configureStore } from '@reduxjs/toolkit';
import uiReducer, {
  selectField,
  setRightPanelTab,
  setPreviewDevice,
  setViewMode,
  openAIModal,
  closeAIModal,
  openExportModal,
  closeExportModal,
  setIsGenerating,
  toggleLeftPanel,
  toggleRightPanel,
  openShortcutsModal,
  closeShortcutsModal,
  setActiveStepId,
  setPreviewStepIndex,
  incrementPreviewStep,
  decrementPreviewStep,
  selectSelectedFieldId,
  selectRightPanelTab,
  selectPreviewDevice,
  selectViewMode,
  selectIsAIModalOpen,
  selectIsExportModalOpen,
  selectIsGenerating,
  selectLeftPanelCollapsed,
  selectRightPanelCollapsed,
  selectIsShortcutsModalOpen,
  selectActiveStepId,
  selectPreviewStepIndex,
} from '@/store/slices/uiSlice';

function makeStore() {
  return configureStore({ reducer: { ui: uiReducer } });
}
const sel = (s: ReturnType<typeof makeStore>) => s.getState() as never;

describe('initial state', () => {
  it('has correct defaults', () => {
    const store = makeStore();
    const state = store.getState().ui;
    expect(state.selectedFieldId).toBeNull();
    expect(state.rightPanelTab).toBe('general');
    expect(state.previewDevice).toBe('desktop');
    expect(state.viewMode).toBe('edit');
    expect(state.isAIModalOpen).toBe(false);
    expect(state.isExportModalOpen).toBe(false);
    expect(state.isGenerating).toBe(false);
    expect(state.leftPanelCollapsed).toBe(false);
    expect(state.rightPanelCollapsed).toBe(false);
    expect(state.isShortcutsModalOpen).toBe(false);
    expect(state.activeStepId).toBeNull();
    expect(state.previewStepIndex).toBe(0);
  });
});

describe('selectField', () => {
  it('sets selectedFieldId', () => {
    const store = makeStore();
    store.dispatch(selectField('field-1'));
    expect(selectSelectedFieldId(sel(store))).toBe('field-1');
  });

  it('clears selectedFieldId on null', () => {
    const store = makeStore();
    store.dispatch(selectField('field-1'));
    store.dispatch(selectField(null));
    expect(selectSelectedFieldId(sel(store))).toBeNull();
  });

  it('auto-expands collapsed right panel when a field is selected', () => {
    const store = makeStore();
    store.dispatch(toggleRightPanel());
    expect(selectRightPanelCollapsed(sel(store))).toBe(true);
    store.dispatch(selectField('field-1'));
    expect(selectRightPanelCollapsed(sel(store))).toBe(false);
  });

  it('does not expand right panel when selecting null', () => {
    const store = makeStore();
    store.dispatch(toggleRightPanel());
    store.dispatch(selectField(null));
    expect(selectRightPanelCollapsed(sel(store))).toBe(true);
  });
});

describe('setRightPanelTab', () => {
  it('updates the right panel tab', () => {
    const store = makeStore();
    store.dispatch(setRightPanelTab('style'));
    expect(selectRightPanelTab(sel(store))).toBe('style');
  });
});

describe('setPreviewDevice', () => {
  it('switches to mobile', () => {
    const store = makeStore();
    store.dispatch(setPreviewDevice('mobile'));
    expect(selectPreviewDevice(sel(store))).toBe('mobile');
  });
});

describe('setViewMode', () => {
  it('switches to preview mode', () => {
    const store = makeStore();
    store.dispatch(setViewMode('preview'));
    expect(selectViewMode(sel(store))).toBe('preview');
  });

  it('clears selectedFieldId and resets previewStepIndex when switching to preview', () => {
    const store = makeStore();
    store.dispatch(selectField('field-1'));
    store.dispatch(setPreviewStepIndex(3));
    store.dispatch(setViewMode('preview'));
    expect(selectSelectedFieldId(sel(store))).toBeNull();
    expect(selectPreviewStepIndex(sel(store))).toBe(0);
  });

  it('does NOT reset previewStepIndex when switching back to edit', () => {
    const store = makeStore();
    store.dispatch(setPreviewStepIndex(2));
    store.dispatch(setViewMode('edit'));
    expect(selectPreviewStepIndex(sel(store))).toBe(2);
  });
});

describe('AI modal', () => {
  it('opens and closes', () => {
    const store = makeStore();
    store.dispatch(openAIModal());
    expect(selectIsAIModalOpen(sel(store))).toBe(true);
    store.dispatch(closeAIModal());
    expect(selectIsAIModalOpen(sel(store))).toBe(false);
  });
});

describe('Export modal', () => {
  it('opens and closes', () => {
    const store = makeStore();
    store.dispatch(openExportModal());
    expect(selectIsExportModalOpen(sel(store))).toBe(true);
    store.dispatch(closeExportModal());
    expect(selectIsExportModalOpen(sel(store))).toBe(false);
  });
});

describe('setIsGenerating', () => {
  it('sets generating flag', () => {
    const store = makeStore();
    store.dispatch(setIsGenerating(true));
    expect(selectIsGenerating(sel(store))).toBe(true);
    store.dispatch(setIsGenerating(false));
    expect(selectIsGenerating(sel(store))).toBe(false);
  });
});

describe('panel toggles', () => {
  it('toggleLeftPanel toggles collapsed state', () => {
    const store = makeStore();
    store.dispatch(toggleLeftPanel());
    expect(selectLeftPanelCollapsed(sel(store))).toBe(true);
    store.dispatch(toggleLeftPanel());
    expect(selectLeftPanelCollapsed(sel(store))).toBe(false);
  });

  it('toggleRightPanel toggles collapsed state', () => {
    const store = makeStore();
    store.dispatch(toggleRightPanel());
    expect(selectRightPanelCollapsed(sel(store))).toBe(true);
    store.dispatch(toggleRightPanel());
    expect(selectRightPanelCollapsed(sel(store))).toBe(false);
  });
});

describe('shortcuts modal', () => {
  it('opens and closes', () => {
    const store = makeStore();
    store.dispatch(openShortcutsModal());
    expect(selectIsShortcutsModalOpen(sel(store))).toBe(true);
    store.dispatch(closeShortcutsModal());
    expect(selectIsShortcutsModalOpen(sel(store))).toBe(false);
  });
});

describe('setActiveStepId', () => {
  it('sets and clears active step id', () => {
    const store = makeStore();
    store.dispatch(setActiveStepId('step-1'));
    expect(selectActiveStepId(sel(store))).toBe('step-1');
    store.dispatch(setActiveStepId(null));
    expect(selectActiveStepId(sel(store))).toBeNull();
  });
});

describe('preview step navigation', () => {
  it('setPreviewStepIndex sets the index directly', () => {
    const store = makeStore();
    store.dispatch(setPreviewStepIndex(4));
    expect(selectPreviewStepIndex(sel(store))).toBe(4);
  });

  it('incrementPreviewStep advances when below max', () => {
    const store = makeStore();
    store.dispatch(incrementPreviewStep(3));
    expect(selectPreviewStepIndex(sel(store))).toBe(1);
    store.dispatch(incrementPreviewStep(3));
    expect(selectPreviewStepIndex(sel(store))).toBe(2);
  });

  it('incrementPreviewStep does not exceed max index', () => {
    const store = makeStore();
    store.dispatch(setPreviewStepIndex(2));
    store.dispatch(incrementPreviewStep(3));
    expect(selectPreviewStepIndex(sel(store))).toBe(2);
  });

  it('decrementPreviewStep goes back', () => {
    const store = makeStore();
    store.dispatch(setPreviewStepIndex(2));
    store.dispatch(decrementPreviewStep());
    expect(selectPreviewStepIndex(sel(store))).toBe(1);
  });

  it('decrementPreviewStep does not go below 0', () => {
    const store = makeStore();
    store.dispatch(decrementPreviewStep());
    expect(selectPreviewStepIndex(sel(store))).toBe(0);
  });
});
