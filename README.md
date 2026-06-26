# SOMA Portal (តេស្ត SOMA)

A multi-tenant online exam platform for academic competitions and quizzes
(math, physics, and more). Built for **SOMA Education Group**, and now ready for
**any school, teacher, or organization** to run their own private exams.

Admins create exams; students join with an access code, take a timed exam, and
the system scores them automatically. Each organization's exams, questions, and
results are completely private to that organization.

> 👉 **Not a programmer?** Read **`SETUP_GUIDE.md`** — it explains every step in
> plain language. This README is the short technical version.

## What's new in this version

- **Multi-tenant / SaaS**: sign up, create an organization (workspace), and your
  exams stay private to that org. Switch between organizations from the nav.
- **Email/password and Google sign-in** via Supabase Auth.
- **Paste images** (Ctrl+V) into questions *and* answer choices, plus upload or
  image-URL — admin only.
- **Image answer choices**: choices support Markdown, LaTeX, Khmer, and images.
- **Exam duration tracking**: each attempt's time is recorded server-side and
  shown in results and CSV export ("12m 35s").

## Features

- Multiple-choice exams with **Markdown + LaTeX math** (KaTeX) and **Khmer/English**
- Per-organization admin dashboard, exams, categories, questions, results, security
- Question editor with **live preview**, paste/upload/URL images
- Timed exams with **server-based timer**, refresh-safe, **auto-submit**
- **Server-side scoring** — correct answers never reach the student's browser
- **Tab-switch / focus tracking** with configurable limit, flagging, auto-submit
- Results table + **CSV export** (Excel/Sheets friendly, UTF-8 BOM for Khmer)

## Tech stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Supabase (Auth, Postgres,
Storage) · Zod · react-markdown · remark-gfm · remark-math · rehype-katex ·
rehype-sanitize · papaparse · lucide-react.

## Quick start

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase keys
npm run dev
```

Open <http://localhost:3000>.

### Supabase setup (summary)

1. Create a project at <https://supabase.com>.
2. **SQL Editor** → run `supabase/migrations/001_initial_schema.sql`.
3. **SQL Editor** → run `supabase/migrations/002_multitenant_choice_images_duration.sql`.
4. **Storage** → create a **public** bucket named `question-images`, then add the
   storage policies (see SETUP_GUIDE.md, "Image uploads").
5. **Authentication → Providers → Google**: enable it and paste your Google OAuth
   client ID/secret (see below). Email is enabled by default.
6. **Project Settings → API** → copy the URL + keys into `.env.local`.
7. Visit `/signup`, create your account, then create your organization.

### Enabling Google sign-in

Google sign-in is configured entirely in the Supabase Dashboard — **no secrets go
in the code**:

1. In Google Cloud Console, create an OAuth 2.0 Client ID (type: Web).
2. Add this authorized redirect URI (from Supabase → Auth → Providers → Google):
   `https://<your-project-ref>.supabase.co/auth/v1/callback`
3. In Supabase → **Authentication → Providers → Google**, toggle it on and paste
   the Client ID and Client Secret.
4. In Supabase → **Authentication → URL Configuration**, set the Site URL to your
   app URL (e.g. `http://localhost:3000` for local, your Vercel URL in production)
   and add `<site>/auth/callback` to the redirect allow-list.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (browser-safe) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** server key — never exposed to the browser |
| `NEXT_PUBLIC_SITE_URL` | e.g. `http://localhost:3000` |
| `NEXT_PUBLIC_SUPABASE_IMAGE_BUCKET` | Storage bucket name (`question-images`) |

## Routes

Public: `/`, `/join`, `/exam/[accessCode]/start`,
`/exam/[accessCode]/take/[attemptId]`, `/exam/[accessCode]/result/[attemptId]`.
Auth: `/login`, `/signup`, `/logout`, `/auth/callback`.
Onboarding: `/onboarding`.
Admin (per organization): `/admin`, `/admin/exams`, `/admin/exams/new`,
`/admin/exams/[id]/edit`, `/admin/exams/[id]/questions`,
`/admin/exams/[id]/results`, `/admin/exams/[id]/security`, `/admin/categories`,
`/admin/organizations`, `/admin/organizations/new`,
`/admin/organizations/[id]/settings`.
Server APIs: `/api/attempts/start`, `/api/attempts/submit`,
`/api/security-events`, `/api/upload-question-image`.

## Multi-tenant model & security

- A **user** signs in. A **user** belongs to one or more **organizations**
  (workspaces) via `organization_members` with a role of `owner`, `admin`, or
  `viewer`.
- **Exams, categories, questions, choices, attempts, and results are scoped to an
  organization.** Row Level Security ensures users can only read/write data for
  organizations they belong to. An admin can never see another org's exams.
- Students are anonymous. All student reads/writes flow through server routes that
  use the service-role key (which bypasses RLS safely). Students **never** receive
  `choices.is_correct`; scoring is server-side only.
- The `service_role` key is only imported by server-only files
  (`lib/supabase/admin.ts`, API routes, server actions). It is never bundled into
  the browser.
- Image uploads are validated server-side (PNG/JPG/JPEG/WEBP, ≤5 MB; SVG rejected)
  and only allowed for organization owners/admins.

## Future billing (not enabled yet)

`organizations` already has `plan`, `subscription_status`, `max_exams`, and
`max_attempts_per_month` columns so Stripe billing and plan limits can be added
later without another migration. No limits are enforced today.

## Deploy (Vercel)

Push to GitHub, import the repo in Vercel, add the same environment variables in
the Vercel project settings, set `NEXT_PUBLIC_SITE_URL` to your real domain, and
update Supabase Auth URL configuration to include your production `/auth/callback`.

---

## Billing & plans (new)

SOMA Portal now supports **paid plans** with manual QR-code payment approval.

**Subscription plans** (monthly):
- **Free** — 7-day trial, 30 respondents total, no CSV export
- **Starter** ($15/mo + 10% tax) — 300 respondents/mo, CSV export, image choices, 2 admins
- **Pro** ($49/mo + 10% tax) — 3000 respondents/mo, custom branding, certificates, 5 admins

**One-time competition packages**:
- Mini ($15) — 100 respondents
- Small ($39) — 300 respondents
- Medium ($69) — 1000 respondents
- Large ($109) — 3000 respondents

### How payment works (manual approval, Phase 1)

1. Buyer chooses a plan on `/pricing` → checkout creates a `payments` row.
2. The order page shows a **QR code** with the order total. Buyer scans with
   Bakong / ABA / Wing and transfers the amount.
3. Buyer uploads a payment screenshot on the same page.
4. The **platform admin** (you) reviews the payment at
   `/admin/platform/payments` and clicks **Approve**.
5. The DB function `apply_approved_payment` is called server-side: for
   subscriptions it switches the org's plan and refills respondent quota for a
   30-day cycle; for packages it adds respondents to the org's balance.

### Becoming the platform admin (you)

After running the migrations, mark your own profile as a **platform admin**
(separate from per-org roles):

```sql
update public.profiles set role = 'admin' where email = 'YOUR_EMAIL';
```

Then sign in and you'll see a "Platform admin" bar in the top nav with a
"Review payments" link.

### Plan enforcement

- **Attempt start** calls the `consume_respondent` DB function which atomically
  decrements the org's quota (or refuses if trial expired / out of quota).
- **CSV export button** is hidden for plans without `csv_export`.
- **Trial banner** on the dashboard shows days/respondents left.
- **Tax (10%)** is added to every paid checkout (server-side calculation).

### Phase 2 (automation) — not yet implemented

The architecture is ready for Bakong/KHQR API integration:
- `payments` already has all the fields needed for an automated webhook.
- `apply_approved_payment(payment_id)` is the single function that grants
  benefits, so an automated webhook just calls the same RPC.
