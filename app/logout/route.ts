import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Logs the admin out and sends them back to the login page.
 * The AdminNav logout button posts to this route.
 */
export async function POST(request: Request) {
  const supabase = createClient();
  await supabase.auth.signOut();

  const url = new URL('/login', request.url);
  return NextResponse.redirect(url, { status: 303 });
}
