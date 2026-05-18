'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import DataTable, { type Column } from '@/components/admin/DataTable';
import StatusBadge from '@/components/admin/StatusBadge';
import type { Contact } from '@/types/database';

export default function AdminContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const fetchContacts = async () => {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false });

    setContacts(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleMarkRead = async (id: string) => {
    const supabase = createSupabaseBrowserClient();
    await supabase.from('contacts').update({ is_read: true }).eq('id', id);
    setContacts(contacts.map((c) => (c.id === id ? { ...c, is_read: true } : c)));
  };

  const handleDelete = async (id: string) => {
    const supabase = createSupabaseBrowserClient();
    await supabase.from('contacts').delete().eq('id', id);
    setContacts(contacts.filter((c) => c.id !== id));
    setConfirmDelete(null);
    setExpanded(null);
  };

  const handleRowClick = (contact: Contact) => {
    setExpanded(expanded === contact.id ? null : contact.id);
    setConfirmDelete(null);
    // Mark as read when opening
    if (!contact.is_read) {
      handleMarkRead(contact.id);
    }
  };

  const columns: Column<Contact>[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (c) => <span>{c.name || 'Anonymous'}</span>,
    },
    { key: 'email', label: 'Email', sortable: true },
    {
      key: 'message',
      label: 'Message',
      render: (c) => (
        <span className="text-[var(--text-tertiary)] line-clamp-1 max-w-xs">
          {c.message || '-'}
        </span>
      ),
    },
    {
      key: 'is_read',
      label: 'Status',
      render: (c) => <StatusBadge status={c.is_read ? 'read' : 'unread'} />,
    },
    {
      key: 'created_at',
      label: 'Date',
      sortable: true,
      render: (c) => (
        <span className="text-[var(--text-tertiary)]">
          {new Date(c.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
      ),
    },
  ];

  const expandedContact = contacts.find((c) => c.id === expanded);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-[var(--text-primary)]">Contacts</h1>

      <DataTable
        columns={columns}
        data={contacts}
        loading={loading}
        emptyMessage="No contact submissions yet"
        getRowKey={(c) => c.id}
        onRowClick={handleRowClick}
      />

      {/* Expanded detail */}
      {expandedContact && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-medium text-[var(--text-primary)]">
                {expandedContact.name || 'Anonymous'}
              </h3>
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{expandedContact.email}</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {new Date(expandedContact.created_at).toLocaleString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
            </div>
            <button
              onClick={() => { setExpanded(null); setConfirmDelete(null); }}
              className="p-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-4 rounded-[var(--radius-sm)] bg-[var(--bg-surface)]">
            <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">
              {expandedContact.message || 'No message provided.'}
            </p>
          </div>

          <div className="flex gap-2">
            {!expandedContact.is_read && (
              <button
                onClick={() => handleMarkRead(expandedContact.id)}
                className="px-3 py-1.5 text-xs rounded-[var(--radius-sm)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Mark as Read
              </button>
            )}
            {confirmDelete === expandedContact.id ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-400">Confirm delete?</span>
                <button
                  onClick={() => handleDelete(expandedContact.id)}
                  className="px-3 py-1.5 text-xs rounded-[var(--radius-sm)] bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                >
                  Yes, delete
                </button>
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="px-3 py-1.5 text-xs rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(expandedContact.id)}
                className="px-3 py-1.5 text-xs rounded-[var(--radius-sm)] bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
