import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  ADMIN_CSRF_COOKIE_NAME,
  createAdminSessionToken,
  getAdminCookieOptions,
  hasAdminCredentialsConfigured,
  markAdminLogin,
  verifyAdminCredentials,
  verifyCsrfToken,
} from "../../../../lib/admin-auth";
import {
  clearFailedAttempts,
  getClientIdentifier,
  getRateLimitStatus,
  registerFailedAttempt,
} from "../../../../lib/admin-rate-limit";

type LoginBody = {
  username?: string;
  email?: string;
  password?: string;
};

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

export async function POST(req: Request) {
  try {
    if (!hasAdminCredentialsConfigured()) {
      return NextResponse.json(
        {
          ok: false,
          error: "ADMIN_SESSION_SECRET is not configured.",
        },
        { status: 500 }
      );
    }

    const clientKey = `admin-login:${getClientIdentifier(req)}`;
    const limitStatus = getRateLimitStatus(clientKey);

    if (!limitStatus.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: `Too many failed login attempts. Please try again in ${limitStatus.retryAfterSeconds} seconds.`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(limitStatus.retryAfterSeconds),
          },
        }
      );
    }

    const csrfHeader = req.headers.get("x-csrf-token");
    const csrfCookie = req.headers.get("cookie") || "";
    const csrfMatch = csrfCookie.match(/ptx_admin_csrf=([^;]+)/);
    const csrfCookieToken = csrfMatch ? decodeURIComponent(csrfMatch[1]) : null;

    if (!verifyCsrfToken(csrfCookieToken, csrfHeader)) {
      return NextResponse.json(
        { ok: false, error: "Invalid security verification." },
        { status: 403 }
      );
    }

    const body = (await req.json()) as LoginBody;

    const email = normalizeLower(body?.email || body?.username);
    const password = String(body?.password || "");

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "Email and password are required." },
        { status: 400 }
      );
    }

    const adminUser = await verifyAdminCredentials(email, password);

    if (!adminUser) {
      registerFailedAttempt(clientKey);

      return NextResponse.json(
        { ok: false, error: "Email or password is incorrect." },
        { status: 401 }
      );
    }

    clearFailedAttempts(clientKey);

    const token = await createAdminSessionToken(adminUser);

    const response = NextResponse.json({
      ok: true,
      message: "Login successful.",
      admin: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        roleKey: adminUser.roleKey,
        permissions: adminUser.permissions,
        mustChangePassword: adminUser.mustChangePassword,
      },
      nextPath: adminUser.mustChangePassword
  ? "/admin/change-password"
  : "/admin",
    });

    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: token,
      ...getAdminCookieOptions(),
    });

    response.cookies.set({
      name: ADMIN_CSRF_COOKIE_NAME,
      value: "",
      path: "/",
      maxAge: 0,
    });

    void markAdminLogin(adminUser.id).catch((error) => {
      console.error(
        "Failed to update admin last login timestamp:",
        error instanceof Error ? error.message : error
      );
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error during login.",
      },
      { status: 500 }
    );
  }
}