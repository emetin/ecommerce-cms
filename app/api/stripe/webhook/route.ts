import Stripe from "stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getStripeServer } from "../../../../lib/stripe";
import { createPaidOrderFromCartToken } from "../../../../lib/order";

function normalize(value?: string | null) {
  return String(value || "").trim();
}

export async function POST(req: Request) {
  try {
    const stripe = getStripeServer();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return NextResponse.json(
        { ok: false, error: "STRIPE_WEBHOOK_SECRET is not configured." },
        { status: 500 }
      );
    }

    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { ok: false, error: "Missing Stripe signature." },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (error) {
      return NextResponse.json(
        {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Webhook signature verification failed.",
        },
        { status: 400 }
      );
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const cartToken = normalize(session.metadata?.cart_token);
      const email =
        normalize(session.metadata?.customer_email) ||
        normalize(session.customer_details?.email);

      if (cartToken && email) {
        await createPaidOrderFromCartToken(cartToken, {
          email,
          first_name: normalize(session.metadata?.first_name),
          last_name: normalize(session.metadata?.last_name),
          company: normalize(session.metadata?.company),
          phone: normalize(session.metadata?.phone),
          country: normalize(session.metadata?.country),
          city: normalize(session.metadata?.city),
          address_line_1: normalize(session.metadata?.address_line_1),
          address_line_2: normalize(session.metadata?.address_line_2),
          postal_code: normalize(session.metadata?.postal_code),
          note: `Stripe Checkout Session: ${session.id}`,
          paid_status: "paid",
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Webhook failed.",
      },
      { status: 500 }
    );
  }
}