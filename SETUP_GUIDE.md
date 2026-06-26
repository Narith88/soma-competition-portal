# SOMA Portal — Simple Setup Guide

This guide is for **non-programmers**. Go slowly, one step at a time. You don't
need to understand the code. 🌱

If you already set up the earlier version, the **only new database step** is
running **Migration 002** (Step 5b) and adding the **storage policies** and
**Google login**. Everything else you've already done still works.

---

## What you'll do

- **Part A** — Run the site on your computer (testing)
- **Part B** — Put it online with Vercel

---

# PART A — Run it on your computer

## Step 1 — Install Node.js
Download the **LTS** version from <https://nodejs.org>, install it, then in a
terminal type `node -v`. If you see a version number, it worked.

## Step 2 — Open the project
Open the `soma-competition-portal` folder in **VS Code**
(<https://code.visualstudio.com>). Open the terminal: **Terminal → New Terminal**.

## Step 3 — Install the building blocks
In the terminal, type:
```
npm install
```
Wait until it finishes (yellow warnings are normal).

## Step 4 — Create a Supabase project
Go to <https://supabase.com>, sign up, create a **New project**, choose a region
near you (Singapore is good for Cambodia), and wait 1–2 minutes.

## Step 5 — Create the database tables

### 5a. First migration (only if you haven't already)
1. Supabase → **SQL Editor** → **+ New query**.
2. In VS Code open `supabase/migrations/001_initial_schema.sql`, select all
   (`Ctrl+A`), copy (`Ctrl+C`).
3. Paste into Supabase and click **Run**. Wait for **Success**.

> Already ran 001 before? Skip 5a.

### 5b. Second migration (NEW — required)
1. Supabase → **SQL Editor** → **+ New query**.
2. In VS Code open
   `supabase/migrations/002_multitenant_choice_images_duration.sql`, select all,
   copy.
3. Paste into Supabase and click **Run**. Wait for **Success**.

This adds organizations, image support for answer choices, and exam-duration
tracking. It keeps all your existing exams working by putting them in a default
organization called "SOMA Education Group."

## Step 6 — Create the image storage box
1. Supabase → **Storage** → **New bucket**.
2. Name it exactly `question-images`, turn **Public bucket** ON, click **Create**.
3. Add upload rules: Supabase → **SQL Editor** → **+ New query**, paste this, Run:

```sql
drop policy if exists "Public can view question images" on storage.objects;
drop policy if exists "Admins can upload question images" on storage.objects;
drop policy if exists "Admins can delete question images" on storage.objects;

create policy "Public can view question images"
on storage.objects for select to public
using (bucket_id = 'question-images');

create policy "Admins can upload question images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'question-images'
  and exists (
    select 1 from public.organization_members m
    where m.user_id = auth.uid() and m.role in ('owner','admin')
  )
);

create policy "Admins can delete question images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'question-images'
  and exists (
    select 1 from public.organization_members m
    where m.user_id = auth.uid() and m.role in ('owner','admin')
  )
);
```

## Step 7 — Copy your keys into `.env.local`
1. Supabase → **Project Settings** (gear) → **API Keys** → **Legacy** tab.
   Copy the **anon** key and the **service_role** key (both start with `eyJ...`).
2. Supabase → **General** for the Project URL
   (`https://<your-ref>.supabase.co`).
3. In VS Code, create a file named exactly `.env.local` (right-click → New File)
   and paste, filling in your values **with no spaces after the `=`**:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your anon key...
SUPABASE_SERVICE_ROLE_KEY=eyJ...your service_role key...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_IMAGE_BUCKET=question-images
```
Save the file (`Ctrl+S`).

## Step 8 — Enable Google sign-in (optional but recommended)
1. In Supabase → **Authentication → Providers → Google**, note the **redirect
   URL** it shows.
2. In **Google Cloud Console** (<https://console.cloud.google.com>) → APIs &
   Services → Credentials → **Create credentials → OAuth client ID → Web
   application**. Paste Supabase's redirect URL into "Authorized redirect URIs".
3. Copy the **Client ID** and **Client Secret** back into Supabase's Google
   provider settings and toggle it **ON**.
4. In Supabase → **Authentication → URL Configuration**, set **Site URL** to
   `http://localhost:3000` and add `http://localhost:3000/auth/callback` to the
   redirect list. (Add your Vercel URL too once you deploy.)

> Want to skip Google for now? You can — email/password sign-up works without it.

## Step 9 — Start the website
```
npm run dev
```
Open <http://localhost:3000>.

---

# Creating your account & first exam

1. Go to <http://localhost:3000/signup>.
2. Sign up with email/password (or Google).
3. You'll be asked to **create your organization** — type a name like
   "Newton Learning Center" and continue.
4. You land on the **Dashboard**. Click **New Exam**.
5. Add a title, duration, and access code. Save.
6. On the **Questions** page, click **Add Question**:
   - Type the question (Markdown + `$math$`; Khmer works too).
   - **Paste an image** with `Ctrl+V`, or click **Upload**, or paste an image URL.
   - Each **answer choice** can also have text *and/or* an image — paste, upload,
     or URL. Click the green circle next to the correct one.
   - Click **Save**.
7. Back on **Exams**, click **Publish**, then share the **access code** with
   students.

## Switching / adding organizations
Use the building icon next to "SOMA Portal" in the top bar to switch
organizations or create a new one. Each organization's exams are private.

## Students
Students open your site → **Join Exam** → type the access code → enter their
details → take the timed exam. It auto-submits when time runs out.

## Results
**Exams → (your exam) → Results** shows scores, **Started**, **Submitted**, and
**Duration** (e.g. "12m 35s"). Click **Export CSV** for Excel/Google Sheets
(Khmer text included).

---

# PART B — Put it online (Vercel)

1. Put the code on GitHub (GitHub Desktop is easiest: Add Local Repository →
   Publish, keep it **Private**).
2. Go to <https://vercel.com>, sign in with GitHub, **Add New → Project**, import
   your repo.
3. Before deploying, add the **same 5 environment variables** from `.env.local`.
   Set `NEXT_PUBLIC_SITE_URL` to your Vercel URL once you know it.
4. Click **Deploy**, wait a few minutes, open your live link.
5. In Supabase → **Authentication → URL Configuration**, add your Vercel URL as a
   Site URL and add `https://YOUR-APP.vercel.app/auth/callback` to the redirect
   list (needed for Google sign-in in production).

---

# Quick troubleshooting

- **"Your project's URL and Key are required"** → `.env.local` missing/misspelled,
  or you didn't restart `npm run dev` after editing it.
- **Login says incorrect password** → use the **Legacy** Supabase keys (start with
  `eyJ...`), not the new `sb_...` keys.
- **Image upload fails** → bucket must be named `question-images`, be **Public**,
  and have the storage policies from Step 6.
- **Google button does nothing / errors** → finish Step 8, and make sure the
  redirect URLs match exactly.
- **I see no exams after migrating** → make sure you're in the right organization
  (building icon, top bar). Existing SOMA exams are under "SOMA Education Group".

You've got this. 🚀
