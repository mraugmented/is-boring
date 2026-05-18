'use client';

import Link from 'next/link';

interface StatsCardProps {
  title: string;
  value: number | string;
  trend?: string;
  trendUp?: boolean;
  icon?: React.ReactNode;
  href?: string;
}

export default function StatsCard({ title, value, trend, trendUp, icon, href }: StatsCardProps) {
  const content = (
    <div className="p-5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-lg bg-[var(--bg-muted)] text-[var(--text-secondary)] group-hover:text-[var(--accent)] transition-colors">
          {icon || (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          )}
        </div>
        {href && (
          <svg className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
          </svg>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-sm text-[var(--text-secondary)]">{title}</p>
        <p className="text-2xl font-semibold text-[var(--text-primary)]">{value}</p>
        {trend && (
          <p className={`text-xs ${trendUp ? 'text-green-500' : trendUp === false ? 'text-red-500' : 'text-[var(--text-tertiary)]'}`}>
            {trend}
          </p>
        )}
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
