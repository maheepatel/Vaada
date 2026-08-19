import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase wiring.
 *
 * The register has to render before anyone has created a project, so every
 * accessor in `data.ts` treats "no client" as a normal state and falls back to
 * the seed file. `isSupabaseConfigured()` is what the UI uses to decide whether
 * to show the read-only banner.
 *
 * There are four clients here and they are not interchangeable:
 *
 *   getSupabase()          server-side reads. No session, no identity.
 *   getBrowserSupabase()   the browser. Persists the anonymous session.
 *   getSupabaseAsUser(t)   server-side writes made ON BEHALF OF a caller.
 *   getServiceSupabase()   moderation. Bypasses RLS entirely.
 *
 * The third is the one that makes anonymous identity work. An API route holds
 * the anon key, so `auth.uid()` inside Postgres would be null and every
 * own-row policy would fail closed. Forwarding the caller's access token means
 * RLS sees the real uid while the route still does its own validation first.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey);
}

let serverClient: SupabaseClient | null = null;

/** Anon-key client for reads. Writes through this have no identity attached. */
export function getSupabase(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  if (!serverClient) {
    serverClient = createClient(url, anonKey, {
      auth: { persistSession: false },
    });
  }
  return serverClient;
}

let browserClient: SupabaseClient | null = null;

/**
 * The browser's client. Unlike the server one this persists its session, which
 * is the whole point: the anonymous identity has to survive a reload, or a
 * reader's own submissions vanish every time they close the tab.
 *
 * Returns null on the server rather than throwing, so a component that imports
 * it can still render during SSR.
 */
export function getBrowserSupabase(): SupabaseClient | null {
  if (typeof window === 'undefined') return null;
  if (!url || !anonKey) return null;
  if (!browserClient) {
    browserClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }
  return browserClient;
}

/**
 * Make sure the visitor has an identity, creating an anonymous one if not.
 *
 * Costs the reader nothing — no email, no password, no interstitial. It exists
 * so that evidence can be tied to a submitter for rate limiting and for "my
 * submissions", not so that anybody has to introduce themselves before
 * reporting that a school has no roof.
 *
 * Returns the access token to hand to the API route, or null if Supabase is
 * not configured, in which case the caller carries on unauthenticated.
 */
export async function ensureAnonSession(): Promise<string | null> {
  const sb = getBrowserSupabase();
  if (!sb) return null;

  const { data } = await sb.auth.getSession();
  if (data.session) return data.session.access_token;

  const { data: signed, error } = await sb.auth.signInAnonymously();
  // A failure here must not block the submission. Losing the identity costs
  // the submitter their history; refusing the promise costs the register a row.
  if (error || !signed.session) return null;
  return signed.session.access_token;
}

/**
 * A client that acts as the caller, for server-side writes that must satisfy
 * an own-row RLS policy. `token` is the access token the browser obtained from
 * `ensureAnonSession`, forwarded on the request.
 */
export function getSupabaseAsUser(token: string | null): SupabaseClient | null {
  if (!url || !anonKey) return null;
  if (!token) return getSupabase();
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

/**
 * Reads the bearer token off an incoming request, if there is one.
 * Never trusts it for identity on its own — Postgres verifies the signature.
 */
export function tokenFromRequest(request: Request): string | null {
  const header = request.headers.get('authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1] : null;
}

/**
 * Service-role client for server-only work that must bypass RLS — moderation
 * verdicts, and nothing else. Never import this into a client component; the
 * key is not prefixed with NEXT_PUBLIC_ precisely so a bundle mistake fails
 * loudly rather than leaking it.
 */
export function getServiceSupabase(): SupabaseClient | null {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

/** Storage bucket that holds citizen-submitted proof photos. */
export const PROOF_BUCKET = 'proof-media';
