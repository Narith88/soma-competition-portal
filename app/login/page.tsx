import { Suspense } from 'react';
import LoginClient from './LoginClient';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-4">
          <div className="text-slate-500">Loading…</div>
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}