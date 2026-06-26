import Link from 'next/link';
import { Check, Sparkles, Zap, Trophy } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getPlans, formatUsd, quotaLabel, type BillingPlan } from '@/lib/billing';

export const dynamic = 'force-dynamic';

const featureRows: { key: string; label: string }[] = [
  { key: 'khmer', label: 'Khmer & English' },
  { key: 'latex', label: 'Markdown / LaTeX math' },
  { key: 'question_images', label: 'Question images' },
  { key: 'choice_images', label: 'Image answer choices' },
  { key: 'timer', label: 'Timer & auto-submit' },
  { key: 'auto_score', label: 'Auto-scoring' },
  { key: 'csv_export', label: 'CSV export' },
  { key: 'tab_logs', label: 'Tab-switch monitoring' },
  { key: 'multi_admin', label: 'Multiple admins' },
  { key: 'custom_branding', label: 'Custom branding' },
  { key: 'certificates', label: 'Certificates' },
];

function cell(plan: BillingPlan, key: string): React.ReactNode {
  const f = plan.features as Record<string, unknown>;
  switch (key) {
    case 'khmer':
    case 'latex':
    case 'timer':
    case 'auto_score':
    case 'question_images':
      return <Check className="h-4 w-4 text-emerald-500" />;
    case 'choice_images':
      return f.choice_images === 'limited' ? (
        <span className="text-xs text-amber-600">Limited</span>
      ) : (
        <Check className="h-4 w-4 text-emerald-500" />
      );
    case 'csv_export':
      return f.csv_export ? <Check className="h-4 w-4 text-emerald-500" /> : <span className="text-slate-300">—</span>;
    case 'tab_logs':
      return f.tab_logs === 'full' ? <Check className="h-4 w-4 text-emerald-500" /> : <span className="text-xs text-amber-600">Basic</span>;
    case 'multi_admin':
      return typeof f.max_admins === 'number' && f.max_admins > 1 ? (
        <span className="text-xs font-medium text-slate-700">{f.max_admins as number}</span>
      ) : (
        <span className="text-slate-300">—</span>
      );
    case 'custom_branding':
      return f.custom_branding ? <Check className="h-4 w-4 text-emerald-500" /> : <span className="text-slate-300">—</span>;
    case 'certificates':
      return f.certificates ? <Check className="h-4 w-4 text-emerald-500" /> : <span className="text-slate-300">—</span>;
    default:
      return <span className="text-slate-300">—</span>;
  }
}

export default async function PricingPage() {
  const plans = await getPlans();
  const subs = plans.filter((p) => p.kind === 'subscription');
  const packages = plans.filter((p) => p.kind === 'package');

  // Detect login so the CTA can route appropriately.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const cta = (planId: string) => (user ? `/admin/billing/checkout/${planId}` : `/signup?plan=${planId}`);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-brand" />
          <span className="font-bold text-brand">SOMA Portal</span>
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/login" className="text-slate-600 hover:text-slate-900">
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-brand px-3 py-1.5 font-medium text-white hover:bg-brand-dark"
          >
            Sign up
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-12 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          Simple pricing for schools and competitions
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
          Try every feature free for 7 days, up to 30 respondents. Choose a monthly
          plan for ongoing classes, or buy a one-time package for a single event.
          Tax 10% is added at checkout. Payment by QR code.
        </p>
      </section>

      {/* Monthly subscriptions */}
      <section className="mx-auto max-w-6xl px-4">
        <h2 className="mb-4 text-center text-2xl font-bold text-slate-900">
          Monthly plans
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {subs.map((p) => (
            <div
              key={p.id}
              className={`flex flex-col rounded-2xl border bg-white p-6 shadow-sm ${
                p.id === 'starter' ? 'border-brand ring-2 ring-brand/30' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">{p.display_name}</h3>
                {p.id === 'starter' && (
                  <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">
                    Most popular
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-slate-500">{p.description}</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-slate-900">
                  {p.price_usd_cents === 0 ? 'Free' : formatUsd(p.price_usd_cents)}
                </span>
                {p.price_usd_cents > 0 && (
                  <span className="text-sm text-slate-500">/ month</span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-400">+ 10% tax</p>
              <p className="mt-4 text-sm font-medium text-slate-700">{quotaLabel(p)}</p>
              <Link
                href={p.id === 'free' ? '/signup' : cta(p.id)}
                className={`mt-6 inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                  p.id === 'starter'
                    ? 'bg-brand text-white hover:bg-brand-dark'
                    : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {p.id === 'free' ? 'Start 7-day trial' : 'Choose ' + p.display_name}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* One-time packages */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-2 flex items-center justify-center gap-2">
          <Trophy className="h-6 w-6 text-amber-500" />
          <h2 className="text-2xl font-bold text-slate-900">One-time competition packages</h2>
        </div>
        <p className="mb-6 text-center text-sm text-slate-500">
          Perfect for schools and organizers who only run events a few times per year.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {packages.map((p) => (
            <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-bold text-slate-900">{p.display_name}</h3>
              <p className="mt-1 text-xs text-slate-500">{p.description}</p>
              <div className="mt-3 text-2xl font-extrabold text-slate-900">
                {formatUsd(p.price_usd_cents)}
              </div>
              <p className="text-xs text-slate-400">+ 10% tax · {quotaLabel(p)}</p>
              <Link
                href={cta(p.id)}
                className="mt-4 inline-flex w-full items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Buy package
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Feature comparison */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        <h2 className="mb-4 flex items-center justify-center gap-2 text-2xl font-bold text-slate-900">
          <Zap className="h-6 w-6 text-brand" />
          Feature comparison
        </h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Feature</th>
                {subs.map((p) => (
                  <th key={p.id} className="px-4 py-3 text-center font-semibold text-slate-700">
                    {p.display_name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {featureRows.map((row) => (
                <tr key={row.key} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-slate-600">{row.label}</td>
                  {subs.map((p) => (
                    <td key={p.id} className="px-4 py-3 text-center">
                      {cell(p, row.key)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-4 py-10 text-center text-sm text-slate-400">
        Questions? Email{' '}
        <a
          className="text-brand hover:underline"
          href="mailto:somaeducationgroup@gmail.com"
        >
          somaeducationgroup@gmail.com
        </a>
        {' '}or contact us on{' '}
        <a
          className="text-brand hover:underline"
          href="https://t.me/somaeducationgroup"
          target="_blank"
          rel="noreferrer"
        >
          Telegram
        </a>
      </footer>
    </main>
  );
}
