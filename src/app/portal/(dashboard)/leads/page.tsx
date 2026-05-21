'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { usePortal } from '@/components/portal/PortalContext';
import type { ClientSite, SiteLead } from '@/types/database';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function PortalLeadsPage() {
  const { client } = usePortal();
  const [leads, setLeads] = useState<SiteLead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeads() {
      const supabase = createSupabaseBrowserClient();

      // Get client's sites first
      const { data: sitesData } = await supabase
        .from('client_sites')
        .select('id')
        .eq('client_id', client.id);

      const sites = (sitesData as ClientSite[]) ?? [];
      const siteIds = sites.map((s) => s.id);

      if (siteIds.length === 0) {
        setLeads([]);
        setLoading(false);
        return;
      }

      // Fetch leads for those sites
      const { data: leadsData } = await supabase
        .from('site_leads')
        .select('*')
        .in('site_id', siteIds)
        .order('created_at', { ascending: false });

      setLeads((leadsData as SiteLead[]) ?? []);
      setLoading(false);
    }

    fetchLeads();
  }, [client.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const unreadCount = leads.filter((l) => !l.is_read).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Leads</h1>
        <p className="mt-1 text-sm text-[var(--text-tertiary)]">
          Form submissions from your websites.
        </p>
      </div>

      {/* Stats */}
      <div className="flex gap-4">
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-5 py-4">
          <p className="text-xs text-[var(--text-tertiary)]">Total Leads</p>
          <p className="text-2xl font-semibold text-[var(--text-primary)]">{leads.length}</p>
        </div>
        {unreadCount > 0 && (
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-5 py-4">
            <p className="text-xs text-[var(--text-tertiary)]">Unread</p>
            <p className="text-2xl font-semibold text-[var(--accent)]">{unreadCount}</p>
          </div>
        )}
      </div>

      {leads.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-12 text-center">
          <svg className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p className="text-sm text-[var(--text-tertiary)]">
            No leads yet. Once your site is live, form submissions will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => (
            <div
              key={lead.id}
              className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5 hover:border-[var(--border-default)] transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {!lead.is_read && (
                      <span className="w-2 h-2 rounded-full bg-[var(--accent)] flex-shrink-0" />
                    )}
                    <h3 className="text-sm font-medium text-[var(--text-primary)]">
                      {lead.name || 'No name'}
                    </h3>
                    {lead.business_name && (
                      <span className="text-xs text-[var(--text-tertiary)]">
                        {lead.business_name}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <a
                      href={`mailto:${lead.email}`}
                      className="text-[var(--accent)] hover:underline"
                    >
                      {lead.email}
                    </a>
                    {lead.phone && (
                      <a
                        href={`tel:${lead.phone}`}
                        className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      >
                        {lead.phone}
                      </a>
                    )}
                  </div>

                  {lead.message && (
                    <p className="text-sm text-[var(--text-secondary)] mt-2">
                      {lead.message}
                    </p>
                  )}
                </div>

                <span className="text-xs text-[var(--text-muted)] whitespace-nowrap ml-4">
                  {timeAgo(lead.created_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
