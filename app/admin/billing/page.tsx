import Link from 'next/link';
import { CreditCard, Receipt, Sparkles, Zap } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getActiveOrganization } from '@/lib/org';
import { getOrgBillingStatus, formatUsd } from '@/lib/billing';
import { formatDateTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const STATUS_BADGES: Record<string, string> = {
  pending_payment: 'bg-amber-50 text-amber-700',
  proof_submitted: 'bg-blue-50 text-blue-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

export default async function BillingPage() {
  const supabase = createClient();
  const org = await getActiveOrganization();
  if (!org) {
    return <p className="text-slate-500">No organization selected.</p>;
  }
  const status = await getOrgBillingStatus(org.organization_id);

  const { data: payments } = await supabase
    .from('payments')
    .select('id, plan_id, kind, total_usd_cents, status, created_at, reviewed_at')
    .eq('organization_id', org.organization_id)
    .order('created_at', { ascending: false })
    .limit(20);

  const trialDaysLeft =
    status?.is_trial && status.trial_ends_at
      ? Math.max(
          0,
          Math.ceil((new Date(status.trial_ends_at).getTime() - Date.now()) / 86400000)
        )
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Billing</h1>
        <p className="mt-1 text-sm text-slate-500">
          Plan, usage, and payment history for {org.name}.
        </p>
      </div>

      {/* Current plan card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-slate-500">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wide">Current plan</span>
            </div>
            <h2 className="mt-1 text-2xl font-bold capitalize text-slate-900">
              {status?.plan ?? 'free'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Status: {status?.subscription_status ?? 'inactive'}
            </p>
            {status?.is_trial && (
              <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                Free trial · {trialDaysLeft ?? 0} day{trialDaysLeft === 1 ? '' : 's'} left
              </p>
            )}
          </div>
          <Link
            href="/pricing"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            Upgrade / buy more
          </Link>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <UsageStat
            label={status?.is_trial ? 'Trial respondents used' : 'Respondents remaining'}
            value={
              status?.is_trial
                ? `${status.trial_respondents_used} / 30`
                : String(status?.respondents_balance ?? 0)
            }
          />
          <UsageStat
            label={status?.is_trial ? 'Trial ends' : 'Period ends'}
            value={
              status?.is_trial
                ? formatDateTime(status.trial_ends_at)
                : formatDateTime(status?.current_period_ends_at ?? null)
            }
          />
          <UsageStat label="CSV export" value={status?.features.csv_export ? 'Enabled' : 'Not on this plan'} />
        </div>
      </div>

      {/* Payments */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
          <Receipt className="h-5 w-5 text-slate-400" />
          <h2 className="font-semibold text-slate-900">Payments</h2>
        </div>
        {!payments || payments.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">
            No payments yet. Open the{' '}
            <Link href="/pricing" className="text-brand hover:underline">
              pricing page
            </Link>{' '}
            to upgrade.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div>
                  <div className="font-medium text-slate-800">{p.plan_id}</div>
                  <div className="text-xs text-slate-400">
                    {formatDateTime(p.created_at)} · {p.kind}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-slate-700">
                    {formatUsd(p.total_usd_cents)}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      STATUS_BADGES[p.status] ?? 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {p.status.replace('_', ' ')}
                  </span>
                  <Link
                    href={`/admin/billing/payments/${p.id}`}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    View
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function UsageStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 font-semibold text-slate-800">{value}</div>
    </div>
  );
}
