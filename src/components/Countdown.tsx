'use client';

import { useEffect, useState } from 'react';
import { clockString, splitDuration } from '@/lib/format';
import { BAND_STYLE } from '@/lib/status';
import type { UrgencyBand } from '@/lib/types';

/**
 * The ticking clock.
 *
 * State is seeded with `initialMs`, computed on the server, so the first client
 * render is byte-identical and hydration stays quiet. The interval only starts
 * afterwards. Long deadlines tick once a minute rather than once a second —
 * a 3-month countdown repainting 60x more often buys nothing, and a page with
 * thirty of these should not be doing thirty timer callbacks a second.
 */
export function Countdown({
  deadline,
  initialMs,
  band,
  size = 'md',
}: {
  deadline: string;
  initialMs: number;
  band: UrgencyBand;
  size?: 'sm' | 'md' | 'lg';
}) {
  const [ms, setMs] = useState(initialMs);

  useEffect(() => {
    const target = Date.parse(deadline);
    const tick = () => setMs(target - Date.now());
    tick();
    // Under a day, seconds matter. Above it, they are noise.
    const period = Math.abs(target - Date.now()) < 86_400_000 ? 1000 : 30_000;
    const id = setInterval(tick, period);
    return () => clearInterval(id);
  }, [deadline]);

  const { overdue } = splitDuration(ms);
  const s = BAND_STYLE[band];
  const finalHours = !overdue && ms < 6 * 3600_000;

  const text = {
    sm: 'text-[0.78rem]',
    md: 'text-[0.95rem]',
    lg: 'text-2xl sm:text-3xl',
  }[size];

  return (
    <span
      className={`tnum inline-flex items-center gap-2 font-mono font-semibold ${text}`}
      style={{ color: overdue ? BAND_STYLE.broken.softOn : s.softOn }}
      // Screen readers should not have this re-announced every second.
      aria-live="off"
    >
      <span
        className={`size-2 shrink-0 rounded-full ${finalHours || overdue ? 'ticking' : ''}`}
        style={{ background: overdue ? BAND_STYLE.broken.fill : s.fill }}
        aria-hidden
      />
      <span>
        {clockString(ms)}
        <span className="ml-1.5 font-sans text-[0.72em] font-medium opacity-70">
          {overdue ? 'overdue' : 'left'}
        </span>
      </span>
    </span>
  );
}

/**
 * The condensed form used inside dense lists — no ticking dot, no seconds,
 * just the number and whether it has gone past.
 */
export function DeadlineTag({
  msRemaining,
  band,
}: {
  msRemaining: number | null;
  band: UrgencyBand;
}) {
  const s = BAND_STYLE[band];

  // A promise that was delivered has no clock left to run. Showing "21h over"
  // on something already marked kept reads as a failure and is simply wrong.
  if (band === 'kept') {
    return (
      <span
        className="rounded-md px-1.5 py-0.5 text-[0.7rem] font-semibold"
        style={{ background: s.soft, color: s.softOn }}
      >
        delivered
      </span>
    );
  }

  if (msRemaining === null) {
    return (
      <span
        className="rounded-md px-1.5 py-0.5 text-[0.7rem] font-semibold"
        style={{ background: s.soft, color: s.softOn }}
      >
        no deadline
      </span>
    );
  }
  const { days, hours, overdue } = splitDuration(msRemaining);
  const value = days > 0 ? `${days}d` : `${hours}h`;
  return (
    <span
      className="tnum rounded-md px-1.5 py-0.5 font-mono text-[0.7rem] font-semibold"
      style={{ background: s.soft, color: s.softOn }}
    >
      {overdue ? `${value} over` : `${value} left`}
    </span>
  );
}
