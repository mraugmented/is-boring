'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { usePortal } from '@/components/portal/PortalContext';
import type { ClientSite } from '@/types/database';

interface AnalyticsData {
  total_views: number;
  unique_visitors: number;
  avg_session_duration: number;
  views_by_day: { date: string; views: number; visitors: number }[];
  top_pages: { path: string; views: number }[];
}

export default function PortalAnalyticsPage() {
  const { client } = usePortal();
  const [sites, setSites] = useState<ClientSite[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>('');
  const [period, setPeriod] = useState<'7d' | '30d'>('7d');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [sitesLoading, setSitesLoading] = useState(true);

  useEffect(() => {
    async function fetchSites() {
      const supabase = createSupabaseBrowserClient();
      const { data: sitesData } = await supabase
        .from('client_sites')
        .select('*')
        .eq('client_id', client.id)
        .order('site_name');
      setSites((sitesData as ClientSite[]) ?? []);
      if (sitesData && sitesData.length > 0) {
        setSelectedSite(sitesData[0].id);
      }
      setSitesLoading(false);
    }
    fetchSites();
  }, [client.id]);

  useEffect(() => {
    if (!selectedSite) return;
    setLoading(true);
    fetch(`/api/portal/analytics?site_id=${selectedSite}&period=${period}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedSite, period]);

  function formatDuration(seconds: number) {
    if (seconds === 0) return '0s';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  if (sitesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Analytics</h1>
        <p className="mt-1 text-sm text-[var(--text-tertiary)]">
          Track visitors and page views across your sites.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={selectedSite}
          onChange={(e) => setSelectedSite(e.target.value)}
          className="px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent)]"
        >
          {sites.length === 0 && <option value="">No sites</option>}
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.site_name} {s.domain ? `(${s.domain})` : ''}
            </option>
          ))}
        </select>

        <div className="flex rounded-[var(--radius-sm)] border border-[var(--border-subtle)] overflow-hidden">
          <button
            onClick={() => setPeriod('7d')}
            className={`px-3 py-2 text-sm transition-colors cursor-pointer ${
              period === '7d'
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            7 days
          </button>
          <button
            onClick={() => setPeriod('30d')}
            className={`px-3 py-2 text-sm transition-colors cursor-pointer ${
              period === '30d'
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            30 days
          </button>
        </div>
      </div>

      {sites.length === 0 ? (
        <div className="rounded-xl border border-[var(--border-subtle)] p-12 text-center">
          <p className="text-sm text-[var(--text-tertiary)]">
            No sites found. Analytics will be available once a site is added to your account.
          </p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data && data.total_views > 0 ? (
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5">
              <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Total Views</p>
              <p className="text-2xl font-semibold text-[var(--text-primary)] mt-1">{data.total_views.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5">
              <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Unique Visitors</p>
              <p className="text-2xl font-semibold text-[var(--text-primary)] mt-1">{data.unique_visitors.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5">
              <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Avg Session Duration</p>
              <p className="text-2xl font-semibold text-[var(--text-primary)] mt-1">{formatDuration(data.avg_session_duration)}</p>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5">
            <h2 className="text-sm font-medium text-[var(--text-secondary)] mb-4">Views by Day</h2>
            <div className="flex items-end gap-1" style={{ height: '160px' }}>
              {(() => {
                const maxViews = Math.max(...data.views_by_day.map((d) => d.views), 1);
                return data.views_by_day.map((day) => (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                    <span className="text-[10px] text-[var(--text-muted)]">{day.views}</span>
                    <div
                      className="w-full rounded-t bg-[var(--accent)]"
                      style={{
                        height: `${Math.max((day.views / maxViews) * 140, 2)}px`,
                        minHeight: '2px',
                        opacity: day.views > 0 ? 1 : 0.2,
                      }}
                    />
                    <span className="text-[9px] text-[var(--text-muted)] truncate w-full text-center">
                      {new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* Top Pages */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] overflow-hidden">
            <div className="px-5 py-3 border-b border-[var(--border-subtle)]">
              <h2 className="text-sm font-medium text-[var(--text-secondary)]">Top Pages</h2>
            </div>
            <div className="divide-y divide-[var(--border-subtle)]">
              {data.top_pages.map((page) => (
                <div key={page.path} className="px-5 py-3 flex items-center justify-between">
                  <span className="text-sm text-[var(--text-primary)] truncate mr-4">{page.path}</span>
                  <span className="text-sm text-[var(--text-secondary)] font-medium whitespace-nowrap">
                    {page.views.toLocaleString()} views
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-[var(--border-subtle)] p-12 text-center">
          <svg className="w-10 h-10 mx-auto text-[var(--text-muted)] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-sm text-[var(--text-tertiary)]">
            Analytics data will appear here once your site is live and tracking is enabled.
          </p>
        </div>
      )}
    </div>
  );
}
