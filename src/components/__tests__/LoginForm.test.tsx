import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import LoginForm from '../LoginForm';
import { signIn } from 'next-auth/react';

vi.mocked(signIn).mockImplementation(async () => ({ error: null, ok: true, status: 200, url: '/' }));

describe('LoginForm', () => {
  const onToggle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    render(<LoginForm onToggle={onToggle} />);
  });

  afterEach(() => {
    cleanup();
  });

  it('renders email and password inputs', () => {
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('renders Sign in button', () => {
    expect(screen.getByRole('button', { name: /sign in$/i })).toBeInTheDocument();
  });

  it('renders Google sign-in button', () => {
    expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument();
  });

  it('renders Remember me checkbox', () => {
    const checkbox = screen.getByRole('checkbox', { name: /remember me/i });
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
  });

  it('shows error on invalid credentials submit', async () => {
    vi.mocked(signIn).mockResolvedValueOnce({ error: 'CredentialsSignin', ok: false, status: 401, url: null });

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'bad@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in$/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });
  });

  it('calls signIn with credentials on submit', async () => {
    vi.mocked(signIn).mockResolvedValueOnce({ error: null, ok: true, status: 200, url: '/' });

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in$/i }));

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith('credentials', {
        email: 'test@example.com',
        password: 'password123',
        redirect: false,
        callbackUrl: '/',
      });
    });
  });

  it('calls onToggle when Sign up link is clicked', () => {
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('calls signIn with google when Google button is clicked', async () => {
    fireEvent.click(screen.getByRole('button', { name: /google/i }));

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith('google', { callbackUrl: '/' });
    });
  });

  it('disables submit button while loading', async () => {
    vi.mocked(signIn).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ error: null, ok: true, status: 200, url: '/' }), 100);
        }),
    );

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pass' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in$/i }));

    // When loading, button becomes disabled and only shows spinner (no text)
    const submitBtn = screen.getByRole('button', { name: /^$/i });
    expect(submitBtn).toBeDisabled();
  });
});
