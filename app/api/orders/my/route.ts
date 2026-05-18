import { NextResponse } from "next/server";
import {
  CUSTOMER_COOKIE_NAME,
  readCustomerFromSessionToken,
} from "../../../../lib/customer-auth";
import {
  findCustomerById,
  sanitizeCustomer,
} from "../../../../lib/customer-account";
import { getOrdersForCustomer } from "../../../../lib/order";

function getCookieValue(cookieHeader: string, name: string) {
  const match = cookieHeader.match(
    new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]+)`)
  );

  return match ? decodeURIComponent(match[1]) : null;
}

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const token = getCookieValue(cookieHeader, CUSTOMER_COOKIE_NAME);

    const session = await readCustomerFromSessionToken(token);

    if (!session?.customerUserId && !session?.customerId) {
      return NextResponse.json(
        { ok: false, error: "Customer login required." },
        { status: 401 }
      );
    }

    const customer = await findCustomerById(
      session.customerUserId || session.customerId
    );

    if (!customer) {
      return NextResponse.json(
        { ok: false, error: "Customer record not found." },
        { status: 404 }
      );
    }

    const orders = await getOrdersForCustomer({
      customerCompanyId: session.companyId || customer.company_id,
      customerUserId: session.customerUserId || customer.id,
      email: customer.email,
    });

    return NextResponse.json({
      ok: true,
      customer: sanitizeCustomer(customer),
      orders,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch my orders.",
      },
      { status: 500 }
    );
  }
}