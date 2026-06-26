'use client';

import { useState } from 'react';
import {
  Plus,
  Trash2,
  Save,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import MarkdownMathRenderer from '@/components/MarkdownMathRenderer';
import ImageInput from '@/components/ImageInput';
import { saveQuestionAction, deleteQuestionAction } from './actions';

export interface EditorChoice {
  content_markdown: string;
  image_url: string;
  is_correct: boolean;
}
export interface EditorQuestion {
  id?: string;
  prompt_markdown: string;
  image_url: string;
  points: number;
  order_index: number;
  choices: EditorChoice[];
}

let keyCounter = 0;
const nextKey = () => `q_${Date.now()}_${keyCounter++}`;

function blankChoice(is_correct = false): EditorChoice {
  return { content_markdown: '', image_url: '', is_correct };
}

export default function QuestionEditor({
  examId,
  initialQuestions,
}: {
  examId: string;
  initialQuestions: EditorQuestion[];
}) {
  const [items, setItems] = useState(
    initialQuestions.map((q) => ({ ...q, _key: nextKey() }))
  );

  const addQuestion = () => {
    setItems((prev) => [
      ...prev,
      {
        _key: nextKey(),
        prompt_markdown: '',
        image_url: '',
        points: 1,
        order_index: prev.length,
        choices: [blankChoice(true), blankChoice(false)],
      },
    ]);
  };

  const removeFromList = (key: string) =>
    setItems((prev) => prev.filter((q) => q._key !== key));

  const setId = (key: string, id: string) =>
    setItems((prev) => prev.map((q) => (q._key === key ? { ...q, id } : q)));

  return (
    <div className="space-y-5">
      {items.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          No questions yet. Add your first question below.
        </div>
      )}

      {items.map((q, idx) => (
        <QuestionCard
          key={q._key}
          examId={examId}
          number={idx + 1}
          initial={q}
          onRemoved={() => removeFromList(q._key)}
          onSavedNew={(id) => setId(q._key, id)}
        />
      ))}

      <button
        onClick={addQuestion}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white py-4 text-sm font-semibold text-slate-600 transition hover:border-brand hover:text-brand"
      >
        <Plus className="h-5 w-5" />
        Add Question
      </button>
    </div>
  );
}

function QuestionCard({
  examId,
  number,
  initial,
  onRemoved,
  onSavedNew,
}: {
  examId: string;
  number: number;
  initial: EditorQuestion & { id?: string };
  onRemoved: () => void;
  onSavedNew: (id: string) => void;
}) {
  const [id, setLocalId] = useState<string | undefined>(initial.id);
  const [prompt, setPrompt] = useState(initial.prompt_markdown);
  const [imageUrl, setImageUrl] = useState(initial.image_url);
  const [points, setPoints] = useState(initial.points);
  const [choices, setChoices] = useState<EditorChoice[]>(
    initial.choices.length ? initial.choices : [blankChoice(true), blankChoice(false)]
  );
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null
  );

  const inputCls =
    'w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30';

  const updateChoice = (i: number, patch: Partial<EditorChoice>) =>
    setChoices((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

  const setCorrect = (i: number) =>
    setChoices((prev) => prev.map((c, idx) => ({ ...c, is_correct: idx === i })));

  const addChoice = () => setChoices((prev) => [...prev, blankChoice(false)]);

  const removeChoice = (i: number) =>
    setChoices((prev) => (prev.length <= 2 ? prev : prev.filter((_, idx) => idx !== i)));

  const onSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const result = await saveQuestionAction(examId, {
        id,
        prompt_markdown: prompt,
        image_url: imageUrl,
        points,
        order_index: number - 1,
        choices,
      });
      if (result.ok) {
        if (!id) {
          setLocalId(result.id);
          onSavedNew(result.id);
        }
        setMessage({ type: 'ok', text: 'Saved.' });
      } else {
        setMessage({ type: 'err', text: result.error });
      }
    } catch {
      setMessage({ type: 'err', text: 'Could not save. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!id) {
      onRemoved();
      return;
    }
    setSaving(true);
    const result = await deleteQuestionAction(examId, id);
    setSaving(false);
    if (result.ok) {
      onRemoved();
    } else {
      setMessage({ type: 'err', text: result.error });
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
            {number}
          </span>
          <span className="text-sm font-medium text-slate-500">
            {id ? 'Saved question' : 'New question (unsaved)'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            value={points}
            onChange={(e) => setPoints(Math.max(1, Number(e.target.value) || 1))}
            className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-center text-sm"
            title="Points"
          />
          <span className="text-xs text-slate-400">pts</span>
        </div>
      </div>

      {/* Prompt */}
      <label className="mb-1 block text-sm font-medium text-slate-700">
        Question (Markdown + LaTeX with $...$ and $$...$$)
      </label>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={3}
        placeholder={'Solve for $x$: $2x+3=7$'}
        className={`${inputCls} font-khmer`}
      />

      <button
        type="button"
        onClick={() => setShowPreview((s) => !s)}
        className="mt-2 flex items-center gap-1.5 text-xs font-medium text-brand hover:underline"
      >
        {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        {showPreview ? 'Hide preview' : 'Show preview'}
      </button>

      {showPreview && (
        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <MarkdownMathRenderer content={prompt} />
          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt="Question"
              className="mt-3 max-h-64 rounded-lg border border-slate-200"
            />
          )}
        </div>
      )}

      {/* Question image */}
      <div className="mt-4">
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Question image (optional) — paste, upload, or enter an image URL
        </label>
        <ImageInput value={imageUrl} onChange={setImageUrl} kind="questions" />
      </div>

      {/* Choices */}
      <div className="mt-5">
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Answer choices (select the correct one)
        </label>
        <div className="space-y-4">
          {choices.map((c, i) => (
            <div
              key={i}
              className="rounded-lg border border-slate-200 p-3"
            >
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={() => setCorrect(i)}
                  className={`mt-1.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
                    c.is_correct
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : 'border-slate-300 text-transparent hover:border-emerald-400'
                  }`}
                  title="Mark as correct"
                >
                  <CheckCircle2 className="h-4 w-4" />
                </button>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-400">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <input
                      value={c.content_markdown}
                      onChange={(e) =>
                        updateChoice(i, { content_markdown: e.target.value })
                      }
                      placeholder="Choice text (Markdown + $math$). Optional if using an image."
                      className={`${inputCls} font-khmer`}
                    />
                  </div>

                  {/* Choice image */}
                  <ImageInput
                    value={c.image_url}
                    onChange={(url) => updateChoice(i, { image_url: url })}
                    kind="choices"
                    compact
                  />

                  {/* Choice live preview */}
                  {(c.content_markdown || c.image_url) && (
                    <div className="rounded-md border border-slate-100 bg-slate-50 p-2">
                      {c.content_markdown && (
                        <MarkdownMathRenderer content={c.content_markdown} />
                      )}
                      {c.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.image_url}
                          alt={`Choice ${String.fromCharCode(65 + i)}`}
                          className="mt-2 max-h-40 rounded border border-slate-200"
                        />
                      )}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeChoice(i)}
                  disabled={choices.length <= 2}
                  className="mt-1 rounded-lg p-1.5 text-slate-400 transition hover:text-red-500 disabled:opacity-30"
                  title="Remove choice"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addChoice}
          className="mt-3 flex items-center gap-1 text-xs font-medium text-brand hover:underline"
        >
          <Plus className="h-3.5 w-3.5" />
          Add choice
        </button>
      </div>

      {/* Footer */}
      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
        {message ? (
          <span
            className={`text-sm ${
              message.type === 'ok' ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            {message.text}
          </span>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDelete}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
