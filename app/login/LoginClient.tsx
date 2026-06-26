'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { GraduationCap, LogIn } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import GoogleButton from '@/components/GoogleButton';

export default function LoginClient() {
  const router = useRouter();
  const params = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState<string | null>(
    params.get('error') === 'not_admin'
      ? 'That account is not part of this organization.'
      : params.get('error') === 'oauth_failed'
        ? 'Google sign-in failed. Please try again.'
        : null
  );

  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError('Incorrect email or password.');
        setLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      let target = params.get('redirect') || '/admin';

      if (user) {
        const { data: membership } = await supabase
          .from('organization_members')
          .select('id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();

        if (!membership) {
          target = '/onboarding';
        }
      }

      router.push(target);
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const inputCls =
    'w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30';

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-white">
            <GraduationCap className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">SOMA Portal</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to manage exams</p>
        </div>

        <GoogleButton label="Sign in with Google" />

        <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
          <div className="h-px flex-1 bg-slate-200" />
          or
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
          >
            <LogIn className="h-5 w-5" />
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          New here?{' '}
          <Link href="/signup" className="font-semibold text-brand hover:underline">
            Create an account
          </Link>
        </p>

        <a
          href="/"
          className="mt-3 block text-center text-sm text-slate-400 hover:text-slate-600"
        >
          ← Back to home
        </a>
      </div>
    </div>
  );
}