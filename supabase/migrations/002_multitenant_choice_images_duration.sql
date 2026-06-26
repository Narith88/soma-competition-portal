-- ============================================================================
-- SOMA Portal - Migration 002
-- Adds: multi-tenant organizations, choice images, and attempt duration.
--
-- This migration is SAFE to run on a database that already has migration 001
-- data. It backfills a default organization ("SOMA Education Group") and
-- attaches all existing categories and exams to it, so existing exams and
-- access codes keep working.
--
-- Run in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1) profiles: relax the role check and add SaaS-friendly columns.
--    (Old rows had role = 'admin'; we keep that valid and add 'member'.)
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists email      text,
  add column if not exists avatar_url text,
  add column if not exists updated_at timestamptz not null default now();

-- Make role nullable + flexible. We no longer rely on a global 'admin' role;
-- access is decided per-organization via organization_members.
alter table public.profiles alter column role drop not null;

do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'profiles_role_check'
  ) then
    alter table public.profiles drop constraint profiles_role_check;
  end if;
end $$;

alter table public.profiles
  add constraint profiles_role_check
  check (role is null or role in ('admin', 'member'));

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 2) organizations
-- ----------------------------------------------------------------------------
create table if not exists public.organizations (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  slug                text unique,
  owner_id            uuid references public.profiles(id) on delete set null,
  plan                text not null default 'free'
                        check (plan in ('free', 'starter', 'pro', 'enterprise')),
  subscription_status text not null default 'inactive',
  max_exams              integer,
  max_attempts_per_month integer,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

drop trigger if exists trg_organizations_updated_at on public.organizations;
create trigger trg_organizations_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 3) organization_members
-- ----------------------------------------------------------------------------
create table if not exists public.organization_members (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  role            text not null check (role in ('owner', 'admin', 'viewer')),
  created_at      timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index if not exists idx_org_members_org  on public.organization_members (organization_id);
create index if not exists idx_org_members_user on public.organization_members (user_id);

-- ----------------------------------------------------------------------------
-- 4) Add organization_id to categories, exams, attempts.
-- ----------------------------------------------------------------------------
alter table public.categories add column if not exists organization_id uuid
  references public.organizations(id) on delete cascade;
alter table public.exams      add column if not exists organization_id uuid
  references public.organizations(id) on delete cascade;
alter table public.attempts   add column if not exists organization_id uuid
  references public.organizations(id) on delete cascade;

-- ----------------------------------------------------------------------------
-- 5) Choice images: add image_url to choices, and make content optional
--    (a choice may be image-only).
-- ----------------------------------------------------------------------------
alter table public.choices add column if not exists image_url text;
alter table public.choices alter column content_markdown drop not null;
alter table public.choices alter column content_markdown set default '';
update public.choices set content_markdown = '' where content_markdown is null;

-- ----------------------------------------------------------------------------
-- 6) Attempt duration tracking.
-- ----------------------------------------------------------------------------
alter table public.attempts add column if not exists duration_seconds integer;

-- ----------------------------------------------------------------------------
-- 7) BACKFILL: create the default organization and attach existing data.
-- ----------------------------------------------------------------------------
do $$
declare
  default_org_id uuid;
  first_profile  uuid;
begin
  -- Only backfill if there are exams/categories without an organization,
  -- or any profile that isn't a member of an organization yet.
  if exists (select 1 from public.exams where organization_id is null)
     or exists (select 1 from public.categories where organization_id is null)
     or exists (
       select 1 from public.profiles p
       where not exists (
         select 1 from public.organization_members m where m.user_id = p.id
       )
     )
  then
    -- Reuse an existing default org if it already exists, else create it.
    select id into default_org_id
      from public.organizations
      where slug = 'soma-education-group'
      limit 1;

    if default_org_id is null then
      select id into first_profile from public.profiles order by created_at asc limit 1;

      insert into public.organizations (name, slug, owner_id, plan, subscription_status)
      values ('SOMA Education Group', 'soma-education-group', first_profile, 'free', 'inactive')
      returning id into default_org_id;
    end if;

    -- Attach existing categories and exams.
    update public.categories set organization_id = default_org_id where organization_id is null;
    update public.exams       set organization_id = default_org_id where organization_id is null;
    update public.attempts a
      set organization_id = e.organization_id
      from public.exams e
      where a.exam_id = e.id and a.organization_id is null;

    -- Make every existing profile a member of the default org (owner for the
    -- very first profile, admin for the rest) if they aren't a member anywhere.
    insert into public.organization_members (organization_id, user_id, role)
    select default_org_id,
           p.id,
           case when p.id = (select owner_id from public.organizations where id = default_org_id)
                then 'owner' else 'admin' end
    from public.profiles p
    where not exists (
      select 1 from public.organization_members m where m.user_id = p.id
    )
    on conflict (organization_id, user_id) do nothing;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 8) Helpful indexes for tenant filtering.
-- ----------------------------------------------------------------------------
create index if not exists idx_categories_org on public.categories (organization_id);
create index if not exists idx_exams_org      on public.exams (organization_id);
create index if not exists idx_attempts_org   on public.attempts (organization_id);

-- ----------------------------------------------------------------------------
-- 9) Membership helper functions (used by RLS). SECURITY DEFINER so they can
--    read organization_members without triggering recursive RLS.
-- ----------------------------------------------------------------------------
create or replace function public.is_org_member(org uuid)
returns boolean as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = org and m.user_id = auth.uid()
  );
$$ language sql security definer stable;

create or replace function public.is_org_editor(org uuid)
returns boolean as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = org
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  );
$$ language sql security definer stable;

-- ----------------------------------------------------------------------------
-- 10) Auto-create a profile row when a new auth user signs up.
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
    set email = excluded.email;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- 11) Row Level Security: replace global-admin policies with per-organization
--     policies. Students remain anonymous and go through server routes that use
--     the service role (which bypasses RLS), so correct answers never leak.
-- ============================================================================

-- Enable RLS on the new tables.
alter table public.organizations        enable row level security;
alter table public.organization_members enable row level security;

-- profiles: a user reads/updates only their own row.
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
  for select using (id = auth.uid());
drop policy if exists profiles_self_upsert on public.profiles;
create policy profiles_self_upsert on public.profiles
  for insert with check (id = auth.uid());
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- organizations: members can read; editors (owner/admin) can update; any
-- authenticated user can create one (they become the owner via app logic).
drop policy if exists organizations_read on public.organizations;
create policy organizations_read on public.organizations
  for select using (public.is_org_member(id));
drop policy if exists organizations_insert on public.organizations;
create policy organizations_insert on public.organizations
  for insert with check (auth.uid() is not null);
drop policy if exists organizations_update on public.organizations;
create policy organizations_update on public.organizations
  for update using (public.is_org_editor(id)) with check (public.is_org_editor(id));
drop policy if exists organizations_delete on public.organizations;
create policy organizations_delete on public.organizations
  for delete using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = id and m.user_id = auth.uid() and m.role = 'owner'
    )
  );

-- organization_members: a user can read membership rows for orgs they belong
-- to. Inserting your own membership is allowed (used during onboarding for the
-- first owner). Editors can manage members.
drop policy if exists org_members_read on public.organization_members;
create policy org_members_read on public.organization_members
  for select using (user_id = auth.uid() or public.is_org_member(organization_id));
drop policy if exists org_members_insert_self on public.organization_members;
create policy org_members_insert_self on public.organization_members
  for insert with check (
    user_id = auth.uid() or public.is_org_editor(organization_id)
  );
drop policy if exists org_members_update on public.organization_members;
create policy org_members_update on public.organization_members
  for update using (public.is_org_editor(organization_id))
  with check (public.is_org_editor(organization_id));
drop policy if exists org_members_delete on public.organization_members;
create policy org_members_delete on public.organization_members
  for delete using (public.is_org_editor(organization_id) or user_id = auth.uid());

-- categories: scoped to org membership (editors write, members read).
drop policy if exists categories_admin_all on public.categories;
drop policy if exists categories_read on public.categories;
create policy categories_read on public.categories
  for select using (organization_id is not null and public.is_org_member(organization_id));
drop policy if exists categories_write on public.categories;
create policy categories_write on public.categories
  for all
  using (organization_id is not null and public.is_org_editor(organization_id))
  with check (organization_id is not null and public.is_org_editor(organization_id));

-- exams: scoped to org membership.
drop policy if exists exams_admin_all on public.exams;
drop policy if exists exams_read on public.exams;
create policy exams_read on public.exams
  for select using (organization_id is not null and public.is_org_member(organization_id));
drop policy if exists exams_write on public.exams;
create policy exams_write on public.exams
  for all
  using (organization_id is not null and public.is_org_editor(organization_id))
  with check (organization_id is not null and public.is_org_editor(organization_id));

-- questions: access decided via the parent exam's organization.
drop policy if exists questions_admin_all on public.questions;
drop policy if exists questions_read on public.questions;
create policy questions_read on public.questions
  for select using (
    exists (
      select 1 from public.exams e
      where e.id = questions.exam_id and public.is_org_member(e.organization_id)
    )
  );
drop policy if exists questions_write on public.questions;
create policy questions_write on public.questions
  for all
  using (
    exists (
      select 1 from public.exams e
      where e.id = questions.exam_id and public.is_org_editor(e.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.exams e
      where e.id = questions.exam_id and public.is_org_editor(e.organization_id)
    )
  );

-- choices: access decided via question -> exam -> organization.
drop policy if exists choices_admin_all on public.choices;
drop policy if exists choices_read on public.choices;
create policy choices_read on public.choices
  for select using (
    exists (
      select 1 from public.questions q
      join public.exams e on e.id = q.exam_id
      where q.id = choices.question_id and public.is_org_member(e.organization_id)
    )
  );
drop policy if exists choices_write on public.choices;
create policy choices_write on public.choices
  for all
  using (
    exists (
      select 1 from public.questions q
      join public.exams e on e.id = q.exam_id
      where q.id = choices.question_id and public.is_org_editor(e.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.questions q
      join public.exams e on e.id = q.exam_id
      where q.id = choices.question_id and public.is_org_editor(e.organization_id)
    )
  );

-- attempts: members of the owning org can read; editors can manage.
drop policy if exists attempts_admin_all on public.attempts;
drop policy if exists attempts_read on public.attempts;
create policy attempts_read on public.attempts
  for select using (
    exists (
      select 1 from public.exams e
      where e.id = attempts.exam_id and public.is_org_member(e.organization_id)
    )
  );
drop policy if exists attempts_write on public.attempts;
create policy attempts_write on public.attempts
  for all
  using (
    exists (
      select 1 from public.exams e
      where e.id = attempts.exam_id and public.is_org_editor(e.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.exams e
      where e.id = attempts.exam_id and public.is_org_editor(e.organization_id)
    )
  );

-- responses: via attempt -> exam -> organization.
drop policy if exists responses_admin_all on public.responses;
drop policy if exists responses_read on public.responses;
create policy responses_read on public.responses
  for select using (
    exists (
      select 1 from public.attempts a
      join public.exams e on e.id = a.exam_id
      where a.id = responses.attempt_id and public.is_org_member(e.organization_id)
    )
  );

-- security_events: via attempt -> exam -> organization.
drop policy if exists sec_events_admin_all on public.security_events;
drop policy if exists sec_events_read on public.security_events;
create policy sec_events_read on public.security_events
  for select using (
    exists (
      select 1 from public.attempts a
      join public.exams e on e.id = a.exam_id
      where a.id = security_events.attempt_id and public.is_org_member(e.organization_id)
    )
  );

-- ============================================================================
-- Done. The old is_admin() function is left in place for backwards
-- compatibility but is no longer used by policies.
-- ============================================================================
