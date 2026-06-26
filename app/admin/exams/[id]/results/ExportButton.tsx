'use client';

import { Download } from 'lucide-react';
import { buildResultsCsv, downloadCsv, type ResultRow } from '@/lib/csv';

export default function ExportButton({
  rows,
  filename,
}: {
  rows: ResultRow[];
  filename: string;
}) {
  const onClick = () => {
    const csv = buildResultsCsv(rows);
    downloadCsv(filename, csv);
  };

  return (
    <button
      onClick={onClick}
      disabled={rows.length === 0}
      className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
    >
      <Download className="h-4 w-4" />
      Export CSV
    </button>
  );
}
