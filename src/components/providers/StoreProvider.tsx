'use client';

import { useRef } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import type { Persistor } from 'redux-persist';
import { makeStore } from '@/store';
import type { AppStore } from '@/store';
import { FormBuilderSkeleton } from '@/components/shared/FormBuilderSkeleton';

interface StoreRef {
  store: AppStore;
  persistor: Persistor;
}

/**
 * Client-only Redux Provider + PersistGate.
 *
 * SSR strategy:
 * - This component is 'use client', so its body never runs on the server.
 * - `makeStore()` is called once per React tree via useRef — never at module level.
 * - `PersistGate` renders `<FormBuilderSkeleton />` until redux-persist finishes
 *   reading localStorage. This prevents any server/client HTML mismatch because
 *   the real app content is never rendered with empty initial state.
 */
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<StoreRef | null>(null);

  if (!storeRef.current) {
    storeRef.current = makeStore();
  }

  return (
    <Provider store={storeRef.current.store}>
      <PersistGate
        loading={<FormBuilderSkeleton />}
        persistor={storeRef.current.persistor}
      >
        {children}
      </PersistGate>
    </Provider>
  );
}
