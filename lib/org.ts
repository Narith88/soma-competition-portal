import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export interface OrgMembership {
  organization_id: string;
  role: 'owner' | 'admin' | 'viewer';
  name: string;
  slug: string | null;
  plan: string;
}

export const ACTIVE_ORG_COOKIE = 'soma-active-org';

/**
 * Load all organizations the current logged-in user belongs to.
 * Returns [] if not logged in or not a member of any organization.
 */
export async function getUserOrganizations(): Promise<OrgMembership[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id, role, organizations(name, slug, plan)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (error || !data) return [];

  return data
    .map((row) => {
      // organizations may come back as an object (single FK relation).
      const org = (row as { organizations: unknown }).organizations as
        | { name: string; slug: string | null; plan: string }
        | { name: string; slug: string | null; plan: string }[]
        | null;
      const o = Array.isArray(org) ? org[0] : org;
      if (!o) return null;
      return {
        organization_id: row.organization_id as string,
        role: row.role as 'owner' | 'admin' | 'viewer',
        name: o.name,
        slug: o.slug,
        plan: o.plan,
      } satisfies OrgMembership;
    })
    .filter((x): x is OrgMembership => x !== null);
}

/**
 * Resolve the "active" organization for the current request. Uses the
 * soma-active-org cookie if it points to an org the user belongs to; otherwise
 * falls back to the first membership. Returns null if the user has no orgs.
 */
export async function getActiveOrganization(
  memberships?: OrgMembership[]
): Promise<OrgMembership | null> {
  const orgs = memberships ?? (await getUserOrganizations());
  if (orgs.length === 0) return null;

  const cookieStore = cookies();
  const preferred = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;
  if (preferred) {
    const match = orgs.find((o) => o.organization_id === preferred);
    if (match) return match;
  }
  return orgs[0];
}

/** True if the membership role can create/edit (owner or admin). */
export function canEdit(role: OrgMembership['role']): boolean {
  return role === 'owner' || role === 'admin';
}
