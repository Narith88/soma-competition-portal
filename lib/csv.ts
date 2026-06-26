import Papa from 'papaparse';
import { formatDuration } from '@/lib/utils';

export interface ResultRow {
  student_name: string;
  student_id: string;
  school_name: string | null;
  grade: string | null;
  exam_title: string;
  category: string;
  subject: string;
  score: number | null;
  total_points: number | null;
  percentage: number;
  started_at: string | null;
  submitted_at: string | null;
  duration_seconds: number | null;
  status: string;
  tab_switch_count: number;
  is_flagged: boolean;
}

/**
 * Build a CSV string compatible with Excel and Google Sheets.
 * We prepend a UTF-8 BOM so Excel correctly renders Khmer/Unicode text.
 */
export function buildResultsCsv(rows: ResultRow[]): string {
  const data = rows.map((r) => ({
    'Student Name': r.student_name,
    'Student ID': r.student_id,
    School: r.school_name ?? '',
    Grade: r.grade ?? '',
    'Exam Title': r.exam_title,
    Category: r.category,
    Subject: r.subject,
    Score: r.score ?? '',
    'Total Points': r.total_points ?? '',
    Percentage: `${r.percentage}%`,
    'Started At': r.started_at ?? '',
    'Submitted At': r.submitted_at ?? '',
    'Duration Seconds': r.duration_seconds ?? '',
    'Duration Formatted': formatDuration(r.duration_seconds),
    Status: r.status,
    'Tab Switch Count': r.tab_switch_count,
    'Flagged Status': r.is_flagged ? 'FLAGGED' : 'OK',
  }));

  const csv = Papa.unparse(data, { quotes: true });
  const BOM = '\uFEFF';
  return BOM + csv;
}

/** Trigger a browser download of a CSV string. */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
