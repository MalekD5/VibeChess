'use client';

import { useState } from 'react';
import { signIn } from '@/lib/auth-client';

export function AuthEntry() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function signInWithGoogle(): Promise<void> {
    setIsLoading(true);
    setError(null);

    try {
      await signIn.social({
        provider: 'google',
        callbackURL: '/',
      });
    } catch {
      setError('Google sign-in could not be started.');
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl shadow-base/50">
        <div className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-wider text-brand">
            Realtime Chess
          </p>
          <h1 className="text-3xl font-semibold text-copy-primary">VibeChess</h1>
          <p className="text-sm text-copy-muted">
            Sign in with Google to start or join a live chess game.
          </p>
        </div>

        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={isLoading}
          className="mt-8 w-full rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-copy-primary transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? 'Connecting...' : 'Continue with Google'}
        </button>

        {error ? (
          <p className="mt-4 rounded-xl border border-error/40 bg-error/10 px-3 py-2 text-sm text-error">
            {error}
          </p>
        ) : null}
      </section>
    </main>
  );
}
