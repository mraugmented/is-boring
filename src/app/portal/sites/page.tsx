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
          {sites.map((site) => (
            <div
              key={site.id}
              className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5 hover:border-[var(--border-default)] transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {site.site_name}
                  </h3>
                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5 truncate">
                    {site.domain || 'No domain yet'}
                  </p>
                </div>
                <StatusBadge status={site.status} />
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
