function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function slugToReadableText(value: string) {
  return normalizeText(value)
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function isWeakAltText(value: unknown) {
  const alt = normalizeText(value).toLowerCase();

  if (!alt) return true;

  const weakValues = [
    "image",
    "photo",
    "gallery image",
    "product image",
    "untitled",
    "img",
  ];

  if (weakValues.includes(alt)) {
    return true;
  }

  if (/\.(jpg|jpeg|png|webp|gif|svg)$/i.test(alt)) {
    return true;
  }

  if (/^(image|img|photo|picture)[-_ ]?\d*$/i.test(alt)) {
    return true;
  }

  return false;
}

export function generateProductImageAltText(params: {
  productTitle?: string;
  productSlug?: string;
  imageType?: "product" | "gallery";
  order?: number | string;
}) {
  const rawTitle = normalizeText(params.productTitle);
  const rawSlug = normalizeText(params.productSlug);
  const orderText = normalizeText(params.order);

  const titleSource =
    rawTitle || titleCase(slugToReadableText(rawSlug)) || "Product";

  if (params.imageType === "product") {
    return `${titleSource} - product image`;
  }

  if (orderText) {
    return `${titleSource} - gallery image ${orderText}`;
  }

  return `${titleSource} - gallery image`;
}