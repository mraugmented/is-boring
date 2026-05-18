'use client';

import { createContext, useContext } from 'react';
import type { Client } from '@/types/database';

interface PortalContextType {
  client: Client;
}

const PortalContext = createContext<PortalContextType | null>(null);

export function usePortal() {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error('usePortal must be used within PortalProvider');
  return ctx;
}

export function PortalProvider({
  client,
  children,
}: {
  client: Client;
  children: React.ReactNode;
}) {
  return (
    <PortalContext.Provider value={{ client }}>
      {children}
    </PortalContext.Provider>
  );
}
