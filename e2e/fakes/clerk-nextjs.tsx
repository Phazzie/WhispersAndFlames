'use client';

/**
 * Stand-in for `@clerk/nextjs` used by the e2e suite (see clerk-shared.ts).
 */
import React, { useEffect, useMemo, useState } from 'react';

import { E2E_USER_COOKIE, parseUserCookie, type FakeUser } from './clerk-shared';

function readUser(): FakeUser | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.split('; ').find((part) => part.startsWith(`${E2E_USER_COOKIE}=`));
  return parseUserCookie(match?.slice(E2E_USER_COOKIE.length + 1));
}

function toUserResource(user: FakeUser) {
  return {
    id: user.id,
    firstName: user.email.split('@')[0],
    fullName: user.email.split('@')[0],
    imageUrl: '',
    emailAddresses: [{ emailAddress: user.email }],
    primaryEmailAddress: { emailAddress: user.email },
    createdAt: new Date(0),
  };
}

export function ClerkProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useUser() {
  const [state, setState] = useState<{ isLoaded: boolean; user: FakeUser | null }>({
    isLoaded: false,
    user: null,
  });
  useEffect(() => {
    setState({ isLoaded: true, user: readUser() });
  }, []);
  // Like real Clerk, hand out a stable user object between renders.
  const user = useMemo(() => (state.user ? toUserResource(state.user) : null), [state.user]);
  return {
    isLoaded: state.isLoaded,
    isSignedIn: !!user,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    user: user as any,
  };
}

export function useClerk() {
  return {
    signOut: async () => {
      document.cookie = `${E2E_USER_COOKIE}=; Max-Age=0; path=/`;
      window.location.href = '/';
    },
  };
}

function Passthrough({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export const SignInButton = Passthrough;
export const SignUpButton = Passthrough;
