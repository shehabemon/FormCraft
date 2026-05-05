import type { FieldType, FieldSchema, FormSchema } from './form';

export type PanelTab = 'general' | 'validation' | 'conditional' | 'style';
export type ViewMode = 'edit' | 'preview';
export type PreviewMode = 'desktop' | 'tablet' | 'mobile';

export type DragItemType = 'palette' | 'canvas';

export interface DragItem {
  origin: DragItemType;
  fieldType?: FieldType;
  field?: FieldSchema;
}

export type ExportFormat = 'react' | 'json-schema';

export interface ExportOptions {
  format: ExportFormat;
  includeValidation: boolean;
  includeConditionalLogic: boolean;
  includeStyles: boolean;
}

export interface ExportResult {
  code: string;
  filename: string;
  language: 'tsx' | 'json';
}

export interface AIGenerateRequest {
  prompt: string;
}

export interface AIGenerateResponse {
  success: boolean;
  schema?: FormSchema;
  error?: string;
  rawResponse?: string;
}

export type AIGenerationStatus =
  | 'idle'
  | 'generating'
  | 'success'
  | 'error'
  | 'retrying';
