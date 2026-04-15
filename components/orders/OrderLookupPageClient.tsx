"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function OrderLookupPageClient() {
  const router = useRouter();
  const [orderNumber, setOrderNumber] = useState("");
  const [error, setError] = useState("");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalized = orderNumber.trim();

    if (!normalized) {
      setError("Please enter an order number.");
      return;
    }

    setError("");
    router.push(`/order-success/${encodeURIComponent(normalized)}`);
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>Find Your Order</h1>

        <p style={textStyle}>
          Enter your order request number to view its current details.
        </p>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <label style={labelStyle}>Order Number</label>
            <input
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="Example: GT-20260415-1234"
              style={inputStyle}
            />
          </div>

          {error ? <div style={errorStyle}>{error}</div> : null}

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button type="submit" style={primaryButtonStyle}>
              View Order
            </button>

            <Link href="/collections" style={secondaryLinkStyle}>
              Browse Collections
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  maxWidth: 880,
  margin: "0 auto",
  padding: "40px 20px 80px",
};

const cardStyle: React.CSSProperties = {
  border: "1px solid #ece3d7",
  background: "#fff",
  borderRadius: 24,
  padding: 32,
};

const titleStyle: React.CSSProperties = {
  margin: "0 0 12px",
  fontSize: "clamp(2rem, 3vw, 3rem)",
  lineHeight: 1.05,
  fontWeight: 800,
  color: "#171717",
};

const textStyle: React.CSSProperties = {
  margin: "0 0 24px",
  color: "#5d554a",
  lineHeight: 1.8,
  fontSize: 15,
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
  color: "#5d554a",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 52,
  borderRadius: 14,
  border: "1px solid #ddd3c5",
  padding: "0 14px",
  fontSize: 15,
  color: "#171717",
  background: "#fff",
};

const errorStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid #f1c7c7",
  background: "#fff4f4",
  color: "#9b2c2c",
  fontSize: 14,
  fontWeight: 600,
};

const primaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 52,
  padding: "0 20px",
  borderRadius: 999,
  background: "#171717",
  color: "#fff",
  fontWeight: 800,
  border: "1px solid #171717",
  cursor: "pointer",
  fontSize: 15,
};

const secondaryLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 52,
  padding: "0 20px",
  borderRadius: 999,
  background: "#fff",
  color: "#171717",
  textDecoration: "none",
  fontWeight: 800,
  border: "1px solid #ddd3c5",
};