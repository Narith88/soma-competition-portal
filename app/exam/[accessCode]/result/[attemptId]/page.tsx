import { createAdminClient } from '@/lib/supabase/admin';
import { getExamByAccessCode, type AttemptRecord } from '@/lib/exam';
import { percentage } from '@/lib/utils';
import StudentNav from '@/components/StudentNav';
import ResultView from './ResultView';

export const dynamic = 'force-dynamic';

export default async function ResultPage({
  params,
}: {
  params: { accessCode: string; attemptId: string };
}) {
  const accessCode = decodeURIComponent(params.accessCode);
  const attemptId = params.attemptId;

  const supabase = createAdminClient();
  const { data: attemptData } = await supabase
    .from('attempts')
    .select('*')
    .eq('id', attemptId)
    .maybeSingle();

  const attempt = attemptData as AttemptRecord | null;
  const exam = await getExamByAccessCode(accessCode);

  if (!attempt || !exam || exam.id !== attempt.exam_id) {
    return (
      <div className="min-h-screen bg-slate-50">
        <StudentNav />
        <main className="mx-auto max-w-md px-4 py-16 text-center">
          <p className="text-slate-600">Result not found.</p>
        </main>
      </div>
    );
  }

  const pct = percentage(Number(attempt.score ?? 0), Number(attempt.total_points ?? 0));

  return (
    <div className="min-h-screen bg-slate-50">
      <StudentNav />
      <main className="mx-auto max-w-md px-4 py-12">
        <ResultView
          showResults={exam.show_results}
          score={attempt.score}
          totalPoints={attempt.total_points}
          percentage={pct}
          autoSubmitted={attempt.status === 'auto_submitted'}
          studentName={attempt.student_name}
        />
      </main>
    </div>
  );
}
