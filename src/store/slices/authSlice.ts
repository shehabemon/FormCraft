import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}

interface AuthState {
  user: AuthUser | null;
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated';
}

const initialState: AuthState = {
  user: null,
  status: 'idle',
};

export function toAuthUser(rawUser: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): AuthUser {
  const meta = rawUser.user_metadata ?? {};
  return {
    id: rawUser.id,
    email: rawUser.email ?? '',
    name:
      (meta['full_name'] as string | undefined) ??
      (meta['name'] as string | undefined),
    avatarUrl:
      (meta['avatar_url'] as string | undefined) ??
      (meta['picture'] as string | undefined),
  };
}

/**
 * Called once on app boot to hydrate auth state from the existing session.
 * Uses the browser Supabase client — safe to call only in client components.
 */
export const initAuth = createAsyncThunk<AuthUser | null>(
  'auth/initAuth',
  async () => {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    return data.user ? toAuthUser(data.user) : null;
  },
);

/**
 * Signs the current user out via Supabase, then the auth listener will
 * clear Redux state via `setUser(null)`.
 */
export const signOut = createAsyncThunk<void>(
  'auth/signOut',
  async () => {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    await supabase.auth.signOut();
  },
);

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /** Called by AuthProvider's onAuthStateChange listener. */
    setUser(state, action: PayloadAction<AuthUser | null>) {
      state.user = action.payload;
      state.status = action.payload ? 'authenticated' : 'unauthenticated';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initAuth.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(initAuth.fulfilled, (state, action) => {
        state.user = action.payload;
        state.status = action.payload ? 'authenticated' : 'unauthenticated';
      })
      .addCase(initAuth.rejected, (state) => {
        state.user = null;
        state.status = 'unauthenticated';
      })
      .addCase(signOut.fulfilled, (state) => {
        state.user = null;
        state.status = 'unauthenticated';
      });
  },
});

export const { setUser } = authSlice.actions;

export const selectAuthUser = (state: RootState): AuthUser | null =>
  state.auth.user;

export const selectAuthStatus = (
  state: RootState,
): AuthState['status'] => state.auth.status;

export const selectIsAuthenticated = (state: RootState): boolean =>
  state.auth.status === 'authenticated';

export default authSlice.reducer;
