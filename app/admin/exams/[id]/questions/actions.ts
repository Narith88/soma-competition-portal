'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { questionSchema } from '@/lib/validations';
import { getActiveOrganization, canEdit } from '@/lib/org';

interface QuestionPayload {
  id?: string;
  prompt_markdown: string;
  image_url: string;
  points: number;
  order_index: number;
  choices: { content_markdown: string; image_url: string; is_correct: boolean }[];
}

type ActionResult = { ok: true; id: string } | { ok: false; error: string };

/**
 * Verify the caller is an editor of the active organization AND that the exam
 * belongs to that organization. Returns the supabase client + org id, or null.
 */
async function requireExamAccess(examId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const org = await getActiveOrganization();
  if (!org || !canEdit(org.role)) return null;

  const { data: exam } = await supabase
    .from('exams')
    .select('id')
    .eq('id', examId)
    .eq('organization_id', org.organization_id)
    .maybeSingle();
  if (!exam) return null;

  return supabase;
}

/**
 * Create or update a question together with its answer choices.
 * On update we fully replace the question's choices (simplest reliable approach
 * for the MVP). Avoid editing questions after students have started an attempt.
 */
export async function saveQuestionAction(
  examId: string,
  payload: QuestionPayload
): Promise<ActionResult> {
  const supabase = await requireExamAccess(examId);
  if (!supabase) return { ok: false, error: 'Not authorized.' };

  const parsed = questionSchema.safeParse({
    prompt_markdown: payload.prompt_markdown,
    image_url: payload.image_url,
    points: payload.points,
    order_index: payload.order_index,
    choices: payload.choices,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? 'Invalid question.' };
  }
  const v = parsed.data;
  const imageUrl = v.image_url && v.image_url !== '' ? v.image_url : null;

  let questionId: string;

  if (payload.id) {
    questionId = payload.id;
    const { error: upErr } = await supabase
      .from('questions')
      .update({
        prompt_markdown: v.prompt_markdown,
        image_url: imageUrl,
        points: v.points,
        order_index: v.order_index,
      })
      .eq('id', questionId)
      .eq('exam_id', examId);
    if (upErr) return { ok: false, error: upErr.message };

    // Replace choices.
    await supabase.from('choices').delete().eq('question_id', questionId);
  } else {
    const { data: inserted, error: insErr } = await supabase
      .from('questions')
      .insert({
        exam_id: examId,
        prompt_markdown: v.prompt_markdown,
        image_url: imageUrl,
        points: v.points,
        order_index: v.order_index,
      })
      .select('id')
      .single();
    if (insErr || !inserted) {
      return { ok: false, error: insErr?.message ?? 'Could not create question.' };
    }
    questionId = inserted.id;
  }

  const choiceRows = v.choices.map((c, idx) => ({
    question_id: questionId,
    content_markdown: c.content_markdown ?? '',
    image_url: c.image_url && c.image_url !== '' ? c.image_url : null,
    is_correct: c.is_correct,
    order_index: idx,
  }));
  const { error: chErr } = await supabase.from('choices').insert(choiceRows);
  if (chErr) return { ok: false, error: chErr.message };

  revalidatePath(`/admin/exams/${examId}/questions`);
  return { ok: true, id: questionId };
}

export async function deleteQuestionAction(
  examId: string,
  questionId: string
): Promise<ActionResult> {
  const supabase = await requireExamAccess(examId);
  if (!supabase) return { ok: false, error: 'Not authorized.' };

  const { error } = await supabase
    .from('questions')
    .delete()
    .eq('id', questionId)
    .eq('exam_id', examId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/admin/exams/${examId}/questions`);
  return { ok: true, id: questionId };
}
