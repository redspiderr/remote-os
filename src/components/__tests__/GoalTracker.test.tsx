import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GoalTracker from '@/components/GoalTracker';

describe('GoalTracker', () => {
  const goals = [
    {
      id: 'g1',
      title: 'Ship v1',
      description: 'Launch first version',
      category: 'productivity',
      status: 'active',
      progress: 60,
      deadline: '2024-06-01T00:00:00Z',
    },
    {
      id: 'g2',
      title: 'Exercise daily',
      status: 'completed',
      progress: 100,
    },
  ];

  it('renders active and completed goals', () => {
    render(<GoalTracker goals={goals} />);
    expect(screen.getByText('Ship v1')).toBeInTheDocument();
    expect(screen.getByText('Exercise daily')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
  });

  it('enters edit mode and calls onUpdateProgress', () => {
    const onUpdateProgress = vi.fn();
    const onUpdateStatus = vi.fn();
    render(<GoalTracker goals={goals} onUpdateProgress={onUpdateProgress} onUpdateStatus={onUpdateStatus} />);

    const buttons = screen.getAllByLabelText(/edit goal progress/i);
    fireEvent.click(buttons[0]);

    const save = screen.getByText('Save');
    fireEvent.click(save);

    expect(onUpdateProgress).toHaveBeenCalledWith('g1', 60);
  });

  it('shows empty state', () => {
    render(<GoalTracker goals={[]} />);
    expect(screen.getByText(/No goals yet/i)).toBeInTheDocument();
  });
});
