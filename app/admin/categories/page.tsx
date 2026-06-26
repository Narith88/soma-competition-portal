import Link from 'next/link';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getActiveOrganization } from '@/lib/org';
import { createCategoryAction, deleteCategoryAction } from '../exams/actions';

export const dynamic = 'force-dynamic';

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const supabase = createClient();
  const org = await getActiveOrganization();
  const orgId = org?.organization_id ?? '00000000-0000-0000-0000-000000000000';
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, name_km, description')
    .eq('organization_id', orgId)
    .order('name', { ascending: true });

  const inputCls =
    'w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/admin/exams"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to exams
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Categories</h1>
        <p className="mt-1 text-sm text-slate-500">
          Group exams into competition categories (e.g. Math Junior, Physics).
        </p>
      </div>

      {searchParams.error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {searchParams.error}
        </p>
      )}

      {/* Create form */}
      <form
        action={createCategoryAction}
        className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h2 className="mb-4 font-semibold text-slate-900">Add Category</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Name (English) *
            </label>
            <input name="name" required className={inputCls} placeholder="Math Junior" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Name (Khmer)
            </label>
            <input name="name_km" className={`${inputCls} font-khmer`} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Description
            </label>
            <input name="description" className={inputCls} />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            <Plus className="h-4 w-4" />
            Add category
          </button>
        </div>
      </form>

      {/* List */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-900">
            Existing Categories ({categories?.length ?? 0})
          </h2>
        </div>
        {!categories || categories.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">
            No categories yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {categories.map((c) => (
              <li key={c.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="font-medium text-slate-800">
                    {c.name}
                    {c.name_km && (
                      <span className="ml-2 font-khmer text-slate-500">{c.name_km}</span>
                    )}
                  </div>
                  {c.description && (
                    <div className="text-xs text-slate-400">{c.description}</div>
                  )}
                </div>
                <form action={deleteCategoryAction.bind(null, c.id)}>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
