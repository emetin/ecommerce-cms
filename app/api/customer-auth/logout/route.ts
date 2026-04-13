import { NextResponse } from "next/server";
import {
  CUSTOMER_COOKIE_NAME,
  getExpiredCustomerCookieOptions,
} from "../../../../lib/customer-auth";

export async function POST() {
  const response = NextResponse.json({
    ok: true,
    message: "Çıkış yapıldı.",
  });

  response.cookies.set({
    name: CUSTOMER_COOKIE_NAME,
    value: "",
    ...getExpiredCustomerCookieOptions(),
  });

  return response;
}