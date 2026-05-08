"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "../cart/CartContext";

type ReorderButtonProps = {
  orderNumber: string;
  variant?: "dark" | "ghost";
  label?: string;
  goToCart?: boolean;
  style?: React.CSSProperties;
};

type ReorderApiResponse = {
  ok?: boolean;
  error?: string;
  message?: string;
  added_count?: number;
  skipped_count?: number;
  next_path?: string;
};

async function parseJsonSafe(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

export default function ReorderButton({
  orderNumber,
  variant = "dark",
  label = "Reorder to Quote Cart",
  goToCart = true,
  style,
}: ReorderButtonProps) {
  const router = useRouter();
  const { refreshCart } = useCart();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const normalizedOrderNumber = normalizeText(orderNumber);

  async function handleReorder() {
    if (!normalizedOrderNumber || isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      setSuccessMessage("");

      const response = await fetch("/api/account/reorder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({
          order_number: normalizedOrderNumber,
        }),
      });

      const data = (await parseJsonSafe(response)) as ReorderApiResponse | null;

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "Unable to reorder this request.");
      }

      await refreshCart();

      setSuccessMessage(
        data.message ||
          `Added ${data.added_count || 0} item(s) to your quote cart.`
      );

      if (goToCart) {
        router.push(data.next_path || "/cart");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to reorder this request right now."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const buttonStyle = variant === "ghost" ? ghostButtonStyle : darkButtonStyle;

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <button
        type="button"
        onClick={handleReorder}
        disabled={isSubmitting || !normalizedOrderNumber}
        style={{
          ...buttonStyle,
          ...(isSubmitting || !normalizedOrderNumber ? disabledStyle : null),
          ...style,
        }}
      >
        {isSubmitting ? "Adding to Quote Cart..." : label}
      </button>

      {error ? <div style={errorStyle}>{error}</div> : null}
      {successMessage ? <div style={successStyle}>{successMessage}</div> : null}
    </div>
  );
}

const baseButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 42,
  padding: "0 16px",
  borderRadius: 999,
  fontWeight: 800,
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
  fontWeight: 700,
};

const successStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#1d6a43",
  lineHeight: 1.4,
  fontWeight: 700,
};