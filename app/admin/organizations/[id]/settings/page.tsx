import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getUserOrganizations, canEdit } from '@/lib/org';
import { formatDateTime } from '@/lib/utils';
import { renameOrganizationAction } from '@/app/onboarding/actions';

export const dynamic = 'force-dynamic';

export default async function OrganizationSettingsPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { ok?: string; error?: string };
}) {
  const supabase = createClient();
  const orgs = await getUserOrganizations();
  const membership = orgs.find((o) => o.organization_id === params.id);
  if (!membership) notFound();

  const editable = canEdit(membership.role);

  // Load member list (RLS allows members to read members of their org).
  const { data: membersRaw } = await supabase
    .from('organization_members')
    .select('role, created_at, profiles(full_name, email)')
    .eq('organization_id', params.id)
    .order('created_at', { ascending: true });

  const members = (membersRaw ?? []).map((m) => {
    const p = (m as { profiles: unknown }).profiles as
      | { full_name: string | null; email: string | null }
      | { full_name: string | null; email: string | null }[]
      | null;
    const profile = Array.isArray(p) ? p[0] : p;
    return {
      role: m.role as string,
      created_at: m.created_at as string,
      full_name: profile?.full_name ?? null,
      email: profile?.email ?? null,
    };
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/admin/organizations"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to organizations
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">{membership.name}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Plan: {membership.plan} · Your role: {membership.role}
        </p>
      </div>

      {searchParams.ok && (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Saved.
        </p>
      )}

      {/* Rename */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-slate-900">Organization name</h2>
        {editable ? (
          <form
            action={renameOrganizationAction.bind(null, params.id)}
            className="flex flex-wrap items-end gap-3"
          >
            <div className="flex-1">
              <input
                name="name"
                defaultValue={membership.name}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
            >
              Save
            </button>
          </form>
        ) : (
          <p className="text-sm text-slate-500">
            Only owners and admins can rename this organization.
          </p>
        )}
      </div>

      {/* Members */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
          <Users className="h-5 w-5 text-slate-400" />
          <h2 className="font-semibold text-slate-900">
            Members ({members.length})
          </h2>
        </div>
        <ul className="divide-y divide-slate-100">
          {members.map((m, i) => (
            <li key={i} className="flex items-center justify-between px-5 py-3">
              <div>
                <div className="font-medium text-slate-800">
                  {m.full_name || m.email || 'Unknown user'}
                </div>
                {m.email && <div className="text-xs text-slate-400">{m.email}</div>}
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-slate-600">{m.role}</div>
                <div className="text-xs text-slate-400">
                  Joined {formatDateTime(m.created_at)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-slate-400">
        Inviting additional members by email is planned for a future update. For
        now, ask a teammate to sign up, then contact support to be added — or share
        this organization&apos;s exams via their access codes.
      </p>
    </div>
  );
}
