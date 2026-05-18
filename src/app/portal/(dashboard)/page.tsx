'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { usePortal } from '@/components/portal/PortalContext';
import StatsCard from '@/components/admin/StatsCard';
import StatusBadge from '@/components/admin/StatusBadge';
import type { Request } from '@/types/database';

export default function PortalDashboard() {
  const { client } = usePortal();
  const [stats, setStats] = useState({ sites: 0, openRequests: 0, unreadMessages: 0 });
  const [recentRequests, setRecentRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const supabase = createSupabaseBrowserClient();

      const [sitesRes, requestsRes, messagesRes, recentRes] = await Promise.all([
        supabase
          .from('client_sites')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', client.id),
        supabase
          .from('requests')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', client.id)
          .in('status', ['pending', 'in_progress', 'review']),
        supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', client.id)
          .eq('is_read', false)
          .eq('sender_role', 'admin'),
        supabase
          .from('requests')
          .select('*')
          .eq('client_id', client.id)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      setStats({
        sites: sitesRes.count ?? 0,
        openRequests: requestsRes.count ?? 0,
        unreadMessages: messagesRes.count ?? 0,
      });
      setRecentRequests((recentRes.data as Request[]) ?? []);
      setLoading(false);
    }

    fetchData();
  }, [client.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">
          Welcome back, {client.contact_name || client.company_name}
        </h1>
        <p className="mt-1 text-sm text-[var(--text-tertiary)]">
          Here&apos;s what&apos;s happening with your projects.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard
          title="Total Sites"
          value={stats.sites}
          href="/portal/sites"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
            </svg>
          }
        />
        <StatsCard
          title="Open Requests"
          value={stats.openRequests}
          href="/portal/requests"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        <StatsCard
          title="Unread Messages"
          value={stats.unreadMessages}
          href="/portal/messages"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          }
        />
      </div>

      {/* Recent Requests */}
      <div>
        <h2 className="text-sm font-medium text-[var(--text-secondary)] mb-3">
          Recent Requests
        </h2>
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] divide-y divide-[var(--border-subtle)]">
          {recentRequests.length === 0 ? (
            <div className="p-6 text-center text-sm text-[var(--text-tertiary)]">
              No requests yet.
            </div>
          ) : (
            recentRequests.map((req) => (
              <div key={req.id} className="px-4 py-3 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[var(--text-primary)] truncate">
                    {req.title}
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                    {new Date(req.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <StatusBadge status={req.priority} />
                  <StatusBadge status={req.status} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/portal/requests"
          className="px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium transition-colors"
        >
          Submit a Request
        </Link>
        <Link
          href="/portal/sites"
          className="px-4 py-2 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm font-medium transition-colors"
        >
          View Sites
        </Link>
      </div>
    </div>
  );
}
