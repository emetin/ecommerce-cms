import bcrypt from "bcryptjs";
import {
  verifyAdminUserCredentials,
  updateAdminUserLastLogin,
  type AdminUserWithPermissions,
} from "./admin-users";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const ADMIN_COOKIE_NAME = "ptx_admin_auth";
export const ADMIN_CSRF_COOKIE_NAME = "ptx_admin_csrf";
export const ADMIN_SESSION_DURATION_SECONDS = 60 * 60 * 8;
export const ADMIN_CSRF_DURATION_SECONDS = 60 * 30;

type AdminSessionPayload = {
  sub: "admin";
  adminUserId: string;
  email: string;
  name: string;
  roleKey: string;
  permissions: string[];
  mustChangePassword: boolean;
  exp: number;
  iat: number;
  nonce: string;
};

function getEnvValue(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is not defined.`);
  }

  return value;
}

function bytesToBase64Url(bytes: Uint8Array) {
  const base64 = Buffer.from(bytes).toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function stringToBase64Url(value: string) {
  return bytesToBase64Url(encoder.encode(value));
}

function fromBase64Url(base64Url: string) {
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return new Uint8Array(Buffer.from(padded, "base64"));
}

async function getSigningKey() {
  const secret = getEnvValue("ADMIN_SESSION_SECRET");

  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

async function signValue(value: string) {
  const key = await getSigningKey();
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return bytesToBase64Url(new Uint8Array(signature));
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;

  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

function nowInSeconds() {
  return Math.floor(Date.now() / 1000);
}

function isAdminAuthDisabled() {
  return process.env.ADMIN_AUTH_DISABLED === "true";
}

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function normalizePermissions(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => normalizeText(item)).filter(Boolean);
}

export function createNonce(size = 24) {
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  return bytesToBase64Url(bytes);
}

export function getAdminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_DURATION_SECONDS,
  };
}

export function getExpiredAdminCookieOptions() {
  return {
    ...getAdminCookieOptions(),
    maxAge: 0,
  };
}

export function getCsrfCookieOptions() {
  return {
    httpOnly: false,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_CSRF_DURATION_SECONDS,
  };
}

export function getExpiredCsrfCookieOptions() {
  return {
    ...getCsrfCookieOptions(),
    maxAge: 0,
  };
}

export async function createAdminSessionToken(user: AdminUserWithPermissions) {
  if (isAdminAuthDisabled()) {
    return "dev-admin-bypass-token";
  }

  const payload: AdminSessionPayload = {
    sub: "admin",
    adminUserId: normalizeText(user.id),
    email: normalizeLower(user.email),
    name: normalizeText(user.name),
    roleKey: normalizeLower(user.roleKey),
    permissions: normalizePermissions(user.permissions),
    mustChangePassword: Boolean(user.mustChangePassword),
    iat: nowInSeconds(),
    exp: nowInSeconds() + ADMIN_SESSION_DURATION_SECONDS,
    nonce: createNonce(16),
  };

  const header = {
    alg: "HS256",
    typ: "PTX-AUTH",
  };

  const encodedHeader = stringToBase64Url(JSON.stringify(header));
  const encodedPayload = stringToBase64Url(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const signature = await signValue(unsignedToken);

  return `${unsignedToken}.${signature}`;
}

export async function readAdminSessionToken(token?: string | null) {
  if (isAdminAuthDisabled()) {
    return {
      adminUserId: "dev-admin",
      email: "dev-admin@local.test",
      name: "Development Admin",
      roleKey: "super_admin",
      permissions: ["settings:manage"],
      mustChangePassword: false,
    };
  }

  if (!token) {
    return null;
  }

  const parts = token.split(".");

  if (parts.length !== 3) {
    return null;
  }

  const [encodedHeader, encodedPayload, receivedSignature] = parts;
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = await signValue(unsignedToken);

  if (!safeEqual(receivedSignature, expectedSignature)) {
    return null;
  }

  try {
    const payloadJson = decoder.decode(fromBase64Url(encodedPayload));
    const payload = JSON.parse(payloadJson) as Partial<AdminSessionPayload>;

    if (payload.sub !== "admin") {
      return null;
    }

    if (typeof payload.exp !== "number" || payload.exp <= nowInSeconds()) {
      return null;
    }

    return {
      adminUserId: normalizeText(payload.adminUserId),
      email: normalizeLower(payload.email),
      name: normalizeText(payload.name),
      roleKey: normalizeLower(payload.roleKey),
      permissions: normalizePermissions(payload.permissions),
      mustChangePassword: Boolean(payload.mustChangePassword),
    };
  } catch {
    return null;
  }
}

export async function verifyAdminSessionToken(token?: string | null) {
  const session = await readAdminSessionToken(token);
  return Boolean(session?.adminUserId);
}

export async function isAuthenticatedAdmin(cookieValue?: string | null) {
  if (isAdminAuthDisabled()) {
    return true;
  }

  return verifyAdminSessionToken(cookieValue);
}

export function hasAdminCredentialsConfigured() {
  if (isAdminAuthDisabled()) {
    return true;
  }

  return Boolean(process.env.ADMIN_SESSION_SECRET?.trim());
}

export async function verifyAdminCredentials(email: string, password: string) {
  if (isAdminAuthDisabled()) {
    return {
      id: "dev-admin",
      email: "dev-admin@local.test",
      name: "Development Admin",
      roleKey: "super_admin",
      status: "active",
      mustChangePassword: false,
      lastLoginAt: "",
      createdAt: "",
      updatedAt: "",
      permissions: ["settings:manage"],
    };
  }

  return verifyAdminUserCredentials(email, password);
}

export async function markAdminLogin(userId: string) {
  return updateAdminUserLastLogin(userId);
}

export function createCsrfToken() {
  return createNonce(24);
}

export function verifyCsrfToken(
  cookieToken?: string | null,
  headerToken?: string | null
) {
  if (isAdminAuthDisabled()) {
    return true;
  }

  if (!cookieToken || !headerToken) {
    return false;
  }

  return safeEqual(cookieToken, headerToken);
}

export async function hashLegacyAdminPassword(password: string) {
  return bcrypt.hash(String(password || ""), 12);
}