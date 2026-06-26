'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, KeyRound } from 'lucide-react';
import { joinSchema, type JoinFormValues } from '@/lib/validations';
import { useLanguage } from '@/components/LanguageProvider';
import StudentNav from '@/components/StudentNav';
import { createClient } from '@/lib/supabase/client';

export default function JoinPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<JoinFormValues>({ resolver: zodResolver(joinSchema) });

  const onSubmit = async (values: JoinFormValues) => {
    setServerError(null);
    const code = values.access_code.trim();

    // Quick client-side existence check using the anon key. RLS blocks reading
    // exam rows directly, so we confirm validity on the server start page; here
    // we simply forward to the start page which performs the real validation.
    // We still verify the code is non-empty before navigating.
    try {
      const supabase = createClient();
      // Touch the session to ensure the client initializes (no-op if anonymous).
      await supabase.auth.getSession();
    } catch {
      // ignore
    }

    router.push(`/exam/${encodeURIComponent(code)}/start`);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <StudentNav />
      <main className="mx-auto max-w-md px-4 py-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <KeyRound className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">{t('enterAccessCode')}</h1>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {t('accessCode')}
              </label>
              <input
                {...register('access_code')}
                placeholder="SOMA-XXXXXX"
                autoComplete="off"
                autoCapitalize="characters"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-lg uppercase tracking-wider outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
              />
              {errors.access_code && (
                <p className="mt-1 text-sm text-red-600">{errors.access_code.message}</p>
              )}
            </div>

            {serverError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{serverError}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
            >
              {isSubmitting ? t('loading') : t('continueBtn')}
              {!isSubmitting && <ArrowRight className="h-5 w-5" />}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
