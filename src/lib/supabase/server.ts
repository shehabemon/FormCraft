import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './database.types';

/**
 * Server-side Supabase client factory.
 * Must be called per-request (NOT at module level) — cookies() is request-scoped.
 * Use this in Route Handlers and Server Components.
 *
 * In Next.js 15, cookies() returns a Promise — we await it here so callers
 * don't need to know about the async boundary.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll is called from Server Components where cookies cannot be
            // set. Safe to ignore — the middleware handles cookie refresh.
          }
        },
      },
    },
  );
}
