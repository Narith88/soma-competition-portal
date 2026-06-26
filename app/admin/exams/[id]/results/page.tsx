import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Flag } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getActiveOrganization } from '@/lib/org';
import { formatDateTime, percentage, formatDuration, attemptDurationSeconds } from '@/lib/utils';
import type { ResultRow } from '@/lib/csv';
import ExportButton from './ExportButton';

export const dynamic = 'force-dynamic';

export default async function ResultsPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const org = await getActiveOrganization();
  const orgId = org?.organization_id ?? '00000000-0000-0000-0000-000000000000';

  const { data: exam } = await supabase
    .from('exams')
    .select('id, title, subject, category_id')
    .eq('id', params.id)
    .eq('organization_id', orgId)
    .maybeSingle();

  if (!exam) notFound();

  let categoryName = '';
  if (exam.category_id) {
    const { data: cat } = await supabase
      .from('categories')
      .select('name')
      .eq('id', exam.category_id)
      .maybeSingle();
    categoryName = cat?.name ?? '';
  }

  const { data: attempts } = await supabase
    .from('attempts')
    .select(
      'id, student_name, student_id, school_name, grade, score, total_points, started_at, submitted_at, duration_seconds, status, tab_switch_count, is_flagged, created_at'
    )
    .eq('exam_id', exam.id)
    .order('created_at', { ascending: false });

  const list = attempts ?? [];

  const rows: ResultRow[] = list.map((a) => ({
    student_name: a.student_name,
    student_id: a.student_id,
    school_name: a.school_name,
    grade: a.grade,
    exam_title: exam.title,
    category: categoryName,
    subject: exam.subject ?? '',
    score: a.score,
    total_points: a.total_points,
    percentage: percentage(Number(a.score ?? 0), Number(a.total_points ?? 0)),
    started_at: a.started_at,
    submitted_at: a.submitted_at,
    duration_seconds: attemptDurationSeconds(a.started_at, a.submitted_at, a.duration_seconds),
    status: a.status,
    tab_switch_count: a.tab_switch_count,
    is_flagged: a.is_flagged,
  }));

  const safeTitle = exam.title.replace(/[^a-z0-9]+/gi, '_').toLowerCase();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/exams"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to exams
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Results</h1>
          <p className="mt-1 text-sm text-slate-500">
            {exam.title} · {list.length} attempt{list.length === 1 ? '' : 's'}
          </p>
        </div>
        <ExportButton rows={rows} filename={`soma_results_${safeTitle}.csv`} />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {list.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">
            No attempts yet for this exam.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">School</th>
                  <th className="px-4 py-3 font-medium">Grade</th>
                  <th className="px-4 py-3 font-medium">Score</th>
                  <th className="px-4 py-3 font-medium">%</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Tabs</th>
                  <th className="px-4 py-3 font-medium">Started</th>
                  <th className="px-4 py-3 font-medium">Submitted</th>
                  <th className="px-4 py-3 font-medium">Duration</th>
                </tr>
              </thead>
              <tbody>
                {list.map((a) => {
                  const pct = percentage(
                    Number(a.score ?? 0),
                    Number(a.total_points ?? 0)
                  );
                  return (
                    <tr key={a.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">
                          {a.student_name}
                        </div>
                        <div className="text-xs text-slate-400">{a.student_id}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{a.school_name ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{a.grade ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {a.score == null ? '—' : `${a.score} / ${a.total_points ?? '—'}`}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {a.score == null ? '—' : `${pct}%`}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1">
                          {a.is_flagged && <Flag className="h-3.5 w-3.5 text-red-500" />}
                          <span
                            className={
                              a.status === 'started'
                                ? 'text-amber-600'
                                : 'text-emerald-600'
                            }
                          >
                            {a.status.replace('_', ' ')}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{a.tab_switch_count}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {formatDateTime(a.started_at)}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {a.submitted_at ? formatDateTime(a.submitted_at) : 'Not submitted'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatDuration(
                          attemptDurationSeconds(a.started_at, a.submitted_at, a.duration_seconds)
                        )}
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
