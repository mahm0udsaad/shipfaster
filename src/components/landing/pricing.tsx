'use client';

import { useState } from 'react';

type Tier = {
  name: string;
  blurb: string;
  monthly: number | null;
  cta: string;
  features: string[];
  featured?: boolean;
};

const TIERS: Tier[] = [
  {
    name: 'Solo',
    blurb: 'Self-host, for one builder.',
    monthly: 0,
    cta: 'Start free',
    features: ['Self-host', '3 projects', '2 agent tokens'],
  },
  {
    name: 'Pro',
    blurb: 'Hosted, for serious solo work.',
    monthly: 19,
    cta: 'Start free trial',
    features: ['Hosted & managed', 'Unlimited projects & agents', 'Money, Approvals & evals', 'Flat price — no metering'],
    featured: true,
  },
  {
    name: 'Agency',
    blurb: 'Seats & roles for a small team.',
    monthly: 49,
    cta: 'Start free trial',
    features: ['Everything in Pro', 'Seats & roles', 'Client portal (soon)'],
  },
];

export function Pricing() {
  const [annual, setAnnual] = useState(false);

  return (
    <div>
      <div className="mb-8 flex items-center justify-center gap-3 text-[13px]">
        <button
          onClick={() => setAnnual(false)}
          className={annual ? 'text-[var(--color-muted)]' : 'font-semibold text-[var(--color-ink)]'}
        >
          Monthly
        </button>
        <button
          onClick={() => setAnnual((a) => !a)}
          className="relative h-6 w-11 rounded-full border border-[var(--color-line-2)] bg-[var(--color-surface-2)]"
          aria-label="Toggle annual billing"
        >
          <span
            className="absolute top-0.5 size-4 rounded-full bg-[var(--color-brand)] transition-all"
            style={{ left: annual ? '22px' : '2px' }}
          />
        </button>
        <button
          onClick={() => setAnnual(true)}
          className={annual ? 'font-semibold text-[var(--color-ink)]' : 'text-[var(--color-muted)]'}
        >
          Annual <span className="text-[var(--color-success)]">−20%</span>
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {TIERS.map((t) => {
          const price = t.monthly === null ? null : annual ? Math.round(t.monthly * 0.8) : t.monthly;
          return (
            <div
              key={t.name}
              className={`relative flex flex-col rounded-2xl border p-6 ${
                t.featured
                  ? 'border-[var(--color-brand)]/50 bg-[var(--color-surface-2)]'
                  : 'border-[var(--color-line)] bg-[var(--color-surface)]'
              }`}
            >
              {t.featured && (
                <span className="absolute -top-2.5 left-6 rounded-full bg-[var(--color-brand)] px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-black">
                  MOST POPULAR
                </span>
              )}
              <div className="font-[var(--font-display)] text-lg font-bold text-[var(--color-ink)]">{t.name}</div>
              <div className="mb-4 text-[13px] text-[var(--color-muted)]">{t.blurb}</div>
              <div className="mb-5 flex items-baseline gap-1">
                {t.monthly === 0 ? (
                  <span className="text-3xl font-bold text-[var(--color-ink)]">Free</span>
                ) : (
                  <>
                    <span className="text-3xl font-bold text-[var(--color-ink)]">${price}</span>
                    <span className="text-[13px] text-[var(--color-faint)]">/mo</span>
                  </>
                )}
              </div>
              <a
                href="/today"
                className={`mb-5 rounded-lg px-4 py-2.5 text-center text-[14px] font-semibold ${
                  t.featured
                    ? 'bg-[var(--color-brand)] text-black'
                    : 'border border-[var(--color-line-2)] text-[var(--color-ink)] hover:bg-[var(--color-surface-2)]'
                }`}
              >
                {t.cta}
              </a>
              <ul className="flex flex-col gap-2.5 text-[13px] text-[var(--color-ink-2)]">
                {t.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="text-[var(--color-success)]">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
