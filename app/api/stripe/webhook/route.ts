import { NextResponse } from "next/server";

function jsonError(message: string, status: number) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
    },
    { status }
  );
}

function isPaymentEnabled() {
  return process.env.CHECKOUT_PAYMENT_ENABLED === "true";
}

export async function GET() {
  return jsonError(
    "Stripe webhook is disabled. Online payment checkout is not active.",
    405
  );
}

export async function POST() {
  if (!isPaymentEnabled()) {
    return jsonError(
      "Stripe webhook is disabled. Online payment checkout is not active.",
      400
    );
  }

  return jsonError(
    "Stripe webhook is not configured yet. Please configure Stripe webhook handling before enabling online payments.",
    501
  );
}