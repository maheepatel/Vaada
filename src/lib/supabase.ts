import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase wiring.
 *
 * The register has to render before anyone has created a project, so every
 * accessor in `data.ts` treats "no client" as a normal state and falls back to
 * the seed file. `isSupabaseConfigured()` is what the UI uses to decide whether
 * to show the read-only banner.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey);
}

let browserClient: SupabaseClient | null = null;

/** Anon-key client. Reads are public; writes are gated by RLS. */
export function getSupabase(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  if (!browserClient) {
    browserClient = createClient(url, anonKey, {
      auth: { persistSession: false },
    });
  }
  return browserClient;
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
