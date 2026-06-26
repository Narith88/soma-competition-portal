import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  getExamByAccessCode,
  getSafeQuestionsForAttempt,
  attemptEndsAt,
  type AttemptRecord,
} from '@/lib/exam';
import ExamClient from './ExamClient';

export const dynamic = 'force-dynamic';

export default async function TakePage({
  params,
}: {
  params: { accessCode: string; attemptId: string };
}) {
  const accessCode = decodeURIComponent(params.accessCode);
  const attemptId = params.attemptId;

  const supabase = createAdminClient();

  // Load the attempt (the attemptId acts as a private capability/secret).
  const { data: attemptData } = await supabase
    .from('attempts')
    .select('*')
    .eq('id', attemptId)
    .maybeSingle();

  const attempt = attemptData as AttemptRecord | null;
  if (!attempt) {
    return <NotFound />;
  }

  // Confirm the attempt belongs to the exam with this access code.
  const exam = await getExamByAccessCode(accessCode);
  if (!exam || exam.id !== attempt.exam_id) {
    return <NotFound />;
  }

  // Already submitted -> go straight to the result page.
  if (attempt.submitted_at || attempt.status !== 'started') {
    redirect(`/exam/${encodeURIComponent(accessCode)}/result/${attemptId}`);
  }

  const endsAt = attemptEndsAt(attempt, exam);
  const questions = await getSafeQuestionsForAttempt(exam, attemptId);

  return (
    <ExamClient
      accessCode={accessCode}
      attemptId={attemptId}
      examTitle={exam.title}
      examTitleKm={exam.title_km}
      instructions={exam.instructions}
      endsAt={endsAt}
      maxTabSwitches={exam.max_tab_switches}
      initialTabSwitchCount={attempt.tab_switch_count}
      initialFlagged={attempt.is_flagged}
      questions={questions}
    />
  );
}

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-lg font-semibold text-slate-800">Attempt not found</p>
        <p className="mt-1 text-sm text-slate-500">
          This exam attempt does not exist or the link is invalid.
        </p>
        <a
          href="/join"
          className="mt-5 inline-block rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white"
        >
          Back to join
        </a>
      </div>
    </div>
  );
}
