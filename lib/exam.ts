import { createAdminClient } from '@/lib/supabase/admin';
import { seededShuffle } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface SafeChoice {
  id: string;
  content_markdown: string;
  image_url: string | null;
  order_index: number;
}

export interface SafeQuestion {
  id: string;
  prompt_markdown: string;
  image_url: string | null;
  points: number;
  order_index: number;
  choices: SafeChoice[];
}

export interface ExamRecord {
  id: string;
  organization_id: string | null;
  title: string;
  title_km: string | null;
  description: string | null;
  instructions: string | null;
  language_mode: 'km' | 'en' | 'bilingual';
  subject: string | null;
  difficulty: string | null;
  access_code: string;
  duration_minutes: number;
  open_at: string | null;
  close_at: string | null;
  is_published: boolean;
  show_results: boolean;
  shuffle_questions: boolean;
  shuffle_choices: boolean;
  max_tab_switches: number;
}

export interface AttemptRecord {
  id: string;
  exam_id: string;
  organization_id: string | null;
  student_name: string;
  student_id: string;
  school_name: string | null;
  grade: string | null;
  started_at: string;
  submitted_at: string | null;
  duration_seconds: number | null;
  score: number | null;
  total_points: number | null;
  tab_switch_count: number;
  is_flagged: boolean;
  status: 'started' | 'submitted' | 'auto_submitted';
}

// ---------------------------------------------------------------------------
// Exam window validation
// ---------------------------------------------------------------------------
export type ExamAvailability =
  | { ok: true }
  | { ok: false; reason: 'not_published' | 'not_open' | 'closed' };

export function checkExamWindow(exam: ExamRecord): ExamAvailability {
  if (!exam.is_published) return { ok: false, reason: 'not_published' };
  const now = Date.now();
  if (exam.open_at && now < new Date(exam.open_at).getTime()) {
    return { ok: false, reason: 'not_open' };
  }
  if (exam.close_at && now > new Date(exam.close_at).getTime()) {
    return { ok: false, reason: 'closed' };
  }
  return { ok: true };
}

/** End time of an attempt = started_at + duration_minutes (server source of truth). */
export function attemptEndsAt(attempt: AttemptRecord, exam: ExamRecord): number {
  return new Date(attempt.started_at).getTime() + exam.duration_minutes * 60_000;
}

// ---------------------------------------------------------------------------
// Load exam by access code (server side)
// ---------------------------------------------------------------------------
export async function getExamByAccessCode(accessCode: string): Promise<ExamRecord | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('exams')
    .select('*')
    .eq('access_code', accessCode)
    .maybeSingle();
  if (error || !data) return null;
  return data as ExamRecord;
}

// ---------------------------------------------------------------------------
// Load the safe (no correct answers) question set for an attempt.
// Question/choice order is shuffled deterministically using the attempt id
// so it stays stable across refreshes.
// ---------------------------------------------------------------------------
export async function getSafeQuestionsForAttempt(
  exam: ExamRecord,
  attemptId: string
): Promise<SafeQuestion[]> {
  const supabase = createAdminClient();

  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, prompt_markdown, image_url, points, order_index')
    .eq('exam_id', exam.id)
    .order('order_index', { ascending: true });

  if (error || !questions) return [];

  const questionIds = questions.map((q) => q.id);
  // IMPORTANT: we deliberately DO NOT select is_correct here.
  const { data: choices } = await supabase
    .from('choices')
    .select('id, question_id, content_markdown, image_url, order_index')
    .in('question_id', questionIds.length ? questionIds : ['00000000-0000-0000-0000-000000000000'])
    .order('order_index', { ascending: true });

  const byQuestion = new Map<string, SafeChoice[]>();
  (choices ?? []).forEach((c) => {
    const list = byQuestion.get(c.question_id) ?? [];
    list.push({
      id: c.id,
      content_markdown: c.content_markdown ?? '',
      image_url: c.image_url ?? null,
      order_index: c.order_index,
    });
    byQuestion.set(c.question_id, list);
  });

  let result: SafeQuestion[] = questions.map((q) => {
    let qChoices = byQuestion.get(q.id) ?? [];
    if (exam.shuffle_choices) {
      qChoices = seededShuffle(qChoices, attemptId + q.id);
    }
    return {
      id: q.id,
      prompt_markdown: q.prompt_markdown,
      image_url: q.image_url,
      points: q.points,
      order_index: q.order_index,
      choices: qChoices,
    };
  });

  if (exam.shuffle_questions) {
    result = seededShuffle(result, attemptId);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Server-side scoring. This is the single source of truth for scores.
// ---------------------------------------------------------------------------
export interface ScoringResult {
  score: number;
  totalPoints: number;
  responses: {
    attempt_id: string;
    question_id: string;
    choice_id: string;
    is_correct: boolean;
    points_awarded: number;
  }[];
}

export async function scoreAttempt(
  examId: string,
  attemptId: string,
  answers: Record<string, string> // questionId -> choiceId
): Promise<ScoringResult> {
  const supabase = createAdminClient();

  // Load all questions (for total points) and their correct choices.
  const { data: questions } = await supabase
    .from('questions')
    .select('id, points')
    .eq('exam_id', examId);

  const { data: choices } = await supabase
    .from('choices')
    .select('id, question_id, is_correct')
    .in(
      'question_id',
      (questions ?? []).map((q) => q.id).length
        ? (questions ?? []).map((q) => q.id)
        : ['00000000-0000-0000-0000-000000000000']
    );

  const pointsByQuestion = new Map<string, number>();
  (questions ?? []).forEach((q) => pointsByQuestion.set(q.id, q.points));

  // Set of correct choice ids
  const correctChoiceIds = new Set(
    (choices ?? []).filter((c) => c.is_correct).map((c) => c.id)
  );
  // Map choice -> question for validation
  const choiceToQuestion = new Map<string, string>();
  (choices ?? []).forEach((c) => choiceToQuestion.set(c.id, c.question_id));

  const totalPoints = (questions ?? []).reduce((sum, q) => sum + q.points, 0);

  let score = 0;
  const responses: ScoringResult['responses'] = [];

  for (const [questionId, choiceId] of Object.entries(answers)) {
    // Make sure the submitted choice actually belongs to the question.
    if (choiceToQuestion.get(choiceId) !== questionId) continue;

    const isCorrect = correctChoiceIds.has(choiceId);
    const pts = isCorrect ? pointsByQuestion.get(questionId) ?? 0 : 0;
    score += pts;
    responses.push({
      attempt_id: attemptId,
      question_id: questionId,
      choice_id: choiceId,
      is_correct: isCorrect,
      points_awarded: pts,
    });
  }

  return { score, totalPoints, responses };
}
