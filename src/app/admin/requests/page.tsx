'use client';

import { useState, useEffect, useMemo } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import DataTable, { type Column } from '@/components/admin/DataTable';
import StatusBadge from '@/components/admin/StatusBadge';
import type { Request, Message } from '@/types/database';

interface RequestWithClient extends Request {
  clients?: { company_name: string } | null;
}

const statusTabs = ['all', 'pending', 'in_progress', 'review', 'completed'] as const;

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<RequestWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<RequestWithClient | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchRequests = async () => {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from('requests')
      .select('*, clients(company_name)')
      .order('created_at', { ascending: false });

    setRequests((data as RequestWithClient[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchMessages = async (requestId: string) => {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true });

    setMessages(data ?? []);
  };

  const handleSelectRequest = (req: RequestWithClient) => {
    if (selectedRequest?.id === req.id) {
      setSelectedRequest(null);
      setMessages([]);
      return;
    }
    setSelectedRequest(req);
    fetchMessages(req.id);
  };

  const handleStatusChange = async (field: 'status' | 'priority', value: string) => {
    if (!selectedRequest) return;
    setUpdatingStatus(true);
    const supabase = createSupabaseBrowserClient();
    const update: Record<string, string> = { [field]: value };
    if (field === 'status' && value === 'completed') {
      update.completed_at = new Date().toISOString();
    }
    await supabase.from('requests').update(update).eq('id', selectedRequest.id);
    setSelectedRequest({ ...selectedRequest, [field]: value } as RequestWithClient);
    await fetchRequests();
    setUpdatingStatus(false);
  };

  const handleSendReply = async () => {
    if (!reply.trim() || !selectedRequest) return;
    setSendingReply(true);
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('messages').insert({
      client_id: selectedRequest.client_id,
      request_id: selectedRequest.id,
      sender_id: user.id,
      sender_role: 'admin',
      content: reply.trim(),
      is_read: false,
    });

    setReply('');
    await fetchMessages(selectedRequest.id);
    setSendingReply(false);
  };

  const filtered = useMemo(() => {
    if (activeTab === 'all') return requests;
    return requests.filter((r) => r.status === activeTab);
  }, [requests, activeTab]);

  const columns: Column<RequestWithClient>[] = [
    { key: 'title', label: 'Title', sortable: true },
    {
      key: 'client_id',
      label: 'Client',
      render: (r) => (
        <span className="text-[var(--text-secondary)]">
          {r.clients?.company_name ?? 'Unknown'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (r) => <StatusBadge status={r.priority} />,
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (r) => (
        <span className="text-[var(--text-tertiary)]">
          {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      ),
    },
  ];

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-[var(--text-primary)]">Requests</h1>

      {/* Status tabs */}
      <div className="flex gap-1 p-1 rounded-[var(--radius-lg)] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] w-fit">
        {statusTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 text-xs font-medium rounded-[var(--radius-sm)] capitalize transition-colors ${
              activeTab === tab
                ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        emptyMessage="No requests found"
        getRowKey={(r) => r.id}
        onRowClick={handleSelectRequest}
      />

      {/* Detail panel */}
      {selectedRequest && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border-subtle)]">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-medium text-[var(--text-primary)]">{selectedRequest.title}</h3>
                <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                  {selectedRequest.clients?.company_name} &middot; {formatTime(selectedRequest.created_at)}
                </p>
              </div>
              <button
                onClick={() => { setSelectedRequest(null); setMessages([]); }}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-5 space-y-5">
            {/* Description */}
            {selectedRequest.description && (
              <div>
                <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">Description</p>
                <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{selectedRequest.description}</p>
              </div>
            )}

            {/* Status / Priority controls */}
            <div className="flex gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Status</label>
                <select
                  value={selectedRequest.status}
                  onChange={(e) => handleStatusChange('status', e.target.value)}
                  disabled={updatingStatus}
                  className="px-3 py-1.5 text-sm rounded-[var(--radius-sm)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Priority</label>
                <select
                  value={selectedRequest.priority}
                  onChange={(e) => handleStatusChange('priority', e.target.value)}
                  disabled={updatingStatus}
                  className="px-3 py-1.5 text-sm rounded-[var(--radius-sm)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            {/* Message thread */}
            <div>
              <p className="text-xs font-medium text-[var(--text-secondary)] mb-3">Messages</p>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {messages.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)]">No messages yet</p>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_role === 'admin' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] px-3 py-2 rounded-[var(--radius-lg)] text-sm ${
                          msg.sender_role === 'admin'
                            ? 'bg-[var(--accent-soft)] text-[var(--text-primary)]'
                            : 'bg-[var(--bg-surface)] text-[var(--text-primary)]'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-medium uppercase text-[var(--text-tertiary)]">
                            {msg.sender_role}
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)]">{formatTime(msg.created_at)}</span>
                        </div>
                        <p>{msg.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Reply input */}
              <div className="flex gap-2 mt-3">
                <input
                  type="text"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendReply()}
                  placeholder="Type a reply..."
                  className="flex-1 px-3 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
                />
                <button
                  onClick={handleSendReply}
                  disabled={!reply.trim() || sendingReply}
                  className="px-4 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition-colors disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
