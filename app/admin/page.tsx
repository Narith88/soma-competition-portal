import Link from 'next/link';
import {
  FileText,
  CheckCircle2,
  Users,
  Percent,
  Flag,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getActiveOrganization } from '@/lib/org';
import { formatDateTime, percentage } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const supabase = createClient();
  const org = await getActiveOrganization();
  const orgId = org?.organization_id ?? '00000000-0000-0000-0000-000000000000';

  // Exams (current organization only)
  const { data: exams } = await supabase
    .from('exams')
    .select('id, title, is_published')
    .eq('organization_id', orgId);
  const totalExams = exams?.length ?? 0;
  const publishedExams = exams?.filter((e) => e.is_published).length ?? 0;

  // Attempts (current organization only)
  const { data: attempts } = await supabase
    .from('attempts')
    .select(
      'id, student_name, student_id, score, total_points, status, is_flagged, submitted_at, created_at, exam_id'
    )
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  const allAttempts = attempts ?? [];
  const totalAttempts = allAttempts.length;
  const flaggedAttempts = allAttempts.filter((a) => a.is_flagged).length;

  const scored = allAttempts.filter(
    (a) => a.score != null && a.total_points != null && Number(a.total_points) > 0
  );
  const avgPct =
    scored.length > 0
      ? Math.round(
          scored.reduce(
            (sum, a) =>
              sum + percentage(Number(a.score), Number(a.total_points)),
            0
          ) / scored.length
        )
      : null;

  // Map exam id -> title for recent attempts table
  const examTitle = new Map<string, string>();
  (exams ?? []).forEach((e) => examTitle.set(e.id, e.title));

  const recent = allAttempts.slice(0, 8);

  const stats = [
    { label: 'Total Exams', value: totalExams, icon: FileText, color: 'text-brand' },
    { label: 'Published', value: publishedExams, icon: CheckCircle2, color: 'text-emerald-600' },
    { label: 'Total Attempts', value: totalAttempts, icon: Users, color: 'text-blue-600' },
    {
      label: 'Average Score',
      value: avgPct == null ? '—' : `${avgPct}%`,
      icon: Percent,
      color: 'text-amber-600',
    },
    { label: 'Flagged', value: flaggedAttempts, icon: Flag, color: 'text-red-600' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            {org ? `${org.name} — ` : ''}Overview of your competitions and student activity.
          </p>
        </div>
        <Link
          href="/admin/exams/new"
          className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
        >
          <Plus className="h-4 w-4" />
          New Exam
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <Icon className={`h-5 w-5 ${s.color}`} />
              <div className="mt-3 text-2xl font-bold text-slate-900">{s.value}</div>
              <div className="text-xs text-slate-500">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Recent attempts */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Recent Attempts</h2>
          <Link
            href="/admin/exams"
            className="flex items-center gap-1 text-sm text-brand hover:underline"
          >
            All exams <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {recent.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">
            No attempts yet. Create an exam and share its access code to get started.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-medium">Student</th>
                  <th className="px-5 py-3 font-medium">Exam</th>
                  <th className="px-5 py-3 font-medium">Score</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((a) => {
                  const pct =
                    a.score != null && a.total_points != null
                      ? percentage(Number(a.score), Number(a.total_points))
                      : null;
                  return (
                    <tr key={a.id} className="border-t border-slate-100">
                      <td className="px-5 py-3">
                        <div className="font-medium text-slate-900">{a.student_name}</div>
                        <div className="text-xs text-slate-400">{a.student_id}</div>
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        {examTitle.get(a.exam_id) ?? '—'}
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        {pct == null ? '—' : `${pct}%`}
                      </td>
                      <td className="px-5 py-3">
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
                      <td className="px-5 py-3 text-slate-500">
                        {formatDateTime(a.submitted_at)}
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
