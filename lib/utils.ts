import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes safely. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a date for display (or a dash if missing). */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return '—';
  }
}

/** Generate a human-friendly access code, e.g. "SOMA-7F3K". */
export function generateAccessCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no confusing 0/O/1/I
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `SOMA-${code}`;
}

/** Compute a percentage (0-100), guarding against divide-by-zero. */
export function percentage(score: number, total: number): number {
  if (!total || total <= 0) return 0;
  return Math.round((score / total) * 10000) / 100;
}

/**
 * Resolve an attempt's duration in seconds. Prefers the stored
 * duration_seconds; otherwise computes it from started_at/submitted_at.
 * Returns null when the attempt was never submitted.
 */
export function attemptDurationSeconds(
  startedAt: string | null | undefined,
  submittedAt: string | null | undefined,
  stored?: number | null
): number | null {
  if (stored != null) return stored;
  if (!startedAt || !submittedAt) return null;
  const start = new Date(startedAt).getTime();
  const end = new Date(submittedAt).getTime();
  if (isNaN(start) || isNaN(end) || end < start) return null;
  return Math.round((end - start) / 1000);
}

/** Format a duration in seconds as "12m 35s" (or "—" / "Not submitted"). */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return 'Not submitted';
  if (seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

/**
 * Deterministic shuffle: same seed always produces the same order.
 * Used so question/choice order stays stable across page refreshes for a
 * given attempt (we seed with the attempt id).
 */
export function seededShuffle<T>(array: T[], seed: string): T[] {
  // Simple string hash -> number
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // Mulberry32 PRNG
  let a = h >>> 0;
  const rand = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
