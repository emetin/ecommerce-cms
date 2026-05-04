import { NextResponse } from "next/server";
import { isAuthenticatedAdmin } from "../../../../../lib/admin-auth";
import {
  getCheckoutSessionById,
  updateCheckoutSession,
  type UpdateCheckoutSessionInput,
} from "../../../../../lib/abandoned-checkouts";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function getAdminTokenFromRequest(req: Request) {
  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader.match(/ptx_admin_auth=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

export async function GET(req: Request, context: RouteContext) {
  try {
    const allowed = await isAuthenticatedAdmin(getAdminTokenFromRequest(req));

    if (!allowed) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const result = await getCheckoutSessionById(id);

    if (!result) {
      return NextResponse.json(
        { ok: false, error: "Checkout session not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      session: result.session,
      items: result.items,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load checkout session.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const allowed = await isAuthenticatedAdmin(getAdminTokenFromRequest(req));

    if (!allowed) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const body = (await req.json()) as UpdateCheckoutSessionInput;

    const result = await updateCheckoutSession(id, {
      customer_id:
        body.customer_id === undefined
          ? undefined
          : normalizeText(body.customer_id),
      email: body.email === undefined ? undefined : normalizeLower(body.email),
      company:
        body.company === undefined ? undefined : normalizeText(body.company),
      status:
        body.status === undefined ? undefined : normalizeLower(body.status),
      stage: body.stage === undefined ? undefined : normalizeLower(body.stage),
      currency:
        body.currency === undefined
          ? undefined
          : normalizeText(body.currency || "USD") || "USD",
      note: body.note === undefined ? undefined : normalizeText(body.note),
      recovered_order_id:
        body.recovered_order_id === undefined
          ? undefined
          : normalizeText(body.recovered_order_id),
      items: Array.isArray(body.items) ? body.items : undefined,
    });

    return NextResponse.json({
      ok: true,
      message: "Checkout session updated successfully.",
      session: result.session,
      items: result.items,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update checkout session.",
      },
      { status: 500 }
    );
  }
}