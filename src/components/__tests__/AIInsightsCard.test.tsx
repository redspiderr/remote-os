import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AIInsightsCard from '@/components/AIInsightsCard';

describe('AIInsightsCard', () => {
  const insights = [
    {
      id: '1',
      type: 'productivity_tip',
      title: 'Take breaks',
      content: 'Regular breaks improve focus.',
      metadata: {},
      read: false,
      created_at: '2024-01-15T10:00:00Z',
    },
    {
      id: '2',
      type: 'weekly_summary',
      title: 'Week 3',
      content: 'You had a solid week.',
      metadata: {},
      read: true,
      created_at: '2024-01-14T10:00:00Z',
    },
  ];

  it('renders insight titles and unread count', () => {
    render(<AIInsightsCard insights={insights} />);
    expect(screen.getByText('🤖 AI Insights')).toBeInTheDocument();
    expect(screen.getByText('Take breaks')).toBeInTheDocument();
    expect(screen.getByText('1 new')).toBeInTheDocument();
  });

  it('calls onMarkRead when button is clicked', () => {
    const handler = vi.fn();
    render(<AIInsightsCard insights={insights} onMarkRead={handler} />);
    const btn = screen.getByRole('button', { name: /mark as read/i });
    fireEvent.click(btn);
    expect(handler).toHaveBeenCalledWith('1');
  });

  it('shows empty state when no insights', () => {
    render(<AIInsightsCard insights={[]} />);
    expect(screen.getByText(/No insights yet/i)).toBeInTheDocument();
  });
});
