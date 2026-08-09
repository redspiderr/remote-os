import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MoodTracker from '@/components/MoodTracker';

describe('MoodTracker', () => {
  const moods = [
    { id: '1', mood: 4, energy: 3, notes: 'Good day', created_at: '2024-01-15T10:00:00Z' },
    { id: '2', mood: 3, energy: 2, notes: '', created_at: '2024-01-14T10:00:00Z' },
  ];

  it('renders mood check-in buttons and avg', () => {
    render(<MoodTracker moods={moods} />);
    expect(screen.getByText('🧠 Mood Check-in')).toBeInTheDocument();
    expect(screen.getByText('7-day avg: 3.5 / 5')).toBeInTheDocument();
    expect(screen.getByText('Log Mood')).toBeInTheDocument();
  });

  it('logs mood when button clicked', () => {
    const handler = vi.fn();
    render(<MoodTracker moods={[]} onLogMood={handler} />);

    fireEvent.click(screen.getByText('Happy'));
    fireEvent.click(screen.getByText('Good'));
    fireEvent.click(screen.getByText('Log Mood'));

    expect(handler).toHaveBeenCalledWith({ mood: 4, energy: 4, notes: undefined });
  });

  it('allows adding notes', () => {
    const handler = vi.fn();
    render(<MoodTracker moods={[]} onLogMood={handler} />);

    fireEvent.change(screen.getByPlaceholderText(/Anything on your mind/i), {
      target: { value: 'Stressed about deadline' },
    });
    fireEvent.click(screen.getByText('Log Mood'));

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ notes: 'Stressed about deadline' }));
  });
});
