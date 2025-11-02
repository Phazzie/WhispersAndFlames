'use client';

import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Download, Share2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface QRCodeShareProps {
  roomCode: string;
  gameUrl: string;
}

export function QRCodeShare({ roomCode, gameUrl }: QRCodeShareProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    // Generate QR code
    QRCode.toDataURL(gameUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate QR code:', err));
  }, [gameUrl]);

  const handleShare = async () => {
    setIsSharing(true);
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Join Whispers and Flames',
          text: `Join my game with room code: ${roomCode}`,
          url: gameUrl,
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(gameUrl);
        alert('Link copied to clipboard!');
      }
    } catch (error) {
      console.error('Share failed:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;

    const link = document.createElement('a');
    link.download = `whispers-flames-${roomCode}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  if (!qrDataUrl) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Share Game</CardTitle>
        <CardDescription>Scan QR code or share link to join</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center">
          <img
            src={qrDataUrl}
            alt={`QR code for room ${roomCode}`}
            className="border-4 border-gray-200 rounded-lg"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button onClick={handleShare} disabled={isSharing} variant="outline" className="w-full">
            <Share2 className="mr-2 h-4 w-4" />
            Share Link
          </Button>
          <Button onClick={handleDownload} variant="outline" className="w-full">
            <Download className="mr-2 h-4 w-4" />
            Download QR
          </Button>
        </div>

        <div className="text-xs text-center text-muted-foreground">
          <p>
            Room Code: <span className="font-mono font-bold text-lg">{roomCode}</span>
          </p>
          <p className="mt-1 break-all">{gameUrl}</p>
        </div>
      </CardContent>
    </Card>
  );
}
