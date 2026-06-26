import Link from 'next/link';
import { ArrowLeft, Building2 } from 'lucide-react';
import { createOrganizationAction } from '@/app/onboarding/actions';

export const dynamic = 'force-dynamic';

export default function NewOrganizationPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <div className="mx-auto max-w-md space-y-6">
      <Link
        href="/admin/organizations"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to organizations
      </Link>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-white">
            <Building2 className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">New organization</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create another private workspace. Its exams stay separate from your
            other organizations.
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
              placeholder="e.g. Phnom Penh Science Club"
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
