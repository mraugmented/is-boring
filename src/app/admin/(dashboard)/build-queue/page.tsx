'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import StatusBadge from '@/components/admin/StatusBadge';

interface QueueItem {
  id: string;
  prospect_lead_id: string | null;
  business_name: string;
  category: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  website_url: string | null;
  status: string;
  preview_url: string | null;
  notes: string | null;
  created_at: string;
}

const STATUS_FLOW = ['queued', 'building', 'review', 'deployed', 'sent'];

export default function BuildQueuePage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchQueue();
  }, [filter]);

  async function fetchQueue() {
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    let query = supabase.from('build_queue').select('*').order('created_at', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data } = await query;
    setItems((data as QueueItem[]) || []);
    setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    const supabase = createSupabaseBrowserClient();
    await supabase.from('build_queue').update({ status }).eq('id', id);
    fetchQueue();
  }

  async function updatePreviewUrl(id: string, url: string) {
    const supabase = createSupabaseBrowserClient();
    await supabase.from('build_queue').update({ preview_url: url, status: 'deployed' }).eq('id', id);
    fetchQueue();
  }

  async function updateNotes(id: string, notes: string) {
    const supabase = createSupabaseBrowserClient();
    await supabase.from('build_queue').update({ notes }).eq('id', id);
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  const counts = {
    queued: items.filter(i => i.status === 'queued').length,
    building: items.filter(i => i.status === 'building').length,
    review: items.filter(i => i.status === 'review').length,
    deployed: items.filter(i => i.status === 'deployed').length,
    sent: items.filter(i => i.status === 'sent').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Build Queue</h1>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          Sites to build for prospects. Click "Build This" on any prospect to add them here.
        </p>
      </div>

      {/* Status pipeline overview */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {['all', ...STATUS_FLOW].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
              filter === s
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            {s !== 'all' && (
              <span className="ml-1.5 text-xs opacity-60">
                {counts[s as keyof typeof counts] || 0}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-12 text-center">
          <p className="text-[var(--text-tertiary)]">
            {filter === 'all'
              ? 'No sites in the queue. Go to Prospects and click "Build This" to add some.'
              : `No sites with status "${filter}".`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5 hover:border-[var(--border-default)] transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                      {item.business_name}
                    </h3>
                    <StatusBadge status={item.status} />
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-surface)] text-[var(--text-tertiary)]">
                      {item.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                    {item.phone && <span>{item.phone}</span>}
                    {item.email && <span>{item.email}</span>}
                    {item.city && <span>{item.city}</span>}
                    <span className="text-[var(--text-muted)]">Added {timeAgo(item.created_at)}</span>
                  </div>

                  {item.website_url && (
                    <a
                      href={item.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[var(--text-tertiary)] hover:text-[var(--accent)] underline"
                    >
                      Current site
                    </a>
                  )}

                  {item.preview_url && (
                    <a
                      href={item.preview_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[var(--accent)] hover:underline font-medium"
                    >
                      Preview: {item.preview_url}
                    </a>
                  )}

                  {/* Notes */}
                  <input
                    type="text"
                    defaultValue={item.notes || ''}
                    placeholder="Add notes..."
                    onBlur={(e) => updateNotes(item.id, e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 text-xs rounded-md bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
                  />

                  {/* Preview URL input (for deployed status) */}
                  {(item.status === 'building' || item.status === 'review') && !item.preview_url && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const url = (e.currentTarget.elements.namedItem('url') as HTMLInputElement).value;
                        if (url) updatePreviewUrl(item.id, url);
                      }}
                      className="flex gap-2 mt-1"
                    >
                      <input
                        name="url"
                        type="url"
                        placeholder="Paste Vercel preview URL..."
                        className="flex-1 px-3 py-1.5 text-xs rounded-md bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1.5 text-xs rounded-md bg-green-600 hover:bg-green-700 text-white cursor-pointer"
                      >
                        Deploy
                      </button>
                    </form>
                  )}
                </div>

                {/* Status controls */}
                <div className="flex flex-col gap-1 flex-shrink-0">
                  {item.status === 'queued' && (
                    <button
                      onClick={() => updateStatus(item.id, 'building')}
                      className="px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                    >
                      Start Building
                    </button>
                  )}
                  {item.status === 'building' && (
                    <button
                      onClick={() => updateStatus(item.id, 'review')}
                      className="px-3 py-1.5 text-xs font-medium rounded-md bg-purple-600 hover:bg-purple-700 text-white cursor-pointer"
                    >
                      Ready for Review
                    </button>
                  )}
                  {item.status === 'review' && (
                    <button
                      onClick={() => updateStatus(item.id, 'deployed')}
                      className="px-3 py-1.5 text-xs font-medium rounded-md bg-green-600 hover:bg-green-700 text-white cursor-pointer"
                    >
                      Mark Deployed
                    </button>
                  )}
                  {item.status === 'deployed' && item.preview_url && (
                    <button
                      onClick={() => {
                        const params = new URLSearchParams({
                          name: item.business_name,
                          email: item.email || '',
                          phone: item.phone || '',
                        });
                        window.location.href = `/admin/outreach?${params}&url=${encodeURIComponent(item.preview_url!)}`;
                      }}
                      className="px-3 py-1.5 text-xs font-medium rounded-md bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white cursor-pointer"
                    >
                      Send Outreach
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
