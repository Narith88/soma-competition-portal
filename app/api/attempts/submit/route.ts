import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { submitAttemptSchema } from '@/lib/validations';
import { scoreAttempt, attemptEndsAt, type AttemptRecord, type ExamRecord } from '@/lib/exam';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const parsed = submitAttemptSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first?.message ?? 'Invalid input.' }, { status: 400 });
  }

  const { attempt_id, answers, auto } = parsed.data;
  const supabase = createAdminClient();

  // Load the attempt.
  const { data: attemptData } = await supabase
    .from('attempts')
    .select('*')
    .eq('id', attempt_id)
    .maybeSingle();

  const attempt = attemptData as AttemptRecord | null;
  if (!attempt) {
    return NextResponse.json({ error: 'Attempt not found.' }, { status: 404 });
  }

  // Prevent duplicate submission.
  if (attempt.submitted_at || attempt.status !== 'started') {
    return NextResponse.json({ ok: true, alreadySubmitted: true });
  }

  // Load the exam (for total points + time window enforcement).
  const { data: examData } = await supabase
    .from('exams')
    .select('*')
    .eq('id', attempt.exam_id)
    .maybeSingle();

  const exam = examData as ExamRecord | null;
  if (!exam) {
    return NextResponse.json({ error: 'Exam not found.' }, { status: 404 });
  }

  // Server-side scoring is the single source of truth.
  const { score, totalPoints, responses } = await scoreAttempt(exam.id, attempt_id, answers);

  // Decide final status. Auto if: client requested auto, attempt flagged,
  // or the server clock says the time window has expired.
  const expired = Date.now() > attemptEndsAt(attempt, exam);
  const finalStatus = auto || attempt.is_flagged || expired ? 'auto_submitted' : 'submitted';

  // Compute duration server-side from started_at -> now (clamped to the exam
  // window so a forgotten browser tab can't inflate the time).
  const submittedAtMs = Math.min(Date.now(), attemptEndsAt(attempt, exam));
  const submittedAtIso = new Date(submittedAtMs).toISOString();
  const durationSeconds = Math.max(
    0,
    Math.round((submittedAtMs - new Date(attempt.started_at).getTime()) / 1000)
  );

  // Save individual responses (idempotent via unique(attempt_id, question_id)).
  if (responses.length > 0) {
    const { error: respError } = await supabase
      .from('responses')
      .upsert(responses, { onConflict: 'attempt_id,question_id' });
    if (respError) {
      return NextResponse.json({ error: 'Could not save responses.' }, { status: 500 });
    }
  }

  // Update the attempt with the final score.
  const { error: updateError } = await supabase
    .from('attempts')
    .update({
      score,
      total_points: totalPoints,
      submitted_at: submittedAtIso,
      duration_seconds: durationSeconds,
      status: finalStatus,
    })
    .eq('id', attempt_id)
    .eq('status', 'started'); // guard against race / double submit

  if (updateError) {
    return NextResponse.json({ error: 'Could not submit the exam.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: finalStatus });
}
