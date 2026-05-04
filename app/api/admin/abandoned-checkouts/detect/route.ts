import { NextResponse } from "next/server";
import { isAuthenticatedAdmin } from "../../../../../lib/admin-auth";
import { detectAbandonedCheckoutSessions } from "../../../../../lib/abandoned-checkouts";

type DetectBody = {
  minutesSinceLastActivity?: number;
};

function getAdminTokenFromRequest(req: Request) {
  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader.match(/ptx_admin_auth=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function toSafeNumber(value: unknown, fallback: number) {
  const next = Number(value);

  if (!Number.isFinite(next) || next <= 0) {
    return fallback;
  }

  return next;
}

export async function POST(req: Request) {
  try {
    const allowed = await isAuthenticatedAdmin(getAdminTokenFromRequest(req));

    if (!allowed) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    let body: DetectBody = {};

    try {
      body = (await req.json()) as DetectBody;
    } catch {
      body = {};
    }

    const result = await detectAbandonedCheckoutSessions({
      minutesSinceLastActivity: toSafeNumber(
        body.minutesSinceLastActivity,
        60
      ),
    });

    return NextResponse.json({
      ok: true,
      message: `${result.updatedCount} checkout session(s) marked as abandoned.`,
      updatedCount: result.updatedCount,
      items: result.items,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to detect abandoned checkouts.",
      },
      { status: 500 }
    );
  }
}