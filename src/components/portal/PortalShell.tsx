'use client';

import { useState } from 'react';
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
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            is-boring
          </span>
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
        <div className="p-6 max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </PortalProvider>
  );
}
