'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import StatusBadge from '@/components/admin/StatusBadge';

interface ProspectLead {
  id: string;
  business_name: string;
  category: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string;
  website_url: string | null;
  has_website: boolean;
  website_score: number | null;
  review_count: number;
  rating: number | null;
  score: number;
  status: string;
  notes: string | null;
  preview_url: string | null;
  build_notes: string | null;
  scraped_at: string;
}

const CATEGORY_FILTERS = [
  'All',
  'barber shop',
  'nail salon',
  'beauty salon',
  'hair salon',
  'plumber',
  'electrician',
  'gym',
  'auto body',
  'tattoo shop',
];

export default function ProspectsPage() {
  const [leads, setLeads] = useState<ProspectLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('new');

  useEffect(() => {
    fetchLeads();
  }, [filter, statusFilter]);

  async function fetchLeads() {
    setLoading(true);
    const supabase = createSupabaseBrowserClient();

    let query = supabase
      .from('prospect_leads')
      .select('*')
      .order('score', { ascending: false });

    if (filter !== 'All') {
      query = query.eq('category', filter);
    }
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data } = await query.limit(100);
    setLeads((data as ProspectLead[]) || []);
    setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    const supabase = createSupabaseBrowserClient();
    await supabase.from('prospect_leads').update({ status }).eq('id', id);
    fetchLeads();
  }

  const [texting, setTexting] = useState<string | null>(null);
  const [textSuccess, setTextSuccess] = useState('');
  const [textError, setTextError] = useState('');

  async function convertToOutreach(lead: ProspectLead) {
    const params = new URLSearchParams({
      name: lead.business_name,
      email: lead.email || '',
      phone: lead.phone || '',
    });
    window.location.href = `/admin/outreach?${params}`;
  }

  async function sendText(lead: ProspectLead) {
    setTexting(lead.id);
    setTextSuccess('');
    setTextError('');

    try {
      const res = await fetch('/api/admin/text-outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: lead.phone,
          businessName: lead.business_name,
          prospectLeadId: lead.id,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setTextSuccess(`iMessage sent to ${lead.business_name}!`);
        fetchLeads();
      } else {
        setTextError(data.error || 'Failed to send');
      }
    } catch {
      setTextError('Failed to send. Check connection.');
    } finally {
      setTexting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Discovered Prospects</h1>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          LA businesses that need a website. Ranked by opportunity score.
        </p>
      </div>

      {textSuccess && (
        <div className="px-4 py-3 rounded-[var(--radius-sm)] bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
          {textSuccess}
        </div>
      )}
      {textError && (
        <div className="px-4 py-3 rounded-[var(--radius-sm)] bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {textError}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-1 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] p-1">
          {['new', 'building', 'ready', 'contacted', 'all'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                statusFilter === s
                  ? 'bg-[var(--accent)] text-white'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-1.5 text-sm rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
        >
          {CATEGORY_FILTERS.map((c) => (
            <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-3">
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-5 py-4">
          <p className="text-xs text-[var(--text-tertiary)]">Total</p>
          <p className="text-2xl font-semibold text-[var(--text-primary)]">{leads.length}</p>
        </div>
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-5 py-4">
          <p className="text-xs text-[var(--text-tertiary)]">No Website</p>
          <p className="text-2xl font-semibold text-green-500">
            {leads.filter((l) => !l.has_website).length}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-5 py-4">
          <p className="text-xs text-[var(--text-tertiary)]">Building</p>
          <p className="text-2xl font-semibold text-amber-500">
            {leads.filter((l) => l.status === 'building').length}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-5 py-4">
          <p className="text-xs text-[var(--text-tertiary)]">Ready to Send</p>
          <p className="text-2xl font-semibold text-[var(--accent)]">
            {leads.filter((l) => l.status === 'ready').length}
          </p>
        </div>
      </div>

      {/* Lead list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : leads.length === 0 ? (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-12 text-center">
          <p className="text-[var(--text-tertiary)]">No prospects found. Run the discovery agent:</p>
          <code className="block mt-3 text-sm text-[var(--accent)] bg-[var(--bg-surface)] px-4 py-2 rounded-lg">
            npx tsx scripts/discover-leads.ts
          </code>
        </div>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => (
            <div
              key={lead.id}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5 hover:border-[var(--border-default)] transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                      {lead.business_name}
                    </h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-surface)] text-[var(--text-tertiary)]">
                      {lead.category}
                    </span>
                    {!lead.has_website && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 font-medium">
                        No Website
                      </span>
                    )}
                    {lead.has_website && lead.website_score !== null && lead.website_score < 5 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500 font-medium">
                        Outdated Site
                      </span>
                    )}
                    <StatusBadge status={lead.status} />
                  </div>

                  <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                    {lead.phone && (
                      <a href={`tel:${lead.phone}`} className="hover:text-[var(--accent)]">
                        {lead.phone}
                      </a>
                    )}
                    {lead.email && (
                      <a href={`mailto:${lead.email}`} className="hover:text-[var(--accent)]">
                        {lead.email}
                      </a>
                    )}
                    {lead.address && (
                      <span className="text-[var(--text-tertiary)]">{lead.address}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                    {lead.rating && <span>Rating: {lead.rating}/5</span>}
                    {lead.review_count > 0 && <span>{lead.review_count} reviews</span>}
                    {lead.website_url && (
                      <a
                        href={lead.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--text-tertiary)] hover:text-[var(--accent)] underline"
                      >
                        View site
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Score badge */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                    lead.score >= 10 ? 'bg-green-500/10 text-green-500' :
                    lead.score >= 7 ? 'bg-yellow-500/10 text-yellow-500' :
                    'bg-[var(--bg-surface)] text-[var(--text-tertiary)]'
                  }`}>
                    {lead.score}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1">
                    {lead.status === 'new' && (
                      <button
                        onClick={() => updateStatus(lead.id, 'building')}
                        className="px-3 py-1.5 text-xs font-medium rounded-md bg-amber-600 hover:bg-amber-700 text-white transition-colors cursor-pointer"
                      >
                        Build This
                      </button>
                    )}
                    {lead.status === 'building' && (
                      <button
                        onClick={() => updateStatus(lead.id, 'ready')}
                        className="px-3 py-1.5 text-xs font-medium rounded-md bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition-colors cursor-pointer"
                      >
                        Mark Ready
                      </button>
                    )}
                    {lead.status === 'ready' && lead.email && (
                      <button
                        onClick={() => convertToOutreach(lead)}
                        className="px-3 py-1.5 text-xs font-medium rounded-md bg-green-600 hover:bg-green-700 text-white transition-colors cursor-pointer"
                      >
                        Send Pitch
                      </button>
                    )}
                    {lead.status === 'ready' && !lead.email && lead.phone && (
                      <button
                        onClick={() => sendText(lead)}
                        disabled={texting === lead.id}
                        className="px-3 py-1.5 text-xs font-medium rounded-md bg-green-600 hover:bg-green-700 text-white transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {texting === lead.id ? 'Sending...' : 'Text Pitch'}
                      </button>
                    )}
                    {lead.preview_url && (
                      <a
                        href={lead.preview_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 text-xs rounded-md text-center border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-default)] transition-colors"
                      >
                        Preview
                      </a>
                    )}
                    {lead.status === 'new' && (
                      <button
                        onClick={() => updateStatus(lead.id, 'skipped')}
                        className="px-3 py-1.5 text-xs rounded-md text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
                      >
                        Skip
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
