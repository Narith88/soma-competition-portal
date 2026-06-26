import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatUsd } from '@/lib/billing';
import { formatDateTime } from '@/lib/utils';
import { approvePaymentAction, rejectPaymentAction } from '../actions';

export const dynamic = 'force-dynamic';

const STATUS_BADGE: Record<string, string> = {
  pending_payment: 'bg-amber-50 text-amber-700',
  proof_submitted: 'bg-blue-50 text-blue-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

export default async function PlatformPaymentsPage({
  searchParams,
}: {
  searchParams: { ok?: string; error?: string; status?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile || profile.role !== 'admin') redirect('/admin');

  // Use the service-role client so we can read EVERY payment regardless of
  // which organization the platform admin currently has selected.
  const admin = createAdminClient();
  const filter = searchParams.status ?? 'proof_submitted';

  const { data: payments } = await admin
    .from('payments')
    .select(
      'id, organization_id, plan_id, kind, amount_usd_cents, tax_usd_cents, total_usd_cents, status, proof_url, proof_note, created_at'
    )
    .eq('status', filter)
    .order('created_at', { ascending: false });

  // Resolve org names in one batch.
  const orgIds = Array.from(new Set((payments ?? []).map((p) => p.organization_id)));
  const { data: orgs } = orgIds.length
    ? await admin.from('organizations').select('id, name').in('id', orgIds)
    : { data: [] as { id: string; name: string }[] };
  const orgName = new Map<string, string>();
  (orgs ?? []).forEach((o) => orgName.set(o.id, o.name));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <ShieldCheck className="h-6 w-6 text-brand" />
          Platform payments review
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Approve or reject payments from buyers. Only platform admins see this page.
        </p>
      </div>

      {searchParams.ok && (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Action completed.
        </p>
      )}
      {searchParams.error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {searchParams.error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {['proof_submitted', 'pending_payment', 'approved', 'rejected', 'cancelled'].map((s) => (
          <Link
            key={s}
            href={`/admin/platform/payments?status=${s}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              filter === s
                ? 'border-brand bg-brand text-white'
                : 'border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {s.replace('_', ' ')}
          </Link>
        ))}
      </div>

      {(payments ?? []).length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          No payments with this status.
        </p>
      ) : (
        <ul className="space-y-3">
          {(payments ?? []).map((p) => (
            <li key={p.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-900">
                    {orgName.get(p.organization_id) ?? p.organization_id} ·{' '}
                    <span className="text-slate-500">{p.plan_id}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-slate-400">
                    {formatDateTime(p.created_at)} · {p.kind}
                  </div>
                  {p.proof_note && (
                    <p className="mt-2 rounded-md bg-slate-50 p-2 text-xs text-slate-600">
                      “{p.proof_note}”
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-slate-900">
                    {formatUsd(p.total_usd_cents)}
                  </div>
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      STATUS_BADGE[p.status] ?? 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {p.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {p.proof_url && (
                <a
                  href={p.proof_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-sm text-brand hover:underline"
                >
                  View payment screenshot
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}

              {(p.status === 'proof_submitted' || p.status === 'pending_payment') && (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <form action={approvePaymentAction.bind(null, p.id)} className="flex items-center gap-2">
                    <input
                      name="reviewer_note"
                      placeholder="Optional note"
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-brand"
                    />
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Approve
                    </button>
                  </form>
                  <form action={rejectPaymentAction.bind(null, p.id)} className="flex items-center gap-2">
                    <input
                      name="reviewer_note"
                      placeholder="Reason"
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-brand"
                    />
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </button>
                  </form>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
