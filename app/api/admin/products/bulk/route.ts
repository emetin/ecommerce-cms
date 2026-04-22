import { NextRequest, NextResponse } from "next/server";
import { updateSheetObjectBySlug } from "../../../../../lib/sheets";

type BulkProductUpdateItem = {
  slug: string;
  changes: Record<string, unknown>;
};

function toText(value: unknown): string {
  return String(value ?? "").trim();
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeChanges(changes: Record<string, unknown>) {
  const allowedFields = new Set([
    "title",
    "description",
    "short_description",
    "image",
    "image_file_id",
    "image_alt",
    "image_uploaded_at",
    "gallery",
    "collection_slug",
    "status",
    "featured",
    "seo_title",
    "seo_description",
    "vendor",
    "product_category",
    "type",
    "tags",
    "collection",
  ]);

  const cleaned: Record<string, string> = {};

  for (const [key, value] of Object.entries(changes)) {
    if (!allowedFields.has(key)) continue;
    cleaned[key] = toText(value);
  }

  return cleaned;
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (!body || !Array.isArray(body.items)) {
      return NextResponse.json(
        { ok: false, error: "'items' must be an array." },
        { status: 400 }
      );
    }

    const items = body.items as BulkProductUpdateItem[];

    if (items.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No items provided for update." },
        { status: 400 }
      );
    }

    const results: Array<{
      slug: string;
      ok: boolean;
      error?: string;
    }> = [];

    for (const item of items) {
      const slug = toText(item?.slug);

      if (!slug) {
        results.push({
          slug: "",
          ok: false,
          error: "Missing slug.",
        });
        continue;
      }

      if (!isObject(item?.changes)) {
        results.push({
          slug,
          ok: false,
          error: "'changes' must be an object.",
        });
        continue;
      }

      const cleanedChanges = sanitizeChanges(item.changes);

      if (Object.keys(cleanedChanges).length === 0) {
        results.push({
          slug,
          ok: false,
          error: "No valid fields to update.",
        });
        continue;
      }

      try {
        await updateSheetObjectBySlug("products", slug, {
          ...cleanedChanges,
          updated_at: new Date().toISOString(),
        });

        results.push({
          slug,
          ok: true,
        });
      } catch (error) {
        results.push({
          slug,
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Update operation failed.",
        });
      }
    }

    const successCount = results.filter((item) => item.ok).length;
    const failedCount = results.length - successCount;

    return NextResponse.json({
      ok: failedCount === 0,
      summary: {
        total: results.length,
        successCount,
        failedCount,
      },
      results,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Bulk update failed.",
      },
      { status: 500 }
    );
  }
}