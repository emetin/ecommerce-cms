"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "../cart/CartContext";

type ReorderItem = {
  id?: string;
  product_slug?: string;
  variant_id?: string;
  product_title?: string;
  variant_title?: string;
  sku?: string;
  image?: string;
  quantity?: string | number;
};

type ReorderButtonProps = {
  items: ReorderItem[];
  variant?: "dark" | "ghost";
  label?: string;
  goToCart?: boolean;
  style?: React.CSSProperties;
};

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeQuantity(value: unknown) {
  const quantity = Number(value || 1);

  if (!Number.isFinite(quantity) || quantity <= 0) {
    return 1;
  }

  return Math.floor(quantity);
}

export default function ReorderButton({
  items,
  variant = "dark",
  label = "Re-order",
  goToCart = true,
  style,
}: ReorderButtonProps) {
  const router = useRouter();
  const { handleAddToCart, refreshCart } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const validItems = useMemo(() => {
    return (items || []).filter((item) => normalizeText(item.product_slug));
  }, [items]);

  async function handleReorder() {
    if (!validItems.length || isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      for (const item of validItems) {
        await handleAddToCart({
          product_slug: normalizeText(item.product_slug),
          variant_id: normalizeText(item.variant_id),
          product_title: normalizeText(item.product_title),
          variant_title: normalizeText(item.variant_title),
          sku: normalizeText(item.sku),
          image: normalizeText(item.image),
          unit_price: 0,
          quantity: normalizeQuantity(item.quantity),
        });
      }

      await refreshCart();

      if (goToCart) {
        router.push("/cart");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to re-order these items right now."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const buttonStyle =
    variant === "ghost" ? ghostButtonStyle : darkButtonStyle;

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <button
        type="button"
        onClick={handleReorder}
        disabled={isSubmitting || !validItems.length}
        style={{
          ...buttonStyle,
          ...(isSubmitting || !validItems.length ? disabledStyle : null),
          ...style,
        }}
      >
        {isSubmitting ? "Re-ordering..." : label}
      </button>

      {error ? <div style={errorStyle}>{error}</div> : null}
    </div>
  );
}

const baseButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 38,
  padding: "0 14px",
  borderRadius: 999,
  fontWeight: 700,
  fontSize: 13,
  whiteSpace: "nowrap",
  cursor: "pointer",
  transition: "all 0.2s ease",
};

const darkButtonStyle: React.CSSProperties = {
  ...baseButtonStyle,
  border: "1px solid #171717",
  background: "#171717",
  color: "#fff",
};

const ghostButtonStyle: React.CSSProperties = {
  ...baseButtonStyle,
  border: "1px solid #d8cebf",
  background: "#fff",
  color: "#171717",
};

const disabledStyle: React.CSSProperties = {
  opacity: 0.6,
  cursor: "not-allowed",
};

const errorStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#b42318",
  lineHeight: 1.4,
};