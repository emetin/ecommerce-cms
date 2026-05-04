import { NextResponse } from "next/server";
import { getSheetData } from "../../../../lib/sheets";

export const runtime = "nodejs";

type FormType = "contact" | "newsletter" | "career";

const SHEET_MAP: Record<FormType, string> = {
  contact: "contact_messages",
  newsletter: "newsletter_subscribers",
  career: "career_applications",
};

function normalize(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalize(value).toLowerCase();
}

function matchesSearch(item: Record<string, string>, query: string) {
  if (!query) return true;

  const searchableText = Object.values(item)
    .map((value) => normalize(value))
    .join(" ")
    .toLowerCase();

  return searchableText.includes(query.toLowerCase());
}

function matchesStatus(item: Record<string, string>, status: string) {
  if (!status || status === "all") return true;

  return normalizeLower(item.status) === status.toLowerCase();
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const typeParam = normalize(searchParams.get("type")) as FormType;
    const type: FormType = ["contact", "newsletter", "career"].includes(typeParam)
      ? typeParam
      : "contact";

    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.max(1, Number(searchParams.get("limit") || 50));
    const query = normalize(searchParams.get("q"));
    const status = normalize(searchParams.get("status") || "all");

    const sheetName = SHEET_MAP[type];

    const data = (await getSheetData(sheetName, {
      forceFresh: true,
      ttlSeconds: 0,
      mode: "forms",
    })) as Record<string, string>[];

    const filteredItems = data
      .filter((item) => matchesSearch(item, query))
      .filter((item) => matchesStatus(item, status))
      .reverse();

    const total = filteredItems.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const startIndex = (page - 1) * limit;
    const items = filteredItems.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      ok: true,
      type,
      items,
      total,
      totalPages,
      page,
      limit,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load form records.",
      },
      { status: 500 }
    );
  }
}