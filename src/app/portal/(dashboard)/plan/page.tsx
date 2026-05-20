'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { usePortal } from '@/components/portal/PortalContext';
import StatusBadge from '@/components/admin/StatusBadge';

const includedFeatures = [
  'Website hosting & maintenance',
  'Up to 5 changes per month',
  'Website analytics & tracking',
  'SSL certificate',
  'Security updates',
  'Email support',
];

export default function PlanPage() {
  const { client } = usePortal();
  const [requestsThisMonth, setRequestsThisMonth] = useState(0);
  const [loading, setLoading] = useState(true);

  const monthlyLimit = client.monthly_change_limit ?? 5;

  useEffect(() => {
    async function fetchUsage() {
      const supabase = createSupabaseBrowserClient();
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { count } = await supabase
        .from('requests')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', client.id)
        .gte('created_at', startOfMonth);

      setRequestsThisMonth(count ?? 0);
      setLoading(false);
    }
    fetchUsage();
  }, [client.id]);

  const usagePercent = Math.min((requestsThisMonth / monthlyLimit) * 100, 100);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Your Plan</h1>
        <p className="mt-1 text-sm text-[var(--text-tertiary)]">
          Plan details and current usage.
        </p>
      </div>

      {/* Plan card */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-6 space-y-5">
        <div className="flex items-baseline justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] capitalize">
              {client.plan} Plan
            </h2>
            <p className="text-sm text-[var(--text-tertiary)] mt-0.5">
              Billed monthly
            </p>
          </div>
          <span className="text-2xl font-semibold text-[var(--text-primary)]">
            $150<span className="text-sm font-normal text-[var(--text-tertiary)]">/mo</span>
          </span>
        </div>

        {/* Included features */}
        <div>
          <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3">
            What&apos;s included
          </h3>
          <ul className="space-y-2">
            {includedFeatures.map((feature) => (
              <li key={feature} className="flex items-center gap-2.5 text-sm text-[var(--text-secondary)]">
                <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Monthly usage */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-6 space-y-4">
        <h3 className="text-sm font-medium text-[var(--text-secondary)]">
          This month&apos;s usage
        </h3>

        <div>
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-sm text-[var(--text-primary)]">Change requests</span>
            <span className="text-sm text-[var(--text-secondary)]">
              {requestsThisMonth} of {monthlyLimit} used
            </span>
          </div>
          <div className="h-2 rounded-full bg-[var(--bg-surface)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${usagePercent}%`,
                backgroundColor: usagePercent >= 100 ? '#ef4444' : 'var(--accent)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
          <p className="text-xs text-[var(--text-tertiary)] mb-1.5">Payment status</p>
          <StatusBadge status={client.payment_status} />
        </div>

        <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
          <p className="text-xs text-[var(--text-tertiary)] mb-1.5">Agreement</p>
          {client.agreement_signed_at ? (
            <p className="text-sm text-emerald-400">
              Signed {new Date(client.agreement_signed_at).toLocaleDateString()}
            </p>
          ) : (
            <p className="text-sm text-amber-400">Not yet signed</p>
          )}
        </div>
      </div>

      {/* Need more */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3">
        <p className="text-sm text-[var(--text-tertiary)]">
          Need more changes?{' '}
          <a href="/portal/messages" className="text-[var(--accent)] hover:underline">
            Contact us
          </a>{' '}
          to discuss additional capacity.
        </p>
      </div>
    </div>
  );
}
