import { NextResponse } from "next/server";
import { isAuthenticatedAdmin } from "../../../../../../lib/admin-auth";
import { updateCheckoutSessionStatus } from "../../../../../../lib/abandoned-checkouts";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type UpdateStatusBody = {
  status?: string;
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

export async function POST(req: Request, context: RouteContext) {
  try {
    const allowed = await isAuthenticatedAdmin(getAdminTokenFromRequest(req));

    if (!allowed) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const body = (await req.json()) as UpdateStatusBody;
    const status = normalizeLower(body.status);

    if (!status) {
      return NextResponse.json(
        { ok: false, error: "status is required." },
        { status: 400 }
      );
    }

    const result = await updateCheckoutSessionStatus(id, status);

    return NextResponse.json({
      ok: true,
      message: "Checkout status updated successfully.",
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
            : "Failed to update checkout status.",
      },
      { status: 500 }
    );
  }
}