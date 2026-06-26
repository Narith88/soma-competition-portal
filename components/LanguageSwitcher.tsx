'use client';

import { Languages } from 'lucide-react';
import { useLanguage } from '@/components/LanguageProvider';
import { LANGUAGES } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export default function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang } = useLanguage();

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm',
        className
      )}
    >
      <Languages className="ml-1 h-4 w-4 text-slate-400" aria-hidden />
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => setLang(l.code)}
          className={cn(
            'rounded-full px-3 py-1 text-sm font-medium transition',
            lang === l.code
              ? 'bg-brand text-white'
              : 'text-slate-600 hover:bg-slate-100'
          )}
          aria-pressed={lang === l.code}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
