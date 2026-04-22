import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import {
  deleteSheetRowBySlug,
  deleteSheetRowsByField,
  getSheetData,
} from "../../../../lib/sheets";

type ProductRecord = {
  slug?: string;
  image?: string;
  image_file_id?: string;
};

type ProductImageRecord = {
  product_slug?: string;
  image_url?: string;
  image_file_id?: string;
};

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeSlug(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function getUploadsBaseDir() {
  return path.resolve(process.cwd(), "public", "uploads");
}

function isSafeUploadPath(fullPath: string) {
  return path.resolve(fullPath).startsWith(getUploadsBaseDir());
}

function resolveLocalFilePath(params: {
  imageUrl?: string;
  imageFileId?: string;
}) {
  const imageUrl = normalizeText(params.imageUrl);
  const imageFileId = path.basename(normalizeText(params.imageFileId));
  const uploadsBaseDir = getUploadsBaseDir();

  if (imageUrl.startsWith("/uploads/")) {
    const relativePath = imageUrl.replace(/^\/+/, "");
    const fullPath = path.resolve(process.cwd(), "public", relativePath);

    if (isSafeUploadPath(fullPath) && fs.existsSync(fullPath)) {
      return fullPath;
    }
  }

  if (imageFileId) {
    const possibleDirs = ["product", "collection", "blog"];

    for (const dir of possibleDirs) {
      const fullPath = path.resolve(uploadsBaseDir, dir, imageFileId);

      if (isSafeUploadPath(fullPath) && fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
  }

  return null;
}

function tryDeleteLocalFile(filePath: string) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
  } catch (error) {
    console.error("Failed to delete local file:", error);
  }

  return false;
}

async function safeDeleteByField(
  sheetName: string,
  fieldName: string,
  fieldValue: string
) {
  try {
    return await deleteSheetRowsByField(sheetName, fieldName, fieldValue);
  } catch (error) {
    console.warn(`Optional cleanup skipped for "${sheetName}":`, error);
    return {
      ok: false,
      deletedCount: 0,
      skipped: true,
      error: error instanceof Error ? error.message : "Unknown cleanup error.",
    };
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const slug = normalizeSlug(body?.slug);

    if (!slug) {
      return NextResponse.json(
        {
          ok: false,
          error: "Product slug is required.",
        },
        { status: 400 }
      );
    }

    const [products, productImages] = await Promise.all([
      getSheetData("products", {
        forceFresh: true,
        ttlSeconds: 0,
      }),
      getSheetData("product_images", {
        forceFresh: true,
        ttlSeconds: 0,
      }),
    ]);

    const productList = products as ProductRecord[];
    const imageList = productImages as ProductImageRecord[];

    const targetProduct =
      productList.find((item) => normalizeSlug(item.slug) === slug) || null;

    if (!targetProduct) {
      return NextResponse.json(
        {
          ok: false,
          error: "Product not found.",
        },
        { status: 404 }
      );
    }

    const relatedImages = imageList.filter(
      (item) => normalizeSlug(item.product_slug) === slug
    );

    const deletedFiles: string[] = [];

    const primaryImagePath = resolveLocalFilePath({
      imageUrl: targetProduct.image,
      imageFileId: targetProduct.image_file_id,
    });

    if (primaryImagePath && tryDeleteLocalFile(primaryImagePath)) {
      deletedFiles.push(primaryImagePath);
    }

    for (const imageItem of relatedImages) {
      const filePath = resolveLocalFilePath({
        imageUrl: imageItem.image_url,
        imageFileId: imageItem.image_file_id,
      });

      if (filePath && !deletedFiles.includes(filePath)) {
        const deleted = tryDeleteLocalFile(filePath);

        if (deleted) {
          deletedFiles.push(filePath);
        }
      }
    }

    await deleteSheetRowBySlug("products", slug);
    const variantsDelete = await safeDeleteByField(
      "product_variants",
      "product_slug",
      slug
    );
    const productImagesDelete = await safeDeleteByField(
      "product_images",
      "product_slug",
      slug
    );
    const collectionProductsDelete = await safeDeleteByField(
      "collection_products",
      "product_slug",
      slug
    );

    return NextResponse.json({
      ok: true,
      message: "Product and related records deleted successfully.",
      deleted_local_files_count: deletedFiles.length,
      deleted_local_files: deletedFiles,
      cleanup: {
        product_variants: variantsDelete,
        product_images: productImagesDelete,
        collection_products: collectionProductsDelete,
      },
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