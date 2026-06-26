import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getActiveOrganization } from '@/lib/org';
import QuestionEditor, { type EditorQuestion } from './QuestionEditor';

export const dynamic = 'force-dynamic';

export default async function QuestionsPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const org = await getActiveOrganization();
  const orgId = org?.organization_id ?? '00000000-0000-0000-0000-000000000000';

  const { data: exam } = await supabase
    .from('exams')
    .select('id, title, access_code')
    .eq('id', params.id)
    .eq('organization_id', orgId)
    .maybeSingle();

  if (!exam) notFound();

  const { data: questions } = await supabase
    .from('questions')
    .select('id, prompt_markdown, image_url, points, order_index')
    .eq('exam_id', exam.id)
    .order('order_index', { ascending: true });

  const questionIds = (questions ?? []).map((q) => q.id);
  const { data: choices } = await supabase
    .from('choices')
    .select('id, question_id, content_markdown, image_url, is_correct, order_index')
    .in(
      'question_id',
      questionIds.length ? questionIds : ['00000000-0000-0000-0000-000000000000']
    )
    .order('order_index', { ascending: true });

  const choicesByQuestion = new Map<
    string,
    { content_markdown: string; image_url: string; is_correct: boolean }[]
  >();
  (choices ?? []).forEach((c) => {
    const list = choicesByQuestion.get(c.question_id) ?? [];
    list.push({
      content_markdown: c.content_markdown ?? '',
      image_url: c.image_url ?? '',
      is_correct: c.is_correct,
    });
    choicesByQuestion.set(c.question_id, list);
  });

  const initialQuestions: EditorQuestion[] = (questions ?? []).map((q) => ({
    id: q.id,
    prompt_markdown: q.prompt_markdown,
    image_url: q.image_url ?? '',
    points: q.points,
    order_index: q.order_index,
    choices: choicesByQuestion.get(q.id) ?? [],
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/admin/exams"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to exams
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Questions</h1>
          <p className="mt-1 text-sm text-slate-500">
            {exam.title} ·{' '}
            <span className="font-mono">{exam.access_code}</span>
          </p>
        </div>
        <Link
          href={`/admin/exams/${exam.id}/edit`}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Exam settings
        </Link>
      </div>

      <QuestionEditor examId={exam.id} initialQuestions={initialQuestions} />
    </div>
  );
}
