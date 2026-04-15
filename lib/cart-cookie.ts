import { cookies } from "next/headers";
import { createToken } from "./ids";

export const CART_COOKIE_NAME = "globaltex_cart_token";

type CookieSetterOptions = {
  maxAge?: number;
};

export async function getCartTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CART_COOKIE_NAME)?.value?.trim();

  return token || null;
}

export async function ensureCartToken(
  options?: CookieSetterOptions
): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(CART_COOKIE_NAME)?.value?.trim();

  if (existing) {
    return existing;
  }

  const token = createToken("cart");
  const maxAge = options?.maxAge ?? 60 * 60 * 24 * 30;

  cookieStore.set(CART_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });

  return token;
}

export async function clearCartToken(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(CART_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}