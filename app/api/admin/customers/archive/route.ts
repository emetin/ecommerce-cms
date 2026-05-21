import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "../../../../../lib/api/admin";
import { archiveCustomer } from "../../../../../lib/db/customers";

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

export async function POST(req: Request) {
  try {
    await requireAdminFromRequest(req);

    const body = await req.json().catch(() => ({}));

    const customerUserId = normalizeText(
      body?.customer_user_id || body?.customerId
    );
    const companyId = normalizeText(body?.company_id || body?.companyId);

    if (!customerUserId) {
      return NextResponse.json(
        { ok: false, error: "Customer user id is required." },
        { status: 400 }
      );
    }

    const item = await archiveCustomer({
      customerUserId,
      companyId,
    });

    return NextResponse.json({
      ok: true,
      message: "Customer archived successfully.",
      item,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to archive customer.",
      },
      { status: 500 }
    );
  }
}