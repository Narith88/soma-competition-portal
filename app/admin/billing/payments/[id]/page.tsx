import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CreditCard, QrCode, Upload, CheckCircle2, XCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatUsd } from '@/lib/billing';
import { formatDateTime } from '@/lib/utils';
import ProofImageBridge from './ProofImageBridge';
import {
  submitPaymentProofAction,
  cancelPaymentAction,
} from '@/app/admin/billing/actions';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  pending_payment: {
    text: 'Waiting for your payment',
    cls: 'bg-amber-50 text-amber-700',
  },
  proof_submitted: {
    text: 'Proof submitted — awaiting review',
    cls: 'bg-blue-50 text-blue-700',
  },
  approved: { text: 'Approved — plan active', cls: 'bg-emerald-50 text-emerald-700' },
  rejected: { text: 'Rejected', cls: 'bg-red-50 text-red-700' },
  cancelled: { text: 'Cancelled', cls: 'bg-slate-100 text-slate-500' },
};

export default async function PaymentPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { ok?: string; error?: string };
}) {
  const supabase = createClient();
  const { data: payment } = await supabase
    .from('payments')
    .select(
      'id, plan_id, kind, amount_usd_cents, tax_usd_cents, total_usd_cents, status, proof_url, proof_note, reviewer_note, created_at, reviewed_at'
    )
    .eq('id', params.id)
    .maybeSingle();

  if (!payment) notFound();

  const { data: plan } = await supabase
    .from('billing_plans')
    .select('display_name, description, respondents_per_cycle, kind')
    .eq('id', payment.plan_id)
    .maybeSingle();

  const status = STATUS_LABEL[payment.status] ?? {
    text: payment.status,
    cls: 'bg-slate-100 text-slate-500',
  };
  const canSubmitProof = payment.status === 'pending_payment' || payment.status === 'proof_submitted';

  // QR target string. For phase 1 we encode the order info into a generic QR.
  // Phase 2 will replace this with a KHQR / Bakong payload signed by the server.
  const qrSrc = 'https://iuhzkbvlvdaorahrewrw.supabase.co/storage/v1/object/public/question-images/photo_2026-06-25_22-03-32.jpg';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/admin/billing"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to billing
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <CreditCard className="h-6 w-6 text-brand" />
            Complete payment
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {plan?.display_name ?? payment.plan_id} ·{' '}
            {plan?.kind === 'subscription' ? 'Monthly subscription' : 'One-time package'}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${status.cls}`}>
          {status.text}
        </span>
      </div>

      {searchParams.ok && (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Proof submitted. We&apos;ll review your payment shortly.
        </p>
      )}
      {searchParams.error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {searchParams.error}
        </p>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">Order summary</h2>
        <dl className="space-y-1 text-sm">
          <Row label="Plan" value={plan?.display_name ?? payment.plan_id} />
          <Row label="Respondents included" value={String(plan?.respondents_per_cycle ?? '—')} />
          <Row label="Subtotal" value={formatUsd(payment.amount_usd_cents)} />
          <Row label="Tax (10%)" value={formatUsd(payment.tax_usd_cents)} />
          <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
            <dt className="font-semibold text-slate-900">Total</dt>
            <dd className="text-lg font-bold text-slate-900">
              {formatUsd(payment.total_usd_cents)}
            </dd>
          </div>
        </dl>
      </section>

      {canSubmitProof && (
        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <QrCode className="h-5 w-5 text-brand" />
              <h2 className="font-semibold text-slate-900">Scan to pay</h2>
            </div>
            <div className="rounded-lg bg-slate-50 p-4 text-center">
              <img
                src={qrSrc}
                alt="SOMA payment QR code"
                className="mx-auto mb-4 h-72 w-72 rounded-xl border border-slate-200 bg-white object-contain p-2"
              />

              <p className="text-xs font-semibold text-slate-700">Transfer to:</p>

              <p className="mt-2 text-xs leading-5 text-slate-800">
                <strong>Bank:</strong> ABA Bank
                <br />
                <strong>Account number:</strong> 018 122 353
                <br />
              </p>
            </div>
            <p className="mt-3 text-center text-xs text-slate-500">
              Order ID:{' '}
              <code className="font-mono text-slate-700">{payment.id.slice(0, 8)}</code>
            </p>
            <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
              Open your banking app (Bakong, ABA, Wing, etc.), scan the QR code,
              transfer{' '}
              <span className="font-semibold text-slate-700">
                {formatUsd(payment.total_usd_cents)}
              </span>
              , then come back here and upload a screenshot of the confirmation.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Upload className="h-5 w-5 text-brand" />
              <h2 className="font-semibold text-slate-900">Upload proof of payment</h2>
            </div>
            <form action={submitPaymentProofAction.bind(null, payment.id)} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Payment screenshot
                </label>
                <ProofImageBridge initial={payment.proof_url ?? ''} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Reference / transaction note (optional)
                </label>
                <textarea
                  name="proof_note"
                  defaultValue={payment.proof_note ?? ''}
                  rows={2}
                  placeholder="e.g. Bakong reference 1234567"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
                />
              </div>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
              >
                <CheckCircle2 className="h-4 w-4" />
                Submit for review
              </button>
            </form>
            <form action={cancelPaymentAction.bind(null, payment.id)} className="mt-3">
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
              >
                <XCircle className="h-4 w-4" />
                Cancel order
              </button>
            </form>
          </div>
        </section>
      )}

      {payment.reviewer_note && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Reviewer note: {payment.reviewer_note}
        </p>
      )}

      <p className="text-xs text-slate-400">
        Order created {formatDateTime(payment.created_at)}.
        {payment.reviewed_at && ` Reviewed ${formatDateTime(payment.reviewed_at)}.`}
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-800">{value}</dd>
    </div>
  );
}
