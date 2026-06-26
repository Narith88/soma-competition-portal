import Link from 'next/link';
import { Building2, Plus, Settings, Check } from 'lucide-react';
import { getUserOrganizations, getActiveOrganization } from '@/lib/org';
import { switchOrganizationAction } from '@/app/onboarding/actions';

export const dynamic = 'force-dynamic';

export default async function OrganizationsPage() {
  const orgs = await getUserOrganizations();
  const active = await getActiveOrganization(orgs);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Organizations</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage the workspaces you belong to.
          </p>
        </div>
        <Link
          href="/admin/organizations/new"
          className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
        >
          <Plus className="h-4 w-4" />
          New Organization
        </Link>
      </div>

      <div className="space-y-2">
        {orgs.map((o) => {
          const isActive = active?.organization_id === o.organization_id;
          return (
            <div
              key={o.organization_id}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-slate-400" />
                <div>
                  <div className="font-semibold text-slate-900">
                    {o.name}
                    {isActive && (
                      <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        <Check className="h-3 w-3" />
                        Active
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">
                    Role: {o.role} · Plan: {o.plan}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isActive && (
                  <form action={switchOrganizationAction.bind(null, o.organization_id)}>
                    <button
                      type="submit"
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      Switch to
                    </button>
                  </form>
                )}
                <Link
                  href={`/admin/organizations/${o.organization_id}/settings`}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
