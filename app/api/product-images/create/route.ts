import { NextResponse } from "next/server";
import {
  appendSheetRows,
  getSheetData,
  getSheetHeaders,
  updateSheetObjectBySlug,
} from "../../../../lib/sheets";
import { updateSheetRowById } from "../../../../lib/sheets-row-utils";
import { generateProductImageAltText } from "../../../../lib/alt-text";

type ProductRecord = Record<string, string>;
type ProductImageRecord = Record<string, string>;

type CreateImageInput = {
  product_slug?: string;
  image_url?: string;
  image_file_id?: string;
  image_uploaded_at?: string;
  sort_order?: string;
  alt_text?: string;
  is_main?: string;
};

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function isTrue(value: unknown) {
  return normalizeLower(value) === "true";
}

function normalizeBool(value: unknown, fallback = false) {
  const normalized = normalizeLower(value);
  if (!normalized) return fallback ? "true" : "false";
  return normalized === "true" ? "true" : "false";
}

function toSafeOrder(value: unknown, fallback = 999999) {
  const num = Number(normalizeText(value));
  return Number.isFinite(num) ? num : fallback;
}

function extractFileNameFromUrl(url: string) {
  const cleanUrl = normalizeText(url).split("?")[0].split("#")[0];
  const parts = cleanUrl.split("/");
  return parts[parts.length - 1] || "";
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

function buildRowValues(headers: string[], item: ProductImageRecord) {
  return headers.map((header) => normalizeText(item[header]));
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

async function clearOtherMainFlags(productSlug: string) {
  const [items, headers] = await Promise.all([
    getSheetData("product_images", {
      forceFresh: true,
      ttlSeconds: 0,
    }) as Promise<ProductImageRecord[]>,
    getSheetHeaders("product_images", {
      forceFresh: true,
      ttlSeconds: 0,
    }),
  ]);

  const now = new Date().toISOString();

  const relatedMainItems = items.filter(
    (item) =>
      normalizeLower(item.product_slug) === normalizeLower(productSlug) &&
      isTrue(item.is_main)
  );

  for (const item of relatedMainItems) {
    const nextItem: ProductImageRecord = {
      ...item,
      is_main: "false",
      updated_at: now,
    };

    await updateSheetRowById(
      "product_images",
      normalizeText(item.id),
      buildRowValues(headers, nextItem)
    );
  }
}

function buildAppendRow(item: ProductImageRecord) {
  return [
    normalizeText(item.id),
    normalizeText(item.product_slug),
    normalizeText(item.image_url),
    normalizeText(item.image_file_id),
    normalizeText(item.image_uploaded_at),
    normalizeText(item.sort_order),
    normalizeText(item.alt_text),
    normalizeText(item.is_main),
    normalizeText(item.created_at),
    normalizeText(item.updated_at),
  ];
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

    const itemsInput: CreateImageInput[] = Array.isArray(body.items)
      ? body.items
      : [body as CreateImageInput];

    if (!itemsInput.length) {
      return NextResponse.json(
        { ok: false, error: "No image items were provided." },
        { status: 400 }
      );
    }

    const productSlug = normalizeLower(
      body.product_slug || itemsInput[0]?.product_slug
    );

    if (!productSlug) {
      return NextResponse.json(
        { ok: false, error: "product_slug is required." },
        { status: 400 }
      );
    }

    const [products, existingImages] = await Promise.all([
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
      products.find((item) => normalizeLower(item.slug) === productSlug) || null;

    if (!product) {
      return NextResponse.json(
        { ok: false, error: "Product not found." },
        { status: 404 }
      );
    }

    const relatedImages = existingImages.filter(
      (item) => normalizeLower(item.product_slug) === productSlug
    );

    const hasAnyExistingImages = relatedImages.length > 0;
    const requestedAnyMain = itemsInput.some((item) => isTrue(item.is_main));

    if (requestedAnyMain || !hasAnyExistingImages) {
      await clearOtherMainFlags(productSlug);
    }

    const baseMaxOrder =
      relatedImages.length > 0
        ? Math.max(...relatedImages.map((item) => toSafeOrder(item.sort_order, 0)))
        : 0;

    const now = new Date().toISOString();

    const createdItems: ProductImageRecord[] = itemsInput.map((item, index) => {
      const imageUrl = normalizeText(item.image_url);
      const fileId =
        normalizeText(item.image_file_id) || extractFileNameFromUrl(imageUrl);

      if (!imageUrl) {
        throw new Error(`image_url is required for item ${index + 1}.`);
      }

      const requestedIsMain = normalizeBool(item.is_main, false);
      const finalIsMain =
        requestedIsMain === "true"
          ? "true"
          : !hasAnyExistingImages && index === 0 && !requestedAnyMain
            ? "true"
            : "false";

      const sortOrder = normalizeText(item.sort_order)
        ? normalizeText(item.sort_order)
        : String(baseMaxOrder + index + 1);

      const altText =
        normalizeText(item.alt_text) ||
        generateProductImageAltText({
          productTitle: product.title || "",
          productSlug,
          imageType: finalIsMain === "true" ? "product" : "gallery",
          order: finalIsMain === "true" ? "" : sortOrder,
        });

      return {
        id: `pimg_${Date.now()}_${index + 1}`,
        product_slug: productSlug,
        image_url: imageUrl,
        image_file_id: fileId,
        image_uploaded_at: normalizeText(item.image_uploaded_at) || now,
        sort_order: sortOrder,
        alt_text: altText,
        is_main: finalIsMain,
        created_at: now,
        updated_at: now,
      };
    });

    await appendSheetRows(
      "product_images",
      createdItems.map(buildAppendRow)
    );

    await syncProductPrimaryImage(productSlug);

    return NextResponse.json(
      {
        ok: true,
        message:
          createdItems.length === 1
            ? "Product image created successfully."
            : `${createdItems.length} product images created successfully.`,
        item: createdItems[0],
        items: createdItems,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create product images.",
      },
      { status: 500 }
    );
  }
}