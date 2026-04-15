const DEFAULT_CURRENCY = "USD";

function normalizeRawNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const raw = value.trim();

    if (!raw) return 0;

    const cleaned = raw.replace(/\$/g, "").replace(/\s/g, "");

    const hasComma = cleaned.includes(",");
    const hasDot = cleaned.includes(".");

    let normalized = cleaned;

    if (hasComma && hasDot) {
      const lastComma = cleaned.lastIndexOf(",");
      const lastDot = cleaned.lastIndexOf(".");

      if (lastComma > lastDot) {
        normalized = cleaned.replace(/\./g, "").replace(",", ".");
      } else {
        normalized = cleaned.replace(/,/g, "");
      }
    } else if (hasComma) {
      normalized = cleaned.replace(",", ".");
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export function toNumber(value: unknown): number {
  return normalizeRawNumber(value);
}

export function toMoney(value: unknown, fractionDigits = 2): string {
  const amount = normalizeRawNumber(value);
  return amount.toFixed(fractionDigits);
}

export function multiplyMoney(price: unknown, quantity: unknown): number {
  const normalizedPrice = normalizeRawNumber(price);
  const normalizedQuantity = Math.max(0, normalizeRawNumber(quantity));

  return Number((normalizedPrice * normalizedQuantity).toFixed(2));
}

export function addMoney(...values: unknown[]): number {
  const total = values.reduce<number>((sum, item) => {
    return sum + normalizeRawNumber(item);
  }, 0);

  return Number(total.toFixed(2));
}

export function subtractMoney(a: unknown, b: unknown): number {
  return Number((normalizeRawNumber(a) - normalizeRawNumber(b)).toFixed(2));
}

export function formatMoney(
  value: unknown,
  currency = DEFAULT_CURRENCY,
  locale = "en-US"
): string {
  const amount = normalizeRawNumber(value);

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function clampQuantity(value: unknown, min = 1): number {
  const parsed = Math.floor(normalizeRawNumber(value));

  if (!Number.isFinite(parsed) || parsed < min) {
    return min;
  }

  return parsed;
}