'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import StatsCard from '@/components/admin/StatsCard';
import StatusBadge from '@/components/admin/StatusBadge';
import type { Client, Request, Contact } from '@/types/database';

interface RequestWithClient extends Request {
  clients?: { company_name: string } | null;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({ clients: 0, sites: 0, requests: 0, messages: 0 });
  const [recentRequests, setRecentRequests] = useState<RequestWithClient[]>([]);
  const [recentContacts, setRecentContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createSupabaseBrowserClient();

      const [
        { count: clientCount },
        { count: siteCount },
        { count: requestCount },
        { count: messageCount },
        { data: requests },
        { data: contacts },
      ] = await Promise.all([
        supabase.from('clients').select('*', { count: 'exact', head: true }),
        supabase.from('client_sites').select('*', { count: 'exact', head: true }).eq('status', 'live'),
        supabase.from('requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('messages').select('*', { count: 'exact', head: true }).eq('is_read', false).eq('sender_role', 'client'),
        supabase
          .from('requests')
          .select('*, clients(company_name)')
          .in('status', ['pending', 'in_progress'])
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('contacts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      setStats({
        clients: clientCount ?? 0,
        sites: siteCount ?? 0,
        requests: requestCount ?? 0,
        messages: messageCount ?? 0,
      });
      setRecentRequests((requests as RequestWithClient[]) ?? []);
      setRecentContacts(contacts ?? []);
      setLoading(false);
    };

    fetchData();
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold text-[var(--text-primary)]">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Clients"
          value={stats.clients}
          href="/admin/clients"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
        <StatsCard
          title="Active Sites"
          value={stats.sites}
          href="/admin/sites"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
            </svg>
          }
        />
        <StatsCard
          title="Pending Requests"
          value={stats.requests}
          href="/admin/requests"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        <StatsCard
          title="Unread Messages"
          value={stats.messages}
          href="/admin/messages"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Requests */}
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
          <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
            <h2 className="text-sm font-medium text-[var(--text-primary)]">Pending Requests</h2>
            <Link href="/admin/requests" className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)]">
              View all
            </Link>
          </div>
          <div className="divide-y divide-[var(--border-subtle)]">
            {recentRequests.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-[var(--text-tertiary)]">
                No pending requests
              </div>
            ) : (
              recentRequests.map((req) => (
                <Link
                  key={req.id}
                  href="/admin/requests"
                  className="flex items-center justify-between px-5 py-3 hover:bg-[var(--bg-surface)] transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[var(--text-primary)] truncate">{req.title}</p>
                    <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                      {req.clients?.company_name ?? 'Unknown client'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    <StatusBadge status={req.priority} />
                    <span className="text-xs text-[var(--text-muted)]">{formatDate(req.created_at)}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent Contacts */}
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
          <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
            <h2 className="text-sm font-medium text-[var(--text-primary)]">Recent Contacts</h2>
            <Link href="/admin/contacts" className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)]">
              View all
            </Link>
          </div>
          <div className="divide-y divide-[var(--border-subtle)]">
            {recentContacts.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-[var(--text-tertiary)]">
                No contacts yet
              </div>
            ) : (
              recentContacts.map((contact) => (
                <div key={contact.id} className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-[var(--text-primary)]">{contact.name || 'Anonymous'}</p>
                      <p className="text-xs text-[var(--text-tertiary)]">{contact.email}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      {!contact.is_read && (
                        <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                      )}
                      <span className="text-xs text-[var(--text-muted)]">{formatDate(contact.created_at)}</span>
                    </div>
                  </div>
                  {contact.message && (
                    <p className="text-xs text-[var(--text-tertiary)] mt-1 line-clamp-1">{contact.message}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
