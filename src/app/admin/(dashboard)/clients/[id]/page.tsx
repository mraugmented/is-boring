'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import StatusBadge from '@/components/admin/StatusBadge';
import StatsCard from '@/components/admin/StatsCard';
import type { Client, ClientSite, Request, Message, ClientFile, PipelineStage, SiteLead } from '@/types/database';
import { PIPELINE_STAGES } from '@/types/database';

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

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const supabase = createSupabaseBrowserClient();

  const [client, setClient] = useState<Client | null>(null);
  const [sites, setSites] = useState<ClientSite[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [clientFiles, setClientFiles] = useState<ClientFile[]>([]);
  const [fileSignedUrls, setFileSignedUrls] = useState<Record<string, string>>({});
  const [leads, setLeads] = useState<SiteLead[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ status: '', plan: '', notes: '', monthly_rate_dollars: '', payment_status: '' });
  const [saving, setSaving] = useState(false);

  // Add site form
  const [showSiteForm, setShowSiteForm] = useState(false);
  const [siteForm, setSiteForm] = useState({
    site_name: '', domain: '', vercel_project_id: '', tech_stack: '', template: '',
  });
  const [addingSite, setAddingSite] = useState(false);

  // Message reply
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // Analytics state
  const [analyticsSiteId, setAnalyticsSiteId] = useState('');
  const [analyticsData, setAnalyticsData] = useState<{
    total_views: number;
    unique_visitors: number;
    top_pages: { path: string; views: number }[];
  } | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Convert prospect
  const [converting, setConverting] = useState(false);
  const [convertError, setConvertError] = useState('');
  const [convertSuccess, setConvertSuccess] = useState('');

  useEffect(() => {
    fetchAll();
  }, [id]);

  async function fetchAll() {
    const [clientRes, sitesRes, requestsRes, messagesRes, filesRes] = await Promise.all([
      supabase.from('clients').select('*').eq('id', id).single(),
      supabase.from('client_sites').select('*').eq('client_id', id).order('created_at', { ascending: false }),
      supabase.from('requests').select('*').eq('client_id', id).order('created_at', { ascending: false }),
      supabase.from('messages').select('*').eq('client_id', id).order('created_at', { ascending: true }),
      supabase.from('client_files').select('*').eq('client_id', id).order('created_at', { ascending: false }),
    ]);

    if (clientRes.data) {
      setClient(clientRes.data as Client);
      setEditForm({
        status: clientRes.data.status,
        plan: clientRes.data.plan,
        notes: clientRes.data.notes || '',
        monthly_rate_dollars: clientRes.data.monthly_rate ? String(clientRes.data.monthly_rate / 100) : '',
        payment_status: clientRes.data.payment_status || 'none',
      });
    }
    setSites((sitesRes.data as ClientSite[]) || []);
    setRequests((requestsRes.data as Request[]) || []);
    setMessages((messagesRes.data as Message[]) || []);
    const fetchedFiles = (filesRes.data as ClientFile[]) || [];
    setClientFiles(fetchedFiles);

    // Fetch leads for all client sites
    const siteIds = ((sitesRes.data as ClientSite[]) || []).map((s) => s.id);
    if (siteIds.length > 0) {
      const { data: leadsData } = await supabase
        .from('site_leads')
        .select('*')
        .in('site_id', siteIds)
        .order('created_at', { ascending: false });
      setLeads((leadsData as SiteLead[]) || []);
    } else {
      setLeads([]);
    }

    setLoading(false);

    // Generate signed URLs for image files
    const urls: Record<string, string> = {};
    for (const f of fetchedFiles) {
      if (f.file_type.startsWith('image/')) {
        const { data: urlData } = await supabase.storage
          .from('client-files')
          .createSignedUrl(f.storage_path, 3600);
        if (urlData?.signedUrl) {
          urls[f.id] = urlData.signedUrl;
        }
      }
    }
    setFileSignedUrls(urls);
  }

  async function fetchAnalytics(siteId: string) {
    if (!siteId) {
      setAnalyticsData(null);
      return;
    }
    setAnalyticsLoading(true);
    const since = new Date();
    since.setDate(since.getDate() - 7);

    const { data: events } = await supabase
      .from('client_analytics')
      .select('*')
      .eq('site_id', siteId)
      .gte('created_at', since.toISOString());

    const rows = events ?? [];
    const pageViews = rows.filter((r: { event_type: string }) => r.event_type === 'page_view');
    const sessionIds = new Set(rows.map((r: { session_id: string }) => r.session_id));

    const pageCounts = new Map<string, number>();
    for (const pv of pageViews) {
      const path = (pv as { event_data?: { path?: string } }).event_data?.path || '/';
      pageCounts.set(path, (pageCounts.get(path) || 0) + 1);
    }
    const topPages = Array.from(pageCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([path, views]) => ({ path, views }));

    setAnalyticsData({
      total_views: pageViews.length,
      unique_visitors: sessionIds.size,
      top_pages: topPages,
    });
    setAnalyticsLoading(false);
  }

  async function handleSaveEdit() {
    if (!client) return;
    setSaving(true);

    const statusChanged = editForm.status !== client.status;
    const monthlyRateCents = editForm.monthly_rate_dollars ? Math.round(parseFloat(editForm.monthly_rate_dollars) * 100) : 0;

    const updateData: Record<string, unknown> = {
      status: editForm.status,
      plan: editForm.plan,
      notes: editForm.notes || null,
      monthly_rate: monthlyRateCents,
      payment_status: editForm.payment_status,
    };

    if (statusChanged) {
      updateData.pipeline_stage_changed_at = new Date().toISOString();
    }

    await supabase.from('clients').update(updateData).eq('id', client.id);

    if (statusChanged) {
      await supabase.from('activity_log').insert({
        client_id: client.id,
        actor: 'admin',
        action: 'stage_changed',
        details: `Status changed from ${client.status.replace(/_/g, ' ')} to ${editForm.status.replace(/_/g, ' ')}`,
        metadata: { from: client.status, to: editForm.status },
      });
    }

    setEditing(false);
    setSaving(false);
    fetchAll();
  }

  async function handleAddSite(e: React.FormEvent) {
    e.preventDefault();
    setAddingSite(true);
    await supabase.from('client_sites').insert({
      client_id: id,
      site_name: siteForm.site_name,
      domain: siteForm.domain || null,
      vercel_project_id: siteForm.vercel_project_id || null,
      tech_stack: siteForm.tech_stack || null,
      template: siteForm.template || null,
      status: 'development',
    });
    setSiteForm({ site_name: '', domain: '', vercel_project_id: '', tech_stack: '', template: '' });
    setShowSiteForm(false);
    setAddingSite(false);
    fetchAll();
  }

  async function handleSendReply() {
    if (!replyText.trim() || !client) return;
    setSendingReply(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('messages').insert({
        client_id: client.id,
        sender_id: user.id,
        sender_role: 'admin',
        content: replyText.trim(),
      });
      setReplyText('');
      fetchAll();
    }
    setSendingReply(false);
  }

  async function handleConvert() {
    if (!client) return;
    setConverting(true);
    setConvertError('');
    setConvertSuccess('');

    try {
      const res = await fetch('/api/admin/convert-prospect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id }),
      });
      const data = await res.json();

      if (res.ok) {
        setConvertSuccess(data.message || 'Client activated and invite sent!');
        fetchAll();
      } else {
        setConvertError(data.error || 'Something went wrong');
      }
    } catch {
      setConvertError('Failed to convert. Check your connection.');
    } finally {
      setConverting(false);
    }
  }

  async function handleUpdateSiteStatus(siteId: string, status: string) {
    await supabase.from('client_sites').update({ status }).eq('id', siteId);
    fetchAll();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="inline-flex items-center gap-3 text-[var(--text-secondary)]">
          <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          <span>Loading client...</span>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-20">
        <p className="text-[var(--text-secondary)]">Client not found</p>
        <Link href="/admin/clients" className="text-sm text-[var(--accent)] hover:underline mt-2 inline-block">
          Back to clients
        </Link>
      </div>
    );
  }

  const openRequests = requests.filter(r => r.status !== 'completed' && r.status !== 'cancelled').length;
  const unreadMessages = messages.filter(m => !m.is_read && m.sender_role === 'client').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/admin/clients" className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">{client.company_name}</h1>
            <StatusBadge status={client.status} size="md" />
            <StatusBadge status={client.plan} size="md" />
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            {client.contact_name && `${client.contact_name} · `}{client.contact_email || 'No email'}
            {client.phone && ` · ${client.phone}`}
          </p>
          <div className="flex items-center gap-2 mt-1">
            {client.monthly_rate > 0 && (
              <span className="text-sm font-medium text-[var(--text-primary)]">
                ${(client.monthly_rate / 100).toLocaleString()}/mo
              </span>
            )}
            {client.payment_status && client.payment_status !== 'none' && (
              <StatusBadge status={client.payment_status} />
            )}
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Created {formatDate(client.created_at)}
            {client.outreach_sent_at && ` · Outreach sent ${timeAgo(client.outreach_sent_at)}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {client.status === 'prospect' && (
            <button
              onClick={handleConvert}
              disabled={converting}
              className="px-4 py-2 rounded-[var(--radius-sm)] bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
            >
              {converting ? 'Converting...' : 'Convert to Client'}
            </button>
          )}
          {client.preview_url && (
            <a
              href={client.preview_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-default)] transition-colors"
            >
              Preview Site
            </a>
          )}
          <button
            onClick={() => setEditing(!editing)}
            className="px-4 py-2 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-default)] transition-colors cursor-pointer"
          >
            {editing ? 'Cancel' : 'Edit'}
          </button>
        </div>
      </div>

      {/* Convert messages */}
      {convertSuccess && (
        <div className="px-4 py-3 rounded-[var(--radius-sm)] bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
          {convertSuccess}
        </div>
      )}
      {convertError && (
        <div className="px-4 py-3 rounded-[var(--radius-sm)] bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {convertError}
        </div>
      )}

      {/* Edit form */}
      {editing && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5 space-y-4">
          <h3 className="text-sm font-medium text-[var(--text-primary)]">Edit Client</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Status</label>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                className="w-full px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent)]"
              >
                {PIPELINE_STAGES.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Plan</label>
              <select
                value={editForm.plan}
                onChange={(e) => setEditForm({ ...editForm, plan: e.target.value })}
                className="w-full px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent)]"
              >
                <option value="starter">Starter</option>
                <option value="growth">Growth</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Monthly Rate ($)</label>
              <input
                type="number"
                min="0"
                step="1"
                value={editForm.monthly_rate_dollars}
                onChange={(e) => setEditForm({ ...editForm, monthly_rate_dollars: e.target.value })}
                placeholder="500"
                className="w-full px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Payment Status</label>
              <select
                value={editForm.payment_status}
                onChange={(e) => setEditForm({ ...editForm, payment_status: e.target.value })}
                className="w-full px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent)]"
              >
                <option value="none">None</option>
                <option value="trial">Trial</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Notes</label>
            <textarea
              value={editForm.notes}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent)] resize-none"
            />
          </div>
          <button
            onClick={handleSaveEdit}
            disabled={saving}
            className="px-4 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition-colors disabled:opacity-50 cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatsCard title="Sites" value={sites.length} />
        <StatsCard title="Open Requests" value={openRequests} />
        <StatsCard title="Unread Messages" value={unreadMessages} />
        <StatsCard title="Total Requests" value={requests.length} />
      </div>

      {/* Sites */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-[var(--text-primary)]">Sites</h2>
          <button
            onClick={() => setShowSiteForm(!showSiteForm)}
            className="px-3 py-1.5 text-sm rounded-[var(--radius-sm)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition-colors cursor-pointer"
          >
            {showSiteForm ? 'Cancel' : 'Add Site'}
          </button>
        </div>

        {showSiteForm && (
          <form onSubmit={handleAddSite} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Site Name *</label>
                <input
                  required
                  value={siteForm.site_name}
                  onChange={(e) => setSiteForm({ ...siteForm, site_name: e.target.value })}
                  placeholder="Main Website"
                  className="w-full px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Domain</label>
                <input
                  value={siteForm.domain}
                  onChange={(e) => setSiteForm({ ...siteForm, domain: e.target.value })}
                  placeholder="example.com"
                  className="w-full px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Vercel Project ID</label>
                <input
                  value={siteForm.vercel_project_id}
                  onChange={(e) => setSiteForm({ ...siteForm, vercel_project_id: e.target.value })}
                  placeholder="prj_xxxxx"
                  className="w-full px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Tech Stack</label>
                <input
                  value={siteForm.tech_stack}
                  onChange={(e) => setSiteForm({ ...siteForm, tech_stack: e.target.value })}
                  placeholder="Next.js, Tailwind, Supabase"
                  className="w-full px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={addingSite}
              className="px-4 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition-colors disabled:opacity-50 cursor-pointer"
            >
              {addingSite ? 'Adding...' : 'Add Site'}
            </button>
          </form>
        )}

        {sites.length === 0 ? (
          <div className="rounded-xl border border-[var(--border-subtle)] p-8 text-center text-[var(--text-tertiary)] text-sm">
            No sites yet
          </div>
        ) : (
          <div className="grid gap-3">
            {sites.map((site) => (
              <div key={site.id} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4 hover:border-[var(--border-default)] transition-all">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-[var(--text-primary)]">{site.site_name}</h3>
                      <StatusBadge status={site.status} />
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {site.domain || 'No domain set'}
                      {site.tech_stack && ` · ${site.tech_stack}`}
                    </p>
                    {site.last_deploy_at && (
                      <p className="text-xs text-[var(--text-muted)]">Last deploy: {timeAgo(site.last_deploy_at)}</p>
                    )}
                  </div>
                  <select
                    value={site.status}
                    onChange={(e) => handleUpdateSiteStatus(site.id, e.target.value)}
                    className="px-2 py-1 text-xs rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
                  >
                    <option value="development">Development</option>
                    <option value="live">Live</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="offline">Offline</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Leads */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-[var(--text-primary)]">Leads</h2>
          <span className="text-sm text-[var(--text-secondary)]">{leads.length} total</span>
        </div>
        {leads.length === 0 ? (
          <div className="rounded-xl border border-[var(--border-subtle)] p-8 text-center text-[var(--text-tertiary)] text-sm">
            No leads yet
          </div>
        ) : (
          <div className="space-y-2">
            {leads.map((lead) => (
              <div key={lead.id} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-[var(--text-primary)]">
                        {lead.name || 'No name'}
                      </h3>
                      {lead.is_read ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-surface)] text-[var(--text-muted)]">Read</span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent-soft)] text-[var(--accent)]">Unread</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <a href={`mailto:${lead.email}`} className="text-[var(--accent)] hover:underline">{lead.email}</a>
                      {lead.phone && (
                        <a href={`tel:${lead.phone}`} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">{lead.phone}</a>
                      )}
                      {lead.business_name && (
                        <span className="text-[var(--text-tertiary)]">{lead.business_name}</span>
                      )}
                    </div>
                    {lead.message && (
                      <p className="text-sm text-[var(--text-secondary)] mt-1">{lead.message}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    <span className="text-xs text-[var(--text-muted)]">{timeAgo(lead.created_at)}</span>
                    {!lead.is_read && (
                      <button
                        onClick={async () => {
                          await supabase.from('site_leads').update({ is_read: true }).eq('id', lead.id);
                          fetchAll();
                        }}
                        className="text-xs text-[var(--accent)] hover:underline cursor-pointer whitespace-nowrap"
                      >
                        Mark as Read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Site Analytics */}
      <div className="space-y-3">
        <h2 className="text-lg font-medium text-[var(--text-primary)]">Site Analytics</h2>
        {sites.length === 0 ? (
          <div className="rounded-xl border border-[var(--border-subtle)] p-6 text-center text-[var(--text-tertiary)] text-sm">
            No sites to show analytics for
          </div>
        ) : (
          <>
            <select
              value={analyticsSiteId}
              onChange={(e) => {
                setAnalyticsSiteId(e.target.value);
                fetchAnalytics(e.target.value);
              }}
              className="px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="">Select a site...</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.site_name} {s.domain ? `(${s.domain})` : ''}</option>
              ))}
            </select>

            {analyticsLoading && (
              <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <div className="w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                Loading...
              </div>
            )}

            {analyticsData && !analyticsLoading && (
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4 space-y-3">
                <div className="flex gap-6">
                  <div>
                    <p className="text-xs text-[var(--text-secondary)]">Views (7d)</p>
                    <p className="text-lg font-semibold text-[var(--text-primary)]">{analyticsData.total_views.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-secondary)]">Visitors (7d)</p>
                    <p className="text-lg font-semibold text-[var(--text-primary)]">{analyticsData.unique_visitors.toLocaleString()}</p>
                  </div>
                </div>
                {analyticsData.top_pages.length > 0 && (
                  <div>
                    <p className="text-xs text-[var(--text-secondary)] mb-1">Top Pages</p>
                    <div className="space-y-1">
                      {analyticsData.top_pages.map((p) => (
                        <div key={p.path} className="flex items-center justify-between text-sm">
                          <span className="text-[var(--text-primary)] truncate mr-3">{p.path}</span>
                          <span className="text-[var(--text-secondary)] whitespace-nowrap">{p.views} views</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {analyticsData.total_views === 0 && (
                  <p className="text-xs text-[var(--text-muted)]">No analytics data for the last 7 days.</p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Requests */}
      <div className="space-y-3">
        <h2 className="text-lg font-medium text-[var(--text-primary)]">Requests</h2>
        {requests.length === 0 ? (
          <div className="rounded-xl border border-[var(--border-subtle)] p-8 text-center text-[var(--text-tertiary)] text-sm">
            No requests yet
          </div>
        ) : (
          <div className="space-y-2">
            {requests.map((req) => (
              <div key={req.id} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-[var(--text-primary)]">{req.title}</h3>
                    <StatusBadge status={req.status} />
                    <StatusBadge status={req.priority} />
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">{timeAgo(req.created_at)}</span>
                </div>
                {req.description && (
                  <p className="text-sm text-[var(--text-tertiary)] mt-2">{req.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="space-y-3">
        <h2 className="text-lg font-medium text-[var(--text-primary)]">Messages</h2>
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] overflow-hidden">
          {messages.length === 0 ? (
            <div className="p-8 text-center text-[var(--text-tertiary)] text-sm">
              No messages yet
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_role === 'admin' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[75%] rounded-xl px-4 py-2.5 ${
                    msg.sender_role === 'admin'
                      ? 'bg-[var(--accent-soft)] text-[var(--text-primary)]'
                      : 'bg-[var(--bg-surface)] text-[var(--text-primary)]'
                  }`}>
                    <p className="text-sm">{msg.content}</p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-1">
                      {msg.sender_role === 'admin' ? 'You' : client.contact_name || 'Client'} · {timeAgo(msg.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Reply input */}
          <div className="border-t border-[var(--border-subtle)] p-3 flex gap-2">
            <input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendReply()}
              placeholder="Send a message..."
              className="flex-1 px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
            />
            <button
              onClick={handleSendReply}
              disabled={sendingReply || !replyText.trim()}
              className="px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm transition-colors disabled:opacity-50 cursor-pointer"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Files */}
      <div className="space-y-3">
        <h2 className="text-lg font-medium text-[var(--text-primary)]">Files</h2>
        {clientFiles.length === 0 ? (
          <div className="rounded-xl border border-[var(--border-subtle)] p-8 text-center text-[var(--text-tertiary)] text-sm">
            No files uploaded by this client
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {clientFiles.map((file) => (
              <div
                key={file.id}
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] overflow-hidden hover:border-[var(--border-default)] transition-all group"
              >
                {file.file_type.startsWith('image/') ? (
                  <a
                    href={fileSignedUrls[file.id] || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block aspect-square bg-[var(--bg-muted)] overflow-hidden cursor-pointer"
                  >
                    {fileSignedUrls[file.id] ? (
                      <img
                        src={fileSignedUrls[file.id]}
                        alt={file.file_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </a>
                ) : (
                  <div className="aspect-square bg-[var(--bg-muted)] flex items-center justify-center">
                    <svg className="w-12 h-12 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                )}
                <div className="p-3 space-y-1">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate" title={file.file_name}>
                    {file.file_name}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {file.file_size < 1024 * 1024
                      ? `${(file.file_size / 1024).toFixed(1)} KB`
                      : `${(file.file_size / (1024 * 1024)).toFixed(1)} MB`}
                    {' '}&middot; {new Date(file.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  {file.notes && (
                    <p className="text-xs text-[var(--text-tertiary)] truncate" title={file.notes}>
                      {file.notes}
                    </p>
                  )}
                  <button
                    onClick={async () => {
                      const { data } = await supabase.storage
                        .from('client-files')
                        .createSignedUrl(file.storage_path, 3600);
                      if (data?.signedUrl) {
                        window.open(data.signedUrl, '_blank');
                      }
                    }}
                    className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors mt-1 cursor-pointer"
                  >
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
