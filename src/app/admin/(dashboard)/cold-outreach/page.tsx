'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

interface Lead {
  id: string;
  business_name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  category: string | null;
  status: string;
  rating: string | null;
  review_count: number | null;
  has_website: boolean;
  website_score: number;
}

export default function ColdOutreachPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ sent: 0, failed: 0, total: 0 });
  const [testEmail, setTestEmail] = useState('');
  const [testBusiness, setTestBusiness] = useState('Test Business');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchLeads();
  }, []);

  async function fetchLeads() {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from('prospect_leads')
      .select('*')
      .not('email', 'is', null)
      .eq('status', 'new')
      .order('score', { ascending: false });

    // Filter out junk emails
    const clean = (data || []).filter((l: Lead) => {
      if (!l.email) return false;
      const e = l.email.toLowerCase();
      if (e.includes('.png') || e.includes('.jpg')) return false;
      if (e === 'user@domain.com' || e === 'johndoe@domain.com') return false;
      if (!e.includes('@') || !e.includes('.')) return false;
      return true;
    });

    setLeads(clean);
    setLoading(false);
  }

  async function sendTest() {
    if (!testEmail) return;
    setSending(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/admin/cold-outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          businessName: testBusiness,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(`Test email sent to ${testEmail}`);
      } else {
        setError(data.error || 'Failed to send');
      }
    } catch {
      setError('Failed to send. Check connection.');
    } finally {
      setSending(false);
    }
  }

  async function sendBulk() {
    if (!confirm(`Send cold outreach to ${leads.length} leads? This cannot be undone.`)) return;

    setBulkSending(true);
    setBulkProgress({ sent: 0, failed: 0, total: leads.length });
    setError('');
    setSuccess('');

    let sent = 0;
    let failed = 0;

    for (const lead of leads) {
      if (sentIds.has(lead.id)) continue;

      try {
        const res = await fetch('/api/admin/cold-outreach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: lead.email,
            businessName: lead.business_name,
            leadId: lead.id,
          }),
        });

        if (res.ok) {
          sent++;
          setSentIds(prev => new Set(prev).add(lead.id));
        } else {
          failed++;
        }
      } catch {
        failed++;
      }

      setBulkProgress({ sent, failed, total: leads.length });

      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 1500));
    }

    setBulkSending(false);
    setSuccess(`Bulk send complete: ${sent} sent, ${failed} failed out of ${leads.length}`);
    fetchLeads();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Cold Outreach</h1>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          Introduce is-boring to leads — offer a free prototype
        </p>
      </div>

      {success && (
        <div className="px-4 py-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
          {success}
        </div>
      )}
      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Test Send */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-6 space-y-4">
        <h2 className="text-lg font-medium text-[var(--text-primary)]">Test Send</h2>
        <p className="text-sm text-[var(--text-tertiary)]">
          Send a test email to yourself before blasting leads.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Email</label>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="justyn@mraugmented.com"
              className="w-full px-3 py-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Business Name (for template)</label>
            <input
              type="text"
              value={testBusiness}
              onChange={(e) => setTestBusiness(e.target.value)}
              placeholder="Test Business"
              className="w-full px-3 py-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
          </div>
        </div>
        <button
          onClick={sendTest}
          disabled={sending || !testEmail}
          className="px-6 py-2.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
        >
          {sending ? 'Sending...' : 'Send Test'}
        </button>
      </div>

      {/* Bulk Send */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-[var(--text-primary)]">Bulk Send</h2>
            <p className="text-sm text-[var(--text-tertiary)]">
              {loading ? 'Loading leads...' : `${leads.length} leads with valid emails ready to go`}
            </p>
          </div>
          <button
            onClick={sendBulk}
            disabled={bulkSending || leads.length === 0}
            className="px-6 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
          >
            {bulkSending ? `Sending... (${bulkProgress.sent}/${bulkProgress.total})` : `Send to All ${leads.length} Leads`}
          </button>
        </div>

        {bulkSending && (
          <div className="space-y-2">
            <div className="w-full bg-[var(--bg-surface)] rounded-full h-2">
              <div
                className="bg-[var(--accent)] h-2 rounded-full transition-all duration-300"
                style={{ width: `${((bulkProgress.sent + bulkProgress.failed) / bulkProgress.total) * 100}%` }}
              />
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              {bulkProgress.sent} sent · {bulkProgress.failed} failed · {bulkProgress.total - bulkProgress.sent - bulkProgress.failed} remaining
            </p>
          </div>
        )}
      </div>

      {/* Lead List */}
      <div>
        <h2 className="text-sm font-medium text-[var(--text-secondary)] mb-3">
          Leads Queue ({leads.length})
        </h2>
        {loading ? (
          <div className="rounded-xl border border-[var(--border-subtle)] p-12 text-center">
            <div className="inline-flex items-center gap-3 text-[var(--text-secondary)]">
              <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
              <span>Loading leads...</span>
            </div>
          </div>
        ) : leads.length === 0 ? (
          <div className="rounded-xl border border-[var(--border-subtle)] p-12 text-center text-[var(--text-tertiary)]">
            No leads with emails found. Run the scraper first.
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                  <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">Business</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">City</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">Score</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">Status</th>
                </tr>
              </thead>
              <tbody>
                {leads.slice(0, 50).map((lead) => (
                  <tr key={lead.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-surface)] transition-colors">
                    <td className="px-4 py-3 text-[var(--text-primary)]">{lead.business_name}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{lead.email}</td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">{lead.city}</td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">{lead.rating ? `${lead.rating} ★` : '—'}</td>
                    <td className="px-4 py-3">
                      {sentIds.has(lead.id) ? (
                        <span className="text-green-400 text-xs font-medium">Sent ✓</span>
                      ) : (
                        <span className="text-[var(--text-muted)] text-xs">{lead.status}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {leads.length > 50 && (
              <div className="px-4 py-3 text-xs text-[var(--text-muted)] text-center bg-[var(--bg-elevated)]">
                Showing 50 of {leads.length} leads
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
