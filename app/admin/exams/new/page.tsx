import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getActiveOrganization } from '@/lib/org';
import ExamForm from '../ExamForm';
import { createExamAction } from '../actions';

export const dynamic = 'force-dynamic';

export default async function NewExamPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const supabase = createClient();
  const org = await getActiveOrganization();
  const orgId = org?.organization_id ?? '00000000-0000-0000-0000-000000000000';
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .eq('organization_id', orgId)
    .order('name', { ascending: true });

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
        <h1 className="text-2xl font-bold text-slate-900">Create Exam</h1>
        <p className="mt-1 text-sm text-slate-500">
          After saving, you&apos;ll add questions and choices.
        </p>
      </div>

      <ExamForm
        action={createExamAction}
        categories={categories ?? []}
        error={searchParams.error}
        submitLabel="Create exam"
      />
    </div>
  );
}
