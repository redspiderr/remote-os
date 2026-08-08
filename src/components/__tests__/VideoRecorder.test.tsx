import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import VideoRecorder from '../VideoRecorder';

// Mock navigator.mediaDevices
const mockGetUserMedia = vi.fn();
const mockStop = vi.fn();
let mockTracks: Array<{ stop: ReturnType<typeof vi.fn> }> = [];

Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: mockGetUserMedia,
  },
  writable: true,
  configurable: true,
});

// Mock MediaRecorder
class MockMediaRecorder {
  state = 'inactive';
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  start = vi.fn(() => {
    this.state = 'recording';
  });
  stop = vi.fn(() => {
    this.state = 'inactive';
    if (this.onstop) this.onstop();
  });
  pause = vi.fn(() => {
    this.state = 'paused';
  });
  resume = vi.fn(() => {
    this.state = 'recording';
  });
  static isTypeSupported = () => true;
}

Object.defineProperty(global, 'MediaRecorder', {
  value: MockMediaRecorder,
  writable: true,
  configurable: true,
});

Object.defineProperty(global, 'Blob', {
  value: class MockBlob {
    constructor(
      public parts: unknown[],
      public options: Record<string, unknown> = {},
    ) {}
  },
  writable: true,
  configurable: true,
});

Object.defineProperty(global, 'URL', {
  value: {
    createObjectURL: vi.fn(() => 'blob:test-url'),
    revokeObjectURL: vi.fn(),
  },
  writable: true,
  configurable: true,
});

describe('VideoRecorder', () => {
  beforeEach(() => {
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => {
        mockTracks = [{ stop: mockStop }];
        return mockTracks;
      },
    });
    mockStop.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders idle state with Start Recording button', () => {
    render(<VideoRecorder />);
    const btn = screen.getByRole('button', { name: /start recording/i });
    expect(btn).toBeInTheDocument();
  });

  it('transitions to previewing after clicking Start Recording', async () => {
    render(<VideoRecorder />);
    const btn = screen.getByRole('button', { name: /start recording/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^record$/i })).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('transitions to recording after clicking Record', async () => {
    render(<VideoRecorder />);
    fireEvent.click(screen.getByRole('button', { name: /start recording/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^record$/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /^record$/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
    });
  });

  it('transitions to paused after clicking Pause', async () => {
    render(<VideoRecorder />);
    fireEvent.click(screen.getByRole('button', { name: /start recording/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^record$/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /^record$/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /pause/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
    });
  });

  it('handles camera permission denial', async () => {
    mockGetUserMedia.mockRejectedValue(new Error('Permission denied'));
    render(<VideoRecorder />);
    fireEvent.click(screen.getByRole('button', { name: /start recording/i }));

    await waitFor(() => {
      expect(screen.getByText(/permission denied/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('resets from error state when Try Again is clicked', async () => {
    mockGetUserMedia.mockRejectedValueOnce(new Error('Permission denied'));
    render(<VideoRecorder />);
    fireEvent.click(screen.getByRole('button', { name: /start recording/i }));

    await waitFor(() => {
      expect(screen.getByText(/permission denied/i)).toBeInTheDocument();
    });

    mockGetUserMedia.mockResolvedValueOnce({
      getTracks: () => {
        mockTracks = [{ stop: mockStop }];
        return mockTracks;
      },
    });

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    await waitFor(() => {
      expect(screen.queryByText(/permission denied/i)).not.toBeInTheDocument();
    });
  });

  it('shows idle label while in idle state', () => {
    render(<VideoRecorder />);
    expect(screen.getByText(/ready to record/i)).toBeInTheDocument();
  });
});
