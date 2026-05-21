import { NextRequest, NextResponse } from "next/server";
import { parseCsvImportText } from "../../../../lib/import/csv-import";
import { parseJsonImportText } from "../../../../lib/import/json-import";
import { createSupabaseAdminClient } from "../../../../lib/supabase/admin";

type IncomingCollection = Record<string, unknown>;

const ALLOWED_STATUS = ["published", "draft", "archived"];

function makeSlug(text: string) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function normalizeStatus(value: unknown) {
  const status = normalizeLower(value || "draft");

  if (ALLOWED_STATUS.includes(status)) {
    return status;
  }

  return "draft";
}

function toIntegerOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return null;
  }

  return Math.floor(number);
}

function prepareCollectionPayload(rawItem: IncomingCollection, existingItem?: any) {
  const now = new Date().toISOString();

  const title = normalizeText(rawItem.title || existingItem?.title);
  const slug = makeSlug(normalizeText(rawItem.slug) || title);

  const description = normalizeText(rawItem.description);
  const imageUrl = normalizeText(rawItem.image_url || rawItem.image);
  const imageFileId = normalizeText(rawItem.image_file_id);
  const imageAlt = normalizeText(rawItem.image_alt || title);

  const status = normalizeStatus(rawItem.status);
  const sortOrder = toIntegerOrNull(rawItem.sort_order);

  const seoTitle = normalizeText(rawItem.seo_title || title);
  const seoDescription = normalizeText(
    rawItem.seo_description || description
  );

  return {
    title,
    slug,
    description,
    imageUrl,
    imageFileId,
    imageAlt,
    status,
    sortOrder,
    seoTitle,
    seoDescription,
    now,
  };
}

async function importCollection(rawItem: IncomingCollection) {
  const supabase = createSupabaseAdminClient();

  const preparedSlug = makeSlug(
    normalizeText(rawItem.slug) || normalizeText(rawItem.title)
  );

  if (!preparedSlug) {
    throw new Error("slug or title is required.");
  }

  const { data: existingItem, error: existingError } = await supabase
    .from("collections")
    .select("id, title, slug, created_at")
    .eq("slug", preparedSlug)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  const prepared = prepareCollectionPayload(rawItem, existingItem);

  if (!prepared.title) {
    throw new Error("title is required.");
  }

  const payload = {
    title: prepared.title,
    slug: prepared.slug,
    description: prepared.description || null,
    image_url: prepared.imageUrl || null,
    image_file_id: prepared.imageFileId || null,
    image_alt: prepared.imageAlt || null,
    status: prepared.status,
    sort_order: prepared.sortOrder,
    seo_title: prepared.seoTitle || null,
    seo_description: prepared.seoDescription || null,
    updated_at: prepared.now,
  };

  if (existingItem?.id) {
    const { error: updateError } = await supabase
      .from("collections")
      .update(payload)
      .eq("id", existingItem.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return "updated" as const;
  }

  const { error: insertError } = await supabase.from("collections").insert({
    ...payload,
    created_at: prepared.now,
  });

  if (insertError) {
    throw new Error(insertError.message);
  }

  return "inserted" as const;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const format = String(body?.format || "csv").trim().toLowerCase();
    const text = String(body?.text || "");

    if (!["csv", "json"].includes(format)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Invalid import format. Use "csv" or "json".',
        },
        { status: 400 }
      );
    }

    if (!text.trim()) {
      return NextResponse.json(
        { ok: false, error: "Import content is empty." },
        { status: 400 }
      );
    }

    const items =
      format === "json" ? parseJsonImportText(text) : parseCsvImportText(text);

    let inserted = 0;
    let updated = 0;
    const errors: string[] = [];

    for (let index = 0; index < items.length; index += 1) {
      try {
        const action = await importCollection(items[index]);

        if (action === "inserted") {
          inserted += 1;
        } else {
          updated += 1;
        }
      } catch (error) {
        errors.push(
          `Row ${index + 2}: ${
            error instanceof Error ? error.message : "Unknown import error."
          }`
        );
      }
    }

    return NextResponse.json({
      ok: true,
      inserted,
      updated,
      errors,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Import failed.",
      },
      { status: 500 }
    );
  }
}