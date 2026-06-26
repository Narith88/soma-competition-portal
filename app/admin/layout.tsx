import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserOrganizations, getActiveOrganization } from '@/lib/org';
import AdminNav from '@/components/AdminNav';

export const dynamic = 'force-dynamic';

/**
 * Wraps every /admin/* page. Ensures the user is logged in and belongs to at
 * least one organization, then provides the org switcher in the nav.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/admin');
  }

  const orgs = await getUserOrganizations();
  if (orgs.length === 0) {
    redirect('/onboarding');
  }
  const active = await getActiveOrganization(orgs);

  // Check if this user is a platform admin (for the "Review payments" link).
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  const isPlatformAdmin = profile?.role === 'admin';

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav
        email={user.email}
        organizations={orgs}
        activeOrgId={active?.organization_id ?? null}
        isPlatformAdmin={isPlatformAdmin}
      />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
