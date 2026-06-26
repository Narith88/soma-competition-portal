import { createBrowserClient } from '@supabase/ssr';

/**
 * Supabase client for use in CLIENT components (browser).
 * Uses the public anon key only. Safe to expose.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
