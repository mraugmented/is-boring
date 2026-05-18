'use client';

import { useAuth } from '@/components/AuthProvider';

export default function SignOutButton() {
  const { signOut } = useAuth();

  return (
    <button
      onClick={signOut}
      className="px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-[var(--radius-sm)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] transition-all cursor-pointer"
    >
      Sign out
    </button>
  );
}
