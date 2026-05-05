import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from './index';

/**
 * Pre-typed dispatch hook — use this instead of `useDispatch` throughout the app.
 * Gives you correct types for thunk actions and slice action creators.
 */
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();

/**
 * Pre-typed selector hook — use this instead of `useSelector` throughout the app.
 * Infers the return type from the selector function automatically.
 */
export const useAppSelector = useSelector.withTypes<RootState>();
