'use client';

import Link from 'next/link';
import type { ActivityLog } from '@/types/database';

interface ActivityTimelineProps {
  activities: ActivityLog[];
  clients?: Record<string, string>;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function ActionIcon({ action }: { action: string }) {
  const className = 'w-4 h-4';
  switch (action) {
    case 'outreach_sent':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    case 'client_created':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      );
    case 'stage_changed':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      );
    case 'request_created':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      );
    case 'message_sent':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      );
    default:
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="3" strokeWidth={1.5} />
        </svg>
      );
  }
}

export default function ActivityTimeline({ activities, clients }: ActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <div className="px-5 py-8 text-center text-sm text-[var(--text-tertiary)]">
        No activity yet
      </div>
    );
  }

  return (
    <div className="relative">
      {activities.map((activity, index) => {
        const isLast = index === activities.length - 1;
        const clientName = activity.client_id && clients ? clients[activity.client_id] : null;

        return (
          <div key={activity.id} className="relative flex gap-3 px-5 py-3">
            {/* Timeline line */}
            {!isLast && (
              <div className="absolute left-[29px] top-[36px] bottom-0 w-px bg-[var(--border-subtle)]" />
            )}

            {/* Icon */}
            <div className="relative z-10 flex-shrink-0 w-7 h-7 rounded-full bg-[var(--bg-muted)] flex items-center justify-center text-[var(--text-tertiary)]">
              <ActionIcon action={activity.action} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[var(--text-primary)]">
                {activity.details || activity.action.replace(/_/g, ' ')}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                {clientName && activity.client_id && (
                  <Link
                    href={`/admin/clients/${activity.client_id}`}
                    className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)]"
                  >
                    {clientName}
                  </Link>
                )}
                <span className="text-xs text-[var(--text-muted)]">{timeAgo(activity.created_at)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
