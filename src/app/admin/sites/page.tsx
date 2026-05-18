'use client';

import { useState, useEffect, useMemo } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import DataTable, { type Column } from '@/components/admin/DataTable';
import StatusBadge from '@/components/admin/StatusBadge';
import type { ClientSite } from '@/types/database';

interface SiteWithClient extends ClientSite {
  clients?: { company_name: string } | null;
}

const statusFilters = ['all', 'live', 'development', 'maintenance', 'offline'] as const;

export default function AdminSitesPage() {
  const [sites, setSites] = useState<SiteWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [selectedSite, setSelectedSite] = useState<SiteWithClient | null>(null);

  useEffect(() => {
    const fetchSites = async () => {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase
        .from('client_sites')
        .select('*, clients(company_name)')
        .order('created_at', { ascending: false });

      setSites((data as SiteWithClient[]) ?? []);
      setLoading(false);
    };

    fetchSites();
  }, []);

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return sites;
    return sites.filter((s) => s.status === activeFilter);
  }, [sites, activeFilter]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const columns: Column<SiteWithClient>[] = [
    { key: 'site_name', label: 'Site Name', sortable: true },
    {
      key: 'client_id',
      label: 'Client',
      render: (s) => (
        <span className="text-[var(--text-secondary)]">
          {s.clients?.company_name ?? 'Unknown'}
        </span>
      ),
    },
    {
      key: 'domain',
      label: 'Domain',
      render: (s) =>
        s.domain ? (
          <span className="text-[var(--text-secondary)] font-mono text-xs">{s.domain}</span>
        ) : (
          <span className="text-[var(--text-muted)]">-</span>
        ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (s) => <StatusBadge status={s.status} />,
    },
    {
      key: 'last_deploy_at',
      label: 'Last Deploy',
      sortable: true,
      render: (s) => (
        <span className="text-[var(--text-tertiary)]">{formatDate(s.last_deploy_at)}</span>
      ),
    },
    {
      key: 'tech_stack',
      label: 'Tech Stack',
      render: (s) =>
        s.tech_stack ? (
          <span className="text-xs text-[var(--text-tertiary)]">{s.tech_stack}</span>
        ) : (
          <span className="text-[var(--text-muted)]">-</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-[var(--text-primary)]">Sites</h1>

      {/* Status filter */}
      <div className="flex gap-1 p-1 rounded-[var(--radius-lg)] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] w-fit">
        {statusFilters.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-3 py-1.5 text-xs font-medium rounded-[var(--radius-sm)] capitalize transition-colors ${
              activeFilter === filter
                ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        emptyMessage="No sites found"
        getRowKey={(s) => s.id}
        onRowClick={(s) => setSelectedSite(selectedSite?.id === s.id ? null : s)}
      />

      {/* Visual detail panel */}
      {selectedSite && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-sm font-medium text-[var(--text-primary)]">{selectedSite.site_name}</h3>
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                {selectedSite.clients?.company_name}
              </p>
            </div>
            <button
              onClick={() => setSelectedSite(null)}
              className="p-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Domain</p>
              <p className="text-sm text-[var(--text-primary)] font-mono">{selectedSite.domain || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Status</p>
              <StatusBadge status={selectedSite.status} size="md" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Tech Stack</p>
              <p className="text-sm text-[var(--text-primary)]">{selectedSite.tech_stack || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Last Deploy</p>
              <p className="text-sm text-[var(--text-primary)]">{formatDate(selectedSite.last_deploy_at)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Template</p>
              <p className="text-sm text-[var(--text-primary)]">{selectedSite.template || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Vercel Project</p>
              <p className="text-sm text-[var(--text-primary)] font-mono">{selectedSite.vercel_project_id || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Deploy Status</p>
              <p className="text-sm text-[var(--text-primary)]">{selectedSite.last_deploy_status || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Created</p>
              <p className="text-sm text-[var(--text-primary)]">{formatDate(selectedSite.created_at)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
