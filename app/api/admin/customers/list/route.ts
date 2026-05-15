import { NextResponse } from "next/server";
import { getCustomersList } from "../../../../../lib/db/customers";

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const status = normalizeLower(searchParams.get("status"));
    const q = normalizeText(searchParams.get("q"));

    const limitParam = Number(searchParams.get("limit") || "50");
    const pageParam = Number(searchParams.get("page") || "1");

    const limit =
      Number.isFinite(limitParam) && limitParam > 0
        ? Math.min(limitParam, 200)
        : 50;

    const page =
      Number.isFinite(pageParam) && pageParam > 0
        ? Math.floor(pageParam)
        : 1;

    const result = await getCustomersList({
      status,
      q,
      page,
      limit,
    });

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch customers.",
      },
      { status: 500 }
    );
  }
}