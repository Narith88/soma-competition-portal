import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { startAttemptSchema } from '@/lib/validations';
import { getExamByAccessCode, checkExamWindow } from '@/lib/exam';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const parsed = startAttemptSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first?.message ?? 'Invalid input.' }, { status: 400 });
  }

  const { access_code, student_name, student_id, school_name, grade } = parsed.data;

  const exam = await getExamByAccessCode(access_code.trim());
  if (!exam) {
    return NextResponse.json({ error: 'Invalid access code.' }, { status: 404 });
  }

  const availability = checkExamWindow(exam);
  if (!availability.ok) {
    const messages: Record<string, string> = {
      not_published: 'This exam is not available yet.',
      not_open: 'This exam is not open yet.',
      closed: 'This exam is now closed.',
    };
    return NextResponse.json({ error: messages[availability.reason] }, { status: 403 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('attempts')
    .insert({
      exam_id: exam.id,
      organization_id: exam.organization_id,
      student_name: student_name.trim(),
      student_id: student_id.trim(),
      school_name: school_name?.trim() || null,
      grade: grade?.trim() || null,
      status: 'started',
    })
    .select('id')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Could not start the exam. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({ attemptId: data.id });
}
