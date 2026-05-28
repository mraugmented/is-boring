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

interface Stats {
  totalLeads: number;
  contacted: number;
  newWithEmail: number;
  newNoEmail: number;
  emailsSentToday: number;
  emailsFailed: number;
  categories: { category: string; count: number }[];
}

export default function ColdOutreachPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ sent: 0, failed: 0, total: 0 });
  const [discovering, setDiscovering] = useState(false);
  const [discoverCategory, setDiscoverCategory] = useState('');
  const [discoverCity, setDiscoverCity] = useState('');
  const [sweeping, setSweeping] = useState(false);
  const [sweepLog, setSweepLog] = useState<string[]>([]);
  const [sweepProgress, setSweepProgress] = useState({ done: 0, total: 0 });
  const [testEmail, setTestEmail] = useState('');
  const [testBusiness, setTestBusiness] = useState('Test Business');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    const supabase = createSupabaseBrowserClient();

    // Fetch stats
    const [
      { count: totalLeads },
      { count: contacted },
      { count: newWithEmail },
      { data: activityData },
      { data: categoryData },
    ] = await Promise.all([
      supabase.from('prospect_leads').select('*', { count: 'exact', head: true }),
      supabase.from('prospect_leads').select('*', { count: 'exact', head: true }).eq('status', 'contacted'),
      supabase.from('prospect_leads').select('*', { count: 'exact', head: true }).eq('status', 'new').not('email', 'is', null),
      supabase.from('activity_log').select('action, created_at').eq('action', 'cold_outreach_sent'),
      supabase.from('prospect_leads').select('category').eq('status', 'new'),
    ]);

    const today = new Date().toISOString().split('T')[0];
    const sentToday = (activityData || []).filter((a: { created_at: string }) => a.created_at?.startsWith(today)).length;
    const totalSent = (activityData || []).length;

    // Count categories
    const catCounts: Record<string, number> = {};
    (categoryData || []).forEach((r: { category: string }) => {
      catCounts[r.category] = (catCounts[r.category] || 0) + 1;
    });
    const categories = Object.entries(catCounts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    setStats({
      totalLeads: totalLeads ?? 0,
      contacted: contacted ?? 0,
      newWithEmail: newWithEmail ?? 0,
      newNoEmail: (totalLeads ?? 0) - (contacted ?? 0) - (newWithEmail ?? 0),
      emailsSentToday: sentToday,
      emailsFailed: (contacted ?? 0) - totalSent,
      categories,
    });

    // Fetch unsent leads with email
    const { data } = await supabase
      .from('prospect_leads')
      .select('*')
      .not('email', 'is', null)
      .eq('status', 'new')
      .order('score', { ascending: false });

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
        body: JSON.stringify({ email: testEmail, businessName: testBusiness }),
      });
      const data = await res.json();
      if (res.ok) setSuccess(`Test email sent to ${testEmail}`);
      else setError(data.error || 'Failed to send');
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
          body: JSON.stringify({ email: lead.email, businessName: lead.business_name, leadId: lead.id }),
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
      await new Promise(r => setTimeout(r, 1500));
    }

    setBulkSending(false);
    setSuccess(`Bulk send complete: ${sent} sent, ${failed} failed out of ${leads.length}`);
    fetchAll();
  }

  const TARGET_CATEGORIES = [
    'small gym', 'personal trainer', 'plumber', 'electrician',
    'beauty salon', 'hair salon', 'nail salon', 'barber shop',
    'auto body shop', 'landscaping', 'cleaning service', 'tattoo shop',
    'pet grooming', 'handyman', 'moving company', 'massage therapist',
    'yoga studio', 'carpet cleaning', 'pressure washing', 'florist',
    'bakery', 'dog walker', 'chiropractor', 'veterinarian',
    'photographer', 'catering', 'tutoring', 'dry cleaner', 'tailor', 'locksmith',
  ];

  async function discoverLeads() {
    if (!discoverCity) {
      setError('Pick a city');
      return;
    }
    setDiscovering(true);
    setError('');
    setSuccess('');

    const cats = discoverCategory ? [discoverCategory] : TARGET_CATEGORIES;
    let totalFound = 0, totalSaved = 0, totalEmails = 0;

    // Send one category at a time so we don't timeout
    for (const cat of cats) {
      try {
        const res = await fetch('/api/admin/discover-leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ city: discoverCity, category: cat }),
        });
        if (res.ok) {
          const data = await res.json();
          totalFound += data.found;
          totalSaved += data.saved;
          totalEmails += data.emails;
          setSweepLog(prev => [...prev, `${discoverCity} → ${cat}: ${data.found} found, ${data.saved} saved, ${data.emails} emails`]);
        }
      } catch { /* continue */ }
      await new Promise(r => setTimeout(r, 500));
    }

    setSuccess(`[${discoverCity}] Done! ${totalFound} found, ${totalSaved} saved, ${totalEmails} emails.`);
    setDiscovering(false);
    fetchAll();
  }

  const LA_CITIES = [
    'Chatsworth CA', 'Northridge CA', 'Granada Hills CA', 'Porter Ranch CA',
    'Sylmar CA', 'San Fernando CA', 'Pacoima CA', 'Arleta CA', 'Sun Valley CA',
    'North Hollywood CA', 'Valley Village CA', 'Studio City CA', 'Sherman Oaks CA',
    'Encino CA', 'Tarzana CA', 'Woodland Hills CA', 'Canoga Park CA', 'Reseda CA',
    'Van Nuys CA', 'Panorama City CA', 'Burbank CA', 'Glendale CA', 'Pasadena CA',
    'Eagle Rock Los Angeles CA', 'Highland Park Los Angeles CA', 'Silver Lake Los Angeles CA',
    'Echo Park Los Angeles CA', 'Los Feliz Los Angeles CA', 'Atwater Village Los Angeles CA',
    'Koreatown Los Angeles CA', 'Downtown Los Angeles CA', 'West Hollywood CA',
    'Hollywood Los Angeles CA', 'Mid-Wilshire Los Angeles CA', 'Culver City CA',
    'Santa Monica CA', 'Venice Los Angeles CA', 'Mar Vista Los Angeles CA',
    'Westchester Los Angeles CA', 'Inglewood CA', 'Hawthorne CA', 'Lawndale CA',
    'Gardena CA', 'Torrance CA', 'Redondo Beach CA', 'Hermosa Beach CA',
    'Manhattan Beach CA', 'Carson CA', 'Lomita CA', 'San Pedro CA',
    'Wilmington CA', 'Long Beach CA', 'Lakewood CA', 'Compton CA',
    'Downey CA', 'Whittier CA', 'Montebello CA', 'Alhambra CA',
    'South Pasadena CA', 'Monrovia CA', 'Arcadia CA', 'Azusa CA',
  ];

  async function runFullSweep() {
    const totalJobs = LA_CITIES.length * TARGET_CATEGORIES.length;
    if (!confirm(`Run full LA sweep: ${LA_CITIES.length} cities × ${TARGET_CATEGORIES.length} categories = ${totalJobs} searches. This will take a while. Continue?`)) return;

    setSweeping(true);
    setSweepLog([]);
    setSweepProgress({ done: 0, total: totalJobs });
    setError('');
    setSuccess('');

    let totalFound = 0;
    let totalSaved = 0;
    let totalEmails = 0;
    let done = 0;

    for (const city of LA_CITIES) {
      let cityFound = 0, citySaved = 0, cityEmails = 0;

      for (const cat of TARGET_CATEGORIES) {
        try {
          const res = await fetch('/api/admin/discover-leads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ city, category: cat }),
          });

          if (res.ok) {
            const data = await res.json();
            cityFound += data.found;
            citySaved += data.saved;
            cityEmails += data.emails;
          }
        } catch { /* continue */ }

        done++;
        setSweepProgress({ done, total: totalJobs });
        await new Promise(r => setTimeout(r, 500));
      }

      totalFound += cityFound;
      totalSaved += citySaved;
      totalEmails += cityEmails;
      setSweepLog(prev => [...prev, `${city}: ${cityFound} found, ${citySaved} saved, ${cityEmails} emails`]);
    }

    setSweepProgress({ done: totalJobs, total: totalJobs });
    setSweeping(false);
    setSuccess(`Full LA sweep complete! ${totalFound} found, ${totalSaved} saved, ${totalEmails} emails. ${totalJobs} searches used.`);
    fetchAll();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Cold Outreach</h1>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          Discover leads, send outreach, track everything
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

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
            <p className="text-2xl font-semibold text-[var(--text-primary)]">{stats.totalLeads}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Total Leads</p>
          </div>
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
            <p className="text-2xl font-semibold text-green-400">{stats.contacted}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Emails Sent</p>
          </div>
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
            <p className="text-2xl font-semibold text-yellow-400">{stats.newWithEmail}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Ready to Send</p>
          </div>
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
            <p className="text-2xl font-semibold text-[var(--text-secondary)]">{stats.newNoEmail}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">No Email (Phone Only)</p>
          </div>
        </div>
      )}

      {/* Category breakdown */}
      {stats && stats.categories.length > 0 && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
          <p className="text-xs font-medium text-[var(--text-muted)] mb-3">Remaining Leads by Category</p>
          <div className="flex flex-wrap gap-2">
            {stats.categories.map(c => (
              <span key={c.category} className="px-3 py-1 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
                {c.category} <span className="text-[var(--text-muted)]">({c.count})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Discover New Leads */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-[var(--text-primary)]">Discover New Leads</h2>
            <p className="text-sm text-[var(--text-tertiary)]">
              Search Google Maps for mom-and-pop businesses. Uses SerpAPI.
            </p>
          </div>
          <button
            onClick={runFullSweep}
            disabled={sweeping || discovering}
            className="px-6 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
          >
            {sweeping ? `Sweeping... (${sweepProgress.done}/${sweepProgress.total})` : `Full LA Sweep (${LA_CITIES.length} cities)`}
          </button>
        </div>

        {/* Single city search */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Category (optional)</label>
            <select
              value={discoverCategory}
              onChange={(e) => setDiscoverCategory(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
            >
              <option value="">All 30 categories</option>
              {['small gym', 'personal trainer', 'plumber', 'electrician', 'beauty salon', 'hair salon', 'nail salon', 'barber shop', 'auto body shop', 'landscaping', 'cleaning service', 'tattoo shop', 'pet grooming', 'handyman', 'moving company', 'massage therapist', 'yoga studio', 'carpet cleaning', 'pressure washing', 'florist', 'bakery', 'dog walker', 'chiropractor', 'veterinarian', 'photographer', 'catering', 'tutoring', 'dry cleaner', 'tailor', 'locksmith'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">City</label>
            <select
              value={discoverCity}
              onChange={(e) => setDiscoverCity(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
            >
              <option value="">Pick a city</option>
              {LA_CITIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={discoverLeads}
              disabled={discovering || sweeping || !discoverCity}
              className="w-full px-6 py-2.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
            >
              {discovering ? 'Searching...' : 'Search City'}
            </button>
          </div>
        </div>

        {/* Sweep progress */}
        {sweeping && (
          <div className="space-y-2">
            <div className="w-full bg-[var(--bg-surface)] rounded-full h-2">
              <div
                className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(sweepProgress.done / sweepProgress.total) * 100}%` }}
              />
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              {sweepProgress.done} of {sweepProgress.total} cities searched
            </p>
          </div>
        )}

        {/* Sweep log */}
        {sweepLog.length > 0 && (
          <div className="max-h-64 overflow-y-auto rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-3 space-y-1">
            {sweepLog.map((line, i) => (
              <p key={i} className={`text-xs font-mono ${line.includes('FAILED') ? 'text-red-400' : 'text-[var(--text-secondary)]'}`}>
                {line}
              </p>
            ))}
          </div>
        )}
      </div>

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
            No unsent leads with emails. Discover more leads above.
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                  <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">Business</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">City</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">Rating</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">Status</th>
                </tr>
              </thead>
              <tbody>
                {leads.slice(0, 100).map((lead) => (
                  <tr key={lead.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-surface)] transition-colors">
                    <td className="px-4 py-3 text-[var(--text-primary)]">{lead.business_name}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{lead.email}</td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">{lead.city}</td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">{lead.rating ? `${lead.rating} ★` : '—'}</td>
                    <td className="px-4 py-3">
                      {sentIds.has(lead.id) ? (
                        <span className="text-green-400 text-xs font-medium">Sent</span>
                      ) : (
                        <span className="text-[var(--text-muted)] text-xs">{lead.status}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {leads.length > 100 && (
              <div className="px-4 py-3 text-xs text-[var(--text-muted)] text-center bg-[var(--bg-elevated)]">
                Showing 100 of {leads.length} leads
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
