'use client';

import { useEffect, useState } from 'react';
import { usePortal } from '@/components/portal/PortalContext';
import type { ServiceAgreement } from '@/types/database';

const agreementSections = [
  {
    title: '1. Services Provided',
    content:
      'is-boring LLC will manage, host, and maintain Client\'s website including hosting, security updates, and content changes as specified in the selected plan.',
  },
  {
    title: '2. Monthly Fee',
    content:
      'Client agrees to pay $150/month for the Starter plan. Payment is due on the 1st of each month.',
  },
  {
    title: '3. Change Requests',
    content:
      'Plan includes up to 5 website changes per calendar month. Changes include text updates, image swaps, layout adjustments, and minor feature additions. Major redesigns, new pages, and custom features are outside scope and quoted separately.',
  },
  {
    title: '4. Limitation of Liability',
    content:
      'is-boring LLC provides website management services on an "as-is" basis. is-boring LLC is not liable for any damages arising from website downtime, data loss, third-party service failures, or content published by the Client. Maximum liability is limited to the amount paid in the current billing period.',
  },
  {
    title: '5. Intellectual Property',
    content:
      'Client retains ownership of all original content, logos, and brand assets. is-boring LLC retains ownership of code, templates, and technical infrastructure. Upon termination, Client receives all content and assets but not proprietary code/templates.',
  },
  {
    title: '6. Cancellation',
    content:
      'Either party may cancel with 30 days written notice. No refunds for the current billing period. Client\'s site will remain live for 30 days after cancellation to allow migration.',
  },
  {
    title: '7. Data & Privacy',
    content:
      'is-boring LLC may collect website analytics data to provide performance reports. Client data is never sold to third parties.',
  },
];

export default function AgreementPage() {
  const { client } = usePortal();
  const [agreement, setAgreement] = useState<ServiceAgreement | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState(client.contact_email ?? '');
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    async function fetchAgreement() {
      try {
        const res = await fetch('/api/portal/agreement');
        if (res.ok) {
          const data = await res.json();
          if (data.agreement) {
            setAgreement(data.agreement);
          }
        }
      } catch {
        // No agreement yet
      } finally {
        setLoading(false);
      }
    }
    fetchAgreement();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed || !signerName.trim() || !signerEmail.trim()) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/portal/agreement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signer_name: signerName.trim(),
          signer_email: signerEmail.trim(),
          client_id: client.id,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to sign agreement');
      } else {
        const data = await res.json();
        setAgreement(data.agreement);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

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
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Service Agreement</h1>
        <p className="mt-1 text-sm text-[var(--text-tertiary)]">
          Please review and sign the service agreement to get started.
        </p>
      </div>

      {/* Signed banner */}
      {agreement && (
        <div className="rounded-[var(--radius-lg)] border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 flex items-center gap-3">
          <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-emerald-400">
              Agreement signed on {new Date(agreement.signed_at).toLocaleDateString()}
            </p>
            <p className="text-xs text-emerald-400/70">
              Signed by {agreement.signer_name}
            </p>
          </div>
        </div>
      )}

      {/* Agreement text */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-6 space-y-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          Service Agreement — is-boring LLC
        </h2>

        {agreementSections.map((section) => (
          <div key={section.title}>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1.5">
              {section.title}
            </h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              {section.content}
            </p>
          </div>
        ))}
      </div>

      {/* Signing form — only if not yet signed */}
      {!agreement && (
        <form
          onSubmit={handleSubmit}
          className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-6 space-y-4"
        >
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Sign Agreement</h3>

          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1.5">
              Full Legal Name
            </label>
            <input
              type="text"
              required
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Your full name"
              className="w-full px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              value={signerEmail}
              onChange={(e) => setSignerEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 accent-[var(--accent)]"
            />
            <span className="text-sm text-[var(--text-secondary)]">
              I have read and agree to the terms of this Service Agreement
            </span>
          </label>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting || !agreed || !signerName.trim() || !signerEmail.trim()}
            className="px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
          >
            {submitting ? 'Signing...' : 'Sign Agreement'}
          </button>
        </form>
      )}
    </div>
  );
}
