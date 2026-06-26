'use client';

import Link from 'next/link';
import { CheckCircle2, EyeOff, Home } from 'lucide-react';
import { useLanguage } from '@/components/LanguageProvider';

interface Props {
  showResults: boolean;
  score: number | null;
  totalPoints: number | null;
  percentage: number;
  autoSubmitted: boolean;
  studentName: string;
}

export default function ResultView({
  showResults,
  score,
  totalPoints,
  percentage,
  autoSubmitted,
  studentName,
}: Props) {
  const { t } = useLanguage();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-green-500" />
      <h1 className="text-2xl font-bold text-slate-900">{t('examSubmitted')}</h1>
      <p className="mt-1 text-slate-600">{t('thankYou')}</p>

      {autoSubmitted && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          {t('examAutoSubmitted')}
        </p>
      )}

      {showResults ? (
        <div className="mt-6 rounded-xl bg-brand/5 p-6">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            {t('yourScore')}
          </p>
          <p className="mt-2 text-4xl font-extrabold text-brand">
            {Number(score ?? 0)}{' '}
            <span className="text-xl font-semibold text-slate-400">
              / {Number(totalPoints ?? 0)} {t('points')}
            </span>
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-700">{percentage}%</p>
        </div>
      ) : (
        <div className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">
          <EyeOff className="h-5 w-5" />
          {t('resultsHidden')}
        </div>
      )}

      <Link
        href="/"
        className="mt-7 inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        <Home className="h-4 w-4" />
        {t('appName')}
      </Link>
    </div>
  );
}
