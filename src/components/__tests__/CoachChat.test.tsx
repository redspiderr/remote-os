import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CoachChat from '@/components/CoachChat';

describe('CoachChat', () => {
  it('renders initial welcome message', () => {
    render(<CoachChat />);
    expect(screen.getByRole('heading', { name: /AI Coach/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ask your coach/i)).toBeInTheDocument();
    expect(screen.getByText(/Hi! I'm your AI coach/i)).toBeInTheDocument();
  });

  it('allows typing and clicking send', () => {
    render(<CoachChat />);
    const input = screen.getByPlaceholderText(/Ask your coach/i);
    fireEvent.change(input, { target: { value: 'How to focus?' } });
    expect(input).toHaveValue('How to focus?');

    const send = screen.getByText('Send');
    fireEvent.click(send);
  });
});
