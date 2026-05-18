'use client';

import { useState, useEffect, useMemo } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import DataTable, { type Column } from '@/components/admin/DataTable';
import StatusBadge from '@/components/admin/StatusBadge';
import type { Client } from '@/types/database';

interface ClientWithSiteCount extends Client {
  site_count: number;
}

export default function AdminClientsPage() {
  const [clients, setClients] = useState<ClientWithSiteCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    company_name: '',
    contact_name: '',
    contact_email: '',
    plan: 'starter' as Client['plan'],
    notes: '',
  });

  const fetchClients = async () => {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from('clients')
      .select('*, client_sites(id)')
      .order('created_at', { ascending: false });

    if (data) {
      const withCounts = data.map((c: Client & { client_sites?: { id: string }[] }) => ({
        ...c,
        site_count: c.client_sites?.length ?? 0,
        client_sites: undefined,
      }));
      setClients(withCounts as ClientWithSiteCount[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from('clients').insert({
      company_name: form.company_name,
      contact_name: form.contact_name || null,
      contact_email: form.contact_email || null,
      plan: form.plan,
      notes: form.notes || null,
      status: 'onboarding',
    });

    if (!error) {
      setForm({ company_name: '', contact_name: '', contact_email: '', plan: 'starter', notes: '' });
      setShowForm(false);
      await fetchClients();
    }
    setSubmitting(false);
  };

  const filtered = useMemo(() => {
    if (!search) return clients;
    const q = search.toLowerCase();
    return clients.filter((c) => c.company_name.toLowerCase().includes(q));
  }, [clients, search]);

  const columns: Column<ClientWithSiteCount>[] = [
    { key: 'company_name', label: 'Company', sortable: true },
    {
      key: 'contact_name',
      label: 'Contact',
      render: (c) => (
        <div>
          <p className="text-sm">{c.contact_name || '-'}</p>
          {c.contact_email && (
            <p className="text-xs text-[var(--text-tertiary)]">{c.contact_email}</p>
          )}
        </div>
      ),
    },
    {
      key: 'plan',
      label: 'Plan',
      render: (c) => <StatusBadge status={c.plan} />,
    },
    {
      key: 'status',
      label: 'Status',
      render: (c) => <StatusBadge status={c.status} />,
    },
    {
      key: 'site_count',
      label: 'Sites',
      sortable: true,
      render: (c) => <span className="text-[var(--text-secondary)]">{c.site_count}</span>,
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (c) => (
        <span className="text-[var(--text-tertiary)]">
          {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Clients</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 text-sm rounded-[var(--radius-sm)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition-colors"
        >
          {showForm ? 'Cancel' : 'Add Client'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Company Name *</label>
              <input
                required
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                className="w-full px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Contact Name</label>
              <input
                value={form.contact_name}
                onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                className="w-full px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Contact Email</label>
              <input
                type="email"
                value={form.contact_email}
                onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                className="w-full px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Plan</label>
              <select
                value={form.plan}
                onChange={(e) => setForm({ ...form, plan: e.target.value as Client['plan'] })}
                className="w-full px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent)]"
              >
                <option value="starter">Starter</option>
                <option value="growth">Growth</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent)] resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition-colors disabled:opacity-50"
          >
            {submitting ? 'Adding...' : 'Add Client'}
          </button>
        </form>
      )}

      <div>
        <input
          type="text"
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] mb-4"
        />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        emptyMessage="No clients found"
        getRowKey={(c) => c.id}
      />
    </div>
  );
}
