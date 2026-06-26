import { getExamByAccessCode, checkExamWindow } from '@/lib/exam';
import StudentNav from '@/components/StudentNav';
import StartForm from './StartForm';
import { AlertTriangle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function StartPage({
  params,
}: {
  params: { accessCode: string };
}) {
  const accessCode = decodeURIComponent(params.accessCode);
  const exam = await getExamByAccessCode(accessCode);

  // Exam not found OR not published -> show a generic unavailable message
  // (we do not reveal whether the code exists, to avoid probing).
  if (!exam || !exam.is_published) {
    return <Unavailable reason="not_found" />;
  }

  const availability = checkExamWindow(exam);
  if (!availability.ok) {
    return <Unavailable reason={availability.reason} />;
  }

  // Count questions for display.
  // (Safe info only — no answers.)
  return (
    <div className="min-h-screen bg-slate-50">
      <StudentNav />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <StartForm
          accessCode={accessCode}
          exam={{
            title: exam.title,
            title_km: exam.title_km,
            description: exam.description,
            instructions: exam.instructions,
            language_mode: exam.language_mode,
            duration_minutes: exam.duration_minutes,
            subject: exam.subject,
          }}
        />
      </main>
    </div>
  );
}

function Unavailable({ reason }: { reason: string }) {
  const messages: Record<string, string> = {
    not_found: 'Invalid access code, or this exam is not available.',
    not_published: 'This exam is not available yet.',
    not_open: 'This exam is not open yet. Please check the start time.',
    closed: 'This exam is now closed.',
  };
  return (
    <div className="min-h-screen bg-slate-50">
      <StudentNav />
      <main className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-7 text-center">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-amber-500" />
          <p className="font-medium text-amber-800">
            {messages[reason] ?? messages.not_found}
          </p>
          <a
            href="/join"
            className="mt-5 inline-block rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white"
          >
            Try another code
          </a>
        </div>
      </main>
    </div>
  );
}
