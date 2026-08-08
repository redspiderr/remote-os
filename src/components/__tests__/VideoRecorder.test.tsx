import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import VideoRecorder from '../VideoRecorder';

// Mock getUserMedia
const mockGetUserMedia = vi.fn();
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: { getUserMedia: mockGetUserMedia },
  writable: true,
});

// Mock URL.createObjectURL
Object.defineProperty(global, 'URL', {
  value: { createObjectURL: vi.fn(() => 'blob:test') },
  writable: true,
});

describe('VideoRecorder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders start recording button', () => {
    render(<VideoRecorder />);
    const button = screen.getByRole('button', { name: /start recording/i });
    expect(button).toBeInTheDocument();
  });

  it('handles permission denial gracefully', async () => {
    mockGetUserMedia.mockRejectedValueOnce(new Error('Permission denied'));
    render(<VideoRecorder />);
    
    const button = screen.getByRole('button', { name: /start recording/i });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText(/permission denied|camera/i)).toBeInTheDocument();
    });
  });

  it('shows error reset button', async () => {
    mockGetUserMedia.mockRejectedValueOnce(new Error('Permission denied'));
    render(<VideoRecorder />);
    
    const button = screen.getByRole('button', { name: /start recording/i });
    fireEvent.click(button);
    
    await waitFor(() => {
      const retryButton = screen.getByRole('button', { name: /try again/i });
      expect(retryButton).toBeInTheDocument();
    });
  });
});
