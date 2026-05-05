import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';

/**
 * Singleton browser Supabase client.
 * Safe to call at module level — only runs in the browser.
 * Use this in client components and client-side hooks.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
