'use client';

import Link from 'next/link';
import { GraduationCap, ArrowRight, ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/components/LanguageProvider';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function LandingPage() {
  const { t, lang } = useLanguage();

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-7 w-7 text-brand" />
          <span className="font-bold text-brand">{t('appName')}</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/pricing" className="text-sm font-medium text-slate-600 hover:text-brand">
            Pricing
          </Link>
          <LanguageSwitcher />
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-4 py-16 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand text-white shadow-lg">
          <GraduationCap className="h-9 w-9" />
        </div>
        <h1
          className={`text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl ${lang === 'km' ? 'leading-snug' : ''}`}
        >
          {t('appName')}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
          {t('landingDescription')}
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/join"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-7 py-3.5 text-base font-semibold text-white shadow-md transition hover:bg-brand-dark"
          >
            {t('joinExam')}
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-7 py-3.5 text-base font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <ShieldCheck className="h-5 w-5 text-brand" />
            {t('adminLogin')}
          </Link>
        </div>

        <p className="mt-6 text-sm text-slate-500">
          Want to create your own exams?{' '}
          <Link href="/signup" className="font-semibold text-brand hover:underline">
            Create a free account
          </Link>
        </p>
      </section>

      <footer className="mx-auto max-w-5xl px-4 py-8 text-center text-sm text-slate-400">
        © {new Date().getFullYear()} SOMA Education Group
      </footer>
    </main>
  );
}
