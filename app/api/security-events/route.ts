import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { securityEventSchema } from '@/lib/validations';
import type { AttemptRecord } from '@/lib/exam';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const parsed = securityEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input.' }, { status: 400 });
  }

  const { attempt_id, event_type, metadata } = parsed.data;
  const supabase = createAdminClient();

  // Load attempt to read current count / flag / max.
  const { data: attemptData } = await supabase
    .from('attempts')
    .select('id, exam_id, tab_switch_count, is_flagged, status')
    .eq('id', attempt_id)
    .maybeSingle();

  const attempt = attemptData as Pick<
    AttemptRecord,
    'id' | 'exam_id' | 'tab_switch_count' | 'is_flagged' | 'status'
  > | null;

  if (!attempt) {
    return NextResponse.json({ error: 'Attempt not found.' }, { status: 404 });
  }

  // Always log the raw event.
  await supabase.from('security_events').insert({
    attempt_id,
    event_type,
    metadata: metadata ?? null,
  });

  // If already submitted, do not modify counts.
  if (attempt.status !== 'started') {
    return NextResponse.json({
      count: attempt.tab_switch_count,
      flagged: attempt.is_flagged,
      shouldAutoSubmit: false,
    });
  }

  // We count only "tab_hidden" as a switch to avoid double-counting the
  // blur event that fires at the same time.
  const isLeaveEvent = event_type === 'tab_hidden';
  if (!isLeaveEvent) {
    return NextResponse.json({
      count: attempt.tab_switch_count,
      flagged: attempt.is_flagged,
      shouldAutoSubmit: false,
    });
  }

  // Read the exam's max tab switches.
  const { data: examData } = await supabase
    .from('exams')
    .select('max_tab_switches')
    .eq('id', attempt.exam_id)
    .maybeSingle();
  const maxSwitches = examData?.max_tab_switches ?? 1;

  const wasFlagged = attempt.is_flagged;
  const newCount = attempt.tab_switch_count + 1;
  const nowFlagged = wasFlagged || newCount > maxSwitches;

  await supabase
    .from('attempts')
    .update({ tab_switch_count: newCount, is_flagged: nowFlagged })
    .eq('id', attempt_id);

  // If the student was ALREADY flagged before this event and left again,
  // signal the client to auto-submit.
  const shouldAutoSubmit = wasFlagged;

  return NextResponse.json({
    count: newCount,
    flagged: nowFlagged,
    shouldAutoSubmit,
  });
}
