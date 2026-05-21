'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import type { Client } from '@/types/database';
import { PortalProvider } from './PortalContext';
import PortalSidebar from './PortalSidebar';
import SignOutButton from './SignOutButton';

export default function PortalShell({
  client,
  children,
}: {
  client: Client;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const showAgreementBanner =
    !client.agreement_signed_at && pathname !== '/portal/agreement';

  return (
    <PortalProvider client={client}>
      {/* Top nav */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-[var(--bg-primary)] border-b border-[var(--border-subtle)] z-50 flex items-center px-4">
        {/* Left: hamburger + logo */}
        <div className="flex items-center gap-3 flex-1">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Image src="/logo.jpeg" alt="is-boring" width={100} height={33} className="h-7 w-auto invert" />
        </div>

        {/* Center: company name */}
        <div className="flex-1 text-center">
          <span className="text-sm text-[var(--text-secondary)]">
            {client.company_name}
          </span>
        </div>

        {/* Right: sign out */}
        <div className="flex-1 flex justify-end">
          <SignOutButton />
        </div>
      </header>

      <PortalSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <main className="pt-14 lg:pl-56 min-h-screen bg-[var(--bg-primary)]">
        {showAgreementBanner && (
          <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-amber-400">
              Please review and sign your service agreement to get started.
            </p>
            <Link
              href="/portal/agreement"
              className="text-sm font-medium text-amber-400 hover:text-amber-300 underline shrink-0 ml-4"
            >
              Review Agreement
            </Link>
          </div>
        )}
        <div className="p-6 max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </PortalProvider>
  );
}
