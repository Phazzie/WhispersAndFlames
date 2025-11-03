'use client';

import { Loader2, Home, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Logo } from '@/components/icons/logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { usePlayerIdentity } from '@/hooks/use-player-identity';
import { useToast } from '@/hooks/use-toast';
import { PLAYER_NAME_MAX_LENGTH, sanitizePlayerName } from '@/lib/player-validation';

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { identity, hydrated, setName, resetIdentity } = usePlayerIdentity();
  const [name, setLocalName] = useState('');

  useEffect(() => {
    if (identity?.name) {
      setLocalName(identity.name);
    }
  }, [identity?.name]);

  const handleSave = () => {
    const sanitized = sanitizePlayerName(name);
    if (!sanitized) {
      toast({
        title: 'Name required',
        description: 'Give yourself a nickname so your partner knows who joined.',
        variant: 'destructive',
      });
      return;
    }
    setLocalName(sanitized);
    setName(sanitized);
    toast({ title: 'Profile updated', description: 'Your name is saved on this device.' });
  };

  const handleReset = () => {
    resetIdentity();
    setLocalName('');
    toast({ title: 'Profile reset', description: 'A fresh anonymous identity has been created.' });
  };

  if (!hydrated || !identity) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-amber-50 to-orange-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6 py-8">
        <div className="flex items-center justify-between">
          <Logo className="h-8 w-8" />
          <div className="flex gap-2">
            <Button onClick={() => router.push('/')} variant="outline">
              <Home className="mr-2 h-4 w-4" />
              Home
            </Button>
            <Button onClick={handleReset} variant="ghost">
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset identity
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Anonymous Profile</CardTitle>
            <CardDescription>Saved securely on this device only.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground" htmlFor="profile-name">
                Display name
              </label>
              <Input
                id="profile-name"
                value={name}
                onChange={(event) => setLocalName(event.target.value)}
                maxLength={PLAYER_NAME_MAX_LENGTH}
                placeholder="E.g. Starlit Muse"
                onBlur={(event) => {
                  const sanitized = sanitizePlayerName(event.target.value);
                  setLocalName(sanitized);
                }}
              />
            </div>
            <Button onClick={handleSave} className="w-full md:w-auto">
              Save changes
            </Button>
            <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Anonymous ID</p>
              <code className="text-xs font-mono break-all">{identity.id}</code>
              <p>
                Share this ID only if you want to reconnect progress on the same device. We never
                upload it to a server.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Game History</CardTitle>
            <CardDescription>Coming soon</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-8">
              Game history will be available in a future update. For now, rooms stay active while at
              least one player keeps the tab open.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
