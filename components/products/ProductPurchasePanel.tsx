"use client";

import { useEffect, useMemo, useState } from "react";

type VariantItem = {
  id?: string;
  product_slug?: string;
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
  weight?: string;
  weight_unit?: string;
  box_quantity?: string;
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
  variants: VariantItem[];
};

type CartItem = {
  product_slug: string;
  product_title: string;
  product_image: string;
  variant_id: string;
  variant_label: string;
  sku: string;
  price: number;
  compare_at_price: number;
  quantity: number;
};

function parsePrice(value?: string) {
  const raw = String(value || "").trim();

  if (!raw) return 0;

  const cleaned = raw.replace(/[^\d.,-]/g, "");
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

  const num = Number(normalized);
  return Number.isFinite(num) ? num : 0;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value || 0);
}

function normalize(value?: string) {
  return String(value || "").trim();
}

function normalizeLower(value?: string) {
  return normalize(value).toLowerCase();
}

function isMeaningfulValue(value?: string) {
  const normalized = normalizeLower(value);
  return Boolean(normalized) && normalized !== "default";
}

function buildVariantLabel(variant: VariantItem) {
  const values = [
    variant.option1_value,
    variant.option2_value,
    variant.option3_value,
  ]
    .map((item) => normalize(item))
    .filter((item) => item && item.toLowerCase() !== "default");

  return values.length ? values.join(" / ") : "Default";
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

export default function ProductPurchasePanel({
  product,
  variants,
}: ProductPurchasePanelProps) {
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

  const [selectedOption1, setSelectedOption1] = useState("");
  const [selectedOption2, setSelectedOption2] = useState("");
  const [selectedOption3, setSelectedOption3] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    setSelectedOption1(option1.values[0] || "");
    setSelectedOption2("");
    setSelectedOption3("");
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
  }, [activeVariants, option1.values.length, option2.values.length, selectedOption1]);

  const availableOption3Values = useMemo(() => {
    if (!option3.values.length) return [];

    const scoped = activeVariants.filter((variant) => {
      const option1Matches =
        !option1.values.length ||
        normalize(variant.option1_value) === selectedOption1;

      const option2Matches =
        !option2.values.length ||
        !availableOption2Values.length ||
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
    option1.values.length,
    option2.values.length,
    option3.values.length,
    selectedOption1,
    selectedOption2,
    availableOption2Values.length,
  ]);

  useEffect(() => {
    if (!option2.values.length) {
      setSelectedOption2("");
      return;
    }

    setSelectedOption2((prev) =>
      availableOption2Values.includes(prev) ? prev : availableOption2Values[0] || ""
    );
  }, [option2.values.length, availableOption2Values]);

  useEffect(() => {
    if (!option3.values.length) {
      setSelectedOption3("");
      return;
    }

    setSelectedOption3((prev) =>
      availableOption3Values.includes(prev) ? prev : availableOption3Values[0] || ""
    );
  }, [option3.values.length, availableOption3Values]);

  const selectedVariant = useMemo(() => {
    if (!activeVariants.length) return null;

    const found = activeVariants.find((variant) => {
      const v1 = normalize(variant.option1_value);
      const v2 = normalize(variant.option2_value);
      const v3 = normalize(variant.option3_value);

      const option1Matches = !option1.values.length || v1 === selectedOption1;
      const option2Matches = !option2.values.length || v2 === selectedOption2;
      const option3Matches = !option3.values.length || v3 === selectedOption3;

      return option1Matches && option2Matches && option3Matches;
    });

    return found || activeVariants[0] || null;
  }, [
    activeVariants,
    option1.values.length,
    option2.values.length,
    option3.values.length,
    selectedOption1,
    selectedOption2,
    selectedOption3,
  ]);

  const price = parsePrice(selectedVariant?.price);
  const compareAtPrice = parsePrice(selectedVariant?.compare_at_price);
  const hasDiscount = compareAtPrice > price && price > 0;
  const discountPercent = hasDiscount
    ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
    : 0;

  function addToCart() {
    if (!selectedVariant) {
      setFeedback("No variant selected.");
      return;
    }

    const cartItem: CartItem = {
      product_slug: String(product.slug || ""),
      product_title: String(product.title || "Product"),
      product_image: String(selectedVariant.variant_image || product.image || ""),
      variant_id: String(
        selectedVariant.id ||
          `${product.slug}-${buildVariantLabel(selectedVariant)}`
      ),
      variant_label: buildVariantLabel(selectedVariant),
      sku: String(selectedVariant.sku || ""),
      price,
      compare_at_price: compareAtPrice,
      quantity,
    };

    const raw = localStorage.getItem("ptx_cart");
    const currentCart: CartItem[] = raw ? JSON.parse(raw) : [];

    const existingIndex = currentCart.findIndex(
      (item) => item.variant_id === cartItem.variant_id
    );

    if (existingIndex > -1) {
      currentCart[existingIndex].quantity += quantity;
    } else {
      currentCart.push(cartItem);
    }

    localStorage.setItem("ptx_cart", JSON.stringify(currentCart));
    setFeedback("Added to cart.");
  }

  function buyNow() {
    addToCart();
    window.location.href = "/contact-us";
  }

  if (!activeVariants.length) {
    return (
      <div
        style={{
          padding: 24,
          borderRadius: 28,
          border: "1px solid #e5ddd2",
          background: "#fff",
        }}
      >
        <div
          style={{
            fontSize: 28,
            lineHeight: 1.2,
            fontWeight: 800,
            marginBottom: 12,
          }}
        >
          Request Quote
        </div>

        <div
          style={{
            color: "#6f6559",
            lineHeight: 1.7,
          }}
        >
          No purchasing variants are currently available for this product.
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 24,
        borderRadius: 28,
        border: "1px solid #e5ddd2",
        background: "#fff",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 18,
        }}
      >
        <div
          style={{
            fontSize: 34,
            lineHeight: 1,
            fontWeight: 800,
          }}
        >
          {price > 0 ? formatMoney(price) : "Request Quote"}
        </div>

        {hasDiscount ? (
          <>
            <div
              style={{
                fontSize: 20,
                color: "#877d6f",
                textDecoration: "line-through",
                fontWeight: 700,
              }}
            >
              {formatMoney(compareAtPrice)}
            </div>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "6px 10px",
                borderRadius: 999,
                background: "#eef8f0",
                color: "#2f7d62",
                fontWeight: 800,
                fontSize: 13,
              }}
            >
              Save {discountPercent}%
            </div>
          </>
        ) : null}
      </div>

      {option1.optionName ? (
        <VariantSelectBlock
          label={option1.optionName}
          values={option1.values}
          value={selectedOption1}
          onChange={setSelectedOption1}
        />
      ) : null}

      {option2.optionName ? (
        <VariantSelectBlock
          label={option2.optionName}
          values={availableOption2Values}
          value={selectedOption2}
          onChange={setSelectedOption2}
        />
      ) : null}

      {option3.optionName ? (
        <VariantSelectBlock
          label={option3.optionName}
          values={availableOption3Values}
          value={selectedOption3}
          onChange={setSelectedOption3}
        />
      ) : null}

      <div style={{ marginTop: 18 }}>
        <div
          style={{
            fontSize: 13,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "#7b7367",
            fontWeight: 700,
            marginBottom: 10,
          }}
        >
          Quantity
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            border: "1px solid #ddd3c5",
            borderRadius: 999,
            overflow: "hidden",
            background: "#fff",
          }}
        >
          <button
            type="button"
            onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
            style={qtyButtonStyle}
          >
            −
          </button>

          <div
            style={{
              minWidth: 56,
              textAlign: "center",
              fontWeight: 800,
            }}
          >
            {quantity}
          </div>

          <button
            type="button"
            onClick={() => setQuantity((prev) => prev + 1)}
            style={qtyButtonStyle}
          >
            +
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: 12,
          marginTop: 24,
        }}
      >
        <button type="button" onClick={addToCart} style={addToCartStyle}>
          Add to Cart
        </button>

        <button type="button" onClick={buyNow} style={buyNowStyle}>
          Buy Now
        </button>
      </div>

      <div
        style={{
          marginTop: 18,
          display: "grid",
          gap: 10,
        }}
      >
        <InfoRow label="Variant" value={buildVariantLabel(selectedVariant || {})} />
        <InfoRow label="SKU" value={String(selectedVariant?.sku || "-")} />
        <InfoRow
          label="Box Quantity"
          value={String(selectedVariant?.box_quantity || "-")}
        />
      </div>

      {feedback ? (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 14,
            background: "#eef8f0",
            border: "1px solid #cfe5d4",
            color: "#245843",
            fontWeight: 700,
          }}
        >
          {feedback}
        </div>
      ) : null}
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
    <div style={{ marginTop: 14 }}>
      <div
        style={{
          fontSize: 13,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "#7b7367",
          fontWeight: 700,
          marginBottom: 10,
        }}
      >
        {label}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
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
                border: active ? "1px solid #2f7d62" : "1px solid #ddd3c5",
                background: active ? "#eef8f0" : "#fff",
                color: "#171717",
                fontWeight: 700,
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
      <span style={{ fontWeight: 800, textAlign: "right" }}>{value}</span>
    </div>
  );
}

const qtyButtonStyle: React.CSSProperties = {
  width: 46,
  height: 46,
  border: "none",
  background: "#fff",
  cursor: "pointer",
  fontSize: 20,
  fontWeight: 800,
};

const addToCartStyle: React.CSSProperties = {
  minHeight: 52,
  borderRadius: 999,
  border: "1px solid #171717",
  background: "#171717",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
  fontSize: 15,
};

const buyNowStyle: React.CSSProperties = {
  minHeight: 52,
  borderRadius: 999,
  border: "1px solid #d8cebf",
  background: "#fff",
  color: "#171717",
  fontWeight: 800,
  cursor: "pointer",
  fontSize: 15,
};