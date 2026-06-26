'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/** True iff the current user is a platform admin (profiles.role = 'admin'). */
async function requirePlatformAdmin(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile || profile.role !== 'admin') return null;
  return user.id;
}

export async function approvePaymentAction(paymentId: string, formData: FormData) {
  const reviewerId = await requirePlatformAdmin();
  if (!reviewerId) redirect('/admin');

  const note = ((formData.get('reviewer_note') as string) ?? '').trim();
  const admin = createAdminClient();

  const { error: updErr } = await admin
    .from('payments')
    .update({
      status: 'approved',
      reviewer_id: reviewerId,
      reviewer_note: note || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', paymentId);

  if (updErr) {
    redirect(`/admin/platform/payments?error=${encodeURIComponent(updErr.message)}`);
  }

  // Apply the plan/package to the org via a SECURITY DEFINER DB function.
  const { error: applyErr } = await admin.rpc('apply_approved_payment', {
    p_payment_id: paymentId,
  });

  if (applyErr) {
    redirect(`/admin/platform/payments?error=${encodeURIComponent(applyErr.message)}`);
  }

  revalidatePath('/admin/platform/payments');
  redirect('/admin/platform/payments?ok=1');
}

export async function rejectPaymentAction(paymentId: string, formData: FormData) {
  const reviewerId = await requirePlatformAdmin();
  if (!reviewerId) redirect('/admin');

  const note = ((formData.get('reviewer_note') as string) ?? '').trim();
  const admin = createAdminClient();
  await admin
    .from('payments')
    .update({
      status: 'rejected',
      reviewer_id: reviewerId,
      reviewer_note: note || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', paymentId);

  revalidatePath('/admin/platform/payments');
  redirect('/admin/platform/payments?ok=1');
}
