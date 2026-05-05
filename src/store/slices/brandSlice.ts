import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type { BrandConfig, FontFamily, InputSize, LabelPosition, RadiusPreset } from '@/types/brand';
import { DEFAULT_BRAND_CONFIG, BRAND_PRESETS } from '@/constants/defaults';

interface BrandState {
  config: BrandConfig;
  activePreset: RadiusPreset | null;
}

const initialState: BrandState = {
  config: DEFAULT_BRAND_CONFIG,
  activePreset: null,
};

export const brandSlice = createSlice({
  name: 'brand',
  initialState,
  reducers: {
    updateBrand(state, action: PayloadAction<Partial<BrandConfig>>) {
      state.config = { ...state.config, ...action.payload };
      state.activePreset = null;
    },

    applyPreset(state, action: PayloadAction<RadiusPreset>) {
      const preset = BRAND_PRESETS[action.payload];
      if (preset) {
        state.config = { ...state.config, ...preset };
        state.activePreset = action.payload;
      }
    },

    resetBrand(state) {
      state.config = DEFAULT_BRAND_CONFIG;
      state.activePreset = null;
    },
  },
});

export const { updateBrand, applyPreset, resetBrand } = brandSlice.actions;

export const selectBrandConfig = (state: RootState): BrandConfig =>
  state.brand.config;

export const selectBrandPreset = (state: RootState): RadiusPreset | null =>
  state.brand.activePreset;

export const selectPrimaryColor = (state: RootState): string =>
  state.brand.config.primaryColor;

export const selectFontFamily = (state: RootState): FontFamily =>
  state.brand.config.fontFamily;

export const selectLabelPosition = (state: RootState): LabelPosition =>
  state.brand.config.labelPosition;

export const selectInputSize = (state: RootState): InputSize =>
  state.brand.config.inputSize;

export default brandSlice.reducer;
