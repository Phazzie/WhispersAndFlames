'use client';

import React, { useState, useEffect } from 'react';
import { Download, Copy, Check, Share2 } from 'lucide-react';
import QRCode from 'qrcode';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface QRCodeShareProps {
  roomCode: string;
  gameUrl: string;
}

const SocialIcon = ({ path }: { path: string }) => (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    stroke="currentColor"
    fill="currentColor"
    strokeWidth="0"
    className="h-4 w-4"
  >
    <path d={path} />
  </svg>
);

const ICONS = {
  WHATSAPP:
    'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z',
  TWITTER:
    'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
  FACEBOOK:
    'M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036c-2.148 0-2.797 1.651-2.797 3.395v.576h3.612l-.499 3.667h-3.113v7.98h-5.02Z',
};

export function QRCodeShare({ roomCode, gameUrl }: QRCodeShareProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [qrError, setQrError] = useState<string>('');
  const [canShareNative, setCanShareNative] = useState(false);

  useEffect(() => {
    // Check if native sharing is available
    if (typeof navigator !== 'undefined' && navigator.share) {
      setCanShareNative(true);
    }

    // Generate QR code
    QRCode.toDataURL(gameUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        setQrDataUrl(url);
        setQrError('');
      })
      .catch((err) => {
        console.error('Failed to generate QR code:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setQrError(`Failed to generate QR code: ${errorMessage}`);
      });
  }, [gameUrl]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(gameUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;

    const link = document.createElement('a');
    link.download = `whispers-flames-${roomCode}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({
        title: 'Join Whispers and Flames',
        text: `Join my game with room code: ${roomCode}`,
        url: gameUrl,
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const getShareUrl = (platform: 'whatsapp' | 'twitter' | 'facebook') => {
    const text = `Join my game with room code: ${roomCode}`;
    const encodedText = encodeURIComponent(text);
    const encodedUrl = encodeURIComponent(gameUrl);

    switch (platform) {
      case 'whatsapp':
        return `https://wa.me/?text=${encodedText}%20${encodedUrl}`;
      case 'twitter':
        return `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
      case 'facebook':
        return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
      default:
        return '';
    }
  };

  const handleSocialShare = (platform: 'whatsapp' | 'twitter' | 'facebook') => {
    window.open(getShareUrl(platform), '_blank', 'width=600,height=400');
  };

  if (qrError) {
    return (
      <Card className="w-full max-w-sm mx-auto">
        <CardHeader>
          <CardTitle className="text-lg text-destructive">QR Code Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">{qrError}</p>
          <div className="space-y-4">
            <p className="text-sm font-semibold">You can still share the game manually:</p>
            <p className="text-xs text-center text-muted-foreground">
              Room Code: <span className="font-mono font-bold text-lg text-primary">{roomCode}</span>
            </p>
            <p className="text-xs break-all text-center bg-muted p-2 rounded">{gameUrl}</p>
            <Button
              onClick={handleCopyLink}
              variant="outline"
              className="w-full"
            >
              {isCopied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {isCopied ? 'Copied!' : 'Copy Link'}
            </Button>
            {canShareNative && (
              <Button onClick={handleNativeShare} variant="outline" className="w-full">
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!qrDataUrl) {
    return (
      <Card className="w-full max-w-sm mx-auto">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm mx-auto shadow-md">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-xl font-bold">Share Game</CardTitle>
        <CardDescription>Scan QR code or share link to join</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-center">
          {/* Data URL from QR code generation - Next.js Image doesn't support data URLs */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt={`QR code for room ${roomCode}`}
            className="border-4 border-white shadow-sm rounded-lg"
          />
        </div>

        <div className="text-center space-y-1">
           <p className="text-sm text-muted-foreground">Room Code</p>
           <p className="font-mono text-3xl font-bold tracking-wider text-primary">{roomCode}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button onClick={handleCopyLink} variant="outline" className="w-full" aria-label="Copy Link">
            {isCopied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
            {isCopied ? 'Copied' : 'Copy Link'}
          </Button>
          <Button onClick={handleDownload} variant="outline" className="w-full" aria-label="Download QR">
            <Download className="mr-2 h-4 w-4" />
            Save QR
          </Button>
          {canShareNative && (
            <Button onClick={handleNativeShare} variant="outline" className="col-span-2 w-full" aria-label="Share via..." >
               <Share2 className="mr-2 h-4 w-4" />
               Share via...
            </Button>
          )}
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or share via</span>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-muted"
            onClick={() => handleSocialShare('whatsapp')}
            title="Share on WhatsApp"
            aria-label="Share on WhatsApp"
          >
            <SocialIcon path={ICONS.WHATSAPP} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-muted"
            onClick={() => handleSocialShare('twitter')}
            title="Share on X (Twitter)"
            aria-label="Share on X (Twitter)"
          >
            <SocialIcon path={ICONS.TWITTER} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-muted"
            onClick={() => handleSocialShare('facebook')}
            title="Share on Facebook"
            aria-label="Share on Facebook"
          >
            <SocialIcon path={ICONS.FACEBOOK} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
