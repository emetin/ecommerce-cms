import { NextResponse } from "next/server";
import {
  CUSTOMER_COOKIE_NAME,
  readCustomerFromSessionToken,
} from "../../../../lib/customer-auth";

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const match = cookieHeader.match(/ptx_customer_auth=([^;]+)/);
    const token = match ? decodeURIComponent(match[1]) : null;

    const customer = await readCustomerFromSessionToken(token);

    return NextResponse.json({
      ok: true,
      authenticated: Boolean(customer),
      customer,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        authenticated: false,
        customer: null,
        error:
          error instanceof Error
            ? error.message
            : "Müşteri oturumu okunamadı.",
      },
      { status: 500 }
    );
  }
}