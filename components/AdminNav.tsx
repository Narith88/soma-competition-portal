'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  FileText,
  LogOut,
  GraduationCap,
  Building2,
  Check,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { switchOrganizationAction } from '@/app/onboarding/actions';

interface OrgItem {
  organization_id: string;
  role: 'owner' | 'admin' | 'viewer';
  name: string;
}

const links = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/exams', label: 'Exams', icon: FileText, exact: false },
];

export default function AdminNav({
  email,
  organizations,
  activeOrgId,
}: {
  email?: string | null;
  organizations: OrgItem[];
  activeOrgId: string | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = organizations.find((o) => o.organization_id === activeOrgId);

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-brand" />
            <span className="font-bold text-brand">SOMA Portal</span>
          </Link>

          {/* Organization switcher */}
          <div className="relative">
            <button
              onClick={() => setOpen((o) => !o)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              <Building2 className="h-4 w-4 text-slate-400" />
              <span className="max-w-[10rem] truncate">{active?.name ?? 'Organization'}</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {open && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setOpen(false)}
                  aria-hidden
                />
                <div className="absolute left-0 z-20 mt-1 w-64 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                  {organizations.map((o) => (
                    <form key={o.organization_id} action={switchOrganizationAction.bind(null, o.organization_id)}>
                      <button
                        type="submit"
                        className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                      >
                        <span className="truncate">{o.name}</span>
                        {o.organization_id === activeOrgId && (
                          <Check className="h-4 w-4 text-brand" />
                        )}
                      </button>
                    </form>
                  ))}
                  <Link
                    href="/admin/organizations/new"
                    onClick={() => setOpen(false)}
                    className="mt-1 block border-t border-slate-100 px-3 py-2 text-sm font-medium text-brand hover:bg-slate-50"
                  >
                    + New organization
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>

        <nav className="flex items-center gap-1">
          {links.map((l) => {
            const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition',
                  active ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-100'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{l.label}</span>
              </Link>
            );
          })}
          <form action="/logout" method="post">
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </form>
        </nav>
      </div>
      {email && (
        <div className="mx-auto max-w-6xl px-4 pb-2 text-xs text-slate-400">
          Signed in as {email}
        </div>
      )}
    </header>
  );
}
