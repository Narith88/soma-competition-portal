'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { examSchema, categorySchema } from '@/lib/validations';
import { getActiveOrganization, canEdit } from '@/lib/org';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function bool(form: FormData, key: string): boolean {
  const v = form.get(key);
  return v === 'on' || v === 'true' || v === '1';
}

function str(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === 'string' ? v.trim() : '';
}

/** Turn an empty string into null (for optional DB columns). */
function orNull(value: string): string | null {
  return value === '' ? null : value;
}

/** Convert a datetime-local string into an ISO string, or null. */
function toIso(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// Create exam
// ---------------------------------------------------------------------------
export async function createExamAction(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const org = await getActiveOrganization();
  if (!org || !canEdit(org.role)) {
    redirect('/admin/exams?error=' + encodeURIComponent('You cannot create exams in this organization.'));
  }

  const raw = {
    title: str(formData, 'title'),
    title_km: str(formData, 'title_km'),
    category_id: str(formData, 'category_id'),
    description: str(formData, 'description'),
    instructions: str(formData, 'instructions'),
    language_mode: str(formData, 'language_mode') || 'bilingual',
    subject: str(formData, 'subject'),
    difficulty: str(formData, 'difficulty'),
    access_code: str(formData, 'access_code'),
    duration_minutes: str(formData, 'duration_minutes'),
    open_at: str(formData, 'open_at'),
    close_at: str(formData, 'close_at'),
    is_published: bool(formData, 'is_published'),
    show_results: bool(formData, 'show_results'),
    shuffle_questions: bool(formData, 'shuffle_questions'),
    shuffle_choices: bool(formData, 'shuffle_choices'),
    max_tab_switches: str(formData, 'max_tab_switches') || '1',
  };

  const parsed = examSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? 'Invalid exam data';
    redirect(`/admin/exams/new?error=${encodeURIComponent(msg)}`);
  }
  const v = parsed.data;

  const { data, error } = await supabase
    .from('exams')
    .insert({
      title: v.title,
      title_km: orNull(v.title_km ?? ''),
      category_id: orNull(v.category_id ?? ''),
      description: orNull(v.description ?? ''),
      instructions: orNull(v.instructions ?? ''),
      language_mode: v.language_mode,
      subject: orNull(v.subject ?? ''),
      difficulty: orNull(v.difficulty ?? ''),
      access_code: v.access_code,
      duration_minutes: v.duration_minutes,
      open_at: toIso(v.open_at ?? ''),
      close_at: toIso(v.close_at ?? ''),
      is_published: v.is_published,
      show_results: v.show_results,
      shuffle_questions: v.shuffle_questions,
      shuffle_choices: v.shuffle_choices,
      max_tab_switches: v.max_tab_switches,
      created_by: user.id,
      organization_id: org.organization_id,
    })
    .select('id')
    .single();

  if (error) {
    const msg =
      error.code === '23505'
        ? 'That access code is already used. Choose another.'
        : error.message;
    redirect(`/admin/exams/new?error=${encodeURIComponent(msg)}`);
  }

  revalidatePath('/admin/exams');
  redirect(`/admin/exams/${data!.id}/questions`);
}

// ---------------------------------------------------------------------------
// Update exam
// ---------------------------------------------------------------------------
export async function updateExamAction(examId: string, formData: FormData) {
  const supabase = createClient();
  const org = await getActiveOrganization();
  if (!org || !canEdit(org.role)) {
    redirect('/admin/exams?error=' + encodeURIComponent('Not authorized.'));
  }

  const raw = {
    title: str(formData, 'title'),
    title_km: str(formData, 'title_km'),
    category_id: str(formData, 'category_id'),
    description: str(formData, 'description'),
    instructions: str(formData, 'instructions'),
    language_mode: str(formData, 'language_mode') || 'bilingual',
    subject: str(formData, 'subject'),
    difficulty: str(formData, 'difficulty'),
    access_code: str(formData, 'access_code'),
    duration_minutes: str(formData, 'duration_minutes'),
    open_at: str(formData, 'open_at'),
    close_at: str(formData, 'close_at'),
    is_published: bool(formData, 'is_published'),
    show_results: bool(formData, 'show_results'),
    shuffle_questions: bool(formData, 'shuffle_questions'),
    shuffle_choices: bool(formData, 'shuffle_choices'),
    max_tab_switches: str(formData, 'max_tab_switches') || '1',
  };

  const parsed = examSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? 'Invalid exam data';
    redirect(`/admin/exams/${examId}/edit?error=${encodeURIComponent(msg)}`);
  }
  const v = parsed.data;

  const { error } = await supabase
    .from('exams')
    .update({
      title: v.title,
      title_km: orNull(v.title_km ?? ''),
      category_id: orNull(v.category_id ?? ''),
      description: orNull(v.description ?? ''),
      instructions: orNull(v.instructions ?? ''),
      language_mode: v.language_mode,
      subject: orNull(v.subject ?? ''),
      difficulty: orNull(v.difficulty ?? ''),
      access_code: v.access_code,
      duration_minutes: v.duration_minutes,
      open_at: toIso(v.open_at ?? ''),
      close_at: toIso(v.close_at ?? ''),
      is_published: v.is_published,
      show_results: v.show_results,
      shuffle_questions: v.shuffle_questions,
      shuffle_choices: v.shuffle_choices,
      max_tab_switches: v.max_tab_switches,
    })
    .eq('id', examId)
    .eq('organization_id', org.organization_id);

  if (error) {
    const msg =
      error.code === '23505'
        ? 'That access code is already used. Choose another.'
        : error.message;
    redirect(`/admin/exams/${examId}/edit?error=${encodeURIComponent(msg)}`);
  }

  revalidatePath('/admin/exams');
  revalidatePath(`/admin/exams/${examId}/edit`);
  redirect('/admin/exams');
}

// ---------------------------------------------------------------------------
// Toggle publish / unpublish
// ---------------------------------------------------------------------------
export async function togglePublishAction(examId: string, publish: boolean) {
  const supabase = createClient();
  const org = await getActiveOrganization();
  if (!org || !canEdit(org.role)) return;
  await supabase
    .from('exams')
    .update({ is_published: publish })
    .eq('id', examId)
    .eq('organization_id', org.organization_id);
  revalidatePath('/admin/exams');
}

// ---------------------------------------------------------------------------
// Delete exam
// ---------------------------------------------------------------------------
export async function deleteExamAction(examId: string) {
  const supabase = createClient();
  const org = await getActiveOrganization();
  if (!org || !canEdit(org.role)) return;
  await supabase
    .from('exams')
    .delete()
    .eq('id', examId)
    .eq('organization_id', org.organization_id);
  revalidatePath('/admin/exams');
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------
export async function createCategoryAction(formData: FormData) {
  const supabase = createClient();
  const org = await getActiveOrganization();
  if (!org || !canEdit(org.role)) {
    redirect('/admin/categories?error=' + encodeURIComponent('Not authorized.'));
  }
  const raw = {
    name: str(formData, 'name'),
    name_km: str(formData, 'name_km'),
    description: str(formData, 'description'),
  };
  const parsed = categorySchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? 'Invalid category';
    redirect(`/admin/categories?error=${encodeURIComponent(msg)}`);
  }
  const v = parsed.data;
  await supabase.from('categories').insert({
    name: v.name,
    name_km: orNull(v.name_km ?? ''),
    description: orNull(v.description ?? ''),
    organization_id: org.organization_id,
  });
  revalidatePath('/admin/categories');
  redirect('/admin/categories');
}

export async function deleteCategoryAction(categoryId: string) {
  const supabase = createClient();
  const org = await getActiveOrganization();
  if (!org || !canEdit(org.role)) return;
  await supabase
    .from('categories')
    .delete()
    .eq('id', categoryId)
    .eq('organization_id', org.organization_id);
  revalidatePath('/admin/categories');
}
