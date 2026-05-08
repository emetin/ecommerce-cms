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
          error: "Collection product id is required.",
        },
        { status: 400 }
      );
    }

    const result = await deleteSheetRowsByField(
      "collection_products",
      "id",
      id
    );

    return NextResponse.json({
      ok: true,
      deleted: result.deletedCount || 0,
      message: "Collection product link deleted successfully.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete collection product link.",
      },
      { status: 500 }
    );
  }
}