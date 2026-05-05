import { configureStore, combineReducers } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  createMigrate,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import storage from './storage';
import formReducer from './slices/formSlice';
import uiReducer from './slices/uiSlice';
import brandReducer from './slices/brandSlice';
import authReducer from './slices/authSlice';
import { listenerMiddleware } from './listenerMiddleware';
import { migrations } from '@/lib/migrations';


const rootReducer = combineReducers({
  form: formReducer,
  ui: uiReducer,
  brand: brandReducer,
  auth: authReducer,
});


const persistConfig = {
  key: 'formcraft',
  version: 2,
  storage,
  migrate: createMigrate(migrations, { debug: false }),
  /**
   * Persist form (including undo/redo stacks) and brand.
   * Do NOT persist ui or auth — modal/panel state and auth state must
   * always be re-hydrated from the real session on each load.
   */
  whitelist: ['form', 'brand'] as string[],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);


/**
 * Factory function — called once per React tree (via useRef in StoreProvider).
 * Never create a module-level singleton: Next.js App Router runs multiple
 * concurrent requests server-side, and a shared store would leak state between them.
 */
export const makeStore = () => {
  const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          // redux-persist dispatches these non-serializable actions internally
          ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        },
      }).prepend(listenerMiddleware.middleware),
  });

  const persistor = persistStore(store);

  return { store, persistor };
};


export type AppStore = ReturnType<typeof makeStore>['store'];
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
