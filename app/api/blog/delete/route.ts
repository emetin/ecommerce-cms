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
      return jsonError("Slug is required.", 400);
    }

    const supabase = createSupabaseAdminClient();

    const { data: currentItem, error: currentError } = await supabase
      .from("blog")
      .select("id, slug")
      .eq("slug", slug)
      .maybeSingle();

    if (currentError) {
      throw new Error(currentError.message);
    }

    if (!currentItem) {
      return jsonError("Blog post not found.", 404);
    }

    const { error: deleteError } = await supabase
      .from("blog")
      .delete()
      .eq("id", currentItem.id);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    return NextResponse.json({
      ok: true,
      message: "Blog post deleted successfully.",
      slug,
      id: normalizeSlug(currentItem.id),
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to delete the blog post."
    );
  }
}