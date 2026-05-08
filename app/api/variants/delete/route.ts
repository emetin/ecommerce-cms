import { NextResponse } from "next/server";
import { deleteSheetRowsByField } from "../../../../lib/sheets";

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const id = normalizeText(body?.id);

    if (!id) {
      return NextResponse.json(
        {
          ok: false,
          error: "Variant id is required.",
        },
        { status: 400 }
      );
    }

    const result = await deleteSheetRowsByField("product_variants", "id", id);

    return NextResponse.json({
      ok: true,
      deleted: result.deletedCount || 0,
      message: "Variant deleted successfully.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to delete variant.",
      },
      { status: 500 }
    );
  }
}