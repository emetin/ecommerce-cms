import { NextResponse } from "next/server";
import { archiveCustomer } from "../../../../../lib/db/customers";

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const customerUserId = normalizeText(body?.customer_user_id);
    const companyId = normalizeText(body?.company_id);

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