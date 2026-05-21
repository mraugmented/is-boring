'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { usePortal } from '@/components/portal/PortalContext';
import StatusBadge from '@/components/admin/StatusBadge';
import type { Request, ClientSite, Message } from '@/types/database';

type FilterTab = 'all' | 'pending' | 'in_progress' | 'completed';

const filterTabs: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
];

export default function PortalRequestsPage() {
  const { client } = usePortal();
  const [requests, setRequests] = useState<Request[]>([]);
  const [sites, setSites] = useState<ClientSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [requestMessages, setRequestMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // Form state
  const [formSiteId, setFormSiteId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPriority, setFormPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [requestsThisMonth, setRequestsThisMonth] = useState(0);

  const monthlyLimit = client.monthly_change_limit ?? 5;
  const remaining = Math.max(monthlyLimit - requestsThisMonth, 0);
  const atLimit = remaining === 0;

  // Next month's first day for reset message
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonthStr = nextMonth.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  useEffect(() => {
    async function fetchData() {
      const supabase = createSupabaseBrowserClient();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [reqRes, sitesRes, countRes] = await Promise.all([
        supabase
          .from('requests')
          .select('*')
          .eq('client_id', client.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('client_sites')
          .select('*')
          .eq('client_id', client.id)
          .order('site_name'),
        supabase
          .from('requests')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', client.id)
          .gte('created_at', startOfMonth),
      ]);

      setRequests((reqRes.data as Request[]) ?? []);
      setSites((sitesRes.data as ClientSite[]) ?? []);
      setRequestsThisMonth(countRes.count ?? 0);
      setLoading(false);
    }

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.id]);

  const filteredRequests =
    activeTab === 'all'
      ? requests
      : requests.filter((r) => r.status === activeTab);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim()) return;

    setSubmitting(true);

    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('requests')
      .insert({
        client_id: client.id,
        site_id: formSiteId || null,
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        priority: formPriority,
        status: 'pending',
      })
      .select()
      .single();

    if (!error && data) {
      setRequests([data as Request, ...requests]);
      setFormTitle('');
      setFormDescription('');
      setFormPriority('medium');
      setFormSiteId('');
      setShowForm(false);
    }

    setSubmitting(false);
  }

  async function toggleRequest(requestId: string) {
    if (selectedRequestId === requestId) {
      setSelectedRequestId(null);
      setRequestMessages([]);
      setReplyContent('');
      return;
    }

    setSelectedRequestId(requestId);
    setLoadingMessages(true);
    setReplyContent('');

    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true });

    setRequestMessages((data as Message[]) ?? []);
    setLoadingMessages(false);
  }

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyContent.trim() || !selectedRequestId) return;

    setSendingReply(true);
    const supabase = createSupabaseBrowserClient();

    const { data: userData } = await supabase.auth.getUser();
    const senderId = userData.user?.id ?? '';

    const { data, error } = await supabase
      .from('messages')
      .insert({
        client_id: client.id,
        request_id: selectedRequestId,
        sender_id: senderId,
        sender_role: 'client',
        content: replyContent.trim(),
      })
      .select()
      .single();

    if (!error && data) {
      setRequestMessages((prev) => [...prev, data as Message]);
      setReplyContent('');
    }

    setSendingReply(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Monthly usage indicator */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-[var(--text-secondary)]">
            {remaining} of {monthlyLimit} changes remaining this month
          </span>
          {atLimit && (
            <span className="text-xs text-red-400">
              Resets on {nextMonthStr}
            </span>
          )}
        </div>
        <div className="h-1.5 rounded-full bg-[var(--bg-surface)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${Math.min((requestsThisMonth / monthlyLimit) * 100, 100)}%`,
              backgroundColor: atLimit ? '#ef4444' : 'var(--accent)',
            }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Requests</h1>
          <p className="mt-1 text-sm text-[var(--text-tertiary)]">
            Submit and track change requests.
          </p>
        </div>
        {atLimit ? (
          <span className="px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] text-[var(--text-muted)] text-sm font-medium cursor-not-allowed">
            Limit Reached
          </span>
        ) : (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium transition-colors cursor-pointer"
          >
            {showForm ? 'Cancel' : 'New Request'}
          </button>
        )}
      </div>

      {/* Inline form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1.5">
                Site
              </label>
              <select
                value={formSiteId}
                onChange={(e) => setFormSiteId(e.target.value)}
                className="w-full px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
              >
                <option value="">General (no specific site)</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.site_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1.5">
                Priority
              </label>
              <select
                value={formPriority}
                onChange={(e) => setFormPriority(e.target.value as typeof formPriority)}
                className="w-full px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1.5">
              Title
            </label>
            <input
              type="text"
              required
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="What do you need?"
              className="w-full px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1.5">
              Description
            </label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Describe the change in detail..."
              rows={4}
              className="w-full px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors resize-none"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-[var(--border-subtle)]">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors -mb-px cursor-pointer ${
              activeTab === tab.key
                ? 'text-[var(--text-primary)] border-b-2 border-[var(--accent)]'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Requests list */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] divide-y divide-[var(--border-subtle)]">
        {filteredRequests.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--text-tertiary)]">
            No requests found.
          </div>
        ) : (
          filteredRequests.map((req) => {
            const isExpanded = selectedRequestId === req.id;
            return (
              <div key={req.id}>
                <button
                  type="button"
                  onClick={() => toggleRequest(req.id)}
                  className="w-full px-4 py-3.5 flex items-center justify-between text-left cursor-pointer hover:bg-[var(--bg-surface)] transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[var(--text-primary)] truncate">
                      {req.title}
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                      {new Date(req.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    <StatusBadge status={req.priority} />
                    <StatusBadge status={req.status} />
                    <svg
                      className={`w-4 h-4 text-[var(--text-tertiary)] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-4 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                    {/* Full description */}
                    {req.description && (
                      <div className="pt-3">
                        <h4 className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-1">
                          Description
                        </h4>
                        <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">
                          {req.description}
                        </p>
                      </div>
                    )}

                    {/* Status timeline */}
                    <div className="pt-1">
                      <h4 className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-2">
                        Status
                      </h4>
                      <div className="flex items-center gap-2">
                        {['pending', 'in_progress', 'completed'].map((step, i) => {
                          const stepOrder = { pending: 0, in_progress: 1, completed: 2 } as Record<string, number>;
                          const currentOrder = stepOrder[req.status] ?? 0;
                          const isReached = stepOrder[step] !== undefined && stepOrder[step] <= currentOrder;
                          return (
                            <div key={step} className="flex items-center gap-2">
                              {i > 0 && (
                                <div className={`w-8 h-0.5 ${isReached ? 'bg-[var(--accent)]' : 'bg-[var(--border-subtle)]'}`} />
                              )}
                              <div className="flex items-center gap-1.5">
                                <div className={`w-2.5 h-2.5 rounded-full ${isReached ? 'bg-[var(--accent)]' : 'bg-[var(--border-subtle)]'}`} />
                                <span className={`text-xs capitalize ${isReached ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                                  {step.replace('_', ' ')}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="pt-1">
                      <h4 className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-2">
                        Messages
                      </h4>
                      {loadingMessages ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : requestMessages.length === 0 ? (
                        <p className="text-xs text-[var(--text-muted)] py-2">No messages yet.</p>
                      ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {requestMessages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`rounded-[var(--radius-sm)] px-3 py-2 text-sm ${
                                msg.sender_role === 'client'
                                  ? 'bg-[var(--accent)]/10 text-[var(--text-primary)] ml-6'
                                  : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] mr-6'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-xs font-medium text-[var(--text-tertiary)]">
                                  {msg.sender_role === 'client' ? 'You' : 'is-boring'}
                                </span>
                                <span className="text-xs text-[var(--text-muted)]">
                                  {new Date(msg.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="whitespace-pre-wrap">{msg.content}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reply input */}
                      <form onSubmit={handleSendReply} className="flex gap-2 mt-2">
                        <input
                          type="text"
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          placeholder="Type a reply..."
                          className="flex-1 px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
                        />
                        <button
                          type="submit"
                          disabled={sendingReply || !replyContent.trim()}
                          className="px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {sendingReply ? '...' : 'Send'}
                        </button>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
