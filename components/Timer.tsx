'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  /** Absolute end time in epoch milliseconds (computed on the server). */
  endsAt: number;
  /** Called once when the timer reaches zero. */
  onExpire: () => void;
  label: string;
}

function format(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function Timer({ endsAt, onExpire, label }: Props) {
  const [remaining, setRemaining] = useState<number>(endsAt - Date.now());
  const [expiredFired, setExpiredFired] = useState(false);

  useEffect(() => {
    const tick = () => {
      const left = endsAt - Date.now();
      setRemaining(left);
      if (left <= 0 && !expiredFired) {
        setExpiredFired(true);
        onExpire();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endsAt, expiredFired]);

  const warning = remaining <= 60_000; // last minute
  const caution = remaining <= 5 * 60_000; // last 5 minutes

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-lg px-3 py-2 font-mono text-lg font-semibold tabular-nums',
        warning
          ? 'bg-red-100 text-red-700 animate-pulse'
          : caution
            ? 'bg-amber-100 text-amber-800'
            : 'bg-brand/10 text-brand'
      )}
      role="timer"
      aria-label={label}
    >
      <Clock className="h-5 w-5" aria-hidden />
      <span>{format(remaining)}</span>
    </div>
  );
}
