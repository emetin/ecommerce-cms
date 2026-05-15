import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT_DIR = process.cwd();
const CSV_FILE_NAME = "products_export_1.csv";
const CSV_PATH = path.join(ROOT_DIR, CSV_FILE_NAME);
const ENV_PATH = path.join(ROOT_DIR, ".env.local");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(".env.local file not found. Reading environment variables from process.env.");
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) continue;

    const equalIndex = line.indexOf("=");
    if (equalIndex === -1) continue;

    const key = line.slice(0, equalIndex).trim();
    let value = line.slice(equalIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    value = value.replace(/\\n/g, "\n");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function parseCsv(text) {
  const rows = [];
  let currentRow = [];
  let currentValue = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      currentValue += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === "," && !insideQuotes) {
      currentRow.push(currentValue);
      currentValue = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i += 1;
      }

      currentRow.push(currentValue);

      const hasValue = currentRow.some((value) => String(value || "").trim());
      if (hasValue) {
        rows.push(currentRow);
      }

      currentRow = [];
      currentValue = "";
      continue;
    }

    currentValue += char;
  }

  if (currentValue || currentRow.length > 0) {
    currentRow.push(currentValue);

    const hasValue = currentRow.some((value) => String(value || "").trim());
    if (hasValue) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function cleanText(value) {
  return String(value || "").trim();
}

function cleanSku(value) {
  return cleanText(value).replace(/^'+/, "").trim();
}

function parseMoney(value) {
  const cleaned = cleanText(value)
    .replace(/^'+/, "")
    .replace(/[$,]/g, "")
    .trim();

  if (!cleaned) return null;

  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

function parseInteger(value) {
  const cleaned = cleanText(value).replace(/^'+/, "").trim();

  if (!cleaned) return null;

  const match = cleaned.match(/\d+/);
  if (!match) return null;

  const number = Number(match[0]);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function parseBoolean(value) {
  const cleaned = cleanText(value).toLowerCase();

  if (["true", "yes", "1"].includes(cleaned)) return true;
  if (["false", "no", "0"].includes(cleaned)) return false;

  return null;
}

function valueFrom(row, headerMap, headerName) {
  const index = headerMap.get(headerName);
  if (index === undefined) return "";
  return row[index] ?? "";
}

function getRequiredEnv(nameOptions) {
  for (const name of nameOptions) {
    const value = process.env[name];
    if (value) return value;
  }

  throw new Error(`Missing environment variable. Tried: ${nameOptions.join(", ")}`);
}

function buildVariantTitle(row, headerMap) {
  const optionValues = [
    valueFrom(row, headerMap, "Option1 Value"),
    valueFrom(row, headerMap, "Option2 Value"),
    valueFrom(row, headerMap, "Option3 Value"),
  ]
    .map(cleanText)
    .filter(Boolean);

  if (optionValues.length === 0) return null;

  const title = optionValues.join(" / ");
  return title || null;
}

function buildOptionPayload(row, headerMap) {
  const option1Name = cleanText(valueFrom(row, headerMap, "Option1 Name"));
  const option1Value = cleanText(valueFrom(row, headerMap, "Option1 Value"));

  const option2Name = cleanText(valueFrom(row, headerMap, "Option2 Name"));
  const option2Value = cleanText(valueFrom(row, headerMap, "Option2 Value"));

  const option3Name = cleanText(valueFrom(row, headerMap, "Option3 Name"));
  const option3Value = cleanText(valueFrom(row, headerMap, "Option3 Value"));

  return {
    option1_name: option1Name || null,
    option1_value: option1Value || null,
    option2_name: option2Name || null,
    option2_value: option2Value || null,
    option3_name: option3Name || null,
    option3_value: option3Value || null,
    option_values_json: {
      option1: {
        name: option1Name || null,
        value: option1Value || null,
      },
      option2: {
        name: option2Name || null,
        value: option2Value || null,
      },
      option3: {
        name: option3Name || null,
        value: option3Value || null,
      },
    },
  };
}

function getBoxQuantity(row, headerMap) {
  const productBoxQuantity = parseInteger(
    valueFrom(row, headerMap, "Box Quantity (product.metafields.wholesale.box_quantity)")
  );

  const variantBoxQuantity = parseInteger(
    valueFrom(row, headerMap, "Box Quantity for Variants (product.metafields.custom.box_quantity_for_variants)")
  );

  return variantBoxQuantity || productBoxQuantity || null;
}

function getVariantImageUrl(row, headerMap) {
  const variantImage = cleanText(valueFrom(row, headerMap, "Variant Image"));
  const imageSrc = cleanText(valueFrom(row, headerMap, "Image Src"));

  return variantImage || imageSrc || null;
}

function normalizeWeightUnit(value) {
  const cleaned = cleanText(value).toLowerCase();

  if (!cleaned) return null;

  if (["lb", "lbs", "pound", "pounds"].includes(cleaned)) return "lb";
  if (["kg", "kilogram", "kilograms"].includes(cleaned)) return "kg";
  if (["g", "gram", "grams"].includes(cleaned)) return "g";
  if (["oz", "ounce", "ounces"].includes(cleaned)) return "oz";

  return cleaned;
}

function normalizeStatus(value) {
  const cleaned = cleanText(value).toLowerCase();

  if (cleaned === "active") return "active";
  if (cleaned === "draft") return "draft";
  if (cleaned === "archived") return "archived";

  return "active";
}

function shouldUseDefaultTitle(variantTitle) {
  if (!variantTitle) return true;

  const normalized = variantTitle.trim().toLowerCase();

  return (
    normalized === "default title" ||
    normalized === "title" ||
    normalized === "default"
  );
}

async function updateProductBasePrices(supabase) {
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id");

  if (productsError) {
    throw new Error(`Could not load products: ${productsError.message}`);
  }

  let updatedProducts = 0;

  for (const product of products || []) {
    const { data: variants, error: variantsError } = await supabase
      .from("product_variants")
      .select("price, compare_at_price, box_quantity, min_order_quantity, quantity_step")
      .eq("product_id", product.id)
      .not("price", "is", null);

    if (variantsError) {
      console.error(`Could not load variants for product ${product.id}: ${variantsError.message}`);
      continue;
    }

    if (!variants || variants.length === 0) continue;

    const prices = variants
      .map((variant) => variant.price)
      .filter((value) => value !== null && value !== undefined)
      .map(Number)
      .filter((value) => Number.isFinite(value));

    const comparePrices = variants
      .map((variant) => variant.compare_at_price)
      .filter((value) => value !== null && value !== undefined)
      .map(Number)
      .filter((value) => Number.isFinite(value));

    const variantBoxQuantities = variants
      .map((variant) => variant.box_quantity)
      .filter((value) => value !== null && value !== undefined)
      .map(Number)
      .filter((value) => Number.isInteger(value) && value > 0);

    if (prices.length === 0) continue;

    const basePrice = Math.min(...prices);
    const compareAtPrice = comparePrices.length > 0 ? Math.min(...comparePrices) : null;

    const updatePayload = {
      base_price: basePrice,
      compare_at_price: compareAtPrice,
      updated_at: new Date().toISOString(),
    };

    if (variantBoxQuantities.length > 0) {
      const minBoxQuantity = Math.min(...variantBoxQuantities);
      updatePayload.box_quantity = minBoxQuantity;
      updatePayload.min_order_quantity = minBoxQuantity;
      updatePayload.quantity_step = minBoxQuantity;
    }

    const { error: updateProductError } = await supabase
      .from("products")
      .update(updatePayload)
      .eq("id", product.id);

    if (updateProductError) {
      console.error(`Could not update product ${product.id}: ${updateProductError.message}`);
      continue;
    }

    updatedProducts += 1;
  }

  return updatedProducts;
}

async function main() {
  loadEnvFile(ENV_PATH);

  if (!fs.existsSync(CSV_PATH)) {
    throw new Error(`CSV file not found: ${CSV_PATH}`);
  }

  const supabaseUrl = getRequiredEnv([
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_URL",
  ]);

  const serviceRoleKey = getRequiredEnv([
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SERVICE_KEY",
  ]);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const csvText = fs.readFileSync(CSV_PATH, "utf8");
  const rows = parseCsv(csvText);

  if (rows.length < 2) {
    throw new Error("CSV has no data rows.");
  }

  const headers = rows[0].map((header) => String(header || "").trim());
  const headerMap = new Map(headers.map((header, index) => [header, index]));

  const requiredHeaders = [
    "Handle",
    "Variant SKU",
    "Variant Price",
  ];

  for (const header of requiredHeaders) {
    if (!headerMap.has(header)) {
      throw new Error(`CSV missing required header: ${header}`);
    }
  }

  const variantRowsBySku = new Map();

  for (const row of rows.slice(1)) {
    const handle = cleanText(valueFrom(row, headerMap, "Handle"));
    const sku = cleanSku(valueFrom(row, headerMap, "Variant SKU"));
    const price = parseMoney(valueFrom(row, headerMap, "Variant Price"));

    if (!handle || !sku || price === null) {
      continue;
    }

    const compareAtPrice = parseMoney(
      valueFrom(row, headerMap, "Variant Compare At Price")
    );

    const costPrice = parseMoney(
      valueFrom(row, headerMap, "Cost per item")
    );

    const barcode = cleanText(
      valueFrom(row, headerMap, "Variant Barcode")
    );

    const grams = parseMoney(
      valueFrom(row, headerMap, "Variant Grams")
    );

    const weightUnit = normalizeWeightUnit(
      valueFrom(row, headerMap, "Variant Weight Unit")
    );

    const inventoryTracker = cleanText(
      valueFrom(row, headerMap, "Variant Inventory Tracker")
    );

    const inventoryPolicy = cleanText(
      valueFrom(row, headerMap, "Variant Inventory Policy")
    );

    const fulfillmentService = cleanText(
      valueFrom(row, headerMap, "Variant Fulfillment Service")
    );

    const requiresShipping = parseBoolean(
      valueFrom(row, headerMap, "Variant Requires Shipping")
    );

    const taxable = parseBoolean(
      valueFrom(row, headerMap, "Variant Taxable")
    );

    const status = normalizeStatus(
      valueFrom(row, headerMap, "Status")
    );

    const boxQuantity = getBoxQuantity(row, headerMap);
    const variantImageUrl = getVariantImageUrl(row, headerMap);
    const variantTitle = buildVariantTitle(row, headerMap);
    const optionPayload = buildOptionPayload(row, headerMap);

    variantRowsBySku.set(sku, {
      handle,
      sku,
      price,
      compareAtPrice,
      costPrice,
      barcode: barcode || null,
      grams,
      weightUnit,
      inventoryTracker: inventoryTracker || null,
      inventoryPolicy: inventoryPolicy || null,
      fulfillmentService: fulfillmentService || null,
      requiresShipping,
      taxable,
      status,
      boxQuantity,
      variantImageUrl,
      variantTitle,
      optionPayload,
    });
  }

  console.log(`CSV variant rows with SKU and price: ${variantRowsBySku.size}`);

  let updated = 0;
  let notFound = 0;
  let failed = 0;

  for (const item of variantRowsBySku.values()) {
    const updatePayload = {
      price: item.price,
      compare_at_price: item.compareAtPrice,
      cost_price: item.costPrice,
      barcode: item.barcode,
      inventory_tracker: item.inventoryTracker,
      inventory_policy: item.inventoryPolicy,
      fulfillment_service: item.fulfillmentService,
      status: item.status,
      variant_image_url: item.variantImageUrl,
      updated_at: new Date().toISOString(),
      ...item.optionPayload,
    };

    if (item.requiresShipping !== null) {
      updatePayload.requires_shipping = item.requiresShipping;
    }

    if (item.taxable !== null) {
      updatePayload.taxable = item.taxable;
    }

    if (item.grams !== null) {
      updatePayload.weight = item.grams;
      updatePayload.weight_unit = item.weightUnit || "g";
    } else if (item.weightUnit) {
      updatePayload.weight_unit = item.weightUnit;
    }

    if (item.boxQuantity) {
      updatePayload.box_quantity = item.boxQuantity;
      updatePayload.min_order_quantity = item.boxQuantity;
      updatePayload.quantity_step = item.boxQuantity;
    }

    if (!shouldUseDefaultTitle(item.variantTitle)) {
      updatePayload.title = item.variantTitle;
    }

    const { data, error } = await supabase
      .from("product_variants")
      .update(updatePayload)
      .eq("sku", item.sku)
      .select("id, sku, product_id");

    if (error) {
      failed += 1;
      console.error(`Failed SKU ${item.sku}: ${error.message}`);
      continue;
    }

    if (!data || data.length === 0) {
      notFound += 1;
      console.warn(`SKU not found in Supabase: ${item.sku}`);
      continue;
    }

    updated += data.length;
  }

  const updatedProducts = await updateProductBasePrices(supabase);

  const { count: totalVariants, error: totalVariantsError } = await supabase
    .from("product_variants")
    .select("id", { count: "exact", head: true });

  const { count: variantsWithPrice, error: variantsWithPriceError } = await supabase
    .from("product_variants")
    .select("id", { count: "exact", head: true })
    .not("price", "is", null);

  const { count: variantsWithBoxQuantity, error: variantsWithBoxQuantityError } = await supabase
    .from("product_variants")
    .select("id", { count: "exact", head: true })
    .not("box_quantity", "is", null);

  console.log("");
  console.log("Import summary");
  console.log("==============");
  console.log(`Updated variants: ${updated}`);
  console.log(`CSV SKUs not found in Supabase: ${notFound}`);
  console.log(`Failed updates: ${failed}`);
  console.log(`Updated product base prices: ${updatedProducts}`);

  if (!totalVariantsError) {
    console.log(`Total variants in Supabase: ${totalVariants}`);
  }

  if (!variantsWithPriceError) {
    console.log(`Variants with price after import: ${variantsWithPrice}`);
  }

  if (!variantsWithBoxQuantityError) {
    console.log(`Variants with box quantity after import: ${variantsWithBoxQuantity}`);
  }

  console.log("Done.");
}

main().catch((error) => {
  console.error("");
  console.error("Import failed");
  console.error("=============");
  console.error(error);
  process.exit(1);
});