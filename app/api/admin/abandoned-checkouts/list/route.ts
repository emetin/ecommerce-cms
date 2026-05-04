import { NextResponse } from "next/server";
import { isAuthenticatedAdmin } from "../../../../../lib/admin-auth";
import { getAllCheckoutSessions } from "../../../../../lib/abandoned-checkouts";

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

export async function GET(req: Request) {
  try {
    const allowed = await isAuthenticatedAdmin(getAdminTokenFromRequest(req));

    if (!allowed) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = normalizeLower(searchParams.get("status") || "all");
    const stage = normalizeLower(searchParams.get("stage") || "all");
    const query = normalizeLower(searchParams.get("q") || "");

    const sessions = await getAllCheckoutSessions();

    const items = sessions.filter((session) => {
      const matchesStatus =
        status === "all" ? true : normalizeLower(session.status) === status;

      const matchesStage =
        stage === "all" ? true : normalizeLower(session.stage) === stage;

      const haystack = [
        session.cart_token,
        session.customer_id,
        session.email,
        session.company,
        session.status,
        session.stage,
        session.note,
        session.recovered_order_id,
      ]
        .map(normalizeLower)
        .join(" ");

      const matchesQuery = query ? haystack.includes(query) : true;

      return matchesStatus && matchesStage && matchesQuery;
    });

    return NextResponse.json({
      ok: true,
      items,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load abandoned checkouts.",
      },
      { status: 500 }
    );
  }
}