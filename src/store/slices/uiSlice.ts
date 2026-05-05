import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type { PanelTab, PreviewMode, ViewMode } from '@/types/ui';

interface UIState {
  selectedFieldId: string | null;
  rightPanelTab: PanelTab;
  previewDevice: PreviewMode;
  viewMode: ViewMode;
  isAIModalOpen: boolean;
  isExportModalOpen: boolean;
  isGenerating: boolean;
  leftPanelCollapsed: boolean;
  rightPanelCollapsed: boolean;
  isShortcutsModalOpen: boolean;
  activeStepId: string | null;
  previewStepIndex: number;
}

const initialState: UIState = {
  selectedFieldId: null,
  rightPanelTab: 'general',
  previewDevice: 'desktop',
  viewMode: 'edit',
  isAIModalOpen: false,
  isExportModalOpen: false,
  isGenerating: false,
  leftPanelCollapsed: false,
  rightPanelCollapsed: false,
  isShortcutsModalOpen: false,
  activeStepId: null,
  previewStepIndex: 0,
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    selectField(state, action: PayloadAction<string | null>) {
      state.selectedFieldId = action.payload;
      if (action.payload !== null && state.rightPanelCollapsed) {
        state.rightPanelCollapsed = false;
      }
    },

    setRightPanelTab(state, action: PayloadAction<PanelTab>) {
      state.rightPanelTab = action.payload;
    },

    setPreviewDevice(state, action: PayloadAction<PreviewMode>) {
      state.previewDevice = action.payload;
    },

    setViewMode(state, action: PayloadAction<ViewMode>) {
      state.viewMode = action.payload;
      if (action.payload === 'preview') {
        state.selectedFieldId = null;
        state.previewStepIndex = 0;
      }
    },

    setActiveStepId(state, action: PayloadAction<string | null>) {
      state.activeStepId = action.payload;
    },

    setPreviewStepIndex(state, action: PayloadAction<number>) {
      state.previewStepIndex = action.payload;
    },

    incrementPreviewStep(state, action: PayloadAction<number>) {
      const max = action.payload - 1;
      if (state.previewStepIndex < max) state.previewStepIndex += 1;
    },

    decrementPreviewStep(state) {
      if (state.previewStepIndex > 0) state.previewStepIndex -= 1;
    },

    openAIModal(state) {
      state.isAIModalOpen = true;
    },
    closeAIModal(state) {
      state.isAIModalOpen = false;
    },

    openExportModal(state) {
      state.isExportModalOpen = true;
    },
    closeExportModal(state) {
      state.isExportModalOpen = false;
    },

    setIsGenerating(state, action: PayloadAction<boolean>) {
      state.isGenerating = action.payload;
    },

    toggleLeftPanel(state) {
      state.leftPanelCollapsed = !state.leftPanelCollapsed;
    },

    toggleRightPanel(state) {
      state.rightPanelCollapsed = !state.rightPanelCollapsed;
    },

    openShortcutsModal(state) {
      state.isShortcutsModalOpen = true;
    },
    closeShortcutsModal(state) {
      state.isShortcutsModalOpen = false;
    },
  },
});

export const {
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
} = uiSlice.actions;

export const selectSelectedFieldId = (state: RootState): string | null =>
  state.ui.selectedFieldId;

export const selectRightPanelTab = (state: RootState): PanelTab =>
  state.ui.rightPanelTab;

export const selectPreviewDevice = (state: RootState): PreviewMode =>
  state.ui.previewDevice;

export const selectViewMode = (state: RootState): ViewMode =>
  state.ui.viewMode;

export const selectIsAIModalOpen = (state: RootState): boolean =>
  state.ui.isAIModalOpen;

export const selectIsExportModalOpen = (state: RootState): boolean =>
  state.ui.isExportModalOpen;

export const selectIsGenerating = (state: RootState): boolean =>
  state.ui.isGenerating;

export const selectLeftPanelCollapsed = (state: RootState): boolean =>
  state.ui.leftPanelCollapsed;

export const selectRightPanelCollapsed = (state: RootState): boolean =>
  state.ui.rightPanelCollapsed;

export const selectIsShortcutsModalOpen = (state: RootState): boolean =>
  state.ui.isShortcutsModalOpen;

export const selectActiveStepId = (state: RootState): string | null =>
  state.ui.activeStepId;

export const selectPreviewStepIndex = (state: RootState): number =>
  state.ui.previewStepIndex;

export default uiSlice.reducer;
