'use client';

import { useEffect, useRef, useState } from 'react';
import { useAppDispatch } from '@/store/hooks';
import { initAuth, setUser, toAuthUser } from '@/store/slices/authSlice';
import { resetAllForms } from '@/store/slices/formSlice';
import { createClient } from '@/lib/supabase/client';
import { readLocalForms } from '@/lib/localStorage';
import {
  LocalStorageMigrationModal,
  needsMigration,
  setMigrationFlag,
} from '@/components/migration/LocalStorageMigrationModal';
import type { AuthUser } from '@/store/slices/authSlice';
import type { FormSchema } from '@/types/form';


/**
 * Check whether the migration modal should open for this user.
 * Reads localStorage directly — before loadFormsFromDB has had a chance to
 * overwrite the Redux forms map with DB data.
 */
function checkMigration(userId: string): FormSchema[] {
  const local = readLocalForms();
  return needsMigration(userId, local) ? local : [];
}

/**
 * Hydrates Redux auth state on boot and keeps it in sync with Supabase auth
 * events (sign in, sign out, token refresh).
 *
 * Also owns the one-time localStorage→Supabase migration prompt: when a user
 * first signs in and has local forms, it shows <LocalStorageMigrationModal />.
 *
 * Place this inside StoreProvider but above any component that reads auth state.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const supabase = createClient();

  // Ref guards against double-triggering when both initAuth.fulfilled AND a
  // SIGNED_IN event fire for the same login (e.g. OAuth redirect on reload).
  const migratedUserIdRef = useRef<string | null>(null);

  // Non-empty = modal open. Empty array = closed.
  const [pendingForms, setPendingForms] = useState<FormSchema[]>([]);
  // Capture userId at migration-check time so the flag write in onDone is stable.
  const pendingUserIdRef = useRef<string | null>(null);

  const triggerMigrationIfNeeded = (userId: string) => {
    if (migratedUserIdRef.current === userId) return;
    migratedUserIdRef.current = userId;

    const localForms = checkMigration(userId);
    if (localForms.length > 0) {
      pendingUserIdRef.current = userId;
      setPendingForms(localForms);
    } else {
      // No local forms — set flag now so redux-persist-written forms never
      // trigger the modal on future sign-ins.
      setMigrationFlag(userId);
    }
  };

  const handleMigrationDone = () => {
    if (pendingUserIdRef.current) {
      setMigrationFlag(pendingUserIdRef.current);
      pendingUserIdRef.current = null;
    }
    setPendingForms([]);
  };

  useEffect(() => {
    // Hydrate from the existing session on mount.
    dispatch(initAuth()).then((action) => {
      if (initAuth.fulfilled.match(action) && action.payload) {
        triggerMigrationIfNeeded(action.payload.id);
      }
    });

    // Subscribe to future auth state changes.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const rawUser = session?.user ?? null;
      const authUser = rawUser ? toAuthUser(rawUser) : null;

      dispatch(setUser(authUser));

      if (event === 'SIGNED_OUT') {
        // Clear in-memory forms so the next user (or guest) starts fresh.
        dispatch(resetAllForms());
        migratedUserIdRef.current = null;
        setPendingForms([]);
        pendingUserIdRef.current = null;
      }

      if (event === 'SIGNED_IN' && authUser) {
        triggerMigrationIfNeeded(authUser.id);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
    // supabase client is stable (singleton), dispatch is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {children}
      <LocalStorageMigrationModal
        open={pendingForms.length > 0}
        forms={pendingForms}
        onDone={handleMigrationDone}
      />
    </>
  );
}
