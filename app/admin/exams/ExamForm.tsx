'use client';

import { useState } from 'react';
import Link from 'next/link';
import { RefreshCw, Save } from 'lucide-react';
import { generateAccessCode } from '@/lib/utils';

export interface ExamDefaults {
  title?: string;
  title_km?: string;
  category_id?: string;
  description?: string;
  instructions?: string;
  language_mode?: 'km' | 'en' | 'bilingual';
  subject?: string;
  difficulty?: string;
  access_code?: string;
  duration_minutes?: number;
  open_at?: string; // datetime-local value
  close_at?: string; // datetime-local value
  is_published?: boolean;
  show_results?: boolean;
  shuffle_questions?: boolean;
  shuffle_choices?: boolean;
  max_tab_switches?: number;
}

interface Category {
  id: string;
  name: string;
}

export default function ExamForm({
  action,
  categories,
  defaults,
  error,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  categories: Category[];
  defaults?: ExamDefaults;
  error?: string;
  submitLabel: string;
}) {
  const [accessCode, setAccessCode] = useState(
    defaults?.access_code ?? generateAccessCode()
  );

  const inputCls =
    'w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30';
  const labelCls = 'mb-1 block text-sm font-medium text-slate-700';

  return (
    <form action={action} className="space-y-8">
      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {/* Basic info */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-slate-900">Basic Information</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelCls}>Title (English) *</label>
            <input name="title" required defaultValue={defaults?.title} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Title (Khmer)</label>
            <input
              name="title_km"
              defaultValue={defaults?.title_km}
              className={`${inputCls} font-khmer`}
            />
          </div>
          <div>
            <label className={labelCls}>Category</label>
            <select
              name="category_id"
              defaultValue={defaults?.category_id ?? ''}
              className={inputCls}
            >
              <option value="">— None —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Subject</label>
            <input
              name="subject"
              defaultValue={defaults?.subject}
              placeholder="e.g. Algebra"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Difficulty</label>
            <input
              name="difficulty"
              defaultValue={defaults?.difficulty}
              placeholder="e.g. Junior / Senior"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Language mode</label>
            <select
              name="language_mode"
              defaultValue={defaults?.language_mode ?? 'bilingual'}
              className={inputCls}
            >
              <option value="bilingual">Bilingual (Khmer + English)</option>
              <option value="km">Khmer</option>
              <option value="en">English</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Description</label>
            <textarea
              name="description"
              rows={2}
              defaultValue={defaults?.description}
              className={inputCls}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Instructions (shown before the exam starts)</label>
            <textarea
              name="instructions"
              rows={3}
              defaultValue={defaults?.instructions}
              className={inputCls}
            />
          </div>
        </div>
      </section>

      {/* Access & timing */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-slate-900">Access &amp; Timing</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Access code *</label>
            <div className="flex gap-2">
              <input
                name="access_code"
                required
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                className={`${inputCls} font-mono`}
              />
              <button
                type="button"
                onClick={() => setAccessCode(generateAccessCode())}
                className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 text-sm text-slate-600 transition hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Students use this code to join the exam.
            </p>
          </div>
          <div>
            <label className={labelCls}>Duration (minutes) *</label>
            <input
              type="number"
              name="duration_minutes"
              min={1}
              required
              defaultValue={defaults?.duration_minutes ?? 30}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Opens at (optional)</label>
            <input
              type="datetime-local"
              name="open_at"
              defaultValue={defaults?.open_at}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Closes at (optional)</label>
            <input
              type="datetime-local"
              name="close_at"
              defaultValue={defaults?.close_at}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Max tab switches before auto-submit</label>
            <input
              type="number"
              name="max_tab_switches"
              min={0}
              defaultValue={defaults?.max_tab_switches ?? 1}
              className={inputCls}
            />
            <p className="mt-1 text-xs text-slate-400">
              Default 1. Leaving the exam tab more than this flags the attempt.
            </p>
          </div>
        </div>
      </section>

      {/* Options */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-slate-900">Options</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle
            name="is_published"
            label="Published"
            hint="Students can join when this is on."
            defaultChecked={defaults?.is_published ?? false}
          />
          <Toggle
            name="show_results"
            label="Show results to students"
            hint="Students see their score after submitting."
            defaultChecked={defaults?.show_results ?? false}
          />
          <Toggle
            name="shuffle_questions"
            label="Shuffle questions"
            defaultChecked={defaults?.shuffle_questions ?? true}
          />
          <Toggle
            name="shuffle_choices"
            label="Shuffle answer choices"
            defaultChecked={defaults?.shuffle_choices ?? true}
          />
        </div>
      </section>

      <div className="flex items-center justify-end gap-3">
        <Link
          href="/admin/exams"
          className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </Link>
        <button
          type="submit"
          className="flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
        >
          <Save className="h-4 w-4" />
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function Toggle({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 transition hover:bg-slate-50">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 h-5 w-5 rounded border-slate-300 text-brand focus:ring-brand"
      />
      <span>
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        {hint && <span className="block text-xs text-slate-400">{hint}</span>}
      </span>
    </label>
  );
}
