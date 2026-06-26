'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';
import ExportButton from './ExportButton';
import type { ResultRow } from '@/lib/csv';

export default function ExportOrUpgrade({
  rows,
  filename,
  allowed,
}: {
  rows: ResultRow[];
  filename: string;
  allowed: boolean;
}) {
  if (allowed) {
    return <ExportButton rows={rows} filename={filename} />;
  }
  return (
    <Link
      href="/admin/billing"
      className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-50"
      title="CSV export is included on Starter and Pro plans"
    >
      <Lock className="h-4 w-4" />
      Export CSV (upgrade)
    </Link>
  );
}
