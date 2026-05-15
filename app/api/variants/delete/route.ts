import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "../../../../lib/supabase/admin";

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = normalizeText(body?.id);

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Variant id is required." },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from("product_variants")
      .update({
        status: "archived",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id, product_id, title, status")
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return NextResponse.json(
        { ok: false, error: "Variant not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      item: data,
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