export type DraftOrderItem = {
  productSlug: string;
  productTitle: string;
  variantId: string;
  variantLabel: string;
  sku: string;
  image: string;
  unitPrice: number;
  quantity: number;
  minOrderQuantity: number;
  quantityStep: number;
  lineTotal: number;
};

const STORAGE_KEY = "ptx_b2b_order_draft";

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function toSafeNumber(value: unknown, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function getItemKey(item: DraftOrderItem) {
  return `${normalizeText(item.productSlug)}::${normalizeText(item.variantId)}`;
}

export function loadDraftOrder(): DraftOrderItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((item) => {
      const quantity = toSafeNumber(item.quantity, 1);
      const unitPrice = toSafeNumber(item.unitPrice, 0);

      return {
        productSlug: normalizeText(item.productSlug),
        productTitle: normalizeText(item.productTitle),
        variantId: normalizeText(item.variantId),
        variantLabel: normalizeText(item.variantLabel),
        sku: normalizeText(item.sku),
        image: normalizeText(item.image),
        unitPrice,
        quantity,
        minOrderQuantity: toSafeNumber(item.minOrderQuantity, 1),
        quantityStep: toSafeNumber(item.quantityStep, 1),
        lineTotal: unitPrice * quantity,
      } as DraftOrderItem;
    });
  } catch {
    return [];
  }
}

export function saveDraftOrder(items: DraftOrderItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("ptx-order-draft-updated"));
}

export function clearDraftOrder() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("ptx-order-draft-updated"));
}

export function addToDraftOrder(item: DraftOrderItem) {
  const items = loadDraftOrder();
  const key = getItemKey(item);

  const existingIndex = items.findIndex((entry) => getItemKey(entry) === key);

  if (existingIndex >= 0) {
    const existing = items[existingIndex];
    const newQuantity = existing.quantity + item.quantity;

    items[existingIndex] = {
      ...existing,
      quantity: newQuantity,
      lineTotal: existing.unitPrice * newQuantity,
    };
  } else {
    items.push({
      ...item,
      lineTotal: item.unitPrice * item.quantity,
    });
  }

  saveDraftOrder(items);
}

export function updateDraftOrderQuantity(key: string, quantity: number) {
  const items = loadDraftOrder();

  const next = items.map((item) => {
    if (getItemKey(item) !== key) {
      return item;
    }

    const finalQuantity = Math.max(
      item.minOrderQuantity || 1,
      toSafeNumber(quantity, item.minOrderQuantity || 1)
    );

    return {
      ...item,
      quantity: finalQuantity,
      lineTotal: item.unitPrice * finalQuantity,
    };
  });

  saveDraftOrder(next);
}

export function removeDraftOrderItem(key: string) {
  const items = loadDraftOrder();
  const next = items.filter((item) => getItemKey(item) !== key);
  saveDraftOrder(next);
}

export function getDraftOrderSubtotal(items: DraftOrderItem[]) {
  return items.reduce((sum, item) => sum + toSafeNumber(item.lineTotal, 0), 0);
}

export function getDraftOrderItemKey(item: DraftOrderItem) {
  return getItemKey(item);
}