'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { organizationSchema } from '@/lib/validations';
import { ACTIVE_ORG_COOKIE } from '@/lib/org';

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base || 'org'}-${suffix}`;
}

/**
 * Create a new organization and make the current user its owner.
 * Uses the admin client for the writes so the brand-new owner membership can be
 * created even before any RLS-visible membership exists (avoids a chicken-and-egg
 * problem), while still verifying the caller is authenticated.
 */
export async function createOrganizationAction(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const parsed = organizationSchema.safeParse({
    name: (formData.get('name') as string | null)?.trim() ?? '',
  });
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? 'Invalid organization name';
    redirect(`/onboarding?error=${encodeURIComponent(msg)}`);
  }

  const admin = createAdminClient();

  // Make sure a profile row exists (it normally does via the signup trigger).
  await admin
    .from('profiles')
    .upsert(
      { id: user.id, email: user.email, full_name: user.user_metadata?.full_name ?? null },
      { onConflict: 'id' }
    );

  const { data: org, error: orgErr } = await admin
    .from('organizations')
    .insert({
      name: parsed.data.name,
      slug: slugify(parsed.data.name),
      owner_id: user.id,
    })
    .select('id')
    .single();

  if (orgErr || !org) {
    redirect(
      `/onboarding?error=${encodeURIComponent(orgErr?.message ?? 'Could not create organization')}`
    );
  }

  const { error: memErr } = await admin.from('organization_members').insert({
    organization_id: org.id,
    user_id: user.id,
    role: 'owner',
  });
  if (memErr) {
    redirect(`/onboarding?error=${encodeURIComponent(memErr.message)}`);
  }

  cookies().set(ACTIVE_ORG_COOKIE, org.id, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });

  revalidatePath('/admin');
  redirect('/admin');
}

/** Switch the active organization (must be a member). */
export async function switchOrganizationAction(orgId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: membership } = await supabase
    .from('organization_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('organization_id', orgId)
    .maybeSingle();

  if (membership) {
    cookies().set(ACTIVE_ORG_COOKIE, orgId, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
  }
  revalidatePath('/admin', 'layout');
  redirect('/admin');
}

/** Rename an organization (owner/admin only). */
export async function renameOrganizationAction(orgId: string, formData: FormData) {
  const supabase = createClient();
  const parsed = organizationSchema.safeParse({
    name: (formData.get('name') as string | null)?.trim() ?? '',
  });
  if (!parsed.success) {
    redirect(`/admin/organizations/${orgId}/settings?error=invalid`);
  }
  // RLS ensures only owner/admin of this org can update it.
  await supabase.from('organizations').update({ name: parsed.data.name }).eq('id', orgId);
  revalidatePath('/admin', 'layout');
  redirect(`/admin/organizations/${orgId}/settings?ok=1`);
}
