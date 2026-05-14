"use client";

import { memo, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { useCart } from "../cart/CartContext";
import { formatMoney } from "../../lib/money";

export type VariantItem = {
  id?: string;
  product_slug?: string;
  product_id?: string;
  title?: string | null;
  name?: string | null;
  option1_name?: string | null;
  option1_value?: string | null;
  option2_name?: string | null;
  option2_value?: string | null;
  option3_name?: string | null;
  option3_value?: string | null;
  sku?: string | null;
  barcode?: string | null;
  price?: string | number | null;
  compare_at_price?: string | number | null;
  status?: string | null;
  variant_image?: string | null;
  variant_image_url?: string | null;
  image_id?: string | null;
  variant_image_file_id?: string | null;
  variant_image_legacy_id?: string | null;
  box_quantity?: string | number | null;
  sort_order?: string | number | null;
  created_at?: string;
  updated_at?: string;
};

type ProductPurchasePanelProps = {
  product: {
    id?: string;
    title?: string;
    slug?: string;
    image?: string;
    sku?: string | number | null;
    price?: string | number | null;
    compare_at_price?: string | number | null;
    box_quantity?: string | number | null;
  };
  variants?: VariantItem[];
  onVariantChange?: (variant: VariantItem | null) => void;
};

type QuantityRule = {
  boxQuantity: number;
  message: string;
};

function normalize(value?: string | number | boolean | null) {
  return String(value ?? "").trim();
}

function normalizeLower(value?: string | number | boolean | null) {
  return normalize(value).toLowerCase();
}

function toPositiveInteger(value: unknown, fallback: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  const floored = Math.floor(parsed);

  return floored > 0 ? floored : fallback;
}

function toSafeOrder(value: unknown) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 999999;
}

function parsePrice(value?: string | number | null) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const raw = normalize(value);
  if (!raw) return 0;

  const cleaned = raw.replace(/[^\d.,-]/g, "");
  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");

  let normalizedNumber = cleaned;

  if (hasComma && hasDot) {
    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");

    normalizedNumber =
      lastComma > lastDot
        ? cleaned.replace(/\./g, "").replace(",", ".")
        : cleaned.replace(/,/g, "");
  } else if (hasComma) {
    normalizedNumber = cleaned.replace(",", ".");
  }

  const parsed = Number(normalizedNumber);

  return Number.isFinite(parsed) ? parsed : 0;
}

function isActiveStatus(value: unknown) {
  const status = normalizeLower(value);

  return status === "" || status === "published" || status === "active";
}

function getUsableVariants(variants: VariantItem[]) {
  return [...variants]
    .filter((variant) => isActiveStatus(variant.status))
    .sort((a, b) => toSafeOrder(a.sort_order) - toSafeOrder(b.sort_order));
}

function getBackendVariant(variants: VariantItem[]) {
  const usableVariants = getUsableVariants(variants);

  return usableVariants[0] || null;
}

function getVariantImage(variant: VariantItem | null) {
  if (!variant) return "";

  return (
    normalize(variant.variant_image_url) ||
    normalize(variant.variant_image) ||
    normalize(variant.variant_image_file_id) ||
    normalize(variant.variant_image_legacy_id) ||
    normalize(variant.image_id)
  );
}

function getQuantityRule(
  product: ProductPurchasePanelProps["product"]
): QuantityRule {
  const boxQuantity = toPositiveInteger(product.box_quantity, 0) || 1;

  return {
    boxQuantity,
    message:
      boxQuantity > 1
        ? `This product is ordered in box multiples of ${boxQuantity}.`
        : "",
  };
}

function normalizeQuantityToBox(quantity: unknown, rule: QuantityRule) {
  const parsed = Number(quantity);
  const requested = Number.isFinite(parsed)
    ? Math.floor(parsed)
    : rule.boxQuantity;

  const safeQuantity = Math.max(rule.boxQuantity, requested);
  const remainder = safeQuantity % rule.boxQuantity;

  if (remainder === 0) {
    return safeQuantity;
  }

  return safeQuantity + (rule.boxQuantity - remainder);
}

function getNextDecreaseQuantity(quantity: number, rule: QuantityRule) {
  const next = quantity - rule.boxQuantity;

  if (next < rule.boxQuantity) {
    return rule.boxQuantity;
  }

  return normalizeQuantityToBox(next, rule);
}

function getNextIncreaseQuantity(quantity: number, rule: QuantityRule) {
  return normalizeQuantityToBox(quantity + rule.boxQuantity, rule);
}

function ProductPurchasePanelComponent({
  product,
  variants = [],
  onVariantChange,
}: ProductPurchasePanelProps) {
  const { handleAddToCart, isAdding } = useCart();

  const [quantity, setQuantity] = useState(1);
  const [quantityInput, setQuantityInput] = useState("1");
  const [localError, setLocalError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const backendVariant = useMemo(() => {
    return getBackendVariant(variants);
  }, [variants]);

  const quantityRule = useMemo(() => {
    return getQuantityRule(product);
  }, [product]);

  useEffect(() => {
    onVariantChange?.(backendVariant);
  }, [backendVariant, onVariantChange]);

  useEffect(() => {
    const initialQuantity = quantityRule.boxQuantity;

    setQuantity(initialQuantity);
    setQuantityInput(String(initialQuantity));
    setLocalError("");
    setSuccessMessage("");
  }, [quantityRule.boxQuantity]);

  const price =
    parsePrice(product.price) || parsePrice(backendVariant?.price) || 0;

  const compareAtPrice =
    parsePrice(product.compare_at_price) ||
    parsePrice(backendVariant?.compare_at_price) ||
    0;

  const hasDiscount = compareAtPrice > price && price > 0;

  const discountPercent = hasDiscount
    ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
    : 0;

  const effectiveSku =
    normalize(product.sku) || normalize(backendVariant?.sku) || "";

  const effectiveImage =
    getVariantImage(backendVariant) || normalize(product.image) || "";

  const inquiryHref = `/contact-us?product=${encodeURIComponent(
    product.title || "Product"
  )}`;

  const canAddToCart =
    Boolean(product.slug) && price > 0 && quantity >= quantityRule.boxQuantity;

  function commitQuantity(rawValue: unknown) {
    const next = normalizeQuantityToBox(rawValue, quantityRule);

    setQuantity(next);
    setQuantityInput(String(next));
  }

  function decreaseQuantity() {
    setLocalError("");
    setSuccessMessage("");

    const next = getNextDecreaseQuantity(quantity, quantityRule);
    setQuantity(next);
    setQuantityInput(String(next));
  }

  function increaseQuantity() {
    setLocalError("");
    setSuccessMessage("");

    const next = getNextIncreaseQuantity(quantity, quantityRule);
    setQuantity(next);
    setQuantityInput(String(next));
  }

  async function onAddToCart() {
    try {
      setLocalError("");
      setSuccessMessage("");

      if (!canAddToCart) {
        setLocalError("This product is currently available for quote request only.");
        return;
      }

      const normalizedQuantity = normalizeQuantityToBox(quantity, quantityRule);

      setQuantity(normalizedQuantity);
      setQuantityInput(String(normalizedQuantity));

      const result = await handleAddToCart({
        product_slug: product.slug || "",
        variant_id: "",
        product_title: product.title || "",
        variant_title: "",
        sku: effectiveSku,
        image: effectiveImage,
        unit_price: price,
        compare_at_price: compareAtPrice,
        quantity: normalizedQuantity,
      });

      const finalQuantity =
        Number(result.quantityRule?.quantity || normalizedQuantity) ||
        normalizedQuantity;

      setQuantity(finalQuantity);
      setQuantityInput(String(finalQuantity));

      if (result.quantityRule?.adjusted && result.quantityRule.message) {
        setSuccessMessage(
          `${result.quantityRule.message} Quantity was adjusted to ${finalQuantity} and added to quote cart.`
        );
      } else {
        setSuccessMessage("Added to quote cart.");
      }
    } catch (error) {
      setLocalError(
        error instanceof Error ? error.message : "Failed to add this item to cart."
      );
    }
  }

  return (
    <div style={panelStyle}>
      <div style={{ display: "grid", gap: 18 }}>
        <div>
          <div style={priceRowStyle}>
            <span style={priceStyle}>
              {price > 0 ? formatMoney(price) : "Request Quote"}
            </span>

            {hasDiscount ? (
              <>
                <span style={comparePriceStyle}>
                  {formatMoney(compareAtPrice)}
                </span>
                <span style={discountBadgeStyle}>Save {discountPercent}%</span>
              </>
            ) : null}
          </div>

          <p style={priceNoteStyle}>
            Estimated B2B unit price. Final pricing, freight, and payment terms
            are reviewed after quote submission.
          </p>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <label style={labelStyle}>Quantity</label>

          <div style={quantityControlStyle}>
            <button
              type="button"
              onClick={decreaseQuantity}
              disabled={isAdding || quantity <= quantityRule.boxQuantity}
              style={{
                ...qtyButtonStyle,
                cursor:
                  isAdding || quantity <= quantityRule.boxQuantity
                    ? "not-allowed"
                    : "pointer",
                opacity:
                  isAdding || quantity <= quantityRule.boxQuantity ? 0.65 : 1,
              }}
            >
              -
            </button>

            <input
              type="number"
              inputMode="numeric"
              min={quantityRule.boxQuantity}
              step={quantityRule.boxQuantity}
              value={quantityInput}
              disabled={isAdding}
              onChange={(event) => {
                setLocalError("");
                setSuccessMessage("");
                setQuantityInput(event.target.value);
              }}
              onBlur={() => commitQuantity(quantityInput)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.currentTarget.blur();
                }
              }}
              style={qtyInputStyle}
            />

            <button
              type="button"
              onClick={increaseQuantity}
              disabled={isAdding}
              style={{
                ...qtyButtonStyle,
                cursor: isAdding ? "not-allowed" : "pointer",
                opacity: isAdding ? 0.65 : 1,
              }}
            >
              +
            </button>
          </div>

          {quantityRule.message ? (
            <div style={ruleNoteStyle}>{quantityRule.message}</div>
          ) : null}
        </div>

        <div style={infoGridStyle}>
          <InfoRow label="SKU" value={effectiveSku || "-"} />
          <InfoRow
            label="Box Quantity"
            value={String(quantityRule.boxQuantity)}
          />
        </div>

        {localError ? (
          <div style={errorBoxStyle}>{localError}</div>
        ) : successMessage ? (
          <div style={successBoxStyle}>{successMessage}</div>
        ) : null}

        <div style={{ display: "grid", gap: 10 }}>
          <button
            type="button"
            onClick={onAddToCart}
            disabled={isAdding || !canAddToCart}
            style={{
              ...primaryButtonStyle,
              opacity: isAdding || !canAddToCart ? 0.65 : 1,
              cursor: isAdding || !canAddToCart ? "not-allowed" : "pointer",
            }}
          >
            {isAdding ? "Adding..." : "Add to Quote Cart"}
          </button>

          <Link href={inquiryHref} style={secondaryLinkStyle}>
            Contact Sales
          </Link>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={infoRowStyle}>
      <span style={{ color: "#7b7367", fontWeight: 700 }}>{label}</span>
      <span style={{ color: "#171717", fontWeight: 850, textAlign: "right" }}>
        {value}
      </span>
    </div>
  );
}

const panelStyle: CSSProperties = {
  border: "1px solid #e8dfd2",
  borderRadius: 26,
  padding: 24,
  background: "#fffaf4",
  boxShadow: "0 12px 32px rgba(23,23,23,0.04)",
};

const priceRowStyle: CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "baseline",
  flexWrap: "wrap",
};

const priceStyle: CSSProperties = {
  fontSize: 32,
  lineHeight: 1,
  fontWeight: 850,
  color: "#171717",
};

const priceNoteStyle: CSSProperties = {
  margin: "10px 0 0",
  color: "#6b6256",
  fontSize: 13,
  lineHeight: 1.7,
};

const comparePriceStyle: CSSProperties = {
  textDecoration: "line-through",
  color: "#8c8378",
  fontWeight: 700,
};

const discountBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 28,
  padding: "0 12px",
  borderRadius: 999,
  background: "#eef8f0",
  color: "#2f7d62",
  fontSize: 12,
  fontWeight: 850,
};

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 850,
  color: "#5d554a",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
};

const quantityControlStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "48px minmax(90px, 1fr) 48px",
  alignItems: "center",
  width: "100%",
  maxWidth: 260,
  minHeight: 50,
  border: "1px solid #ddd3c5",
  borderRadius: 999,
  overflow: "hidden",
  background: "#fff",
};

const qtyButtonStyle: CSSProperties = {
  height: 50,
  border: 0,
  background: "#f8f5ef",
  color: "#171717",
  fontSize: 18,
  fontWeight: 850,
};

const qtyInputStyle: CSSProperties = {
  height: 50,
  border: 0,
  outline: "none",
  textAlign: "center",
  fontSize: 16,
  fontWeight: 850,
  color: "#171717",
  background: "#fff",
};

const ruleNoteStyle: CSSProperties = {
  color: "#6b5530",
  background: "#fff8e7",
  border: "1px solid #eadbb5",
  borderRadius: 14,
  padding: "10px 12px",
  fontSize: 13,
  lineHeight: 1.6,
  fontWeight: 700,
};

const infoGridStyle: CSSProperties = {
  display: "grid",
  gap: 10,
  padding: 16,
  borderRadius: 18,
  background: "#fff",
  border: "1px solid #eee5d9",
};

const infoRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  paddingBottom: 10,
  borderBottom: "1px solid #eee5d9",
};

const errorBoxStyle: CSSProperties = {
  padding: 12,
  borderRadius: 14,
  background: "#fff1f1",
  border: "1px solid #efc9c9",
  color: "#7a2222",
  fontSize: 13,
  lineHeight: 1.6,
  fontWeight: 700,
};

const successBoxStyle: CSSProperties = {
  padding: 12,
  borderRadius: 14,
  background: "#eef8f0",
  border: "1px solid #cfe7d8",
  color: "#1d6a43",
  fontSize: 13,
  lineHeight: 1.6,
  fontWeight: 700,
};

const primaryButtonStyle: CSSProperties = {
  minHeight: 54,
  borderRadius: 999,
  border: "1px solid #171717",
  background: "#171717",
  color: "#fff",
  fontSize: 15,
  fontWeight: 850,
};

const secondaryLinkStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 52,
  padding: "0 20px",
  borderRadius: 999,
  background: "#fff",
  color: "#171717",
  textDecoration: "none",
  fontWeight: 850,
  border: "1px solid #ddd3c5",
};

export default memo(ProductPurchasePanelComponent);