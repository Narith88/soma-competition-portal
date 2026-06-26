'use client';

import MarkdownMathRenderer from '@/components/MarkdownMathRenderer';
import { cn } from '@/lib/utils';
import type { SafeQuestion } from '@/lib/exam';

interface Props {
  question: SafeQuestion;
  index: number;
  selectedChoiceId: string | undefined;
  onSelect: (choiceId: string) => void;
}

export default function ExamQuestionCard({
  question,
  index,
  selectedChoiceId,
  onSelect,
}: Props) {
  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-start gap-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <MarkdownMathRenderer content={question.prompt_markdown} />
          {question.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={question.image_url}
              alt={`Question ${index + 1} image`}
              className="mt-3 max-h-80 rounded-lg border border-slate-200 object-contain"
            />
          )}
          <p className="mt-2 text-xs text-slate-400">
            {question.points} {question.points === 1 ? 'point' : 'points'}
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {question.choices.map((choice, i) => {
          const selected = selectedChoiceId === choice.id;
          return (
            <button
              key={choice.id}
              type="button"
              onClick={() => onSelect(choice.id)}
              className={cn(
                'flex w-full items-start gap-3 rounded-lg border p-3 text-left transition',
                selected
                  ? 'border-brand bg-brand/5 ring-1 ring-brand'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              )}
              aria-pressed={selected}
            >
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold',
                  selected
                    ? 'border-brand bg-brand text-white'
                    : 'border-slate-300 text-slate-500'
                )}
              >
                {letters[i] ?? i + 1}
              </span>
              <div className="min-w-0 flex-1 space-y-2">
                {choice.content_markdown && (
                  <MarkdownMathRenderer content={choice.content_markdown} />
                )}
                {choice.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={choice.image_url}
                    alt={`Choice ${letters[i] ?? i + 1}`}
                    className="max-h-48 rounded border border-slate-200 object-contain"
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
