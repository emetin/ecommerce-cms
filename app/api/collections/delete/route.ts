import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "../../../../lib/supabase/admin";

function normalizeSlug(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
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
    const body = await req.json().catch(() => ({}));
    const slug = normalizeSlug(body?.slug);

    if (!slug) {
      return jsonError("Collection slug is required.", 400);
    }

    const supabase = createSupabaseAdminClient();

    const { data: collection, error: collectionError } = await supabase
      .from("collections")
      .select("id, slug")
      .eq("slug", slug)
      .maybeSingle();

    if (collectionError) {
      throw new Error(collectionError.message);
    }

    if (!collection) {
      return jsonError("Collection not found.", 404);
    }

    const collectionId = String(collection.id || "").trim();

    const { error: relationDeleteError } = await supabase
      .from("product_collections")
      .delete()
      .eq("collection_id", collectionId);

    if (relationDeleteError) {
      throw new Error(relationDeleteError.message);
    }

    const { error: collectionDeleteError } = await supabase
      .from("collections")
      .delete()
      .eq("id", collectionId);

    if (collectionDeleteError) {
      throw new Error(collectionDeleteError.message);
    }

    return NextResponse.json({
      ok: true,
      message: "Collection and related links deleted successfully.",
      slug,
      id: collectionId,
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to delete collection."
    );
  }
}