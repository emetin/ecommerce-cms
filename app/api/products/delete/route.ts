import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "../../../../lib/supabase/admin";

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const slug = normalizeLower(body?.slug);

    if (!slug) {
      return NextResponse.json(
        { ok: false, error: "Product slug is required." },
        { status: 400 }
      );
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
      return NextResponse.json(
        { ok: false, error: "Product not found." },
        { status: 404 }
      );
    }

    await supabase
      .from("product_variants")
      .update({
        status: "archived",
        updated_at: new Date().toISOString(),
      })
      .eq("product_id", data.id);

    return NextResponse.json({
      ok: true,
      item: data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to delete product.",
      },
      { status: 500 }
    );
  }
}