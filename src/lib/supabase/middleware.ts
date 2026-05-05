import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { User } from '@supabase/supabase-js';
import type { Database } from './database.types';

export type UpdateSessionResult = {
  response: NextResponse;
  user: User | null;
};

/**
 * Refreshes the Supabase session on every request and returns the
 * (potentially cookie-mutated) response together with the current user.
 *
 * Call this from root middleware.ts only. The response MUST be returned
 * as the final middleware response so token-rotation cookies reach the browser.
 */
export async function updateSession(
  request: NextRequest,
): Promise<UpdateSessionResult> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write new cookies onto the request object first so downstream
          // server code sees the refreshed tokens immediately.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          // Re-build the response so Next.js sends updated cookies to the browser.
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: getUser() triggers the token refresh — do not add any logic
  // between createServerClient() and this call or session refresh will break.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
