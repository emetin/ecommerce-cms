import { NextResponse } from "next/server";
import { getCartTokenFromCookies } from "../../../../lib/cart-cookie";
import { createOrderFromCartToken } from "../../../../lib/order";

export async function POST(req: Request) {
  try {
    const cartToken = await getCartTokenFromCookies();

    if (!cartToken) {
      return NextResponse.json(
        { ok: false, error: "Cart token not found." },
        { status: 400 }
      );
    }

    const body = await req.json();

    const email = String(body?.email || "").trim().toLowerCase();
    const firstName = String(body?.first_name || "").trim();
    const lastName = String(body?.last_name || "").trim();
    const company = String(body?.company || "").trim();
    const phone = String(body?.phone || "").trim();
    const country = String(body?.country || "").trim();
    const city = String(body?.city || "").trim();
    const addressLine1 = String(body?.address_line_1 || "").trim();
    const addressLine2 = String(body?.address_line_2 || "").trim();
    const postalCode = String(body?.postal_code || "").trim();
    const note = String(body?.note || "").trim();

    if (!email) {
      return NextResponse.json(
        { ok: false, error: "email is required." },
        { status: 400 }
      );
    }

    const result = await createOrderFromCartToken(cartToken, {
      email,
      first_name: firstName,
      last_name: lastName,
      company,
      phone,
      country,
      city,
      address_line_1: addressLine1,
      address_line_2: addressLine2,
      postal_code: postalCode,
      note,
    });

    return NextResponse.json({
      ok: true,
      order: result.order,
      items: result.items,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create order.";

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}