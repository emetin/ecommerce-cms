export type ShopifyCsvRow = Record<string, string>;

function stripHtml(html: string) {
  return String(html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateText(text: string, maxLength = 220) {
  const clean = String(text || "").trim();

  if (clean.length <= maxLength) {
    return clean;
  }

  return clean.slice(0, maxLength).trim() + "...";
}

function normalizeStatus(value: string) {
  const normalized = String(value || "").trim().toLowerCase();

  if (
    normalized === "true" ||
    normalized === "active" ||
    normalized === "published"
  ) {
    return "published";
  }

  if (normalized === "archived") {
    return "archived";
  }

  return "draft";
}

function splitGallery(images: string[]) {
  const unique = Array.from(
    new Set(
      images
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    )
  );

  if (!unique.length) {
    return {
      image: "",
      gallery: "",
    };
  }

  return {
    image: unique[0],
    gallery: unique.slice(1).join(","),
  };
}

function readFirstNonEmpty(row: ShopifyCsvRow, keys: string[]) {
  for (const key of keys) {
    const value = String(row[key] || "").trim();
    if (value) return value;
  }

  return "";
}

export function buildProductRecordFromShopifyRows(rows: ShopifyCsvRow[]) {
  if (!rows.length) {
    throw new Error("No Shopify rows were provided for product mapping.");
  }

  const first = rows[0];

  const handle = String(first["Handle"] || "").trim();
  const title = String(first["Title"] || "").trim();
  const bodyHtml = String(first["Body (HTML)"] || "").trim();
  const productType = String(first["Type"] || "").trim();
  const vendor = String(first["Vendor"] || "").trim();
  const tags = String(first["Tags"] || "").trim();
  const seoTitle = String(first["SEO Title"] || "").trim();
  const seoDescription = String(first["SEO Description"] || "").trim();
  const published = String(first["Status"] || "").trim();

  const allImages = rows.flatMap((row) => {
    const imageSrc = String(row["Image Src"] || "").trim();
    return imageSrc ? [imageSrc] : [];
  });

  const { image, gallery } = splitGallery(allImages);

  const description = stripHtml(bodyHtml);
  const shortDescription = truncateText(description, 180);

  const productCategory = readFirstNonEmpty(first, [
    "Product Category",
    "Google Shopping / Google Product Category",
    "Google Product Category",
  ]);

  const typeValue = readFirstNonEmpty(first, [
    "Type",
    "Product Type",
  ]);

  return {
    id: "",
    title,
    slug: handle,
    description,
    short_description: shortDescription,
    image,
    gallery,
    collection_slug: productType || tags || "",
    status: normalizeStatus(published),
    featured: "false",
    seo_title: seoTitle || title,
    seo_description: seoDescription || truncateText(description, 160),
    created_at: "",
    updated_at: "",
    vendor,
    product_category: productCategory,
    type: typeValue,
    tags,
  };
}