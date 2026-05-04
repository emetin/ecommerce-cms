import { NextResponse } from "next/server";
import { getSheetData } from "../../../../../lib/sheets";

export const runtime = "nodejs";

export async function GET() {
  try {
    const [contactMessages, newsletterSubscribers, careerApplications] =
      await Promise.all([
        getSheetData("contact_messages", {
          forceFresh: true,
          ttlSeconds: 0,
          mode: "forms",
        }),
        getSheetData("newsletter_subscribers", {
          forceFresh: true,
          ttlSeconds: 0,
          mode: "forms",
        }),
        getSheetData("career_applications", {
          forceFresh: true,
          ttlSeconds: 0,
          mode: "forms",
        }),
      ]);

    return NextResponse.json({
      ok: true,
      contactMessages,
      newsletterSubscribers,
      careerApplications,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load form submissions.",
      },
      { status: 500 }
    );
  }
}