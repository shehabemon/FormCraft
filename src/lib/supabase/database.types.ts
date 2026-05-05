export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type FormRow = {
  id: string;
  user_id: string;
  title: string;
  /** Full Redux FormSchema serialised as JSONB. */
  content: Json;
  created_at: string;
  updated_at: string;
};

export type FormRowInsert = Omit<FormRow, 'created_at' | 'updated_at'>;
export type FormRowUpdate = Partial<Pick<FormRow, 'title' | 'content'>>;

/**
 * Database type in the exact shape @supabase/supabase-js expects so that
 * `.from('forms')` resolves Row / Insert / Update correctly.
 */
export type Database = {
  public: {
    Tables: {
      forms: {
        Row: FormRow;
        Insert: FormRowInsert;
        Update: FormRowUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
