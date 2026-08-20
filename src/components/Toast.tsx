'use client';

import { Toaster as Sonner, toast } from 'sonner';

/**
 * Toast notifications.
 *
 * Sonner rather than a hand-rolled one: it already solves the parts that are
 * tedious and easy to get subtly wrong — an aria-live region that announces
 * once without re-announcing on every re-render, focus never being stolen,
 * stacking, swipe-to-dismiss, and honouring `prefers-reduced-motion`.
 *
 * Themed to the design tokens rather than left on its defaults. The surface
 * palette is warm paper and near-black ink; Sonner's stock white-on-grey reads
 * as a different product pasted on top.
 *
 * Colour never carries the meaning alone here either — success and failure get
 * a left border AND an icon AND wording, for the same reason the public state
 * model does.
 */
export function Toaster() {
  return (
    <Sonner
      position="bottom-center"
      // Long enough to read a sentence in a second language, short enough not
      // to sit over the thing the reader just pressed.
      duration={5000}
      closeButton
      toastOptions={{
        style: {
          background: 'var(--surface)',
          color: 'var(--ink)',
          border: '1px solid var(--line-strong)',
          borderRadius: '0.75rem',
          boxShadow: 'var(--shadow-lg)',
          fontFamily: 'var(--font-sans)',
          fontSize: '0.875rem',
        },
        classNames: {
          description: 'toast-description',
          actionButton: 'toast-action',
        },
      }}
      icons={{
        success: (
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
            <circle cx="8" cy="8" r="7" fill="var(--band-kept)" />
            <path
              d="M4.8 8.2l2.1 2.1 4.3-4.4"
              fill="none"
              stroke="#fff"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ),
        error: (
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
            <circle cx="8" cy="8" r="7" fill="var(--band-broken)" />
            <path
              d="M8 4.4v4.2M8 11.2v.6"
              stroke="#fff"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        ),
        info: (
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
            <circle cx="8" cy="8" r="7" fill="var(--ink-3)" />
            <path
              d="M8 7.2v4.4M8 4.6v.6"
              stroke="#fff"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        ),
      }}
    />
  );
}

/**
 * One place that decides how an intake result becomes a toast, so every form
 * reports the same way. `ok` comes straight off the API envelope.
 */
export function toastResult(result: { ok: boolean; message: string }) {
  if (result.ok) toast.success(result.message);
  else toast.error(result.message);
}

export { toast };
