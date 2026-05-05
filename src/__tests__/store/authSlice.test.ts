import { configureStore } from '@reduxjs/toolkit';
import authReducer, {
  setUser,
  initAuth,
  signOut,
  selectAuthUser,
  selectAuthStatus,
  selectIsAuthenticated,
} from '@/store/slices/authSlice';
import type { AuthUser } from '@/store/slices/authSlice';

function makeStore() {
  return configureStore({ reducer: { auth: authReducer } });
}

const mockUser: AuthUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  avatarUrl: undefined,
};


describe('setUser', () => {
  it('sets user and status to authenticated', () => {
    const store = makeStore();
    store.dispatch(setUser(mockUser));
    expect(selectAuthUser(store.getState() as never)).toEqual(mockUser);
    expect(selectAuthStatus(store.getState() as never)).toBe('authenticated');
    expect(selectIsAuthenticated(store.getState() as never)).toBe(true);
  });

  it('clears user and sets unauthenticated on null', () => {
    const store = makeStore();
    store.dispatch(setUser(mockUser));
    store.dispatch(setUser(null));
    expect(selectAuthUser(store.getState() as never)).toBeNull();
    expect(selectAuthStatus(store.getState() as never)).toBe('unauthenticated');
    expect(selectIsAuthenticated(store.getState() as never)).toBe(false);
  });
});


describe('initAuth thunk lifecycle actions', () => {
  it('sets status to loading on pending', () => {
    const store = makeStore();
    store.dispatch({ type: initAuth.pending.type });
    expect(selectAuthStatus(store.getState() as never)).toBe('loading');
  });

  it('sets user and authenticated on fulfilled with user', () => {
    const store = makeStore();
    store.dispatch({ type: initAuth.fulfilled.type, payload: mockUser });
    expect(selectAuthUser(store.getState() as never)).toEqual(mockUser);
    expect(selectAuthStatus(store.getState() as never)).toBe('authenticated');
  });

  it('sets unauthenticated and null user on fulfilled with null', () => {
    const store = makeStore();
    store.dispatch({ type: initAuth.fulfilled.type, payload: null });
    expect(selectAuthUser(store.getState() as never)).toBeNull();
    expect(selectAuthStatus(store.getState() as never)).toBe('unauthenticated');
  });

  it('sets unauthenticated on rejected', () => {
    const store = makeStore();
    store.dispatch(setUser(mockUser));
    store.dispatch({ type: initAuth.rejected.type });
    expect(selectAuthUser(store.getState() as never)).toBeNull();
    expect(selectAuthStatus(store.getState() as never)).toBe('unauthenticated');
  });
});


describe('signOut thunk', () => {
  it('clears user on fulfilled', () => {
    const store = makeStore();
    store.dispatch(setUser(mockUser));
    store.dispatch({ type: signOut.fulfilled.type });
    expect(selectAuthUser(store.getState() as never)).toBeNull();
    expect(selectAuthStatus(store.getState() as never)).toBe('unauthenticated');
  });
});


describe('initAuth thunk — async execution', () => {
  afterEach(() => {
    jest.resetModules();
  });

  it('resolves with mapped AuthUser from full_name metadata', async () => {
    jest.doMock('@/lib/supabase/client', () => ({
      createClient: () => ({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: {
              user: {
                id: 'u-1',
                email: 'alice@example.com',
                user_metadata: { full_name: 'Alice', avatar_url: 'https://img.example.com/a.png' },
              },
            },
          }),
        },
      }),
    }));

    const { initAuth: freshInitAuth } = await import('@/store/slices/authSlice');
    const store = makeStore();
    const result = await store.dispatch(freshInitAuth());

    expect(initAuth.fulfilled.match(result)).toBe(true);
    const user = (result as { payload: AuthUser }).payload;
    expect(user.id).toBe('u-1');
    expect(user.email).toBe('alice@example.com');
    expect(user.name).toBe('Alice');
    expect(user.avatarUrl).toBe('https://img.example.com/a.png');
  });

  it('falls back to "name" metadata when full_name is absent', async () => {
    jest.doMock('@/lib/supabase/client', () => ({
      createClient: () => ({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: {
              user: {
                id: 'u-2',
                email: 'bob@example.com',
                user_metadata: { name: 'Bob' },
              },
            },
          }),
        },
      }),
    }));

    const { initAuth: freshInitAuth } = await import('@/store/slices/authSlice');
    const store = makeStore();
    const result = await store.dispatch(freshInitAuth());
    const user = (result as { payload: AuthUser }).payload;
    expect(user.name).toBe('Bob');
  });

  it('falls back to "picture" metadata when avatar_url is absent', async () => {
    jest.doMock('@/lib/supabase/client', () => ({
      createClient: () => ({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: {
              user: {
                id: 'u-3',
                email: 'carol@example.com',
                user_metadata: { picture: 'https://google.com/pic.jpg' },
              },
            },
          }),
        },
      }),
    }));

    const { initAuth: freshInitAuth } = await import('@/store/slices/authSlice');
    const store = makeStore();
    const result = await store.dispatch(freshInitAuth());
    const user = (result as { payload: AuthUser }).payload;
    expect(user.avatarUrl).toBe('https://google.com/pic.jpg');
  });

  it('returns null when no session exists', async () => {
    jest.doMock('@/lib/supabase/client', () => ({
      createClient: () => ({
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
        },
      }),
    }));

    const { initAuth: freshInitAuth } = await import('@/store/slices/authSlice');
    const store = makeStore();
    const result = await store.dispatch(freshInitAuth());
    expect((result as { payload: null }).payload).toBeNull();
    expect(selectAuthStatus(store.getState() as never)).toBe('unauthenticated');
  });

  it('rejects when Supabase throws', async () => {
    jest.doMock('@/lib/supabase/client', () => ({
      createClient: () => ({
        auth: {
          getUser: jest.fn().mockRejectedValue(new Error('network error')),
        },
      }),
    }));

    const { initAuth: freshInitAuth } = await import('@/store/slices/authSlice');
    const store = makeStore();
    const result = await store.dispatch(freshInitAuth());
    expect(initAuth.rejected.match(result)).toBe(true);
    expect(selectAuthStatus(store.getState() as never)).toBe('unauthenticated');
  });
});


describe('initial state', () => {
  it('starts idle with no user', () => {
    const store = makeStore();
    expect(selectAuthUser(store.getState() as never)).toBeNull();
    expect(selectAuthStatus(store.getState() as never)).toBe('idle');
    expect(selectIsAuthenticated(store.getState() as never)).toBe(false);
  });
});
