import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import StandupDashboard from '../StandupDashboard';
import type { Standup, TeamHealth } from '../StandupDashboard';

function createStandup(overrides: Partial<Standup> = {}): Standup {
  return {
    id: '1',
    user: { name: 'Alice Smith', avatar: null },
    timestamp: new Date().toISOString(),
    status: 'Summarized',
    transcript: 'Worked on the API. Fixed auth bug.',
    summary: 'Auth fix summary',
    videoUrl: 'https://example.com/video.webm',
    durationSeconds: 65,
    ...overrides,
  };
}

const health: TeamHealth = {
  totalMembers: 5,
  submittedToday: 3,
  submittedThisWeek: 4,
  avgDurationSeconds: 60,
};

describe('StandupDashboard', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders loading skeleton when loading prop is true', () => {
    render(<StandupDashboard standups={[]} loading={true} />);
    expect(screen.getAllByTestId('skeleton-card').length).toBeGreaterThan(0);
  });

  it('renders empty state when no standups', () => {
    render(<StandupDashboard standups={[]} />);
    expect(screen.getByText(/no standups found/i)).toBeInTheDocument();
    expect(screen.getByText(/try adjusting your filters/i)).toBeInTheDocument();
  });

  it('renders standup cards with names', () => {
    const standups = [createStandup(), createStandup({ id: '2', user: { name: 'Bob Jones', avatar: null }, status: 'Transcribed' })];
    render(<StandupDashboard standups={standups} />);
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
  });

  it('renders team health bar', () => {
    const standups = [createStandup()];
    render(<StandupDashboard standups={standups} health={health} />);
    expect(screen.getByText(/team health/i)).toBeInTheDocument();
    expect(screen.getByText('3/5 today')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
  });

  it('filters by search query', () => {
    const standups = [
      createStandup({ id: '1', user: { name: 'Alice Smith', avatar: null }, transcript: 'api work' }),
      createStandup({ id: '2', user: { name: 'Bob Jones', avatar: null }, transcript: 'frontend polish' }),
    ];
    render(<StandupDashboard standups={standups} />);
    const searchInput = screen.getByPlaceholderText(/search by name/i);
    fireEvent.change(searchInput, { target: { value: 'alice' } });
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.queryByText('Bob Jones')).not.toBeInTheDocument();
  });

  it('shows filtered count', () => {
    const standups = [
      createStandup({ id: '1', user: { name: 'Alice Smith', avatar: null } }),
      createStandup({ id: '2', user: { name: 'Bob Jones', avatar: null } }),
    ];
    render(<StandupDashboard standups={standups} />);
    // Text is split across elements, query via partial content
    const resultsText = screen.getByText((content) => content.includes('Showing') && content.includes('standup'));
    expect(resultsText).toBeInTheDocument();
  });

  it('renders status badges', () => {
    const standups = [
      createStandup({ id: '1', status: 'Recorded' }),
      createStandup({ id: '2', status: 'Summarized' }),
    ];
    render(<StandupDashboard standups={standups} />);
    expect(screen.getByText('Recorded')).toBeInTheDocument();
    expect(screen.getByText('Summarized')).toBeInTheDocument();
  });

  it('renders Play button when videoUrl exists', () => {
    const standups = [createStandup({ videoUrl: 'https://example.com/video.webm' })];
    render(<StandupDashboard standups={standups} />);
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
  });

  it('calls onPlayVideo when Play is clicked', () => {
    const onPlay = vi.fn();
    const standups = [createStandup({ videoUrl: 'https://example.com/video.webm' })];
    render(<StandupDashboard standups={standups} onPlayVideo={onPlay} />);
    fireEvent.click(screen.getByRole('button', { name: /play/i }));
    expect(onPlay).toHaveBeenCalledTimes(1);
    expect(onPlay).toHaveBeenCalledWith(expect.objectContaining({ id: '1' }));
  });
});
