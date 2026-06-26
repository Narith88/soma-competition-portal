'use client';

import Link from 'next/link';
import { GraduationCap } from 'lucide-react';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function StudentNav({ showSwitcher = true }: { showSwitcher?: boolean }) {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-brand" />
          <span className="font-bold text-brand">SOMA</span>
        </Link>
        {showSwitcher && <LanguageSwitcher />}
      </div>
    </header>
  );
}
