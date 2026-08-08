import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import DeepWorkGuard from '../DeepWorkGuard';

describe('DeepWorkGuard', () => {
  const onPhaseChange = vi.fn();

  beforeEach(() => {
    onPhaseChange.mockClear();
    // localStorage mock
    Storage.prototype.getItem = vi.fn(() => null);
    Storage.prototype.setItem = vi.fn();
    Storage.prototype.removeItem = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders idle state with task input and presets', () => {
    render(<DeepWorkGuard />);
    expect(screen.getByPlaceholderText(/what are you focusing on/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pomodoro/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /deep 30/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /deep 60/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /deep 90/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start focus/i })).toBeInTheDocument();
  });

  it('selects a preset when clicked', () => {
    render(<DeepWorkGuard />);
    const deep30 = screen.getByRole('button', { name: /deep 30/i });
    fireEvent.click(deep30);
    expect(deep30).toHaveClass('bg-[#2A6FBB]');
  });

  it('transitions to focus phase on Start Focus click', () => {
    render(<DeepWorkGuard onPhaseChange={onPhaseChange} />);
    fireEvent.click(screen.getByRole('button', { name: /start focus/i }));
    expect(onPhaseChange).toHaveBeenCalledWith('focus');
  });

  it('shows timer display during focus phase', async () => {
    render(<DeepWorkGuard />);
    fireEvent.click(screen.getByRole('button', { name: /start focus/i }));
    expect(screen.getByTestId('timer-display')).toBeInTheDocument();
    expect(screen.getByText(/deep work$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
  });

  it('counts down timer after starting focus', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<DeepWorkGuard />);
    fireEvent.click(screen.getByRole('button', { name: /start focus/i }));
    await waitFor(() => {
      expect(screen.getByTestId('timer-display')).toHaveTextContent(/25:00/i);
    });

    vi.advanceTimersByTime(3000);

    await waitFor(() => {
      expect(screen.getByTestId('timer-display')).toHaveTextContent(/24:57/i);
    });
    vi.useRealTimers();
  });

  it('stops focus session and returns to idle', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<DeepWorkGuard onPhaseChange={onPhaseChange} />);
    fireEvent.click(screen.getByRole('button', { name: /start focus/i }));
    await waitFor(() => {
      expect(screen.getByTestId('timer-display')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /stop/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/what are you focusing on/i)).toBeInTheDocument();
    });
    expect(onPhaseChange).toHaveBeenCalledWith('idle');
    vi.useRealTimers();
  });

  it('renders minimal mode correctly', () => {
    render(<DeepWorkGuard minimal />);
    expect(screen.getByPlaceholderText(/what are you focusing on/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /settings/i })).not.toBeInTheDocument();
  });

  it('renders settings panel when settings button is clicked', () => {
    render(<DeepWorkGuard />);
    const settingsBtn = screen.getByRole('button', { name: /settings/i });
    fireEvent.click(settingsBtn);
    expect(screen.getByText(/blocked sites/i)).toBeInTheDocument();
  });

  it('allows typing a task', () => {
    render(<DeepWorkGuard />);
    const input = screen.getByPlaceholderText(/what are you focusing on/i);
    fireEvent.change(input, { target: { value: 'Write tests' } });
    expect(input).toHaveValue('Write tests');
  });
});
