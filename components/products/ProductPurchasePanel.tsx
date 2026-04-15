"use client";

import { useMemo, useState } from "react";
import { useCart } from "../cart/CartContext";
import { formatMoney, toNumber } from "../../lib/money";

export type VariantItem = {
  id?: string;
  title?: string;
  name?: string;
  sku?: string;
  price?: string | number;
  compare_at_price?: string | number;
  variant_image?: string;
  image_id?: string;
};

type Props = {
  product: {
    title?: string;
    slug?: string;
    image?: string;
  };
  variants?: VariantItem[];
  onVariantChange?: (variant: VariantItem | null) => void;
};

function getVariantLabel(variant: VariantItem, index: number) {
  return variant.title || variant.name || variant.sku || `Option ${index + 1}`;
}

export default function ProductPurchasePanel({
  product,
  variants = [],
  onVariantChange,
}: Props) {
  const { handleAddToCart, isLoading } = useCart();

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  const selectedVariant = useMemo(() => {
    if (!variants.length) return null;
    return variants[selectedIndex] || variants[0];
  }, [variants, selectedIndex]);

  // 🔥 parent’a variant bildir
  useMemo(() => {
    if (onVariantChange) {
      onVariantChange(selectedVariant);
    }
  }, [selectedVariant, onVariantChange]);

  const price = selectedVariant?.price || 0;
  const comparePrice = selectedVariant?.compare_at_price || 0;

  const onAddToCart = async () => {
    await handleAddToCart({
      product_slug: product.slug || "",
      variant_id: selectedVariant?.id || "",
      product_title: product.title || "",
      variant_title: selectedVariant
        ? getVariantLabel(selectedVariant, selectedIndex)
        : "",
      sku: selectedVariant?.sku || "",
      image:
        selectedVariant?.variant_image ||
        selectedVariant?.image_id ||
        product.image ||
        "",
      unit_price: price,
      compare_at_price: comparePrice,
      quantity,
    });
  };

  return (
    <div
      style={{
        border: "1px solid #ececec",
        borderRadius: "18px",
        padding: "24px",
        background: "#fff",
      }}
    >
      {/* PRICE */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
          <span style={{ fontSize: 28, fontWeight: 700 }}>
            {formatMoney(price)}
          </span>

          {toNumber(comparePrice) > toNumber(price) && (
            <span
              style={{
                textDecoration: "line-through",
                color: "#888",
              }}
            >
              {formatMoney(comparePrice)}
            </span>
          )}
        </div>
      </div>

      {/* VARIANT */}
      {variants.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Variant</label>

          <select
            value={selectedIndex}
            onChange={(e) => setSelectedIndex(Number(e.target.value))}
            style={selectStyle}
          >
            {variants.map((v, i) => (
              <option key={v.id || i} value={i}>
                {getVariantLabel(v, i)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* QUANTITY */}
      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Quantity</label>

        <div style={qtyWrapper}>
          <button onClick={() => setQuantity((q) => Math.max(1, q - 1))}>
            -
          </button>
          <span>{quantity}</span>
          <button onClick={() => setQuantity((q) => q + 1)}>+</button>
        </div>
      </div>

      {/* ADD TO CART */}
      <button
        onClick={onAddToCart}
        disabled={isLoading}
        style={addButton}
      >
        {isLoading ? "Adding..." : "Add to Cart"}
      </button>
    </div>
  );
}

/* styles */

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 6,
  fontWeight: 600,
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  height: 44,
  borderRadius: 10,
  border: "1px solid #ddd",
  padding: "0 10px",
};

const qtyWrapper: React.CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "center",
};

const addButton: React.CSSProperties = {
  width: "100%",
  height: 48,
  borderRadius: 12,
  border: "none",
  background: "#111",
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
};