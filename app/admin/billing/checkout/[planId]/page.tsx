import { startCheckoutAction } from '@/app/admin/billing/actions';

export const dynamic = 'force-dynamic';

/**
 * Hitting /admin/billing/checkout/[planId] starts the checkout for that plan.
 * This is a server component that triggers the server action and redirects.
 */
export default async function CheckoutStartPage({
  params,
}: {
  params: { planId: string };
}) {
  await startCheckoutAction(params.planId);
  // startCheckoutAction always redirects; the line below is unreachable but
  // satisfies TypeScript's return-type expectations.
  return null;
}
