import { NextResponse } from "next/server";
import {
  CUSTOMER_COOKIE_NAME,
  getExpiredCustomerCookieOptions,
} from "../../../../lib/customer-auth";

export async function POST(req: Request) {
  const response = NextResponse.redirect(new URL("/portal-login", req.url));

  response.cookies.set({
    name: CUSTOMER_COOKIE_NAME,
    value: "",
    ...getExpiredCustomerCookieOptions(),
  });

  return response;
}