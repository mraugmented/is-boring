'use client';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

const statusStyles: Record<string, { bg: string; text: string; dot?: string }> = {
  pending: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', dot: 'bg-yellow-500' },
  in_progress: { bg: 'bg-blue-500/10', text: 'text-blue-500', dot: 'bg-blue-500' },
  review: { bg: 'bg-purple-500/10', text: 'text-purple-500', dot: 'bg-purple-500' },
  completed: { bg: 'bg-green-500/10', text: 'text-green-500', dot: 'bg-green-500' },
  cancelled: { bg: 'bg-red-500/10', text: 'text-red-500', dot: 'bg-red-500' },
  active: { bg: 'bg-green-500/10', text: 'text-green-500', dot: 'bg-green-500' },
  inactive: { bg: 'bg-[var(--bg-muted)]', text: 'text-[var(--text-tertiary)]' },
  onboarding: { bg: 'bg-orange-500/10', text: 'text-orange-500', dot: 'bg-orange-500' },
  live: { bg: 'bg-green-500/10', text: 'text-green-500', dot: 'bg-green-500' },
  development: { bg: 'bg-blue-500/10', text: 'text-blue-500', dot: 'bg-blue-500' },
  maintenance: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', dot: 'bg-yellow-500' },
  offline: { bg: 'bg-red-500/10', text: 'text-red-500', dot: 'bg-red-500' },
  low: { bg: 'bg-[var(--bg-muted)]', text: 'text-[var(--text-tertiary)]' },
  medium: { bg: 'bg-yellow-500/10', text: 'text-yellow-500' },
  high: { bg: 'bg-orange-500/10', text: 'text-orange-500', dot: 'bg-orange-500' },
  urgent: { bg: 'bg-red-500/10', text: 'text-red-500', dot: 'bg-red-500' },
  unread: { bg: 'bg-blue-500/10', text: 'text-blue-500', dot: 'bg-blue-500' },
  read: { bg: 'bg-[var(--bg-muted)]', text: 'text-[var(--text-tertiary)]' },
  starter: { bg: 'bg-[var(--bg-muted)]', text: 'text-[var(--text-secondary)]' },
  growth: { bg: 'bg-blue-500/10', text: 'text-blue-500' },
  enterprise: { bg: 'bg-purple-500/10', text: 'text-purple-500' },
};

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const style = statusStyles[status] || statusStyles.inactive;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';
  const label = status.replace(/_/g, ' ');

  return (
    <span className={`inline-flex items-center gap-1.5 ${sizeClasses} font-medium rounded-full ${style.bg} ${style.text}`}>
      {style.dot && <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />}
      <span className="capitalize">{label}</span>
    </span>
  );
}
