import {
  appendSheetRow,
  findRowNumberByField,
  findSheetItemByField,
  findSheetItemsByField,
  getSheetData,
  getSheetHeaders,
  updateSheetRowByRowNumber,
} from "./sheets";
import { createId, createToken, nowIso } from "./ids";
import { multiplyMoney, toMoney, toNumber } from "./money";

const CHECKOUT_SESSIONS_SHEET = "checkout_sessions";
const CHECKOUT_SESSION_ITEMS_SHEET = "checkout_session_items";

export type CheckoutSessionStatus =
  | "active"
  | "abandoned"
  | "followed_up"
  | "recovered"
  | "dismissed";

export type CheckoutSessionStage =
  | "cart"
  | "checkout_started"
  | "contact_info"
  | "shipping"
  | "payment"
  | "completed";

export type CheckoutSessionRecord = {
  id: string;
  cart_token: string;
  customer_id: string;
  email: string;
  company: string;
  status: string;
  stage: string;
  currency: string;
  subtotal: string;
  item_count: string;
  last_activity_at: string;
  recovered_order_id: string;
  note: string;
  created_at: string;
  updated_at: string;
};

export type CheckoutSessionItemRecord = {
  id: string;
  checkout_session_id: string;
  product_slug: string;
  variant_id: string;
  sku: string;
  product_title: string;
  variant_title: string;
  image: string;
  quantity: string;
  unit_price: string;
  line_total: string;
  created_at: string;
  updated_at: string;
};

export type CheckoutSessionItemInput = {
  product_slug?: string;
  variant_id?: string;
  sku?: string;
  product_title?: string;
  variant_title?: string;
  image?: string;
  quantity?: string | number;
  unit_price?: string | number;
};

export type CreateCheckoutSessionInput = {
  cart_token?: string;
  customer_id?: string;
  email?: string;
  company?: string;
  status?: string;
  stage?: string;
  currency?: string;
  note?: string;
  recovered_order_id?: string;
  items?: CheckoutSessionItemInput[];
};

export type UpdateCheckoutSessionInput = {
  customer_id?: string;
  email?: string;
  company?: string;
  status?: string;
  stage?: string;
  currency?: string;
  note?: string;
  recovered_order_id?: string;
  items?: CheckoutSessionItemInput[];
};

export type CheckoutSessionWithItems = {
  session: CheckoutSessionRecord;
  items: CheckoutSessionItemRecord[];
};

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function normalizeStatus(value: unknown): CheckoutSessionStatus {
  const status = normalizeLower(value || "active");

  if (
    status === "active" ||
    status === "abandoned" ||
    status === "followed_up" ||
    status === "recovered" ||
    status === "dismissed"
  ) {
    return status;
  }

  return "active";
}

function normalizeStage(value: unknown): CheckoutSessionStage {
  const stage = normalizeLower(value || "cart");

  if (
    stage === "cart" ||
    stage === "checkout_started" ||
    stage === "contact_info" ||
    stage === "shipping" ||
    stage === "payment" ||
    stage === "completed"
  ) {
    return stage;
  }

  return "cart";
}

async function buildRowFromHeaders(
  sheetName: string,
  record: Record<string, unknown>
) {
  const headers = await getSheetHeaders(sheetName, {
    forceFresh: true,
    ttlSeconds: 0,
  });

  if (!headers.length) {
    throw new Error(`"${sheetName}" sheet headers could not be found.`);
  }

  return headers.map((header) => {
    const value = record[header];
    return value === undefined || value === null ? "" : String(value);
  });
}

function calculateItems(items: CheckoutSessionItemInput[]) {
  const normalizedItems = items.map((item) => {
    const quantity = Math.max(0, toNumber(item.quantity || 0));
    const unitPrice = Math.max(0, toNumber(item.unit_price || 0));
    const lineTotal = multiplyMoney(unitPrice, quantity);

    return {
      product_slug: normalizeText(item.product_slug),
      variant_id: normalizeText(item.variant_id),
      sku: normalizeText(item.sku),
      product_title: normalizeText(item.product_title),
      variant_title: normalizeText(item.variant_title),
      image: normalizeText(item.image),
      quantity,
      unit_price: unitPrice,
      line_total: lineTotal,
    };
  });

  const subtotal = normalizedItems.reduce((sum, item) => {
    return sum + item.line_total;
  }, 0);

  const itemCount = normalizedItems.reduce((sum, item) => {
    return sum + item.quantity;
  }, 0);

  return {
    items: normalizedItems,
    subtotal,
    itemCount,
  };
}

export async function getAllCheckoutSessions() {
  const rows = (await getSheetData(CHECKOUT_SESSIONS_SHEET, {
    forceFresh: true,
    ttlSeconds: 0,
  })) as CheckoutSessionRecord[];

  return [...rows].sort((a, b) => {
    return (
      new Date(
        b.last_activity_at || b.updated_at || b.created_at || 0
      ).getTime() -
      new Date(
        a.last_activity_at || a.updated_at || a.created_at || 0
      ).getTime()
    );
  });
}

export async function getCheckoutSessionItems(sessionId: string) {
  const normalizedSessionId = normalizeText(sessionId);

  if (!normalizedSessionId) {
    return [];
  }

  return (await findSheetItemsByField(
    CHECKOUT_SESSION_ITEMS_SHEET,
    "checkout_session_id",
    normalizedSessionId,
    { forceFresh: true, ttlSeconds: 0 }
  )) as CheckoutSessionItemRecord[];
}

export async function getCheckoutSessionById(
  sessionId: string
): Promise<CheckoutSessionWithItems | null> {
  const normalizedSessionId = normalizeText(sessionId);

  if (!normalizedSessionId) {
    return null;
  }

  const session = (await findSheetItemByField(
    CHECKOUT_SESSIONS_SHEET,
    "id",
    normalizedSessionId,
    { forceFresh: true, ttlSeconds: 0 }
  )) as CheckoutSessionRecord | null;

  if (!session) {
    return null;
  }

  const items = await getCheckoutSessionItems(session.id);

  return {
    session,
    items,
  };
}

export async function getCheckoutSessionByCartToken(
  cartToken: string
): Promise<CheckoutSessionWithItems | null> {
  const normalizedCartToken = normalizeText(cartToken);

  if (!normalizedCartToken) {
    return null;
  }

  const session = (await findSheetItemByField(
    CHECKOUT_SESSIONS_SHEET,
    "cart_token",
    normalizedCartToken,
    { forceFresh: true, ttlSeconds: 0 }
  )) as CheckoutSessionRecord | null;

  if (!session) {
    return null;
  }

  const items = await getCheckoutSessionItems(session.id);

  return {
    session,
    items,
  };
}

export async function createCheckoutSession(input: CreateCheckoutSessionInput) {
  const now = nowIso();
  const calculated = calculateItems(Array.isArray(input.items) ? input.items : []);

  const session: CheckoutSessionRecord = {
    id: createId("checkout"),
    cart_token: normalizeText(input.cart_token) || createToken("cart"),
    customer_id: normalizeText(input.customer_id),
    email: normalizeLower(input.email),
    company: normalizeText(input.company),
    status: normalizeStatus(input.status),
    stage: normalizeStage(input.stage),
    currency: normalizeText(input.currency || "USD") || "USD",
    subtotal: toMoney(calculated.subtotal),
    item_count: String(calculated.itemCount),
    last_activity_at: now,
    recovered_order_id: normalizeText(input.recovered_order_id),
    note: normalizeText(input.note),
    created_at: now,
    updated_at: now,
  };

  const sessionRow = await buildRowFromHeaders(CHECKOUT_SESSIONS_SHEET, session);
  await appendSheetRow(CHECKOUT_SESSIONS_SHEET, sessionRow);

  const createdItems: CheckoutSessionItemRecord[] = [];

  for (const item of calculated.items) {
    const itemRecord: CheckoutSessionItemRecord = {
      id: createId("checkoutitem"),
      checkout_session_id: session.id,
      product_slug: item.product_slug,
      variant_id: item.variant_id,
      sku: item.sku,
      product_title: item.product_title,
      variant_title: item.variant_title,
      image: item.image,
      quantity: String(item.quantity),
      unit_price: toMoney(item.unit_price),
      line_total: toMoney(item.line_total),
      created_at: now,
      updated_at: now,
    };

    const itemRow = await buildRowFromHeaders(
      CHECKOUT_SESSION_ITEMS_SHEET,
      itemRecord
    );

    await appendSheetRow(CHECKOUT_SESSION_ITEMS_SHEET, itemRow);
    createdItems.push(itemRecord);
  }

  return {
    session,
    items: createdItems,
  };
}

export async function updateCheckoutSession(
  sessionId: string,
  input: UpdateCheckoutSessionInput
) {
  const normalizedSessionId = normalizeText(sessionId);

  if (!normalizedSessionId) {
    throw new Error("sessionId is required.");
  }

  const current = await getCheckoutSessionById(normalizedSessionId);

  if (!current) {
    throw new Error("Checkout session not found.");
  }

  const now = nowIso();

  const updatedSession: CheckoutSessionRecord = {
    ...current.session,
    customer_id:
      input.customer_id === undefined
        ? current.session.customer_id
        : normalizeText(input.customer_id),
    email:
      input.email === undefined
        ? current.session.email
        : normalizeLower(input.email),
    company:
      input.company === undefined
        ? current.session.company
        : normalizeText(input.company),
    status:
      input.status === undefined
        ? current.session.status
        : normalizeStatus(input.status),
    stage:
      input.stage === undefined
        ? current.session.stage
        : normalizeStage(input.stage),
    currency:
      input.currency === undefined
        ? current.session.currency
        : normalizeText(input.currency || "USD") || "USD",
    note:
      input.note === undefined ? current.session.note : normalizeText(input.note),
    recovered_order_id:
      input.recovered_order_id === undefined
        ? current.session.recovered_order_id
        : normalizeText(input.recovered_order_id),
    last_activity_at: now,
    updated_at: now,
  };

  if (Array.isArray(input.items)) {
    const calculated = calculateItems(input.items);
    updatedSession.subtotal = toMoney(calculated.subtotal);
    updatedSession.item_count = String(calculated.itemCount);
  }

  const rowNumber = await findRowNumberByField(
    CHECKOUT_SESSIONS_SHEET,
    "id",
    normalizedSessionId
  );

  if (!rowNumber) {
    throw new Error("Checkout session row could not be found.");
  }

  const row = await buildRowFromHeaders(CHECKOUT_SESSIONS_SHEET, updatedSession);
  await updateSheetRowByRowNumber(CHECKOUT_SESSIONS_SHEET, rowNumber, row);

  return {
    session: updatedSession,
    items: current.items,
  };
}

export async function updateCheckoutSessionStatus(
  sessionId: string,
  status: string
) {
  return updateCheckoutSession(sessionId, {
    status,
  });
}

export async function updateCheckoutSessionStage(sessionId: string, stage: string) {
  return updateCheckoutSession(sessionId, {
    stage,
  });
}

export async function markCheckoutSessionRecovered(
  sessionId: string,
  recoveredOrderId: string
) {
  return updateCheckoutSession(sessionId, {
    status: "recovered",
    stage: "completed",
    recovered_order_id: recoveredOrderId,
  });
}

export async function detectAbandonedCheckoutSessions(options?: {
  minutesSinceLastActivity?: number;
}) {
  const minutesSinceLastActivity = options?.minutesSinceLastActivity ?? 60;
  const cutoffTime = Date.now() - minutesSinceLastActivity * 60 * 1000;

  const sessions = await getAllCheckoutSessions();

  const candidates = sessions.filter((session) => {
    const status = normalizeStatus(session.status);
    const stage = normalizeStage(session.stage);

    if (status !== "active") return false;
    if (stage === "completed") return false;

    const lastActivityTime = new Date(
      session.last_activity_at || session.updated_at || session.created_at || 0
    ).getTime();

    if (!Number.isFinite(lastActivityTime)) return false;

    return lastActivityTime < cutoffTime;
  });

  const updated: CheckoutSessionRecord[] = [];

  for (const session of candidates) {
    const result = await updateCheckoutSessionStatus(session.id, "abandoned");
    updated.push(result.session);
  }

  return {
    ok: true,
    updatedCount: updated.length,
    items: updated,
  };
}