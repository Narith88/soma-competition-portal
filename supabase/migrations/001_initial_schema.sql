-- ============================================================================
-- SOMA Competition Portal - Initial database schema
-- Run this in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run
-- ============================================================================

-- Required extension for gen_random_uuid()
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- profiles : admin / teacher accounts (linked to Supabase Auth users)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null check (role in ('admin')),
  full_name   text,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- categories : competition categories (Math Junior, Physics, etc.)
-- ----------------------------------------------------------------------------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  name_km     text,
  description text,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- exams
-- ----------------------------------------------------------------------------
create table if not exists public.exams (
  id                uuid primary key default gen_random_uuid(),
  category_id       uuid references public.categories(id) on delete set null,
  title             text not null,
  title_km          text,
  description       text,
  instructions      text,
  language_mode     text not null default 'bilingual' check (language_mode in ('km', 'en', 'bilingual')),
  subject           text,
  difficulty        text,
  access_code       text unique not null,
  duration_minutes  integer not null check (duration_minutes > 0),
  open_at           timestamptz,
  close_at          timestamptz,
  is_published      boolean not null default false,
  show_results      boolean not null default false,
  shuffle_questions boolean not null default true,
  shuffle_choices   boolean not null default true,
  max_tab_switches  integer not null default 1,
  created_by        uuid references public.profiles(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- questions
-- ----------------------------------------------------------------------------
create table if not exists public.questions (
  id              uuid primary key default gen_random_uuid(),
  exam_id         uuid not null references public.exams(id) on delete cascade,
  prompt_markdown text not null,
  image_url       text,
  points          integer not null default 1 check (points > 0),
  order_index     integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- choices : answer options for a question
-- ----------------------------------------------------------------------------
create table if not exists public.choices (
  id               uuid primary key default gen_random_uuid(),
  question_id      uuid not null references public.questions(id) on delete cascade,
  content_markdown text not null,
  is_correct       boolean not null default false,
  order_index      integer not null default 0,
  created_at       timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- attempts : one student sitting one exam
-- ----------------------------------------------------------------------------
create table if not exists public.attempts (
  id               uuid primary key default gen_random_uuid(),
  exam_id          uuid not null references public.exams(id) on delete cascade,
  student_name     text not null,
  student_id       text not null,
  school_name      text,
  grade            text,
  started_at       timestamptz not null default now(),
  submitted_at     timestamptz,
  score            numeric,
  total_points     numeric,
  tab_switch_count integer not null default 0,
  is_flagged       boolean not null default false,
  status           text not null default 'started' check (status in ('started', 'submitted', 'auto_submitted')),
  created_at       timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- responses : a student's chosen answer for a question
-- ----------------------------------------------------------------------------
create table if not exists public.responses (
  id             uuid primary key default gen_random_uuid(),
  attempt_id     uuid not null references public.attempts(id) on delete cascade,
  question_id    uuid not null references public.questions(id) on delete cascade,
  choice_id      uuid not null references public.choices(id) on delete cascade,
  is_correct     boolean not null default false,
  points_awarded numeric not null default 0,
  created_at     timestamptz not null default now(),
  unique (attempt_id, question_id)
);

-- ----------------------------------------------------------------------------
-- security_events : anti-cheating logs (tab switches, focus loss, etc.)
-- ----------------------------------------------------------------------------
create table if not exists public.security_events (
  id          uuid primary key default gen_random_uuid(),
  attempt_id  uuid not null references public.attempts(id) on delete cascade,
  event_type  text not null,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

-- ============================================================================
-- updated_at trigger
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_exams_updated_at on public.exams;
create trigger trg_exams_updated_at
  before update on public.exams
  for each row execute function public.set_updated_at();

drop trigger if exists trg_questions_updated_at on public.questions;
create trigger trg_questions_updated_at
  before update on public.questions
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Indexes
-- ============================================================================
create index if not exists idx_exams_access_code   on public.exams (access_code);
create index if not exists idx_questions_exam_id    on public.questions (exam_id);
create index if not exists idx_choices_question_id  on public.choices (question_id);
create index if not exists idx_attempts_exam_id     on public.attempts (exam_id);
create index if not exists idx_attempts_student_id  on public.attempts (student_id);
create index if not exists idx_attempts_created_at  on public.attempts (created_at);
create index if not exists idx_responses_attempt_id on public.responses (attempt_id);
create index if not exists idx_sec_events_attempt   on public.security_events (attempt_id);
create index if not exists idx_sec_events_created   on public.security_events (created_at);

-- ============================================================================
-- Helper function: is the current logged-in user an admin?
-- ============================================================================
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$ language sql security definer stable;

-- ============================================================================
-- Row Level Security
--
-- Design note:
--   * Admins (logged-in users with a profiles.role = 'admin') can do everything.
--   * Students are NOT logged in. All student reads/writes go through SERVER
--     route handlers that use the SERVICE ROLE key, which bypasses RLS safely.
--   * Therefore we keep public (anonymous) access LOCKED at the database level,
--     and we never expose choices.is_correct to the browser. This is the most
--     secure default: correct answers physically cannot be read by clients.
-- ============================================================================

alter table public.profiles        enable row level security;
alter table public.categories      enable row level security;
alter table public.exams           enable row level security;
alter table public.questions       enable row level security;
alter table public.choices         enable row level security;
alter table public.attempts        enable row level security;
alter table public.responses       enable row level security;
alter table public.security_events enable row level security;

-- profiles: a user can read their own profile; admins can read all.
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
  for select using (id = auth.uid() or public.is_admin());

-- categories: admins full access
drop policy if exists categories_admin_all on public.categories;
create policy categories_admin_all on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

-- exams: admins full access
drop policy if exists exams_admin_all on public.exams;
create policy exams_admin_all on public.exams
  for all using (public.is_admin()) with check (public.is_admin());

-- questions: admins full access
drop policy if exists questions_admin_all on public.questions;
create policy questions_admin_all on public.questions
  for all using (public.is_admin()) with check (public.is_admin());

-- choices: admins full access (correct answers never leave the server)
drop policy if exists choices_admin_all on public.choices;
create policy choices_admin_all on public.choices
  for all using (public.is_admin()) with check (public.is_admin());

-- attempts: admins full access
drop policy if exists attempts_admin_all on public.attempts;
create policy attempts_admin_all on public.attempts
  for all using (public.is_admin()) with check (public.is_admin());

-- responses: admins full access
drop policy if exists responses_admin_all on public.responses;
create policy responses_admin_all on public.responses
  for all using (public.is_admin()) with check (public.is_admin());

-- security_events: admins full access
drop policy if exists sec_events_admin_all on public.security_events;
create policy sec_events_admin_all on public.security_events
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- Optional seed data: a couple of starter categories.
-- Safe to keep or delete.
-- ============================================================================
insert into public.categories (name, name_km, description)
values
  ('Math Junior', 'គណិតវិទ្យាថ្នាក់តូច', 'Junior level mathematics competition'),
  ('Math Senior', 'គណិតវិទ្យាថ្នាក់ធំ', 'Senior level mathematics competition'),
  ('Physics', 'រូបវិទ្យា', 'Physics competition'),
  ('Grade 12 BacII Preparation', 'ត្រៀមប្រឡងបាក់ឌុបថ្នាក់ទី១២', 'Bac II preparation')
on conflict do nothing;
