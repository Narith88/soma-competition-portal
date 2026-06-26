import { Suspense } from 'react';
import SignupClient from './SignupClient';

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-4">
          <div className="text-slate-500">Loading…</div>
        </div>
      }
    >
      <SignupClient />
    </Suspense>
  );
}
