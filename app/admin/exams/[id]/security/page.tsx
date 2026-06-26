import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Flag, ShieldAlert } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getActiveOrganization } from '@/lib/org';
import { formatDateTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const EVENT_LABELS: Record<string, string> = {
  tab_hidden: 'Left tab',
  tab_visible: 'Returned to tab',
  window_blur: 'Window lost focus',
  window_focus: 'Window focused',
};

export default async function SecurityPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const org = await getActiveOrganization();
  const orgId = org?.organization_id ?? '00000000-0000-0000-0000-000000000000';

  const { data: exam } = await supabase
    .from('exams')
    .select('id, title')
    .eq('id', params.id)
    .eq('organization_id', orgId)
    .maybeSingle();

  if (!exam) notFound();

  const { data: attempts } = await supabase
    .from('attempts')
    .select(
      'id, student_name, student_id, score, total_points, tab_switch_count, is_flagged'
    )
    .eq('exam_id', exam.id);

  const attemptMap = new Map(
    (attempts ?? []).map((a) => [a.id, a])
  );
  const attemptIds = (attempts ?? []).map((a) => a.id);

  const { data: events } = await supabase
    .from('security_events')
    .select('id, attempt_id, event_type, metadata, created_at')
    .in(
      'attempt_id',
      attemptIds.length ? attemptIds : ['00000000-0000-0000-0000-000000000000']
    )
    .order('created_at', { ascending: false });

  const list = events ?? [];
  const flaggedCount = (attempts ?? []).filter((a) => a.is_flagged).length;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/exams"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to exams
      </Link>

      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <ShieldAlert className="h-6 w-6 text-brand" />
          Security Logs
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {exam.title} · {flaggedCount} flagged attempt{flaggedCount === 1 ? '' : 's'} ·{' '}
          {list.length} event{list.length === 1 ? '' : 's'}
        </p>
      </div>

      <p className="rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-700">
        These logs record tab and focus changes during exams. They are signals of
        suspicious behavior, not proof of cheating. Use your judgment when reviewing.
      </p>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {list.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">
            No security events recorded.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Score</th>
                  <th className="px-4 py-3 font-medium">Tabs</th>
                  <th className="px-4 py-3 font-medium">Flagged</th>
                  <th className="px-4 py-3 font-medium">Event</th>
                  <th className="px-4 py-3 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {list.map((ev) => {
                  const a = attemptMap.get(ev.attempt_id);
                  return (
                    <tr key={ev.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">
                          {a?.student_name ?? '—'}
                        </div>
                        <div className="text-xs text-slate-400">
                          {a?.student_id ?? ''}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {a?.score == null ? '—' : `${a.score} / ${a.total_points ?? '—'}`}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {a?.tab_switch_count ?? 0}
                      </td>
                      <td className="px-4 py-3">
                        {a?.is_flagged ? (
                          <span className="inline-flex items-center gap-1 text-red-600">
                            <Flag className="h-3.5 w-3.5" />
                            Flagged
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {EVENT_LABELS[ev.event_type] ?? ev.event_type}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {formatDateTime(ev.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
