import { useCallback, useEffect, useMemo, useState } from 'react';

import { sanitizePlayerName } from '@/lib/player-validation';

const STORAGE_KEY = 'whispers-and-flames/player-identity';

type StoredIdentity = {
  id: string;
  name: string;
};

function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function createIdentity(name = ''): StoredIdentity {
  return {
    id: generateId(),
    name,
  };
}

function readIdentity(): StoredIdentity | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<StoredIdentity>;
    if (parsed && typeof parsed.id === 'string' && parsed.id) {
      return {
        id: parsed.id,
        name: typeof parsed.name === 'string' ? sanitizePlayerName(parsed.name) : '',
      };
    }
  } catch (error) {
    console.warn('[identity] Failed to read stored player identity:', error);
  }

  return null;
}

function persistIdentity(identity: StoredIdentity) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
  } catch (error) {
    console.warn('[identity] Failed to persist player identity:', error);
  }
}

export function usePlayerIdentity() {
  const [identity, setIdentity] = useState<StoredIdentity | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const stored = readIdentity();
    const nextIdentity = stored ?? createIdentity();

    if (!stored) {
      persistIdentity(nextIdentity);
    }

    setIdentity(nextIdentity);
    setHydrated(true);
  }, []);

  const setName = useCallback((name: string) => {
    setIdentity((current) => {
      const sanitized = sanitizePlayerName(name);
      const base = current ?? createIdentity(sanitized);
      const updated = { ...base, name: sanitized };
      persistIdentity(updated);
      return updated;
    });
  }, []);

  const resetIdentity = useCallback(() => {
    const next = createIdentity();
    persistIdentity(next);
    setIdentity(next);
  }, []);

  return useMemo(
    () => ({
      identity,
      hydrated,
      setName,
      resetIdentity,
    }),
    [identity, hydrated, resetIdentity, setName]
  );
}

export type PlayerIdentity = StoredIdentity;
