import { getSheetData } from "./sheets";

const PRICE_LISTS_SHEET = "price_lists";
const PRICE_LIST_ITEMS_SHEET = "price_list_items";
const CUSTOMERS_SHEET = "customers";

export type CustomerRecord = {
  id: string;
  customer_code: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  password_hash: string;
  company_type: string;
  website: string;
  country: string;
  state: string;
  city: string;
  status: string;
  customer_group: string;
  price_list_id: string;
  payment_terms: string;
  minimum_order_amount: string;
  minimum_order_quantity: string;
  must_change_password: string;
  last_login_at: string;
  created_at: string;
  updated_at: string;
};

export type PriceListRecord = {
  id: string;
  name: string;
  code: string;
  description: string;
  currency: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type PriceListItemRecord = {
  id: string;
  price_list_id: string;
  product_slug: string;
  variant_id: string;
  sku: string;
  price: string;
  compare_at_price: string;
  minimum_quantity: string;
  quantity_step: string;
  case_pack: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type ResolvedB2BPrice = {
  priceListId: string;
  priceListName: string;
  currency: string;
  productSlug: string;
  variantId: string;
  sku: string;
  price: number;
  compareAtPrice: number | null;
  minimumQuantity: number;
  quantityStep: number;
  casePack: number;
};

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function parseNumber(value: unknown, fallback = 0) {
  const numberValue = Number(String(value || "").replace(/,/g, "").trim());

  if (Number.isNaN(numberValue)) {
    return fallback;
  }

  return numberValue;
}

function parsePositiveInteger(value: unknown, fallback = 1) {
  const numberValue = Math.floor(parseNumber(value, fallback));

  if (numberValue < 1) {
    return fallback;
  }

  return numberValue;
}

export async function getCustomers() {
  const rows = (await getSheetData(CUSTOMERS_SHEET, {
    forceFresh: true,
    ttlSeconds: 0,
  })) as CustomerRecord[];

  return rows.filter((customer) => {
    return normalizeText(customer.id) && normalizeText(customer.email);
  });
}

export async function getActiveCustomers() {
  const customers = await getCustomers();

  return customers.filter((customer) => {
    return normalizeLower(customer.status) === "active";
  });
}

export async function getCustomerByEmail(email: string) {
  const normalizedEmail = normalizeLower(email);

  if (!normalizedEmail) {
    return null;
  }

  const customers = await getCustomers();

  return (
    customers.find((customer) => {
      return normalizeLower(customer.email) === normalizedEmail;
    }) || null
  );
}

export async function getCustomerById(customerId: string) {
  const normalizedId = normalizeText(customerId);

  if (!normalizedId) {
    return null;
  }

  const customers = await getCustomers();

  return (
    customers.find((customer) => {
      return normalizeText(customer.id) === normalizedId;
    }) || null
  );
}

export async function getActivePriceLists() {
  const rows = (await getSheetData(PRICE_LISTS_SHEET, {
    forceFresh: true,
    ttlSeconds: 0,
  })) as PriceListRecord[];

  return rows.filter((priceList) => {
    return (
      normalizeText(priceList.id) &&
      normalizeLower(priceList.status) === "active"
    );
  });
}

export async function getPriceListById(priceListId: string) {
  const normalizedId = normalizeText(priceListId);

  if (!normalizedId) {
    return null;
  }

  const priceLists = await getActivePriceLists();

  return (
    priceLists.find((priceList) => {
      return normalizeText(priceList.id) === normalizedId;
    }) || null
  );
}

export async function getPriceListItems(priceListId: string) {
  const normalizedPriceListId = normalizeText(priceListId);

  if (!normalizedPriceListId) {
    return [];
  }

  const rows = (await getSheetData(PRICE_LIST_ITEMS_SHEET, {
    forceFresh: true,
    ttlSeconds: 0,
  })) as PriceListItemRecord[];

  return rows.filter((item) => {
    return (
      normalizeText(item.price_list_id) === normalizedPriceListId &&
      normalizeLower(item.status) === "active"
    );
  });
}

export async function getPriceListItemByProduct(input: {
  priceListId: string;
  productSlug: string;
  variantId?: string;
  sku?: string;
}) {
  const priceListId = normalizeText(input.priceListId);
  const productSlug = normalizeText(input.productSlug);
  const variantId = normalizeText(input.variantId);
  const sku = normalizeText(input.sku);

  if (!priceListId || !productSlug) {
    return null;
  }

  const priceItems = await getPriceListItems(priceListId);

  const exactMatch = priceItems.find((item) => {
    const matchesProduct = normalizeText(item.product_slug) === productSlug;

    const matchesVariant = variantId
      ? normalizeText(item.variant_id) === variantId
      : true;

    const matchesSku = sku ? normalizeText(item.sku) === sku : true;

    return matchesProduct && matchesVariant && matchesSku;
  });

  if (exactMatch) {
    return exactMatch;
  }

  const productOnlyMatch = priceItems.find((item) => {
    return normalizeText(item.product_slug) === productSlug;
  });

  return productOnlyMatch || null;
}

export async function resolveB2BPrice(input: {
  customerId?: string;
  customerEmail?: string;
  productSlug: string;
  variantId?: string;
  sku?: string;
}) {
  const productSlug = normalizeText(input.productSlug);
  const variantId = normalizeText(input.variantId);
  const sku = normalizeText(input.sku);

  if (!productSlug) {
    return null;
  }

  const customer = input.customerId
    ? await getCustomerById(input.customerId)
    : await getCustomerByEmail(input.customerEmail || "");

  if (!customer) {
    return null;
  }

  if (normalizeLower(customer.status) !== "active") {
    return null;
  }

  const priceListId = normalizeText(customer.price_list_id);

  if (!priceListId) {
    return null;
  }

  const priceList = await getPriceListById(priceListId);

  if (!priceList) {
    return null;
  }

  const matchedItem = await getPriceListItemByProduct({
    priceListId,
    productSlug,
    variantId,
    sku,
  });

  if (!matchedItem) {
    return null;
  }

  const resolvedPrice: ResolvedB2BPrice = {
    priceListId: normalizeText(priceList.id),
    priceListName: normalizeText(priceList.name),
    currency: normalizeText(priceList.currency || "USD"),
    productSlug: normalizeText(matchedItem.product_slug),
    variantId: normalizeText(matchedItem.variant_id),
    sku: normalizeText(matchedItem.sku),
    price: parseNumber(matchedItem.price, 0),
    compareAtPrice: matchedItem.compare_at_price
      ? parseNumber(matchedItem.compare_at_price, 0)
      : null,
    minimumQuantity: parsePositiveInteger(matchedItem.minimum_quantity, 1),
    quantityStep: parsePositiveInteger(matchedItem.quantity_step, 1),
    casePack: parsePositiveInteger(matchedItem.case_pack, 1),
  };

  return resolvedPrice;
}

export function isValidB2BQuantity(input: {
  quantity: number;
  minimumQuantity: number;
  quantityStep: number;
}) {
  const quantity = Math.floor(Number(input.quantity || 0));
  const minimumQuantity = parsePositiveInteger(input.minimumQuantity, 1);
  const quantityStep = parsePositiveInteger(input.quantityStep, 1);

  if (quantity < minimumQuantity) {
    return false;
  }

  return (quantity - minimumQuantity) % quantityStep === 0;
}

export function getNextValidB2BQuantity(input: {
  quantity: number;
  minimumQuantity: number;
  quantityStep: number;
}) {
  const quantity = Math.floor(Number(input.quantity || 0));
  const minimumQuantity = parsePositiveInteger(input.minimumQuantity, 1);
  const quantityStep = parsePositiveInteger(input.quantityStep, 1);

  if (quantity <= minimumQuantity) {
    return minimumQuantity;
  }

  const remainder = (quantity - minimumQuantity) % quantityStep;

  if (remainder === 0) {
    return quantity;
  }

  return quantity + quantityStep - remainder;
}