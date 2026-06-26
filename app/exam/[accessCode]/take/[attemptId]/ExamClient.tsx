'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Send } from 'lucide-react';
import Timer from '@/components/Timer';
import ExamQuestionCard from '@/components/ExamQuestionCard';
import MarkdownMathRenderer from '@/components/MarkdownMathRenderer';
import { useLanguage } from '@/components/LanguageProvider';
import type { SafeQuestion } from '@/lib/exam';

interface Props {
  accessCode: string;
  attemptId: string;
  examTitle: string;
  examTitleKm: string | null;
  instructions: string | null;
  endsAt: number;
  maxTabSwitches: number;
  initialTabSwitchCount: number;
  initialFlagged: boolean;
  questions: SafeQuestion[];
}

type Answers = Record<string, string>; // questionId -> choiceId

export default function ExamClient({
  accessCode,
  attemptId,
  examTitle,
  examTitleKm,
  instructions,
  endsAt,
  maxTabSwitches,
  initialTabSwitchCount,
  initialFlagged,
  questions,
}: Props) {
  const router = useRouter();
  const { t, lang } = useLanguage();

  const storageKey = `soma-answers-${attemptId}`;
  const [answers, setAnswers] = useState<Answers>({});
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [tabWarning, setTabWarning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false);
  const flaggedRef = useRef(initialFlagged);

  const displayTitle = lang === 'km' && examTitleKm ? examTitleKm : examTitle;

  // ---- Restore saved answers from localStorage (survives refresh) ----------
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) setAnswers(JSON.parse(saved));
    } catch {
      // ignore
    }
  }, [storageKey]);

  const selectAnswer = (questionId: string, choiceId: string) => {
    setAnswers((prev) => {
      const next = { ...prev, [questionId]: choiceId };
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // ---- Submit (manual or automatic) ----------------------------------------
  const doSubmit = useCallback(
    async (auto: boolean) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);
      try {
        const res = await fetch('/api/attempts/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attempt_id: attemptId, answers, auto }),
        });
        // Whether success or "already submitted", proceed to result page.
        try {
          window.localStorage.removeItem(storageKey);
        } catch {
          // ignore
        }
        router.replace(`/exam/${encodeURIComponent(accessCode)}/result/${attemptId}`);
      } catch {
        // Network error: allow retry.
        submittedRef.current = false;
        setSubmitting(false);
        alert(t('errorGeneric'));
      }
    },
    [accessCode, answers, attemptId, router, storageKey, t]
  );

  // ---- Tab-switch / focus tracking -----------------------------------------
  useEffect(() => {
    const logEvent = async (eventType: string) => {
      if (submittedRef.current) return;
      try {
        const res = await fetch('/api/security-events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attempt_id: attemptId,
            event_type: eventType,
            metadata: { at: new Date().toISOString() },
          }),
        });
        const data = await res.json();
        if (data && typeof data.count === 'number') {
          if (data.flagged) flaggedRef.current = true;
          // Once flagged, a further leave event triggers auto-submit.
          if (data.shouldAutoSubmit) {
            doSubmit(true);
          } else if (eventType === 'tab_hidden' || eventType === 'window_blur') {
            setTabWarning(true);
          }
        }
      } catch {
        // ignore logging failures
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        logEvent('tab_hidden');
      } else {
        logEvent('tab_visible');
      }
    };
    const onBlur = () => logEvent('window_blur');
    const onFocus = () => logEvent('window_focus');

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
    };
  }, [attemptId, doSubmit]);

  const answeredCount = Object.keys(answers).length;
  const progress = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      {/* Sticky header with timer */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold text-slate-900 sm:text-lg">
              {displayTitle}
            </h1>
            <p className="text-xs text-slate-500">
              {answeredCount} / {questions.length} {t('answered')}
            </p>
          </div>
          <Timer endsAt={endsAt} onExpire={() => doSubmit(true)} label={t('timeRemaining')} />
        </div>
        <div className="h-1 w-full bg-slate-100">
          <div className="h-1 bg-brand transition-all" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        {instructions && (
          <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4">
            <MarkdownMathRenderer content={instructions} />
          </div>
        )}

        <div className="space-y-5">
          {questions.map((q, idx) => (
            <ExamQuestionCard
              key={q.id}
              question={q}
              index={idx}
              selectedChoiceId={answers[q.id]}
              onSelect={(choiceId) => selectAnswer(q.id, choiceId)}
            />
          ))}
        </div>

        <button
          onClick={() => setShowSubmitConfirm(true)}
          disabled={submitting}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-4 text-lg font-semibold text-white shadow-md transition hover:bg-brand-dark disabled:opacity-60"
        >
          <Send className="h-5 w-5" />
          {t('submitExam')}
        </button>
      </main>

      {/* Tab-switch warning modal */}
      {tabWarning && (
        <Modal>
          <div className="text-center">
            <AlertTriangle className="mx-auto mb-3 h-12 w-12 text-amber-500" />
            <h2 className="text-lg font-bold text-slate-900">
              {lang === 'km' ? 'ការព្រមាន' : 'Warning'}
            </h2>
            <p className="mt-2 text-sm text-slate-600">{t('tabSwitchWarning')}</p>
            <button
              onClick={() => setTabWarning(false)}
              className="mt-5 w-full rounded-lg bg-brand px-4 py-2.5 font-semibold text-white"
            >
              OK
            </button>
          </div>
        </Modal>
      )}

      {/* Submit confirmation modal */}
      {showSubmitConfirm && (
        <Modal>
          <div className="text-center">
            <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-brand" />
            <h2 className="text-lg font-bold text-slate-900">{t('submitExam')}</h2>
            <p className="mt-2 text-sm text-slate-600">{t('confirmSubmit')}</p>
            <p className="mt-2 text-sm font-medium text-slate-500">
              {answeredCount} / {questions.length} {t('answered')}
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 font-semibold text-slate-700"
              >
                {t('cancel')}
              </button>
              <button
                onClick={() => {
                  setShowSubmitConfirm(false);
                  doSubmit(false);
                }}
                disabled={submitting}
                className="flex-1 rounded-lg bg-brand px-4 py-2.5 font-semibold text-white disabled:opacity-60"
              >
                {submitting ? t('loading') : t('submit')}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">{children}</div>
    </div>
  );
}
