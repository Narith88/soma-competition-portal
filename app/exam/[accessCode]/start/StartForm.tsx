'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Clock, Play } from 'lucide-react';
import { startAttemptSchema, type StartAttemptValues } from '@/lib/validations';
import { useLanguage } from '@/components/LanguageProvider';
import MarkdownMathRenderer from '@/components/MarkdownMathRenderer';

interface ExamInfo {
  title: string;
  title_km: string | null;
  description: string | null;
  instructions: string | null;
  language_mode: 'km' | 'en' | 'bilingual';
  duration_minutes: number;
  subject: string | null;
}

export default function StartForm({
  accessCode,
  exam,
}: {
  accessCode: string;
  exam: ExamInfo;
}) {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const [serverError, setServerError] = useState<string | null>(null);

  const displayTitle =
    lang === 'km' && exam.title_km ? exam.title_km : exam.title;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StartAttemptValues>({
    resolver: zodResolver(startAttemptSchema),
    defaultValues: { access_code: accessCode },
  });

  const onSubmit = async (values: StartAttemptValues) => {
    setServerError(null);
    try {
      const res = await fetch('/api/attempts/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, access_code: accessCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.error || t('errorGeneric'));
        return;
      }
      router.push(`/exam/${encodeURIComponent(accessCode)}/take/${data.attemptId}`);
    } catch {
      setServerError(t('errorGeneric'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Exam header card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">{displayTitle}</h1>
        {exam.subject && (
          <p className="mt-1 text-sm font-medium text-brand">{exam.subject}</p>
        )}
        <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-brand/10 px-3 py-1.5 text-sm font-medium text-brand">
          <Clock className="h-4 w-4" />
          {exam.duration_minutes} {t('minutes')}
        </div>

        {exam.description && (
          <div className="mt-4 text-slate-700">
            <MarkdownMathRenderer content={exam.description} />
          </div>
        )}

        {exam.instructions && (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">
              {t('instructions')}
            </h2>
            <MarkdownMathRenderer content={exam.instructions} />
          </div>
        )}
      </div>

      {/* Student info form */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h2 className="mb-4 text-lg font-bold text-slate-900">{t('studentInformation')}</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={`${t('fullName')} *`} error={errors.student_name?.message}>
            <input
              {...register('student_name')}
              className="input"
              autoComplete="name"
            />
          </Field>
          <Field label={`${t('studentId')} *`} error={errors.student_id?.message}>
            <input {...register('student_id')} className="input" autoComplete="off" />
          </Field>
          <Field label={t('schoolName')} error={errors.school_name?.message}>
            <input {...register('school_name')} className="input" />
          </Field>
          <Field label={t('gradeClass')} error={errors.grade?.message}>
            <input {...register('grade')} className="input" />
          </Field>
        </div>

        {serverError && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {serverError}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
        >
          {isSubmitting ? t('loading') : t('startExam')}
          {!isSubmitting && <Play className="h-5 w-5" />}
        </button>
      </form>

      <style jsx>{`
        :global(.input) {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid rgb(203 213 225);
          padding: 0.625rem 0.75rem;
          outline: none;
        }
        :global(.input:focus) {
          border-color: rgb(var(--brand));
          box-shadow: 0 0 0 3px rgb(var(--brand) / 0.25);
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      {children}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
