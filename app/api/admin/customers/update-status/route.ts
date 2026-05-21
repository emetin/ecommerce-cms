import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "../../../../../lib/api/admin";
import { updateCustomerStatus } from "../../../../../lib/db/customers";

type UpdateStatusBody = {
  customerId?: string;
  customer_user_id?: string;
  companyId?: string;
  company_id?: string;
  status?: string;
};

const ALLOWED_STATUSES = new Set([
  "pending",
  "active",
  "suspended",
  "archived",
]);

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

export async function POST(req: Request) {
  try {
    await requireAdminFromRequest(req);

    const body = (await req.json().catch(() => ({}))) as UpdateStatusBody;

    const customerUserId = normalizeText(
      body?.customer_user_id || body?.customerId
    );

    const companyId = normalizeText(body?.company_id || body?.companyId);
    const status = normalizeLower(body?.status);

    if (!customerUserId) {
      return NextResponse.json(
        { ok: false, error: "Customer user id is required." },
        { status: 400 }
      );
    }

    if (!status || !ALLOWED_STATUSES.has(status)) {
      return NextResponse.json(
        { ok: false, error: "Invalid customer status." },
        { status: 400 }
      );
    }

    const item = await updateCustomerStatus({
      customerUserId,
      companyId,
      status,
    });

    return NextResponse.json({
      ok: true,
      message: "Customer status updated successfully.",
      item,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error while updating customer status.",
      },
      { status: 500 }
    );
  }
}