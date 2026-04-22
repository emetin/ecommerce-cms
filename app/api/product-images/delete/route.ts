import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getSheetData, updateSheetObjectBySlug } from "../../../../lib/sheets";
import { deleteSheetRowById } from "../../../../lib/sheets-row-utils";

type ProductImageRecord = Record<string, string>;
type ProductRecord = Record<string, string>;

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function isTrue(value: unknown) {
  return normalizeLower(value) === "true";
}

function toSafeOrder(value: unknown, fallback = 999999) {
  const num = Number(normalizeText(value));
  return Number.isFinite(num) ? num : fallback;
}

function sortImages(items: ProductImageRecord[]) {
  return [...items].sort((a, b) => {
    const aMain = isTrue(a.is_main);
    const bMain = isTrue(b.is_main);

    if (aMain !== bMain) {
      return aMain ? -1 : 1;
    }

    return toSafeOrder(a.sort_order) - toSafeOrder(b.sort_order);
  });
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
  imageUrl?: string;
  imageFileId?: string;
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

async function syncProductPrimaryImage(productSlug: string) {
  const [products, productImages] = await Promise.all([
    getSheetData("products", {
      forceFresh: true,
      ttlSeconds: 0,
    }) as Promise<ProductRecord[]>,
    getSheetData("product_images", {
      forceFresh: true,
      ttlSeconds: 0,
    }) as Promise<ProductImageRecord[]>,
  ]);

  const product =
    products.find((item) => normalizeLower(item.slug) === normalizeLower(productSlug)) ||
    null;

  if (!product) return;

  const relatedImages = productImages.filter(
    (item) => normalizeLower(item.product_slug) === normalizeLower(productSlug)
  );

  const primaryImage = sortImages(relatedImages)[0]?.image_url || "";

  await updateSheetObjectBySlug("products", productSlug, {
    image: normalizeText(primaryImage),
    updated_at: new Date().toISOString(),
  });
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

    const id = normalizeText(body.id);

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "id is required." },
        { status: 400 }
      );
    }

    const items = (await getSheetData("product_images", {
      forceFresh: true,
      ttlSeconds: 0,
    })) as ProductImageRecord[];

    const current =
      items.find((item) => normalizeText(item.id) === id) || null;

    if (!current) {
      return NextResponse.json(
        { ok: false, error: "Product image not found." },
        { status: 404 }
      );
    }

    const localFilePath = resolveLocalFilePath({
      imageUrl: current.image_url,
      imageFileId: current.image_file_id,
    });

    await deleteSheetRowById("product_images", id);

    if (body.delete_local_file && localFilePath) {
      tryDeleteLocalFile(localFilePath);
    }

    await syncProductPrimaryImage(normalizeText(current.product_slug));

    return NextResponse.json({
      ok: true,
      message: "Product image deleted successfully.",
      id,
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