/** Formatting helpers. Deterministic and locale-pinned so SSR and the client
 *  never disagree — a hydration mismatch on a countdown is very visible. */

const FULL_DATE = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Kolkata',
});

const DATE_TIME = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'Asia/Kolkata',
});

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : FULL_DATE.format(d);
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : DATE_TIME.format(d);
}

export interface Parts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  overdue: boolean;
}

export function splitDuration(ms: number): Parts {
  const overdue = ms < 0;
  let s = Math.floor(Math.abs(ms) / 1000);
  const days = Math.floor(s / 86400);
  s -= days * 86400;
  const hours = Math.floor(s / 3600);
  s -= hours * 3600;
  const minutes = Math.floor(s / 60);
  return { days, hours, minutes, seconds: s - minutes * 60, overdue };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** `12d 04:31:07` — monospace-friendly and readable at a glance. */
export function clockString(ms: number): string {
  const { days, hours, minutes, seconds } = splitDuration(ms);
  return days > 0
    ? `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/** Coarse, for cards where a live-ticking clock would be noise. */
export function roughDuration(ms: number): string {
  const { days, hours, minutes } = splitDuration(ms);
  if (days >= 60) return `${Math.round(days / 30)} months`;
  if (days >= 14) return `${Math.round(days / 7)} weeks`;
  if (days >= 1) return `${days} day${days === 1 ? '' : 's'}`;
  if (hours >= 1) return `${hours} hour${hours === 1 ? '' : 's'}`;
  return `${minutes} min`;
}

/** Indian digit grouping — 1,20,000 rather than 120,000. */
export function formatCount(n: number | null): string {
  if (n === null) return '—';
  return new Intl.NumberFormat('en-IN').format(n);
}

export function percent(x: number, digits = 0): string {
  return `${(x * 100).toFixed(digits)}%`;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function titleFromSlug(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
