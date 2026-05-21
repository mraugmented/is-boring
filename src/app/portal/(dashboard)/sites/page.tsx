'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { usePortal } from '@/components/portal/PortalContext';
import StatusBadge from '@/components/admin/StatusBadge';
import type { ClientSite } from '@/types/database';

export default function PortalSitesPage() {
  const { client } = usePortal();
  const [sites, setSites] = useState<ClientSite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSites() {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase
        .from('client_sites')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });

      setSites((data as ClientSite[]) ?? []);
      setLoading(false);
    }

    fetchSites();
  }, [client.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Sites</h1>
        <p className="mt-1 text-sm text-[var(--text-tertiary)]">
          All websites managed for {client.company_name}.
        </p>
      </div>

      {sites.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-12 text-center">
          <p className="text-sm text-[var(--text-tertiary)]">No sites yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sites.map((site) => {
            const cardContent = (
              <>
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {site.site_name}
                    </h3>
                    <p className="text-xs text-[var(--text-tertiary)] mt-0.5 truncate">
                      {site.domain ? site.domain : 'Coming soon'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={site.status} />
                    {site.domain && (
                      <svg className="w-4 h-4 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    )}
                  </div>
                </div>

                {site.last_deploy_at && (
                  <p className="text-xs text-[var(--text-muted)]">
                    Last deploy: {new Date(site.last_deploy_at).toLocaleDateString()}{' '}
                    {new Date(site.last_deploy_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )}

                {site.tech_stack && (
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    {site.tech_stack}
                  </p>
                )}
              </>
            );

            return site.domain ? (
              <a
                key={site.id}
                href={`https://${site.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5 hover:border-[var(--border-default)] transition-all block"
              >
                {cardContent}
              </a>
            ) : (
              <div
                key={site.id}
                className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5 transition-all"
              >
                {cardContent}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
