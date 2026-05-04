import { NextResponse } from "next/server";
import { getSheetData } from "../../../../../lib/sheets";
import {
  getAdminApiErrorMessage,
  getAdminApiErrorStatus,
  requireAdminPermission,
} from "../../../../../lib/admin-request";

type ProductRecord = {
  id?: string;
  title?: string;
  slug?: string;
  image?: string;
  status?: string;
  collection_slug?: string;
};

type ProductVariantRecord = {
  id?: string;
  product_id?: string;
  product_slug?: string;
  variant_id?: string;
  title?: string;
  variant_title?: string;
  option1?: string;
  option2?: string;
  option3?: string;
  sku?: string;
  price?: string;
  unit_price?: string;
  status?: string;
};

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function toNumber(value: unknown) {
  const next = Number(String(value || "0").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(next) ? next : 0;
}

function getVariantTitle(variant: ProductVariantRecord) {
  const variantTitle = normalizeText(variant.variant_title);

  if (variantTitle) {
    return variantTitle;
  }

  const title = normalizeText(variant.title);

  if (title) {
    return title;
  }

  const options = [variant.option1, variant.option2, variant.option3]
    .map(normalizeText)
    .filter(Boolean)
    .join(" / ");

  return options || "Default";
}

export async function GET(req: Request) {
  try {
    await requireAdminPermission(req, "draft_orders:read");

    const { searchParams } = new URL(req.url);
    const query = normalizeLower(searchParams.get("q"));

    const products = (await getSheetData("products", {
      forceFresh: true,
      ttlSeconds: 0,
    })) as ProductRecord[];

    let variants: ProductVariantRecord[] = [];

    try {
      variants = (await getSheetData("product_variants", {
        forceFresh: true,
        ttlSeconds: 0,
      })) as ProductVariantRecord[];
    } catch {
      variants = [];
    }

    const activeProducts = products.filter((product) => {
      const status = normalizeLower(product.status || "published");
      return status !== "draft" && status !== "archived" && status !== "inactive";
    });

    const productBySlug = activeProducts.reduce<Record<string, ProductRecord>>(
      (acc, product) => {
        const slug = normalizeText(product.slug);

        if (slug) {
          acc[slug] = product;
        }

        return acc;
      },
      {}
    );

    const variantRows: ProductVariantRecord[] = variants.length
      ? variants
      : activeProducts.map((product) => ({
          id: normalizeText(product.id),
          product_slug: normalizeText(product.slug),
          variant_id: "",
          variant_title: "Default",
          option1: "",
          option2: "",
          option3: "",
          sku: "",
          price: "0",
          unit_price: "0",
          status: "active",
        }));

    const filtered = variantRows.filter((variant) => {
      const productSlug = normalizeText(variant.product_slug);
      const product = productBySlug[productSlug];

      if (!product) {
        return false;
      }

      const status = normalizeLower(variant.status || "active");

      if (status === "inactive" || status === "archived" || status === "draft") {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = [
        product.title,
        product.slug,
        product.collection_slug,
        variant.sku,
        variant.variant_title,
        variant.title,
        variant.option1,
        variant.option2,
        variant.option3,
      ]
        .map(normalizeLower)
        .join(" ");

      return haystack.includes(query);
    });

    const items = filtered.slice(0, 30).map((variant) => {
      const productSlug = normalizeText(variant.product_slug);
      const product = productBySlug[productSlug];

      const variantId =
        normalizeText(variant.variant_id) ||
        normalizeText(variant.id) ||
        `${productSlug}-default`;

      const unitPrice = toNumber(variant.unit_price || variant.price);

      return {
        product_slug: productSlug,
        product_title: normalizeText(product?.title),
        variant_id: variantId,
        variant_title: getVariantTitle(variant),
        sku: normalizeText(variant.sku),
        image: normalizeText(product?.image),
        unit_price: String(unitPrice),
        collection_slug: normalizeText(product?.collection_slug),
      };
    });

    return NextResponse.json({
      ok: true,
      items,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: getAdminApiErrorMessage(error, "Failed to search products."),
      },
      { status: getAdminApiErrorStatus(error) }
    );
  }
}