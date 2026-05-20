import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "../../../../lib/supabase/admin";
import { requireAdminFromRequest } from "../../../../lib/api/admin";

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function jsonError(message: string, status = 500) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
    },
    { status }
  );
}

export async function POST(req: Request) {
  try {
    await requireAdminFromRequest(req);

    const body = await req.json().catch(() => ({}));
    const slug = normalizeLower(body?.slug);

    if (!slug) {
      return jsonError("Product slug is required.", 400);
    }

    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from("products")
      .update({
        status: "archived",
        updated_at: new Date().toISOString(),
      })
      .eq("slug", slug)
      .select("id, title, slug, status")
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return jsonError("Product not found.", 404);
    }

    const { error: variantError } = await supabase
      .from("product_variants")
      .update({
        status: "archived",
        updated_at: new Date().toISOString(),
      })
      .eq("product_id", data.id);

    if (variantError) {
      throw new Error(variantError.message);
    }

    return NextResponse.json({
      ok: true,
      message: "Product archived successfully.",
      item: data,
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to archive product."
    );
  }
}