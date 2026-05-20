'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import StatusBadge from '@/components/admin/StatusBadge';
import type { Client, PipelineStage } from '@/types/database';

const SALES_STAGES: { key: PipelineStage; label: string; color: string }[] = [
  { key: 'prospect', label: 'Prospect', color: 'bg-cyan-500' },
  { key: 'outreach_sent', label: 'Outreach Sent', color: 'bg-indigo-500' },
  { key: 'replied', label: 'Replied', color: 'bg-teal-500' },
  { key: 'meeting_booked', label: 'Meeting Booked', color: 'bg-amber-500' },
  { key: 'closed_won', label: 'Closed Won', color: 'bg-green-500' },
  { key: 'closed_lost', label: 'Closed Lost', color: 'bg-red-500' },
];

function timeAgo(dateStr: string | null) {
  if (!dateStr) return 'N/A';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  return `${months}mo`;
}

export default function PipelinePage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [movingId, setMovingId] = useState<string | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  async function fetchClients() {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });
    setClients((data as Client[]) || []);
    setLoading(false);
  }

  async function moveToStage(client: Client, newStage: PipelineStage) {
    if (newStage === client.status) return;
    setMovingId(client.id);
    const supabase = createSupabaseBrowserClient();

    const now = new Date().toISOString();
    await Promise.all([
      supabase
        .from('clients')
        .update({
          status: newStage,
          pipeline_stage_changed_at: now,
        })
        .eq('id', client.id),
      supabase.from('activity_log').insert({
        client_id: client.id,
        actor: 'admin',
        action: 'stage_changed',
        details: `Moved from ${client.status.replace(/_/g, ' ')} to ${newStage.replace(/_/g, ' ')}`,
        metadata: { from: client.status, to: newStage },
      }),
    ]);

    setMovingId(null);
    fetchClients();
  }

  const grouped = SALES_STAGES.map((stage) => ({
    ...stage,
    clients: clients.filter((c) => c.status === stage.key),
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-[var(--text-primary)]">Pipeline</h1>

      <div className="overflow-x-auto -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
        <div className="flex gap-4 min-w-max pb-4">
          {grouped.map((stage) => (
            <div
              key={stage.key}
              className="w-72 flex-shrink-0 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]"
            >
              {/* Column header */}
              <div className="px-4 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                  <span className="text-sm font-medium text-[var(--text-primary)]">{stage.label}</span>
                </div>
                <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-[var(--bg-muted)] text-[var(--text-tertiary)]">
                  {stage.clients.length}
                </span>
              </div>

              {/* Cards */}
              <div className="p-2 space-y-2 min-h-[120px] max-h-[calc(100vh-220px)] overflow-y-auto">
                {stage.clients.length === 0 ? (
                  <div className="px-3 py-6 text-center text-xs text-[var(--text-muted)]">
                    No clients
                  </div>
                ) : (
                  stage.clients.map((client) => (
                    <div
                      key={client.id}
                      className={`rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 hover:border-[var(--border-default)] transition-all ${
                        movingId === client.id ? 'opacity-50' : ''
                      }`}
                    >
                      <Link href={`/admin/clients/${client.id}`} className="block mb-2">
                        <p className="text-sm font-medium text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors">
                          {client.company_name}
                        </p>
                        {client.contact_name && (
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5">{client.contact_name}</p>
                        )}
                        {client.contact_email && (
                          <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">{client.contact_email}</p>
                        )}
                      </Link>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <StatusBadge status={client.plan} />
                          <span className="text-[10px] text-[var(--text-muted)]">
                            {timeAgo(client.pipeline_stage_changed_at || client.created_at)} in stage
                          </span>
                        </div>

                        {/* Move dropdown */}
                        <select
                          value={client.status}
                          onChange={(e) => moveToStage(client, e.target.value as PipelineStage)}
                          disabled={movingId === client.id}
                          className="px-1.5 py-0.5 text-[10px] rounded bg-[var(--bg-muted)] border border-[var(--border-subtle)] text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] cursor-pointer"
                        >
                          {SALES_STAGES.map((s) => (
                            <option key={s.key} value={s.key}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
