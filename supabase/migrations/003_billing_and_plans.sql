-- ============================================================================
-- SOMA Portal - Migration 003
-- Adds billing: plans, 7-day free trial, one-time competition packages,
-- payment-proof records (QR-code workflow with manual approval), and
-- per-organization respondent counters used to enforce plan limits.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1) organizations: trial dates, monthly-usage counters, plan limits.
--    plan / subscription_status already exist from migration 002.
-- ----------------------------------------------------------------------------
alter table public.organizations
  add column if not exists trial_started_at  timestamptz,
  add column if not exists trial_ends_at     timestamptz,
  add column if not exists current_period_starts_at timestamptz,
  add column if not exists current_period_ends_at   timestamptz,
  -- How many "respondent slots" (paid attempts) are still available to use.
  -- Subscriptions refill this monthly; competition packages add to it.
  add column if not exists respondents_balance integer not null default 0,
  -- Total respondents seen during the current trial (lifetime cap of 30).
  add column if not exists trial_respondents_used integer not null default 0;

-- Update plan check constraint to include the new plan names.
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'organizations_plan_check' and conrelid = 'public.organizations'::regclass
  ) then
    alter table public.organizations drop constraint organizations_plan_check;
  end if;
end $$;

alter table public.organizations
  add constraint organizations_plan_check
  check (plan in ('free', 'trial', 'starter', 'pro', 'enterprise'));

-- Start a 7-day trial for any org that doesn't have one yet.
update public.organizations
   set plan = 'trial',
       subscription_status = 'trialing',
       trial_started_at = coalesce(trial_started_at, now()),
       trial_ends_at   = coalesce(trial_ends_at, now() + interval '7 days')
 where trial_started_at is null
   and plan in ('free', 'trial');

-- ----------------------------------------------------------------------------
-- 2) Pricing catalog (server-side source of truth for prices, limits, perks).
--    Read-only for admins; only the service role writes.
-- ----------------------------------------------------------------------------
create table if not exists public.billing_plans (
  id                  text primary key,           -- e.g. 'starter', 'pro'
  kind                text not null check (kind in ('subscription', 'package')),
  display_name        text not null,
  description         text,
  price_usd_cents     integer not null,           -- pre-tax price in cents
  respondents_per_cycle integer not null,         -- monthly quota for subs;
                                                  -- total cap for packages
  features            jsonb not null default '{}'::jsonb,
  sort_order          integer not null default 0,
  is_active           boolean not null default true
);

-- Seed (or refresh) the catalog. Prices reflect the user's requested tiers.
insert into public.billing_plans (id, kind, display_name, description,
                                  price_usd_cents, respondents_per_cycle,
                                  features, sort_order)
values
  ('free',     'subscription', 'Free',
   '7-day trial. Try every core feature. Limited respondents.',
   0,    30,
   '{"csv_export":false,"choice_images":"limited","custom_branding":false,"max_admins":1,"tab_logs":"basic"}'::jsonb, 0),
  ('starter',  'subscription', 'Starter',
   'For individual teachers and small classes.',
   1500, 300,
   '{"csv_export":true,"choice_images":true,"custom_branding":false,"max_admins":2,"tab_logs":"full"}'::jsonb, 10),
  ('pro',      'subscription', 'Pro',
   'For schools and large classes. Higher quotas, full analytics.',
   4900, 3000,
   '{"csv_export":true,"choice_images":true,"custom_branding":true,"max_admins":5,"tab_logs":"full","certificates":true}'::jsonb, 20),
  ('pkg_mini',   'package', 'Mini Competition',
   'One-time package. Best for a single small event.',
   1500, 100,  '{"csv_export":true,"choice_images":true}'::jsonb, 100),
  ('pkg_small',  'package', 'Small Competition',
   'One-time package for a typical school competition.',
   3900, 300,  '{"csv_export":true,"choice_images":true}'::jsonb, 110),
  ('pkg_medium', 'package', 'Medium Competition',
   'One-time package for a regional competition.',
   6900, 1000, '{"csv_export":true,"choice_images":true}'::jsonb, 120),
  ('pkg_large',  'package', 'Large Competition',
   'One-time package for a national-scale event.',
   10900, 3000,'{"csv_export":true,"choice_images":true,"custom_branding":true}'::jsonb, 130)
on conflict (id) do update set
  display_name = excluded.display_name,
  description  = excluded.description,
  price_usd_cents = excluded.price_usd_cents,
  respondents_per_cycle = excluded.respondents_per_cycle,
  features = excluded.features,
  sort_order = excluded.sort_order,
  is_active = true;

alter table public.billing_plans enable row level security;
drop policy if exists billing_plans_read on public.billing_plans;
create policy billing_plans_read on public.billing_plans
  for select to authenticated, anon using (is_active = true);

-- ----------------------------------------------------------------------------
-- 3) Payments / orders.
--    A row is created when the user opens checkout. Status moves:
--      pending_payment -> proof_submitted -> approved (or rejected).
--    On approval, an admin (you) clicks Approve -> a database function applies
--    the plan / package to the organization.
-- ----------------------------------------------------------------------------
create table if not exists public.payments (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  user_id             uuid references public.profiles(id) on delete set null,
  plan_id             text not null references public.billing_plans(id),
  kind                text not null check (kind in ('subscription', 'package')),
  amount_usd_cents    integer not null,            -- subtotal
  tax_usd_cents       integer not null default 0,  -- 10% by default
  total_usd_cents     integer not null,            -- amount + tax
  currency            text not null default 'USD',
  status              text not null default 'pending_payment'
                       check (status in ('pending_payment','proof_submitted',
                                         'approved','rejected','cancelled')),
  proof_url           text,                        -- payment screenshot
  proof_note          text,                        -- buyer's reference/note
  reviewer_id         uuid references public.profiles(id) on delete set null,
  reviewer_note       text,
  created_at          timestamptz not null default now(),
  reviewed_at         timestamptz
);

create index if not exists idx_payments_org on public.payments (organization_id, created_at desc);
create index if not exists idx_payments_status on public.payments (status);

alter table public.payments enable row level security;

-- Members of the owning org can see their own payments.
drop policy if exists payments_read on public.payments;
create policy payments_read on public.payments
  for select using (public.is_org_member(organization_id));

-- Editors of the org can create payment requests for that org.
drop policy if exists payments_insert on public.payments;
create policy payments_insert on public.payments
  for insert with check (public.is_org_editor(organization_id));

-- Submitting payment proof is the only thing an org editor can update.
-- Approval/rejection is done by the service role from the platform-admin UI.
drop policy if exists payments_update_proof on public.payments;
create policy payments_update_proof on public.payments
  for update using (public.is_org_editor(organization_id) and status in ('pending_payment','proof_submitted'))
  with check (public.is_org_editor(organization_id));

-- ----------------------------------------------------------------------------
-- 4) Platform admins (you). They can approve/reject payments globally.
--    Re-uses the existing profiles.role column (where role = 'admin' means
--    "platform admin"; per-org roles live in organization_members).
-- ----------------------------------------------------------------------------
create or replace function public.is_platform_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$ language sql security definer stable;

-- Allow platform admins to read all payments and orgs.
drop policy if exists payments_platform_admin_read on public.payments;
create policy payments_platform_admin_read on public.payments
  for select using (public.is_platform_admin());

drop policy if exists organizations_platform_admin_read on public.organizations;
create policy organizations_platform_admin_read on public.organizations
  for select using (public.is_platform_admin());

-- ----------------------------------------------------------------------------
-- 5) Function: apply an approved payment to an organization.
--    Called server-side (by an API route running as the service role).
-- ----------------------------------------------------------------------------
create or replace function public.apply_approved_payment(p_payment_id uuid)
returns void as $$
declare
  pay   record;
  plan  record;
begin
  select * into pay from public.payments where id = p_payment_id;
  if not found then
    raise exception 'Payment % not found', p_payment_id;
  end if;
  if pay.status <> 'approved' then
    raise exception 'Payment % is not approved', p_payment_id;
  end if;

  select * into plan from public.billing_plans where id = pay.plan_id;
  if not found then
    raise exception 'Plan % not found', pay.plan_id;
  end if;

  if plan.kind = 'subscription' then
    -- Switch the org to this plan for a fresh monthly period and top up its
    -- respondents balance to the plan's quota.
    update public.organizations
       set plan = plan.id,
           subscription_status = 'active',
           current_period_starts_at = now(),
           current_period_ends_at   = now() + interval '30 days',
           respondents_balance = plan.respondents_per_cycle
     where id = pay.organization_id;
  else
    -- One-time package: just add respondents on top of whatever balance exists.
    update public.organizations
       set respondents_balance = respondents_balance + plan.respondents_per_cycle
     where id = pay.organization_id;
  end if;
end;
$$ language plpgsql security definer;

-- ----------------------------------------------------------------------------
-- 6) Helper: server-side check + increment of the respondent counter.
--    Called by the attempt-start API. Returns true if the new attempt is
--    allowed; in that case the appropriate counter is incremented atomically.
-- ----------------------------------------------------------------------------
create or replace function public.consume_respondent(org_id uuid)
returns boolean as $$
declare
  org record;
begin
  select * into org from public.organizations where id = org_id for update;
  if not found then
    return false;
  end if;

  -- Trial: 30 respondents total AND must be within trial window.
  if org.plan = 'trial' then
    if org.trial_ends_at is null or org.trial_ends_at < now() then
      return false;
    end if;
    if coalesce(org.trial_respondents_used, 0) >= 30 then
      return false;
    end if;
    update public.organizations
       set trial_respondents_used = coalesce(trial_respondents_used, 0) + 1
     where id = org_id;
    return true;
  end if;

  -- Paid subscription or package: consume one respondent from balance.
  if org.respondents_balance is null or org.respondents_balance <= 0 then
    return false;
  end if;
  update public.organizations
     set respondents_balance = respondents_balance - 1
   where id = org_id;
  return true;
end;
$$ language plpgsql security definer;
