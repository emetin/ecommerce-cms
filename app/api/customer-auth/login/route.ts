import { NextResponse } from "next/server";

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const email = normalizeText(body?.email).toLowerCase();
    const password = normalizeText(body?.password);

    if (!email) {
      return NextResponse.json(
        { ok: false, error: "Email is required." },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { ok: false, error: "Password is required." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error:
          "Customer login route is not fully configured yet. Add your authentication logic here.",
      },
      { status: 501 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Login request failed.",
      },
      { status: 500 }
    );
  }
}