/**
 * UserMenu renders a Sign in link for guests and an avatar trigger for
 * authenticated users. These tests verify the rendering branches and
 * sign-out flow without hitting Supabase.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer, { setUser } from '@/store/slices/authSlice';
import type { AuthUser } from '@/store/slices/authSlice';


const mockPush = jest.fn();
const mockRefresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

jest.mock('next/link', () => {
  const MockLink = ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <a href={href} {...props}>{children}</a>;
  MockLink.displayName = 'MockLink';
  return MockLink;
});

// Mock Supabase so the signOut thunk doesn't make real network calls.
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
  }),
}));


function makeAuthStore() {
  return configureStore({ reducer: { auth: authReducer } });
}

async function renderUserMenu(
  user: AuthUser | null,
  statusOverride?: 'idle' | 'loading' | 'authenticated' | 'unauthenticated',
) {
  const { UserMenu } = await import('@/components/auth/UserMenu');
  const store = makeAuthStore();

  if (statusOverride === 'loading') {
    store.dispatch({ type: 'auth/initAuth/pending' });
  } else if (user) {
    store.dispatch(setUser(user));
  } else {
    // Transition to unauthenticated so the guest branch renders (not idle skeleton)
    store.dispatch(setUser(null));
  }

  render(
    <Provider store={store}>
      <UserMenu />
    </Provider>,
  );
  return store;
}

const mockUser: AuthUser = {
  id: 'user-1',
  email: 'alice@example.com',
  name: 'Alice Smith',
  avatarUrl: undefined,
};


beforeEach(() => {
  jest.clearAllMocks();
});

describe('UserMenu — guest', () => {
  it('renders a Sign in link when no user', async () => {
    await renderUserMenu(null);
    expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
  });

  it('Sign in link points to /auth/login', async () => {
    await renderUserMenu(null);
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/auth/login');
  });
});

describe('UserMenu — loading/idle', () => {
  it('renders a placeholder skeleton during hydration (no Sign in link or avatar)', async () => {
    await renderUserMenu(null, 'loading');
    expect(screen.queryByRole('link', { name: /sign in/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /account menu/i })).not.toBeInTheDocument();
  });
});

describe('UserMenu — authenticated', () => {
  it('renders an avatar button with aria-label "Account menu"', async () => {
    await renderUserMenu(mockUser);
    expect(screen.getByRole('button', { name: /account menu/i })).toBeInTheDocument();
  });

  it('does not render a Sign in link', async () => {
    await renderUserMenu(mockUser);
    expect(screen.queryByRole('link', { name: /sign in/i })).not.toBeInTheDocument();
  });

  it('shows initials derived from name', async () => {
    await renderUserMenu(mockUser);
    // "Alice Smith" → "AS"
    expect(screen.getAllByText('AS').length).toBeGreaterThan(0);
  });

  it('shows initials from email when name is absent', async () => {
    await renderUserMenu({ id: 'u2', email: 'bob@example.com' });
    // "bob@example.com" split on @ → ["bob", "example.com"] → "BE"
    expect(screen.getAllByText('BE').length).toBeGreaterThan(0);
  });

  it('opens dropdown and shows user name on trigger click', async () => {
    await renderUserMenu(mockUser);
    fireEvent.click(screen.getByRole('button', { name: /account menu/i }));
    expect(await screen.findByText('Alice Smith')).toBeInTheDocument();
  });

  it('opens dropdown and shows email', async () => {
    await renderUserMenu(mockUser);
    fireEvent.click(screen.getByRole('button', { name: /account menu/i }));
    const emails = await screen.findAllByText('alice@example.com');
    expect(emails.length).toBeGreaterThan(0);
  });

  it('calls router.push("/") when My forms is clicked', async () => {
    await renderUserMenu(mockUser);
    fireEvent.click(screen.getByRole('button', { name: /account menu/i }));
    const myForms = await screen.findByText(/my forms/i);
    fireEvent.click(myForms);
    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('signs out and navigates to / when Sign out is clicked', async () => {
    const store = await renderUserMenu(mockUser);
    fireEvent.click(screen.getByRole('button', { name: /account menu/i }));
    const signOutItem = await screen.findByText(/sign out/i);
    fireEvent.click(signOutItem);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });
});
