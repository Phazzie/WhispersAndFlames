import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QRCodeShare } from './qr-code-share';

// Mock qrcode library
vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,mockqrcode'),
  },
}));

describe('QRCodeShare', () => {
  const defaultProps = {
    roomCode: 'ABCD',
    gameUrl: 'https://example.com/game/ABCD',
  };

  it('renders the component with room code', async () => {
    render(<QRCodeShare {...defaultProps} />);

    // Wait for the main content to appear (it renders a spinner initially)
    const title = await screen.findByText('Share Game');
    expect(title).toBeInTheDocument();
    expect(screen.getByText('ABCD')).toBeInTheDocument();
  });

  it('generates QR code', async () => {
    render(<QRCodeShare {...defaultProps} />);

    // Wait for the image to appear
    const qrImage = await screen.findByRole('img');
    expect(qrImage).toHaveAttribute('src', 'data:image/png;base64,mockqrcode');
  });

  it('renders social share buttons', async () => {
    render(<QRCodeShare {...defaultProps} />);

    await screen.findByText('Share Game');

    expect(screen.getByRole('button', { name: /copy link/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download qr/i })).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /share on whatsapp/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /share on x/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /share on facebook/i })).toBeInTheDocument();
  });

  it('renders native share button when available', async () => {
    // Mock navigator.share
    const shareMock = vi.fn();
    Object.assign(navigator, {
        share: shareMock,
    });

    render(<QRCodeShare {...defaultProps} />);
    await screen.findByText('Share Game');

    // Force re-render or wait for effect?
    // The effect runs on mount and checks navigator.share.
    // Since we mocked it before render, it should be available.

    const shareButton = await screen.findByRole('button', { name: /share via.../i });
    expect(shareButton).toBeInTheDocument();

    shareButton.click();
    expect(shareMock).toHaveBeenCalledWith({
        title: 'Join Whispers and Flames',
        text: 'Join my game with room code: ABCD',
        url: 'https://example.com/game/ABCD',
    });
  });
});
