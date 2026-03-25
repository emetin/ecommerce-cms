import { NextResponse } from "next/server";
import { appendFormSheetRow, getFormSheetData } from "../../../lib/sheets";

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const email = normalizeText(body?.email).toLowerCase();
    const sourcePage = normalizeText(body?.source_page);

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { ok: false, error: "Valid email is required." },
        { status: 400 }
      );
    }

    const existing = (await getFormSheetData("newsletter_subscribers")) as Record<
      string,
      string
    >[];

    const alreadyExists = existing.some(
      (item) => String(item.email || "").trim().toLowerCase() === email
    );

    if (alreadyExists) {
      return NextResponse.json({
        ok: true,
        message: "Email is already subscribed.",
      });
    }

    const now = new Date().toISOString();
    const id = `newsletter_${Date.now()}`;

    await appendFormSheetRow("newsletter_subscribers", [
      id,
      email,
      sourcePage,
      "active",
      now,
      "",
      "",
    ]);

    return NextResponse.json({
      ok: true,
      message: "Newsletter subscription saved successfully.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to submit newsletter form.",
      },
      { status: 500 }
    );
  }
}