'use client';

import { useState, useEffect, useRef } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import type { Message, Client } from '@/types/database';

interface ClientThread {
  client: Client;
  messages: Message[];
  hasUnread: boolean;
}

export default function AdminMessagesPage() {
  const [threads, setThreads] = useState<ClientThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const threadEndRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const fetchMessages = async () => {
    const supabase = createSupabaseBrowserClient();

    const [{ data: clients }, { data: messages }] = await Promise.all([
      supabase.from('clients').select('*').order('company_name'),
      supabase.from('messages').select('*').order('created_at', { ascending: true }),
    ]);

    if (!clients || !messages) {
      setLoading(false);
      return;
    }

    // Group messages by client
    const messagesByClient: Record<string, Message[]> = {};
    for (const msg of messages) {
      if (!messagesByClient[msg.client_id]) {
        messagesByClient[msg.client_id] = [];
      }
      messagesByClient[msg.client_id].push(msg);
    }

    // Build threads (only for clients with messages)
    const clientThreads: ClientThread[] = clients
      .filter((c: Client) => messagesByClient[c.id]?.length > 0)
      .map((c: Client) => ({
        client: c,
        messages: messagesByClient[c.id] || [],
        hasUnread: (messagesByClient[c.id] || []).some(
          (m: Message) => !m.is_read && m.sender_role === 'client'
        ),
      }))
      .sort((a: ClientThread, b: ClientThread) => {
        // Unread first, then by latest message
        if (a.hasUnread && !b.hasUnread) return -1;
        if (!a.hasUnread && b.hasUnread) return 1;
        const aLast = a.messages[a.messages.length - 1]?.created_at ?? '';
        const bLast = b.messages[b.messages.length - 1]?.created_at ?? '';
        return bLast.localeCompare(aLast);
      });

    setThreads(clientThreads);
    setLoading(false);

    // Mark unread client messages as read
    const unreadIds = messages
      .filter((m: Message) => !m.is_read && m.sender_role === 'client')
      .map((m: Message) => m.id);

    if (unreadIds.length > 0) {
      await supabase.from('messages').update({ is_read: true }).in('id', unreadIds);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleSendReply = async (clientId: string) => {
    const content = replies[clientId]?.trim();
    if (!content) return;

    setSendingTo(clientId);
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('messages').insert({
      client_id: clientId,
      request_id: null,
      sender_id: user.id,
      sender_role: 'admin',
      content,
      is_read: false,
    });

    setReplies({ ...replies, [clientId]: '' });
    await fetchMessages();
    setSendingTo(null);
  };

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-[var(--text-primary)]">Messages</h1>

      {threads.length === 0 ? (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-12 text-center text-sm text-[var(--text-tertiary)]">
          No messages yet
        </div>
      ) : (
        <div className="space-y-6">
          {threads.map((thread) => (
            <div
              key={thread.client.id}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] overflow-hidden"
            >
              {/* Client header */}
              <div className="px-5 py-3 border-b border-[var(--border-subtle)] flex items-center gap-3">
                <h3 className="text-sm font-medium text-[var(--text-primary)]">
                  {thread.client.company_name}
                </h3>
                {thread.hasUnread && (
                  <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                    New
                  </span>
                )}
                <span className="text-xs text-[var(--text-muted)] ml-auto">
                  {thread.messages.length} message{thread.messages.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Messages */}
              <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
                {thread.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_role === 'admin' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] px-3 py-2 rounded-[var(--radius-lg)] text-sm ${
                        msg.sender_role === 'admin'
                          ? 'bg-[var(--accent-soft)] text-[var(--text-primary)]'
                          : 'bg-[var(--bg-surface)] text-[var(--text-primary)]'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-[10px] font-medium uppercase ${
                            msg.sender_role === 'admin' ? 'text-[var(--accent)]' : 'text-[var(--text-tertiary)]'
                          }`}
                        >
                          {msg.sender_role}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)]">{formatTime(msg.created_at)}</span>
                        {!msg.is_read && msg.sender_role === 'client' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                        )}
                      </div>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                <div ref={(el) => { threadEndRefs.current[thread.client.id] = el; }} />
              </div>

              {/* Reply */}
              <div className="px-4 py-3 border-t border-[var(--border-subtle)] flex gap-2">
                <input
                  type="text"
                  value={replies[thread.client.id] || ''}
                  onChange={(e) => setReplies({ ...replies, [thread.client.id]: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendReply(thread.client.id)}
                  placeholder="Reply..."
                  className="flex-1 px-3 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
                />
                <button
                  onClick={() => handleSendReply(thread.client.id)}
                  disabled={!replies[thread.client.id]?.trim() || sendingTo === thread.client.id}
                  className="px-4 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition-colors disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
