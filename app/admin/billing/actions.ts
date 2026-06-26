'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getActiveOrganization, canEdit } from '@/lib/org';
import { getPlan, taxBreakdown } from '@/lib/billing';

/**
 * Create a payment record for the active org + chosen plan and redirect to
 * the QR-code page. Idempotent in the simple sense: a brand-new pending row
 * is created every time the user clicks "Buy" so they can have multiple
 * outstanding orders.
 */
export async function startCheckoutAction(planId: string): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/pricing');

  const org = await getActiveOrganization();
  if (!org || !canEdit(org.role)) {
    redirect('/pricing?error=' + encodeURIComponent('You need to be an org owner/admin to buy.'));
  }

  const plan = await getPlan(planId);
  if (!plan) redirect('/pricing?error=' + encodeURIComponent('Plan not found.'));
  if (plan.price_usd_cents === 0) redirect('/admin');

  const { subtotal, tax, total } = taxBreakdown(plan.price_usd_cents);

  const admin = createAdminClient();
  const { data: payment, error } = await admin
    .from('payments')
    .insert({
      organization_id: org.organization_id,
      user_id: user.id,
      plan_id: plan.id,
      kind: plan.kind,
      amount_usd_cents: subtotal,
      tax_usd_cents: tax,
      total_usd_cents: total,
      status: 'pending_payment',
    })
    .select('id')
    .single();

  if (error || !payment) {
    redirect('/pricing?error=' + encodeURIComponent(error?.message ?? 'Could not start checkout.'));
  }

  redirect(`/admin/billing/payments/${payment.id}`);
}

/**
 * Buyer uploads a proof URL (or reference number) and marks the payment as
 * "proof_submitted". The platform admin then reviews and approves/rejects.
 */
export async function submitPaymentProofAction(
  paymentId: string,
  formData: FormData
): Promise<void> {
  const supabase = createClient();
  const proofUrl = ((formData.get('proof_url') as string) ?? '').trim();
  const proofNote = ((formData.get('proof_note') as string) ?? '').trim();

  if (!proofUrl && !proofNote) {
    redirect(
      `/admin/billing/payments/${paymentId}?error=${encodeURIComponent('Add a payment screenshot URL or a reference note before submitting.')}`
    );
  }

  const { error } = await supabase
    .from('payments')
    .update({
      proof_url: proofUrl || null,
      proof_note: proofNote || null,
      status: 'proof_submitted',
    })
    .eq('id', paymentId);

  if (error) {
    redirect(
      `/admin/billing/payments/${paymentId}?error=${encodeURIComponent(error.message)}`
    );
  }

  revalidatePath(`/admin/billing/payments/${paymentId}`);
  redirect(`/admin/billing/payments/${paymentId}?ok=1`);
}

/** Cancel a pending payment (only while still pending / proof not approved). */
export async function cancelPaymentAction(paymentId: string): Promise<void> {
  const supabase = createClient();
  await supabase
    .from('payments')
    .update({ status: 'cancelled' })
    .eq('id', paymentId)
    .in('status', ['pending_payment', 'proof_submitted']);
  revalidatePath('/admin/billing');
  redirect('/admin/billing');
}
