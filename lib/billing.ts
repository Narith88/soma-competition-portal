import { createClient } from '@/lib/supabase/server';

export const TAX_RATE = 0.10; // 10%

export interface PlanFeatures {
  csv_export?: boolean;
  choice_images?: boolean | 'limited';
  custom_branding?: boolean;
  certificates?: boolean;
  max_admins?: number;
  tab_logs?: 'basic' | 'full';
}

export interface BillingPlan {
  id: string;
  kind: 'subscription' | 'package';
  display_name: string;
  description: string | null;
  price_usd_cents: number;
  respondents_per_cycle: number;
  features: PlanFeatures;
  sort_order: number;
}

export interface OrgBillingStatus {
  organization_id: string;
  plan: string; // 'trial' | 'free' | 'starter' | 'pro' | 'enterprise'
  subscription_status: string;
  trial_ends_at: string | null;
  current_period_ends_at: string | null;
  respondents_balance: number;
  trial_respondents_used: number;
  features: PlanFeatures;
  is_trial: boolean;
  trial_expired: boolean;
  out_of_respondents: boolean;
}

/** Format a US-cents value as "$1.50" / "$49.00". */
export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Tax + total breakdown for a given subtotal (in cents). */
export function taxBreakdown(subtotalCents: number): {
  subtotal: number;
  tax: number;
  total: number;
} {
  const tax = Math.round(subtotalCents * TAX_RATE);
  return { subtotal: subtotalCents, tax, total: subtotalCents + tax };
}

/** Load the full pricing catalog (public). */
export async function getPlans(): Promise<BillingPlan[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('billing_plans')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  return (data ?? []) as BillingPlan[];
}

/** Look up a single plan by id. */
export async function getPlan(id: string): Promise<BillingPlan | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('billing_plans')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle();
  return (data as BillingPlan | null) ?? null;
}

/** Compute the full billing status for a given organization id. */
export async function getOrgBillingStatus(
  orgId: string
): Promise<OrgBillingStatus | null> {
  const supabase = createClient();
  const { data: org } = await supabase
    .from('organizations')
    .select(
      'id, plan, subscription_status, trial_ends_at, current_period_ends_at, respondents_balance, trial_respondents_used'
    )
    .eq('id', orgId)
    .maybeSingle();
  if (!org) return null;

  const planRow = await getPlan(org.plan);
  const features = (planRow?.features ?? {}) as PlanFeatures;

  const isTrial = org.plan === 'trial';
  const trialExpired =
    isTrial &&
    !!org.trial_ends_at &&
    new Date(org.trial_ends_at).getTime() < Date.now();

  const outOfRespondents = isTrial
    ? (org.trial_respondents_used ?? 0) >= 30
    : (org.respondents_balance ?? 0) <= 0;

  return {
    organization_id: org.id,
    plan: org.plan,
    subscription_status: org.subscription_status,
    trial_ends_at: org.trial_ends_at,
    current_period_ends_at: org.current_period_ends_at,
    respondents_balance: org.respondents_balance ?? 0,
    trial_respondents_used: org.trial_respondents_used ?? 0,
    features,
    is_trial: isTrial,
    trial_expired: trialExpired,
    out_of_respondents: outOfRespondents,
  };
}

/** Convenience: does this org currently allow a paid feature? */
export function hasFeature(
  status: OrgBillingStatus | null,
  feature: keyof PlanFeatures
): boolean {
  if (!status) return false;
  const v = status.features[feature];
  return v === true || (typeof v === 'number' && v > 0);
}

/** True when this org can start a new student attempt right now. */
export function canAcceptRespondents(status: OrgBillingStatus | null): boolean {
  if (!status) return false;
  if (status.is_trial) {
    return !status.trial_expired && !status.out_of_respondents;
  }
  // Paid plans / packages: just need balance > 0.
  return !status.out_of_respondents;
}

/** Human label for a plan's quota: "30 respondents" / "300 / month" / "100 total". */
export function quotaLabel(plan: BillingPlan): string {
  if (plan.kind === 'subscription') {
    return `${plan.respondents_per_cycle.toLocaleString()} respondents / month`;
  }
  return `${plan.respondents_per_cycle.toLocaleString()} respondents (one-time)`;
}
