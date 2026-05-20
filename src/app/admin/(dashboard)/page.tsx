'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import StatsCard from '@/components/admin/StatsCard';
import StatusBadge from '@/components/admin/StatusBadge';
import ActivityTimeline from '@/components/admin/ActivityTimeline';
import type { Client, Request, Message, ActivityLog, PipelineStage } from '@/types/database';

interface RequestWithClient extends Request {
  clients?: { company_name: string } | null;
}

const SALES_STAGES: { key: PipelineStage; label: string; color: string }[] = [
  { key: 'prospect', label: 'Prospect', color: 'bg-cyan-500' },
  { key: 'outreach_sent', label: 'Outreach Sent', color: 'bg-indigo-500' },
  { key: 'replied', label: 'Replied', color: 'bg-teal-500' },
  { key: 'meeting_booked', label: 'Meeting Booked', color: 'bg-amber-500' },
  { key: 'closed_won', label: 'Closed Won', color: 'bg-green-500' },
  { key: 'closed_lost', label: 'Closed Lost', color: 'bg-red-500' },
];

export default function AdminDashboardPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [recentRequests, setRecentRequests] = useState<RequestWithClient[]>([]);
  const [recentMessages, setRecentMessages] = useState<(Message & { clients?: { company_name: string } | null })[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [clientMap, setClientMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createSupabaseBrowserClient();

      const [
        { data: allClients },
        { data: reqs },
        { data: msgs },
        { data: acts },
      ] = await Promise.all([
        supabase.from('clients').select('*'),
        supabase
          .from('requests')
          .select('*, clients(company_name)')
          .in('status', ['pending', 'in_progress'])
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('messages')
          .select('*, clients(company_name)')
          .eq('is_read', false)
          .eq('sender_role', 'client')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('activity_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      const clientsList = (allClients as Client[]) || [];
      setClients(clientsList);

      const map: Record<string, string> = {};
      clientsList.forEach((c) => { map[c.id] = c.company_name; });
      setClientMap(map);

      setRecentRequests((reqs as RequestWithClient[]) ?? []);
      setRecentMessages(msgs ?? []);
      setActivities((acts as ActivityLog[]) ?? []);
      setLoading(false);
    };

    fetchData();
  }, []);

  // Revenue calculations
  const activeClients = clients.filter(
    (c) => (c.status === 'active' || c.status === 'closed_won') && c.payment_status === 'paid'
  );
  const monthlyRevenue = activeClients.reduce((sum, c) => sum + (c.monthly_rate || 0), 0);

  const pipelineStatuses: PipelineStage[] = ['prospect', 'outreach_sent', 'replied', 'meeting_booked'];
  const pipelineClients = clients.filter((c) => pipelineStatuses.includes(c.status));
  const pipelineValue = pipelineClients.reduce((sum, c) => sum + (c.monthly_rate || 0), 0);

  const activeCount = clients.filter((c) => c.status === 'active' || c.status === 'closed_won').length;

  const totalProspects = clients.filter((c) =>
    ['prospect', 'outreach_sent', 'replied', 'meeting_booked', 'closed_won', 'closed_lost'].includes(c.status)
  ).length;
  const closedWonCount = clients.filter((c) => c.status === 'closed_won').length;
  const conversionRate = totalProspects > 0 ? Math.round((closedWonCount / totalProspects) * 100) : 0;

  // Pipeline bar counts
  const stageCounts = SALES_STAGES.map((stage) => ({
    ...stage,
    count: clients.filter((c) => c.status === stage.key).length,
  }));
  const totalInPipeline = stageCounts.reduce((sum, s) => sum + s.count, 0);

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

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Monthly Revenue"
          value={`$${(monthlyRevenue / 100).toLocaleString()}`}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatsCard
          title="Pipeline Value"
          value={`$${(pipelineValue / 100).toLocaleString()}`}
          href="/admin/pipeline"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          }
        />
        <StatsCard
          title="Active Clients"
          value={activeCount}
          href="/admin/clients"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
        <StatsCard
          title="Conversion Rate"
          value={`${conversionRate}%`}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
      </div>

      {/* Pipeline Overview Bar */}
      <Link
        href="/admin/pipeline"
        className="block rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5 hover:border-[var(--border-default)] transition-all"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-[var(--text-primary)]">Pipeline Overview</h2>
          <span className="text-xs text-[var(--accent)]">View pipeline</span>
        </div>

        {totalInPipeline > 0 ? (
          <>
            <div className="flex rounded-lg overflow-hidden h-8">
              {stageCounts.map((stage) =>
                stage.count > 0 ? (
                  <div
                    key={stage.key}
                    className={`${stage.color} flex items-center justify-center text-white text-xs font-medium transition-all`}
                    style={{ width: `${(stage.count / totalInPipeline) * 100}%`, minWidth: stage.count > 0 ? '32px' : '0' }}
                  >
                    {stage.count}
                  </div>
                ) : null
              )}
            </div>
            <div className="flex flex-wrap gap-3 mt-3">
              {stageCounts.map((stage) => (
                <div key={stage.key} className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                  <span className="text-xs text-[var(--text-tertiary)]">
                    {stage.label} ({stage.count})
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-[var(--text-tertiary)]">No clients in pipeline</p>
        )}
      </Link>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Timeline */}
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
          <div className="px-5 py-4 border-b border-[var(--border-subtle)]">
            <h2 className="text-sm font-medium text-[var(--text-primary)]">Activity Timeline</h2>
          </div>
          <ActivityTimeline activities={activities} clients={clientMap} />
        </div>

        {/* Pending Requests + Unread Messages */}
        <div className="space-y-6">
          {/* Pending Requests */}
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

          {/* Unread Messages */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
            <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <h2 className="text-sm font-medium text-[var(--text-primary)]">Unread Messages</h2>
              <Link href="/admin/messages" className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)]">
                View all
              </Link>
            </div>
            <div className="divide-y divide-[var(--border-subtle)]">
              {recentMessages.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-[var(--text-tertiary)]">
                  No unread messages
                </div>
              ) : (
                recentMessages.map((msg) => (
                  <Link
                    key={msg.id}
                    href={`/admin/clients/${msg.client_id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-[var(--bg-surface)] transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-[var(--text-primary)] truncate">{msg.content}</p>
                      <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                        {msg.clients?.company_name || clientMap[msg.client_id] || 'Unknown client'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                      <span className="text-xs text-[var(--text-muted)]">{formatDate(msg.created_at)}</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
