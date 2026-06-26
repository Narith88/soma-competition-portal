import Link from 'next/link';
import {
  Plus,
  Pencil,
  ListChecks,
  BarChart3,
  ShieldAlert,
  Eye,
  EyeOff,
  Trash2,
  FolderOpen,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getActiveOrganization } from '@/lib/org';
import { formatDateTime } from '@/lib/utils';
import { togglePublishAction, deleteExamAction } from './actions';

export const dynamic = 'force-dynamic';

interface ExamRow {
  id: string;
  title: string;
  access_code: string;
  subject: string | null;
  is_published: boolean;
  duration_minutes: number;
  created_at: string;
  category_id: string | null;
}

export default async function ExamsListPage() {
  const supabase = createClient();
  const org = await getActiveOrganization();
  const orgId = org?.organization_id ?? '00000000-0000-0000-0000-000000000000';

  const { data: exams } = await supabase
    .from('exams')
    .select('id, title, access_code, subject, is_published, duration_minutes, created_at, category_id')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .eq('organization_id', orgId);
  const catName = new Map<string, string>();
  (categories ?? []).forEach((c) => catName.set(c.id, c.name));

  const rows = (exams ?? []) as ExamRow[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Exams</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create and manage your competition exams.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/categories"
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <FolderOpen className="h-4 w-4" />
            Categories
          </Link>
          <Link
            href="/admin/exams/new"
            className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            <Plus className="h-4 w-4" />
            New Exam
          </Link>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-slate-500">No exams yet.</p>
          <Link
            href="/admin/exams/new"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            <Plus className="h-4 w-4" />
            Create your first exam
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((exam) => (
            <div
              key={exam.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-slate-900">{exam.title}</h2>
                    {exam.is_published ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        Published
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                        Draft
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span>
                      Code:{' '}
                      <span className="font-mono font-medium text-slate-700">
                        {exam.access_code}
                      </span>
                    </span>
                    {exam.category_id && catName.get(exam.category_id) && (
                      <span>{catName.get(exam.category_id)}</span>
                    )}
                    {exam.subject && <span>{exam.subject}</span>}
                    <span>{exam.duration_minutes} min</span>
                    <span>Created {formatDateTime(exam.created_at)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                <Link
                  href={`/admin/exams/${exam.id}/questions`}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
                >
                  <ListChecks className="h-4 w-4" />
                  Questions
                </Link>
                <Link
                  href={`/admin/exams/${exam.id}/edit`}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </Link>
                <Link
                  href={`/admin/exams/${exam.id}/results`}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
                >
                  <BarChart3 className="h-4 w-4" />
                  Results
                </Link>
                <Link
                  href={`/admin/exams/${exam.id}/security`}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
                >
                  <ShieldAlert className="h-4 w-4" />
                  Security
                </Link>

                <div className="ml-auto flex items-center gap-2">
                  <form action={togglePublishAction.bind(null, exam.id, !exam.is_published)}>
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      {exam.is_published ? (
                        <>
                          <EyeOff className="h-4 w-4" />
                          Unpublish
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4" />
                          Publish
                        </>
                      )}
                    </button>
                  </form>
                  <form action={deleteExamAction.bind(null, exam.id)}>
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
