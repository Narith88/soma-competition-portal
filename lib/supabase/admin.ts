import { createClient } from '@supabase/supabase-js';

/**
 * ⚠️  SERVER-ONLY admin Supabase client.
 *
 * This uses the SERVICE ROLE key, which BYPASSES Row Level Security.
 * It must NEVER be imported into a Client Component ('use client').
 * It is only safe inside:
 *   - API route handlers (app/api/.../route.ts)
 *   - Server Components / server actions
 *
 * Because SUPABASE_SERVICE_ROLE_KEY is not prefixed with NEXT_PUBLIC_, it is
 * never bundled into browser JavaScript, so it cannot leak to students.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Missing Supabase server environment variables. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local'
    );
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
