import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getActiveOrganization } from '@/lib/org';
import ExamForm, { type ExamDefaults } from '../../ExamForm';
import { updateExamAction } from '../../actions';

export const dynamic = 'force-dynamic';

/** Convert an ISO timestamp to a value usable by <input type="datetime-local">. */
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default async function EditExamPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  const supabase = createClient();
  const org = await getActiveOrganization();
  const orgId = org?.organization_id ?? '00000000-0000-0000-0000-000000000000';

  const { data: exam } = await supabase
    .from('exams')
    .select('*')
    .eq('id', params.id)
    .eq('organization_id', orgId)
    .maybeSingle();

  if (!exam) notFound();

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .eq('organization_id', orgId)
    .order('name', { ascending: true });

  const defaults: ExamDefaults = {
    title: exam.title,
    title_km: exam.title_km ?? '',
    category_id: exam.category_id ?? '',
    description: exam.description ?? '',
    instructions: exam.instructions ?? '',
    language_mode: exam.language_mode,
    subject: exam.subject ?? '',
    difficulty: exam.difficulty ?? '',
    access_code: exam.access_code,
    duration_minutes: exam.duration_minutes,
    open_at: toLocalInput(exam.open_at),
    close_at: toLocalInput(exam.close_at),
    is_published: exam.is_published,
    show_results: exam.show_results,
    shuffle_questions: exam.shuffle_questions,
    shuffle_choices: exam.shuffle_choices,
    max_tab_switches: exam.max_tab_switches,
  };

  const action = updateExamAction.bind(null, params.id);

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
        <h1 className="text-2xl font-bold text-slate-900">Edit Exam</h1>
        <p className="mt-1 text-sm text-slate-500">{exam.title}</p>
      </div>

      <ExamForm
        action={action}
        categories={categories ?? []}
        defaults={defaults}
        error={searchParams.error}
        submitLabel="Save changes"
      />
    </div>
  );
}
