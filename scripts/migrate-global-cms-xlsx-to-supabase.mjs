import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";
import { createClient } from "@supabase/supabase-js";



const require = createRequire(import.meta.url);
const XLSX = require("xlsx");


function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");

  if (!fs.existsSync(envPath)) {
    throw new Error(".env.local file not found");
  }

  const content = fs.readFileSync(envPath, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const equalIndex = trimmed.indexOf("=");

    if (equalIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, equalIndex).trim();
    let value = trimmed.slice(equalIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function cleanValue(value) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return null;
    }

    return trimmed;
  }

  return value;
}

function toStringOrNull(value) {
  const cleaned = cleanValue(value);

  if (cleaned === null) {
    return null;
  }

  return String(cleaned);
}

function toBoolean(value, defaultValue = false) {
  const cleaned = cleanValue(value);

  if (cleaned === null) {
    return defaultValue;
  }

  if (typeof cleaned === "boolean") {
    return cleaned;
  }

  const normalized = String(cleaned).trim().toLowerCase();

  if (["true", "1", "yes", "y", "published", "active"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no", "n", "draft", "archived"].includes(normalized)) {
    return false;
  }

  return defaultValue;
}

function toNumberOrNull(value) {
  const cleaned = cleanValue(value);

  if (cleaned === null) {
    return null;
  }

  const numberValue = Number(cleaned);

  if (Number.isNaN(numberValue)) {
    return null;
  }

  return numberValue;
}

function toIntegerOrNull(value) {
  const numberValue = toNumberOrNull(value);

  if (numberValue === null) {
    return null;
  }

  return Math.trunc(numberValue);
}

function toIsoOrNull(value) {
  const cleaned = cleanValue(value);

  if (cleaned === null) {
    return null;
  }

  if (cleaned instanceof Date && !Number.isNaN(cleaned.getTime())) {
    return cleaned.toISOString();
  }

  if (typeof cleaned === "number") {
    const parsedDate = XLSX.SSF.parse_date_code(cleaned);

    if (!parsedDate) {
      return null;
    }

    const date = new Date(
      Date.UTC(
        parsedDate.y,
        parsedDate.m - 1,
        parsedDate.d,
        parsedDate.H || 0,
        parsedDate.M || 0,
        Math.floor(parsedDate.S || 0)
      )
    );

    return date.toISOString();
  }

  const date = new Date(String(cleaned));

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function normalizeContentStatus(value) {
  const cleaned = toStringOrNull(value)?.toLowerCase();

  if (cleaned === "published") {
    return "published";
  }

  if (cleaned === "archived") {
    return "archived";
  }

  return "draft";
}

function normalizeVariantStatus(value) {
  const cleaned = toStringOrNull(value)?.toLowerCase();

  if (cleaned === "published" || cleaned === "active") {
    return "active";
  }

  if (cleaned === "archived") {
    return "archived";
  }

  return "draft";
}

function readSheet(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    console.warn(`Sheet not found: ${sheetName}`);
    return [];
  }

  const rows = XLSX.utils.sheet_to_json(sheet, {
    defval: null,
    raw: false,
  });

  return rows.filter((row) => {
    return Object.values(row).some((value) => cleanValue(value) !== null);
  });
}

function chunkArray(items, size = 100) {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

async function upsertRows({ supabase, table, rows, onConflict, label }) {
  if (!rows.length) {
    console.log(`${label}: 0 row`);
    return;
  }

  let total = 0;

  for (const chunk of chunkArray(rows, 100)) {
    const { error } = await supabase.from(table).upsert(chunk, {
      onConflict,
    });

    if (error) {
      console.error(`${label} import failed`);
      console.error(error);
      throw new Error(error.message);
    }

    total += chunk.length;
  }

  console.log(`${label}: ${total} row imported`);
}

async function fetchMapByColumn({
  supabase,
  table,
  keyColumn,
  valueColumn = "id",
}) {
  const { data, error } = await supabase
    .from(table)
    .select(`${valueColumn}, ${keyColumn}`);

  if (error) {
    throw new Error(`Failed to fetch map for ${table}: ${error.message}`);
  }

  const map = new Map();

  for (const row of data || []) {
    const key = row[keyColumn];

    if (key) {
      map.set(String(key), row[valueColumn]);
    }
  }

  return map;
}

async function main() {
  loadEnvLocal();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL in .env.local");
  }

  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY in .env.local");
  }

  const inputPath = process.argv[2] || "./data/global-cms.xlsx";
  const absoluteInputPath = path.resolve(process.cwd(), inputPath);

  if (!fs.existsSync(absoluteInputPath)) {
    throw new Error(`Excel file not found: ${absoluteInputPath}`);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const workbook = XLSX.readFile(absoluteInputPath, {
    cellDates: true,
  });

  const collectionsSheet = readSheet(workbook, "collections");
  const productsSheet = readSheet(workbook, "products");
  const variantsSheet = readSheet(workbook, "product_variants");
  const imagesSheet = readSheet(workbook, "product_images");
  const blogSheet = readSheet(workbook, "blog");
  const mediaSheet = readSheet(workbook, "media");

  console.log("Excel file loaded");
  console.log({
    collections: collectionsSheet.length,
    products: productsSheet.length,
    productVariants: variantsSheet.length,
    productImages: imagesSheet.length,
    blog: blogSheet.length,
    media: mediaSheet.length,
  });

  await supabase.from("collections").delete().eq("slug", "test-collection");

  const collections = collectionsSheet
    .filter((row) => toStringOrNull(row.slug))
    .map((row, index) => ({
      legacy_id: toStringOrNull(row.id),
      title: toStringOrNull(row.title) || "Untitled Collection",
      slug: toStringOrNull(row.slug),
      description: toStringOrNull(row.description),
      image_url: toStringOrNull(row.image),
      image_file_id: toStringOrNull(row.image_file_id),
      image_alt: toStringOrNull(row.image_alt),
      status: normalizeContentStatus(row.status),
      sort_order: index + 1,
      seo_title: toStringOrNull(row.seo_title),
      seo_description: toStringOrNull(row.seo_description),
      created_at: toIsoOrNull(row.created_at) || new Date().toISOString(),
      updated_at: toIsoOrNull(row.updated_at) || new Date().toISOString(),
    }));

  await upsertRows({
    supabase,
    table: "collections",
    rows: collections,
    onConflict: "slug",
    label: "Collections",
  });

  const collectionIdBySlug = await fetchMapByColumn({
    supabase,
    table: "collections",
    keyColumn: "slug",
  });

  const products = productsSheet
    .filter((row) => toStringOrNull(row.slug))
    .map((row) => {
      const collectionSlug = toStringOrNull(row.collection_slug);
      const primaryCollectionId = collectionSlug
        ? collectionIdBySlug.get(collectionSlug) || null
        : null;

      return {
        legacy_id: toStringOrNull(row.id),
        title: toStringOrNull(row.title) || "Untitled Product",
        slug: toStringOrNull(row.slug),
        description: toStringOrNull(row.description),
        short_description: toStringOrNull(row.short_description),
        primary_collection_id: primaryCollectionId,
        status: normalizeContentStatus(row.status),
        featured: toBoolean(row.featured, false),
        image_url: toStringOrNull(row.image),
        image_file_id: toStringOrNull(row.image_file_id),
        image_alt: toStringOrNull(row.image_alt),
        vendor: toStringOrNull(row.vendor),
        product_category: toStringOrNull(row.product_category),
        product_type: toStringOrNull(row.type),
        tags: toStringOrNull(row.tags),
        seo_title: toStringOrNull(row.seo_title),
        seo_description: toStringOrNull(row.seo_description),
        created_at: toIsoOrNull(row.created_at) || new Date().toISOString(),
        updated_at: toIsoOrNull(row.updated_at) || new Date().toISOString(),
      };
    });

  await upsertRows({
    supabase,
    table: "products",
    rows: products,
    onConflict: "slug",
    label: "Products",
  });

  const productIdBySlug = await fetchMapByColumn({
    supabase,
    table: "products",
    keyColumn: "slug",
  });

  const productCollectionLinks = productsSheet
    .map((row, index) => {
      const productSlug = toStringOrNull(row.slug);
      const collectionSlug = toStringOrNull(row.collection_slug);

      if (!productSlug || !collectionSlug) {
        return null;
      }

      const productId = productIdBySlug.get(productSlug);
      const collectionId = collectionIdBySlug.get(collectionSlug);

      if (!productId || !collectionId) {
        return null;
      }

      return {
        product_id: productId,
        collection_id: collectionId,
        sort_order: index + 1,
      };
    })
    .filter(Boolean);

  await upsertRows({
    supabase,
    table: "product_collection_links",
    rows: productCollectionLinks,
    onConflict: "product_id,collection_id",
    label: "Product collection links",
  });

  const productImages = imagesSheet
    .map((row) => {
      const productSlug = toStringOrNull(row.product_slug);
      const productId = productSlug ? productIdBySlug.get(productSlug) : null;
      const imageUrl = toStringOrNull(row.image_url);

      if (!productId || !imageUrl) {
        return null;
      }

      return {
        legacy_id: toStringOrNull(row.id),
        product_id: productId,
        image_url: imageUrl,
        image_file_id: toStringOrNull(row.image_file_id),
        alt_text: toStringOrNull(row.alt_text),
        sort_order: toIntegerOrNull(row.sort_order) || 0,
        is_main: toBoolean(row.is_main, false),
        created_at: toIsoOrNull(row.created_at) || new Date().toISOString(),
        updated_at: toIsoOrNull(row.updated_at) || new Date().toISOString(),
      };
    })
    .filter(Boolean);

  await upsertRows({
    supabase,
    table: "product_images",
    rows: productImages,
    onConflict: "legacy_id",
    label: "Product images",
  });

  const productVariants = variantsSheet
    .map((row, index) => {
      const productSlug = toStringOrNull(row.product_slug);
      const productId = productSlug ? productIdBySlug.get(productSlug) : null;

      if (!productId) {
        return null;
      }

      return {
        legacy_id: toStringOrNull(row.id),
        product_id: productId,
        title:
          [
            toStringOrNull(row.option1_value),
            toStringOrNull(row.option2_value),
            toStringOrNull(row.option3_value),
          ]
            .filter(Boolean)
            .join(" / ") || null,
        sku: toStringOrNull(row.sku),
        barcode: toStringOrNull(row.barcode),
        option1_name: toStringOrNull(row.option1_name),
        option1_value: toStringOrNull(row.option1_value),
        option2_name: toStringOrNull(row.option2_name),
        option2_value: toStringOrNull(row.option2_value),
        option3_name: toStringOrNull(row.option3_name),
        option3_value: toStringOrNull(row.option3_value),
        price: toNumberOrNull(row.price),
        compare_at_price: toNumberOrNull(row.compare_at_price),
        inventory_tracker: toStringOrNull(row.inventory_tracker),
        inventory_policy: toStringOrNull(row.inventory_policy),
        fulfillment_service: toStringOrNull(row.fulfillment_service),
        requires_shipping: toBoolean(row.requires_shipping, true),
        taxable: toBoolean(row.taxable, true),
        variant_image_legacy_id: toStringOrNull(row.image_id),
        weight: toNumberOrNull(row.weight),
        weight_unit: toStringOrNull(row.weight_unit),
        box_quantity: toIntegerOrNull(row.box_quantity),
        status: normalizeVariantStatus(row.status),
        sort_order: index + 1,
        created_at: toIsoOrNull(row.created_at) || new Date().toISOString(),
        updated_at: toIsoOrNull(row.updated_at) || new Date().toISOString(),
      };
    })
    .filter(Boolean);

  await upsertRows({
    supabase,
    table: "product_variants",
    rows: productVariants,
    onConflict: "legacy_id",
    label: "Product variants",
  });

  const blogPosts = blogSheet
    .filter((row) => toStringOrNull(row.slug))
    .map((row) => ({
      legacy_id: toStringOrNull(row.id),
      title: toStringOrNull(row.title) || "Untitled Blog Post",
      slug: toStringOrNull(row.slug),
      excerpt: toStringOrNull(row.excerpt),
      content: toStringOrNull(row.content),
      image_url: toStringOrNull(row.image),
      image_file_id: toStringOrNull(row.image_file_id),
      image_alt: toStringOrNull(row.image_alt),
      status: normalizeContentStatus(row.status),
      featured: toBoolean(row.featured, false),
      author: toStringOrNull(row.author),
      published_at: toIsoOrNull(row.published_at),
      seo_title: toStringOrNull(row.seo_title),
      seo_description: toStringOrNull(row.seo_description),
      tags: toStringOrNull(row.tags),
      created_at: toIsoOrNull(row.created_at) || new Date().toISOString(),
      updated_at: toIsoOrNull(row.updated_at) || new Date().toISOString(),
    }));

  await upsertRows({
    supabase,
    table: "blog_posts",
    rows: blogPosts,
    onConflict: "slug",
    label: "Blog posts",
  });

  const mediaAssets = mediaSheet
    .filter((row) => toStringOrNull(row.id))
    .map((row) => ({
      legacy_id: toStringOrNull(row.id),
      file_name: toStringOrNull(row.file_name),
      file_id: toStringOrNull(row.file_id),
      image_url: toStringOrNull(row.image_url),
      preview_url: toStringOrNull(row.preview_url),
      mime_type: toStringOrNull(row.mime_type),
      size_bytes: toIntegerOrNull(row.size_bytes),
      folder: toStringOrNull(row.folder),
      alt_text: toStringOrNull(row.alt_text),
      entity_type: toStringOrNull(row.folder),
      entity_id: null,
      created_at: toIsoOrNull(row.created_at) || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

  await upsertRows({
    supabase,
    table: "media_assets",
    rows: mediaAssets,
    onConflict: "legacy_id",
    label: "Media assets",
  });

  console.log("Migration completed successfully.");
}

main().catch((error) => {
  console.error("Migration failed.");
  console.error(error);
  process.exit(1);
});