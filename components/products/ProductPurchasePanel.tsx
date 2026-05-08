"use client";

import { memo, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useCart } from "../cart/CartContext";
import { formatMoney } from "../../lib/money";

export type VariantItem = {
  id?: string;
  product_slug?: string;
  title?: string;
  name?: string;
  option1_name?: string;
  option1_value?: string;
  option2_name?: string;
  option2_value?: string;
  option3_name?: string;
  option3_value?: string;
  sku?: string;
  barcode?: string;
  price?: string;
  compare_at_price?: string;
  inventory_tracker?: string;
  inventory_policy?: string;
  fulfillment_service?: string;
  requires_shipping?: string;
  taxable?: string;
  variant_image?: string;
  image_id?: string;
  weight?: string;
  weight_unit?: string;
  min_quantity?: string;
  box_quantity?: string;
  case_quantity?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
};

type ProductPurchasePanelProps = {
  product: {
    title?: string;
    slug?: string;
    image?: string;
  };
  variants?: VariantItem[];
  onVariantChange?: (variant: VariantItem | null) => void;
};

function normalize(value?: string) {
  return String(value || "").trim();
}

function normalizeLower(value?: string) {
  return normalize(value).toLowerCase();
}

function isMeaningfulValue(value?: string) {
  const v = normalizeLower(value);
  return Boolean(v) && v !== "default";
}

function parsePrice(value?: string) {
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

function buildVariantLabel(variant: VariantItem | null) {
  if (!variant) return "";

  const titled = normalize(variant.title || variant.name);
  if (titled) return titled;

  const values = [
    normalize(variant.option1_value),
    normalize(variant.option2_value),
    normalize(variant.option3_value),
  ].filter((item) => item && item.toLowerCase() !== "default");

  if (values.length) return values.join(" / ");

  return normalize(variant.sku) || "Default";
}

function getOptionMeta(
  variants: VariantItem[],
  optionNameKey: "option1_name" | "option2_name" | "option3_name",
  optionValueKey: "option1_value" | "option2_value" | "option3_value"
) {
  const optionName =
    normalize(
      variants.find((variant) => isMeaningfulValue(variant[optionValueKey]))?.[
        optionNameKey
      ]
    ) || "";

  const values = Array.from(
    new Set(
      variants
        .map((variant) => normalize(variant[optionValueKey]))
        .filter((value) => isMeaningfulValue(value))
    )
  );

  return {
    optionName,
    values,
  };
}

function filterOutDefaultVariantsWhenRealOnesExist(variants: VariantItem[]) {
  const hasRealVariant = variants.some(
    (variant) =>
      isMeaningfulValue(variant.option1_value) ||
      isMeaningfulValue(variant.option2_value) ||
      isMeaningfulValue(variant.option3_value)
  );

  if (!hasRealVariant) {
    return variants;
  }

  return variants.filter(
    (variant) =>
      isMeaningfulValue(variant.option1_value) ||
      isMeaningfulValue(variant.option2_value) ||
      isMeaningfulValue(variant.option3_value)
  );
}

function getInitialVariant(variants: VariantItem[]) {
  return variants[0] || null;
}

function findMatchingVariant(
  variants: VariantItem[],
  option1Values: string[],
  option2Values: string[],
  option3Values: string[],
  selectedOption1: string,
  selectedOption2: string,
  selectedOption3: string
) {
  return (
    variants.find((variant) => {
      const v1 = normalize(variant.option1_value);
      const v2 = normalize(variant.option2_value);
      const v3 = normalize(variant.option3_value);

      const option1Matches = !option1Values.length || v1 === selectedOption1;
      const option2Matches = !option2Values.length || v2 === selectedOption2;
      const option3Matches = !option3Values.length || v3 === selectedOption3;

      return option1Matches && option2Matches && option3Matches;
    }) || getInitialVariant(variants)
  );
}

function ProductPurchasePanelComponent({
  product,
  variants = [],
  onVariantChange,
}: ProductPurchasePanelProps) {
  const { handleAddToCart, isAdding } = useCart();

  const [selectedOption1, setSelectedOption1] = useState("");
  const [selectedOption2, setSelectedOption2] = useState("");
  const [selectedOption3, setSelectedOption3] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [localError, setLocalError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const activeVariants = useMemo(() => {
    const published = variants.filter((variant) =>
      ["", "published", "active"].includes(normalizeLower(variant.status))
    );

    const pool = published.length ? published : variants;
    return filterOutDefaultVariantsWhenRealOnesExist(pool);
  }, [variants]);

  const option1 = useMemo(
    () => getOptionMeta(activeVariants, "option1_name", "option1_value"),
    [activeVariants]
  );

  const option2 = useMemo(
    () => getOptionMeta(activeVariants, "option2_name", "option2_value"),
    [activeVariants]
  );

  const option3 = useMemo(
    () => getOptionMeta(activeVariants, "option3_name", "option3_value"),
    [activeVariants]
  );

  useEffect(() => {
    setSelectedOption1((prev) =>
      option1.values.includes(prev) ? prev : option1.values[0] || ""
    );
  }, [option1.values]);

  const availableOption2Values = useMemo(() => {
    if (!option2.values.length) return [];

    const scoped = activeVariants.filter((variant) => {
      if (!option1.values.length) return true;
      return normalize(variant.option1_value) === selectedOption1;
    });

    return Array.from(
      new Set(
        scoped
          .map((variant) => normalize(variant.option2_value))
          .filter((value) => isMeaningfulValue(value))
      )
    );
  }, [activeVariants, option1.values, option2.values.length, selectedOption1]);

  const availableOption3Values = useMemo(() => {
    if (!option3.values.length) return [];

    const scoped = activeVariants.filter((variant) => {
      const option1Matches =
        !option1.values.length ||
        normalize(variant.option1_value) === selectedOption1;

      const option2Matches =
        !option2.values.length ||
        normalize(variant.option2_value) === selectedOption2;

      return option1Matches && option2Matches;
    });

    return Array.from(
      new Set(
        scoped
          .map((variant) => normalize(variant.option3_value))
          .filter((value) => isMeaningfulValue(value))
      )
    );
  }, [
    activeVariants,
    option1.values,
    option2.values,
    option3.values.length,
    selectedOption1,
    selectedOption2,
  ]);

  useEffect(() => {
    if (!option2.values.length) {
      setSelectedOption2("");
      return;
    }

    setSelectedOption2((prev) =>
      availableOption2Values.includes(prev)
        ? prev
        : availableOption2Values[0] || ""
    );
  }, [option2.values.length, availableOption2Values]);

  useEffect(() => {
    if (!option3.values.length) {
      setSelectedOption3("");
      return;
    }

    setSelectedOption3((prev) =>
      availableOption3Values.includes(prev)
        ? prev
        : availableOption3Values[0] || ""
    );
  }, [option3.values.length, availableOption3Values]);

  const selectedVariant = useMemo(() => {
    if (!activeVariants.length) return null;

    return findMatchingVariant(
      activeVariants,
      option1.values,
      option2.values,
      option3.values,
      selectedOption1,
      selectedOption2,
      selectedOption3
    );
  }, [
    activeVariants,
    option1.values,
    option2.values,
    option3.values,
    selectedOption1,
    selectedOption2,
    selectedOption3,
  ]);

  useEffect(() => {
    onVariantChange?.(selectedVariant);
  }, [selectedVariant, onVariantChange]);

  useEffect(() => {
    setQuantity(1);
    setLocalError("");
    setSuccessMessage("");
  }, [selectedVariant?.id]);

  const price = parsePrice(selectedVariant?.price);
  const compareAtPrice = parsePrice(selectedVariant?.compare_at_price);
  const hasDiscount = compareAtPrice > price && price > 0;

  const discountPercent = hasDiscount
    ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
    : 0;

  const inquiryHref = `/contact-us?product=${encodeURIComponent(
    product.title || "Product"
  )}&variant=${encodeURIComponent(buildVariantLabel(selectedVariant))}`;

  const canAddToCart =
    Boolean(product.slug) &&
    Boolean(selectedVariant?.id) &&
    price > 0 &&
    quantity >= 1;

  function decreaseQuantity() {
    setLocalError("");
    setSuccessMessage("");

    setQuantity((prev) => Math.max(1, prev - 1));
  }

  function increaseQuantity() {
    setLocalError("");
    setSuccessMessage("");

    setQuantity((prev) => prev + 1);
  }

  async function onAddToCart() {
    try {
      setLocalError("");
      setSuccessMessage("");

      if (!canAddToCart || !selectedVariant) {
        setLocalError("This product is currently available for quote request only.");
        return;
      }

      await handleAddToCart({
        product_slug: product.slug || "",
        variant_id: selectedVariant.id || "",
        product_title: product.title || "",
        variant_title: buildVariantLabel(selectedVariant),
        sku: selectedVariant.sku || "",
        image:
          selectedVariant.variant_image ||
          selectedVariant.image_id ||
          product.image ||
          "",
        unit_price: price,
        compare_at_price: compareAtPrice,
        quantity,
      });

      setSuccessMessage("Added to quote cart.");
    } catch (error) {
      setLocalError(
        error instanceof Error ? error.message : "Failed to add this item to cart."
      );
    }
  }

  if (!activeVariants.length) {
    return (
      <div style={panelStyle}>
        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <div style={panelTitleStyle}>Request Quote</div>
            <p style={panelTextStyle}>
              This product is currently presented as part of the catalog
              structure. Contact our team for pricing, quantities, and
              project-based inquiries.
            </p>
          </div>

          <Link href={inquiryHref} style={primaryLinkStyle}>
            Contact Sales
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      <div style={{ display: "grid", gap: 18 }}>
        <div>
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "baseline",
              flexWrap: "wrap",
            }}
          >
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

        {option1.optionName ? (
          <VariantSelectBlock
            label={option1.optionName}
            values={option1.values}
            value={selectedOption1}
            onChange={(value) => {
              setSelectedOption1(value);
              setLocalError("");
              setSuccessMessage("");
            }}
          />
        ) : null}

        {option2.optionName ? (
          <VariantSelectBlock
            label={option2.optionName}
            values={availableOption2Values}
            value={selectedOption2}
            onChange={(value) => {
              setSelectedOption2(value);
              setLocalError("");
              setSuccessMessage("");
            }}
          />
        ) : null}

        {option3.optionName ? (
          <VariantSelectBlock
            label={option3.optionName}
            values={availableOption3Values}
            value={selectedOption3}
            onChange={(value) => {
              setSelectedOption3(value);
              setLocalError("");
              setSuccessMessage("");
            }}
          />
        ) : null}

        <div style={{ display: "grid", gap: 10 }}>
          <label style={labelStyle}>Quantity</label>

          <div style={qtyWrapperStyle}>
            <button
              type="button"
              onClick={decreaseQuantity}
              disabled={isAdding}
              style={{
                ...qtyButtonStyle,
                cursor: isAdding ? "not-allowed" : "pointer",
                opacity: isAdding ? 0.65 : 1,
              }}
            >
              -
            </button>

            <span style={qtyValueStyle}>{quantity}</span>

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
        </div>

        <div style={infoGridStyle}>
          <InfoRow
            label="Selected Variant"
            value={buildVariantLabel(selectedVariant) || "-"}
          />
          <InfoRow label="SKU" value={normalize(selectedVariant?.sku) || "-"} />
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

function VariantSelectBlock({
  label,
  values,
  value,
  onChange,
}: {
  label: string;
  values: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  if (!values.length) return null;

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <label style={labelStyle}>{label}</label>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {values.map((item) => {
          const active = item === value;

          return (
            <button
              key={item}
              type="button"
              onClick={() => onChange(item)}
              style={{
                minHeight: 42,
                padding: "0 16px",
                borderRadius: 999,
                border: active ? "1px solid #171717" : "1px solid #ddd3c5",
                background: active ? "#f8f5ef" : "#fff",
                color: "#171717",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              {item}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        paddingBottom: 10,
        borderBottom: "1px solid #eee5d9",
      }}
    >
      <span style={{ color: "#7b7367", fontWeight: 700 }}>{label}</span>
      <span style={{ color: "#171717", fontWeight: 850, textAlign: "right" }}>
        {value}
      </span>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  border: "1px solid #e8dfd2",
  borderRadius: 24,
  padding: 24,
  background: "#fffaf4",
};

const panelTitleStyle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 850,
  color: "#171717",
  marginBottom: 8,
};

const panelTextStyle: React.CSSProperties = {
  margin: 0,
  color: "#5d554a",
  fontSize: 15,
  lineHeight: 1.8,
};

const priceStyle: React.CSSProperties = {
  fontSize: 32,
  lineHeight: 1,
  fontWeight: 850,
  color: "#171717",
};

const priceNoteStyle: React.CSSProperties = {
  margin: "10px 0 0",
  color: "#6b6256",
  fontSize: 13,
  lineHeight: 1.7,
};

const comparePriceStyle: React.CSSProperties = {
  textDecoration: "line-through",
  color: "#8c8378",
  fontWeight: 700,
};

const discountBadgeStyle: React.CSSProperties = {
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

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 850,
  color: "#5d554a",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
};

const qtyWrapperStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
};

const qtyButtonStyle: React.CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: 12,
  border: "1px solid #ddd3c5",
  background: "#fff",
  color: "#171717",
  fontSize: 18,
  fontWeight: 800,
};

const qtyValueStyle: React.CSSProperties = {
  minWidth: 42,
  textAlign: "center",
  fontWeight: 850,
  color: "#171717",
};

const infoGridStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
  padding: 18,
  borderRadius: 18,
  background: "#fff",
  border: "1px solid #eee5d9",
};

const errorBoxStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid #f1c7c7",
  background: "#fff4f4",
  color: "#9b2c2c",
  fontSize: 14,
  fontWeight: 600,
};

const successBoxStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid #cfe6d5",
  background: "#f3fbf5",
  color: "#1f6b3b",
  fontSize: 14,
  fontWeight: 600,
};

const primaryButtonStyle: React.CSSProperties = {
  minHeight: 52,
  borderRadius: 999,
  border: "1px solid #171717",
  background: "#171717",
  color: "#fff",
  fontWeight: 850,
  fontSize: 15,
};

const primaryLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 52,
  borderRadius: 999,
  border: "1px solid #171717",
  background: "#171717",
  color: "#fff",
  fontWeight: 850,
  cursor: "pointer",
  fontSize: 15,
  textDecoration: "none",
  padding: "0 20px",
};

const secondaryLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 52,
  borderRadius: 999,
  border: "1px solid #d8cebf",
  background: "#fff",
  color: "#171717",
  fontWeight: 850,
  cursor: "pointer",
  fontSize: 15,
  textDecoration: "none",
  padding: "0 20px",
};

export default memo(ProductPurchasePanelComponent);