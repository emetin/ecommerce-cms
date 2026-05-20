import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createSupabaseAdminClient } from "../../../../lib/supabase/admin";

type ProductImageRow = {
  id?: string;
  product_id?: string | null;
  image_url?: string | null;
  image_file_id?: string | null;
  alt_text?: string | null;
  sort_order?: number | string | null;
  is_main?: boolean | string | null;
  created_at?: string | null;
  updated_at?: string | null;
  products?: {
    slug?: string | null;
  } | null;
};

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function isTrue(value: unknown) {
  if (typeof value === "boolean") return value;
  return normalizeLower(value) === "true";
}

function toSafeOrder(value: unknown, fallback = 999999) {
  const num = Number(normalizeText(value));
  return Number.isFinite(num) ? num : fallback;
}

function tryDeleteLocalFile(filePath: string) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

function resolveLocalFilePath(params: {
  imageUrl?: string | null;
  imageFileId?: string | null;
}) {
  const imageUrl = normalizeText(params.imageUrl);
  const imageFileId = path.basename(normalizeText(params.imageFileId));
  const uploadsBaseDir = path.resolve(process.cwd(), "public", "uploads");

  if (imageUrl.startsWith("/uploads/")) {
    return path.resolve(process.cwd(), "public", imageUrl.replace(/^\/+/, ""));
  }

  if (imageFileId) {
    const possibleDirs = ["product", "products", "collection", "blog"];

    for (const dir of possibleDirs) {
      const fullPath = path.resolve(uploadsBaseDir, dir, imageFileId);

      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
  }

  return null;
}

async function syncProductPrimaryImage(productId: string) {
  const supabase = createSupabaseAdminClient();

  const { data: images, error: imagesError } = await supabase
    .from("product_images")
    .select("image_url, is_main, sort_order, created_at")
    .eq("product_id", productId)
    .order("is_main", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (imagesError) {
    throw new Error(imagesError.message);
  }

  const primaryImage = normalizeText(images?.[0]?.image_url);

  const { error: productError } = await supabase
    .from("products")
    .update({
      image_url: primaryImage || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  if (productError) {
    throw new Error(productError.message);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { ok: false, error: "Invalid request body." },
        { status: 400 }
      );
    }

    const id = normalizeText((body as any).id);

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "id is required." },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    const { data: current, error: currentError } = await supabase
      .from("product_images")
      .select(
        `
        id,
        product_id,
        image_url,
        image_file_id,
        alt_text,
        sort_order,
        is_main,
        created_at,
        updated_at,
        products (
          slug
        )
      `
      )
      .eq("id", id)
      .maybeSingle();

    if (currentError) {
      throw new Error(currentError.message);
    }

    if (!current) {
      return NextResponse.json(
        { ok: false, error: "Product image not found." },
        { status: 404 }
      );
    }

    const currentRow = current as ProductImageRow;
    const productId = normalizeText(currentRow.product_id);
    const productSlug = normalizeText(currentRow.products?.slug);
    const wasMain = isTrue(currentRow.is_main);

    const localFilePath = resolveLocalFilePath({
      imageUrl: currentRow.image_url,
      imageFileId: currentRow.image_file_id,
    });

    const { error: deleteError } = await supabase
      .from("product_images")
      .delete()
      .eq("id", id);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    if ((body as any).delete_local_file && localFilePath) {
      tryDeleteLocalFile(localFilePath);
    }

    if (productId) {
      if (wasMain) {
        const { data: nextImage, error: nextImageError } = await supabase
          .from("product_images")
          .select("id")
          .eq("product_id", productId)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (nextImageError) {
          throw new Error(nextImageError.message);
        }

        if (nextImage?.id) {
          const { error: promoteError } = await supabase
            .from("product_images")
            .update({
              is_main: true,
              updated_at: new Date().toISOString(),
            })
            .eq("id", nextImage.id);

          if (promoteError) {
            throw new Error(promoteError.message);
          }
        }
      }

      await syncProductPrimaryImage(productId);
    }

    return NextResponse.json({
      ok: true,
      message: "Product image deleted successfully.",
      id,
      product_id: productId,
      product_slug: productSlug,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete product image.",
      },
      { status: 500 }
    );
  }
}