type StripeDisabledClient = {
  checkout: {
    sessions: {
      create: () => Promise<never>;
    };
  };
  webhooks: {
    constructEvent: () => never;
  };
};

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

export function isStripePaymentEnabled() {
  return process.env.CHECKOUT_PAYMENT_ENABLED === "true";
}

export function getStripeSecretKey() {
  return normalizeText(process.env.STRIPE_SECRET_KEY);
}

export function getStripeWebhookSecret() {
  return normalizeText(process.env.STRIPE_WEBHOOK_SECRET);
}

/**
 * Compatibility helper.
 *
 * Stripe package is intentionally not imported here.
 * Current B2B flow uses quote request, not online payment.
 *
 * Future payment activation options:
 * 1. Install Stripe package:
 *    npm install stripe
 *
 * 2. Rebuild this file with real Stripe SDK import:
 *    import Stripe from "stripe";
 *
 * 3. Configure:
 *    CHECKOUT_PAYMENT_ENABLED=true
 *    STRIPE_SECRET_KEY=sk_live_xxx
 *    STRIPE_WEBHOOK_SECRET=whsec_xxx
 */
export function getStripeServer(): StripeDisabledClient {
  if (!isStripePaymentEnabled()) {
    throw new Error(
      "Stripe payment is disabled. Please use Submit Quote Request."
    );
  }

  if (!getStripeSecretKey()) {
    throw new Error(
      "STRIPE_SECRET_KEY is not configured. Please configure Stripe before enabling online payments."
    );
  }

  throw new Error(
    "Stripe SDK is not installed. Run `npm install stripe` and restore the real Stripe server implementation before enabling online payments."
  );
}