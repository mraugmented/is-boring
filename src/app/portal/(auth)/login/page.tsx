'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

export default function PortalLoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin + '/auth/callback?next=/portal',
        },
      });

      if (authError) {
        setError(authError.message);
      } else {
        setSent(true);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-8">
          <div className="text-center mb-8">
            <Link
              href="/"
              className="text-lg font-semibold text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors"
            >
              is-boring
            </Link>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Sign in to your client portal
            </p>
          </div>

          {sent ? (
            <div className="text-center space-y-4">
              <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                <p className="text-sm text-[var(--text-primary)]">
                  Check your email
                </p>
                <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                  We sent a magic link to <span className="text-[var(--text-secondary)]">{email}</span>
                </p>
              </div>
              <button
                onClick={() => {
                  setSent(false);
                  setEmail('');
                }}
                className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
              >
                Try a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm text-[var(--text-secondary)] mb-1.5"
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full px-3 py-2.5 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
                />
              </div>

              {error && (
                <p className="text-sm text-red-400">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-[var(--radius-sm)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Sending...' : 'Send magic link'}
              </button>
            </form>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
          >
            Back to homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
