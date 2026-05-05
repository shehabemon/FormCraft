import { configureStore } from '@reduxjs/toolkit';
import brandReducer, {
  updateBrand,
  applyPreset,
  resetBrand,
  selectBrandConfig,
  selectBrandPreset,
  selectPrimaryColor,
  selectFontFamily,
  selectLabelPosition,
  selectInputSize,
} from '@/store/slices/brandSlice';
import { DEFAULT_BRAND_CONFIG, BRAND_PRESETS } from '@/constants/defaults';

function makeStore() {
  return configureStore({ reducer: { brand: brandReducer } });
}

const sel = (store: ReturnType<typeof makeStore>) =>
  store.getState() as never;


describe('initial state', () => {
  it('starts with DEFAULT_BRAND_CONFIG and no active preset', () => {
    const store = makeStore();
    expect(selectBrandConfig(sel(store))).toEqual(DEFAULT_BRAND_CONFIG);
    expect(selectBrandPreset(sel(store))).toBeNull();
  });
});


describe('updateBrand', () => {
  it('merges partial config changes', () => {
    const store = makeStore();
    store.dispatch(updateBrand({ primaryColor: '#ff0000' }));
    expect(selectPrimaryColor(sel(store))).toBe('#ff0000');
    // Other fields unchanged
    expect(selectBrandConfig(sel(store)).fontFamily).toBe(DEFAULT_BRAND_CONFIG.fontFamily);
  });

  it('clears activePreset when brand is manually updated', () => {
    const store = makeStore();
    store.dispatch(applyPreset('minimal'));
    expect(selectBrandPreset(sel(store))).toBe('minimal');

    store.dispatch(updateBrand({ borderRadius: 6 }));
    expect(selectBrandPreset(sel(store))).toBeNull();
  });

  it('can update multiple fields in one dispatch', () => {
    const store = makeStore();
    store.dispatch(updateBrand({ borderRadius: 16, fontFamily: 'poppins', inputSize: 'lg' }));
    const config = selectBrandConfig(sel(store));
    expect(config.borderRadius).toBe(16);
    expect(config.fontFamily).toBe('poppins');
    expect(config.inputSize).toBe('lg');
  });
});


describe('applyPreset', () => {
  it('applies "minimal" preset values to config', () => {
    const store = makeStore();
    store.dispatch(applyPreset('minimal'));
    const config = selectBrandConfig(sel(store));
    const expected = BRAND_PRESETS['minimal'];
    for (const [key, value] of Object.entries(expected)) {
      expect(config[key as keyof typeof config]).toBe(value);
    }
  });

  it('applies "rounded" preset', () => {
    const store = makeStore();
    store.dispatch(applyPreset('rounded'));
    expect(selectBrandConfig(sel(store)).borderRadius).toBe(12);
    expect(selectBrandPreset(sel(store))).toBe('rounded');
  });

  it('applies "sharp" preset — borderRadius 0', () => {
    const store = makeStore();
    store.dispatch(applyPreset('sharp'));
    expect(selectBrandConfig(sel(store)).borderRadius).toBe(0);
    expect(selectBrandPreset(sel(store))).toBe('sharp');
  });

  it('applies "editorial" preset', () => {
    const store = makeStore();
    store.dispatch(applyPreset('editorial'));
    expect(selectBrandConfig(sel(store)).labelPosition).toBe('left');
    expect(selectBrandPreset(sel(store))).toBe('editorial');
  });

  it('no-ops for unknown preset key', () => {
    const store = makeStore();
    const before = selectBrandConfig(sel(store));
    // @ts-expect-error intentionally passing unknown preset
    store.dispatch(applyPreset('nonexistent'));
    expect(selectBrandConfig(sel(store))).toEqual(before);
    expect(selectBrandPreset(sel(store))).toBeNull();
  });
});


describe('resetBrand', () => {
  it('restores DEFAULT_BRAND_CONFIG and clears preset', () => {
    const store = makeStore();
    store.dispatch(updateBrand({ primaryColor: '#abc123', borderRadius: 20 }));
    store.dispatch(applyPreset('minimal'));
    store.dispatch(resetBrand());
    expect(selectBrandConfig(sel(store))).toEqual(DEFAULT_BRAND_CONFIG);
    expect(selectBrandPreset(sel(store))).toBeNull();
  });
});


describe('selectors', () => {
  it('selectFontFamily returns current font', () => {
    const store = makeStore();
    store.dispatch(updateBrand({ fontFamily: 'roboto' }));
    expect(selectFontFamily(sel(store))).toBe('roboto');
  });

  it('selectLabelPosition returns current label position', () => {
    const store = makeStore();
    store.dispatch(updateBrand({ labelPosition: 'left' }));
    expect(selectLabelPosition(sel(store))).toBe('left');
  });

  it('selectInputSize returns current input size', () => {
    const store = makeStore();
    store.dispatch(updateBrand({ inputSize: 'sm' }));
    expect(selectInputSize(sel(store))).toBe('sm');
  });
});
