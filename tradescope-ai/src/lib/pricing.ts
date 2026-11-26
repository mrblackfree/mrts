/**
 * Pricing plans (server side): prices and checkout links come from the admin page (or environment variables)
 * and are read on every request, so a change takes effect without a rebuild. Payment itself happens on the
 * linked checkout page (e.g. a Toss Payments or Stripe payment link); this app never handles card data.
 */
import { isHttpsUrl } from '@/lib/settings/schema';
import { getSetting } from '@/lib/settings';

export interface PublicPricing {
  currency: 'KRW';
  perCase: { price: number | null; checkoutUrl: string | null };
  subscription: { monthly: number | null; yearly: number | null; checkoutUrl: string | null };
}

function amount(key: string): number | null {
  const n = Number(getSetting(key));
  return getSetting(key) !== undefined && Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

/** An https checkout link, or null (an environment value is not re-validated by the admin form). */
function link(key: string): string | null {
  const v = getSetting(key);
  return v && isHttpsUrl(v) ? v : null;
}

export function publicPricing(): PublicPricing {
  return {
    currency: 'KRW',
    perCase: { price: amount('PRICE_CASE_KRW'), checkoutUrl: link('CHECKOUT_CASE_URL') },
    subscription: { monthly: amount('PRICE_SUB_MONTHLY_KRW'), yearly: amount('PRICE_SUB_YEARLY_KRW'), checkoutUrl: link('CHECKOUT_SUB_URL') },
  };
}
