'use client';

import { useEffect, useRef, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { usePortal } from '@/components/portal/PortalContext';
import { useAuth } from '@/components/AuthProvider';
import type { Message } from '@/types/database';

export default function PortalMessagesPage() {
  const { client } = usePortal();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchMessages() {
      const supabase = createSupabaseBrowserClient();

      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: true });

      setMessages((data as Message[]) ?? []);
      setLoading(false);

      // Mark admin messages as read
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('client_id', client.id)
        .eq('sender_role', 'admin')
        .eq('is_read', false);
    }

    fetchMessages();
  }, [client.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    setSending(true);

    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('messages')
      .insert({
        client_id: client.id,
        sender_id: user.id,
        sender_role: 'client',
        content: newMessage.trim(),
        is_read: false,
      })
      .select()
      .single();

    if (!error && data) {
      setMessages((prev) => [...prev, data as Message]);
      setNewMessage('');
    }

    setSending(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 3.5rem - 3rem)' }}>
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Messages</h1>
        <p className="mt-1 text-sm text-[var(--text-tertiary)]">
          Chat with the is-boring team.
        </p>
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4 space-y-4"
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-[var(--text-tertiary)]">
              No messages yet. Start a conversation below.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isClient = msg.sender_role === 'client';
            return (
              <div
                key={msg.id}
                className={`flex ${isClient ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-[var(--radius-lg)] px-4 py-2.5 ${
                    isClient
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-xs font-medium ${
                        isClient ? 'text-white/70' : 'text-[var(--text-tertiary)]'
                      }`}
                    >
                      {isClient ? 'You' : 'is-boring'}
                    </span>
                    <span
                      className={`text-xs ${
                        isClient ? 'text-white/50' : 'text-[var(--text-muted)]'
                      }`}
                    >
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="mt-4 flex gap-3">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2.5 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
        />
        <button
          type="submit"
          disabled={sending || !newMessage.trim()}
          className="px-5 py-2.5 rounded-[var(--radius-sm)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
        >
          Send
        </button>
      </form>
    </div>
  );
}
