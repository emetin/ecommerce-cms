import bcrypt from "bcryptjs";

export const CUSTOMER_RESET_TOKEN_EXPIRES_MINUTES = 15;
export const CUSTOMER_RESET_TOKEN_BYTES = 32;

export function normalizeEmail(email: string) {
  return String(email || "").trim().toLowerCase();
}

export function generateRawResetToken(size = CUSTOMER_RESET_TOKEN_BYTES) {
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  return Buffer.from(bytes).toString("base64url");
}

export async function hashResetToken(token: string) {
  return bcrypt.hash(token, 12);
}

export async function verifyResetToken(token: string, tokenHash: string) {
  return bcrypt.compare(token, tokenHash);
}

export function createResetExpiryIso() {
  return new Date(
    Date.now() + CUSTOMER_RESET_TOKEN_EXPIRES_MINUTES * 60 * 1000
  ).toISOString();
}

export function isExpired(expiresAtIso: string) {
  const expiresAt = new Date(expiresAtIso).getTime();
  return Number.isNaN(expiresAt) || expiresAt <= Date.now();
}

export function buildCustomerResetUrl(token: string, email: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!appUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL is not configured.");
  }

  const url = new URL("/account/reset-password", appUrl);
  url.searchParams.set("token", token);
  url.searchParams.set("email", email);

  return url.toString();
}

export function isStrongPassword(password: string) {
  return (
    password.length >= 10 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}