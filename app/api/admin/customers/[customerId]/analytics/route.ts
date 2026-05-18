import { NextResponse } from "next/server";
import { verifyAdminSessionToken } from "../../../../../../lib/admin-auth";
import {
  getCustomerAnalytics,
  ReportRangeKey,
} from "../../../../../../lib/customer-reports";

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function parseAdminTokenFromCookie(cookieHeader: string) {
  const match = cookieHeader.match(/ptx_admin_auth=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function getRange(value: string | null): ReportRangeKey {
  const allowed: ReportRangeKey[] = [
    "today",
    "week",
    "month",
    "year",
    "all",
    "custom",
  ];

  return allowed.includes(value as ReportRangeKey)
    ? (value as ReportRangeKey)
    : "month";
}

export async function GET(
  req: Request,
  context: { params: Promise<{ customerId: string }> }
) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const token = parseAdminTokenFromCookie(cookieHeader);
    const isAdmin = await verifyAdminSessionToken(token);

    if (!isAdmin) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const params = await context.params;
    const customerId = normalizeText(params.customerId);

    if (!customerId) {
      return NextResponse.json(
        { ok: false, error: "customerId is required." },
        { status: 400 }
      );
    }

    const url = new URL(req.url);
    const range = getRange(url.searchParams.get("range"));
    const startDate = url.searchParams.get("startDate") || "";
    const endDate = url.searchParams.get("endDate") || "";

    const analytics = await getCustomerAnalytics(customerId, {
      range,
      startDate,
      endDate,
    });

    return NextResponse.json({
      ok: true,
      ...analytics,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load customer analytics.",
      },
      { status: 500 }
    );
  }
}