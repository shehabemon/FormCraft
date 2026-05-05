import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockPush = jest.fn();
const mockRefresh = jest.fn();
const mockGet = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
  useSearchParams: () => ({ get: mockGet }),
}));

jest.mock('next/link', () => {
  const MockLink = ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

const mockSignInWithPassword = jest.fn();
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { signInWithPassword: mockSignInWithPassword },
  }),
}));

// Lazy import after mocks are set up
let LoginPage: React.ComponentType;

beforeAll(async () => {
  const mod = await import('@/app/(auth)/auth/login/page');
  LoginPage = mod.default;
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockReturnValue(null);
});

describe('LoginPage', () => {
  it('renders the sign-in form', () => {
    render(<LoginPage />);
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument();
  });

  it('renders the demo account button', () => {
    render(<LoginPage />);
    expect(screen.getByRole('button', { name: /continue with demo account/i })).toBeInTheDocument();
  });

  it('shows a register link', () => {
    render(<LoginPage />);
    expect(screen.getByRole('link', { name: /create one/i })).toHaveAttribute('href', '/auth/register');
  });

  it('shows a URL error from search params', () => {
    mockGet.mockImplementation((key: string) => (key === 'error' ? 'Session expired' : null));
    render(<LoginPage />);
    expect(screen.getByText('Session expired')).toBeInTheDocument();
  });

  it('shows validation error when submitting empty email', async () => {
    render(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));
    await waitFor(() => {
      expect(screen.getByText(/enter a valid email address/i)).toBeInTheDocument();
    });
  });

  it('calls signInWithPassword and redirects on success', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });
    mockGet.mockImplementation((key: string) => (key === 'redirectTo' ? '/dashboard' : null));
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'secret123',
      });
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('shows friendly error for invalid credentials', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      expect(screen.getByText(/incorrect email or password/i)).toBeInTheDocument();
    });
  });

  describe('demo account button', () => {
    it('signs in with demo credentials and redirects', async () => {
      mockSignInWithPassword.mockResolvedValue({ error: null });
      render(<LoginPage />);

      fireEvent.click(screen.getByRole('button', { name: /continue with demo account/i }));

      await waitFor(() => {
        expect(mockSignInWithPassword).toHaveBeenCalledWith({
          email: 'demo@formcraft.app',
          password: 'FormCraft2024!',
        });
        expect(mockPush).toHaveBeenCalledWith('/');
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it('shows error when demo login fails', async () => {
      mockSignInWithPassword.mockResolvedValue({ error: { message: 'User not found' } });
      render(<LoginPage />);

      fireEvent.click(screen.getByRole('button', { name: /continue with demo account/i }));

      await waitFor(() => {
        expect(screen.getByText(/demo login failed/i)).toBeInTheDocument();
      });
    });

    it('is disabled while the main form is submitting', async () => {
      // Never resolves — simulates in-flight request
      mockSignInWithPassword.mockReturnValue(new Promise(() => {}));
      render(<LoginPage />);

      fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'user@example.com' } });
      fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'secret123' } });
      fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /continue with demo account/i })).toBeDisabled();
      });
    });
  });
});
