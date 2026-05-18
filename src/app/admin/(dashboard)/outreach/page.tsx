'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import StatusBadge from '@/components/admin/StatusBadge';
import type { Client } from '@/types/database';

export default function OutreachPage() {
  const [prospects, setProspects] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    contactName: '',
    contactEmail: '',
    companyName: '',
    previewUrl: '',
    customMessage: '',
    plan: 'starter',
  });

  useEffect(() => {
    fetchProspects();
  }, []);

  async function fetchProspects() {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('status', 'prospect')
      .order('created_at', { ascending: false });

    setProspects((data as Client[]) || []);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/admin/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(`Email sent to ${form.contactEmail}! Prospect created.`);
        setForm({ contactName: '', contactEmail: '', companyName: '', previewUrl: '', customMessage: '', plan: 'starter' });
        setShowForm(false);
        fetchProspects();
      } else if (res.status === 207) {
        setSuccess(`Prospect saved but email failed: ${data.error}`);
        fetchProspects();
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch {
      setError('Failed to send. Check your connection.');
    } finally {
      setSending(false);
    }
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Outreach</h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">Build a site, send the preview, close the deal</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setError(''); setSuccess(''); }}
          className="px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium transition-colors cursor-pointer"
        >
          {showForm ? 'Cancel' : 'New Prospect'}
        </button>
      </div>

      {success && (
        <div className="px-4 py-3 rounded-[var(--radius-sm)] bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
          {success}
        </div>
      )}

      {error && (
        <div className="px-4 py-3 rounded-[var(--radius-sm)] bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-6 space-y-4">
          <h2 className="text-lg font-medium text-[var(--text-primary)]">Send Outreach</h2>
          <p className="text-sm text-[var(--text-tertiary)]">
            This will save the prospect and send them a branded email with the preview link.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Contact Name *</label>
              <input
                type="text"
                required
                value={form.contactName}
                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                placeholder="John Smith"
                className="w-full px-3 py-2.5 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Email *</label>
              <input
                type="email"
                required
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                placeholder="john@company.com"
                className="w-full px-3 py-2.5 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Company Name *</label>
              <input
                type="text"
                required
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                placeholder="Acme Coffee"
                className="w-full px-3 py-2.5 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Plan</label>
              <select
                value={form.plan}
                onChange={(e) => setForm({ ...form, plan: e.target.value })}
                className="w-full px-3 py-2.5 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
              >
                <option value="starter">Starter</option>
                <option value="growth">Growth</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Vercel Preview URL *</label>
            <input
              type="url"
              required
              value={form.previewUrl}
              onChange={(e) => setForm({ ...form, previewUrl: e.target.value })}
              placeholder="https://project-abc123.vercel.app"
              className="w-full px-3 py-2.5 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
            <p className="mt-1 text-xs text-[var(--text-muted)]">The Vercel deployment URL for the site you built for them</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Custom Message <span className="text-[var(--text-muted)]">(optional)</span>
            </label>
            <textarea
              value={form.customMessage}
              onChange={(e) => setForm({ ...form, customMessage: e.target.value })}
              rows={3}
              placeholder={`I came across [Company] and thought your online presence could be doing a lot more for you. So instead of just telling you — I built something.`}
              className="w-full px-3 py-2.5 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors resize-none"
            />
            <p className="mt-1 text-xs text-[var(--text-muted)]">Leave blank for the default pitch message</p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={sending}
              className="px-6 py-2.5 rounded-[var(--radius-sm)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
            >
              {sending ? 'Sending...' : 'Save Prospect & Send Email'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2.5 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Prospect Pipeline */}
      <div>
        <h2 className="text-sm font-medium text-[var(--text-secondary)] mb-3">Prospect Pipeline</h2>
        {loading ? (
          <div className="rounded-xl border border-[var(--border-subtle)] p-12 text-center">
            <div className="inline-flex items-center gap-3 text-[var(--text-secondary)]">
              <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
              <span>Loading...</span>
            </div>
          </div>
        ) : prospects.length === 0 ? (
          <div className="rounded-xl border border-[var(--border-subtle)] p-12 text-center text-[var(--text-tertiary)]">
            No prospects yet. Build a site and send your first outreach!
          </div>
        ) : (
          <div className="space-y-3">
            {prospects.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4 hover:border-[var(--border-default)] transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-[var(--text-primary)]">{p.company_name}</h3>
                      <StatusBadge status="prospect" />
                      {p.plan && <StatusBadge status={p.plan} />}
                    </div>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {p.contact_name} &middot; {p.contact_email}
                    </p>
                    {p.outreach_sent_at && (
                      <p className="text-xs text-[var(--text-muted)]">
                        Outreach sent {timeAgo(p.outreach_sent_at)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {p.preview_url && (
                      <a
                        href={p.preview_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-default)] transition-colors"
                      >
                        Preview
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
