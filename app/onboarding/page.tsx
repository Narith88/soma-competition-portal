import { redirect } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getUserOrganizations } from '@/lib/org';
import { createOrganizationAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // If the user already has an organization, skip onboarding.
  const orgs = await getUserOrganizations();
  if (orgs.length > 0) redirect('/admin');

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-white">
            <Building2 className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Create your organization</h1>
          <p className="mt-1 text-sm text-slate-500">
            This is your private workspace. Your exams, questions, and results stay
            inside it and are never visible to other organizations.
          </p>
        </div>

        {searchParams.error && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {searchParams.error}
          </p>
        )}

        <form action={createOrganizationAction} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Organization name
            </label>
            <input
              name="name"
              required
              placeholder="e.g. Newton Learning Center"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-brand px-4 py-2.5 font-semibold text-white transition hover:bg-brand-dark"
          >
            Create organization
          </button>
        </form>
      </div>
    </div>
  );
}
