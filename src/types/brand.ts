export type FontFamily =
  | 'inter'
  | 'roboto'
  | 'poppins'
  | 'open-sans'
  | 'lato'
  | 'montserrat'
  | 'system';

export type InputSize = 'sm' | 'md' | 'lg';
export type LabelPosition = 'top' | 'left' | 'floating';
export type SpacingScale = 'compact' | 'comfortable' | 'spacious';
export type RadiusPreset = 'minimal' | 'rounded' | 'sharp' | 'editorial';

export interface BrandConfig {
  primaryColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  errorColor: string;
  successColor: string;
  borderColor: string;
  fontFamily: FontFamily;
  borderRadius: number;
  inputSize: InputSize;
  labelPosition: LabelPosition;
  spacingScale: SpacingScale;
  formMaxWidth: number;
  showLabels: boolean;
}

export interface FieldStyleConfig {
  width: 'full' | 'half' | 'third';
  customClassName: string;
  labelPositionOverride: LabelPosition | null;
}

export interface StyleConfig {
  labelFontSize: string;
  labelFontWeight: string;
  labelColour: string;
  inputBorderStyle: 'solid' | 'dashed' | 'none';
  inputBorderRadius: number;
  inputPadding: string;
  inputFontSize: string;
  placeholderColour: string;
  focusRingColour: string;
  errorColour: string;
  helperTextSize: string;
  fieldSpacing: number;
  variant: 'filled' | 'outlined' | 'underlined';
}
