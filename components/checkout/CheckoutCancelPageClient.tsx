"use client";

import Link from "next/link";

export default function CheckoutCancelPageClient() {
  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={badgeStyle}>Payment Cancelled</div>

        <h1 style={titleStyle}>Your payment was not completed</h1>

        <p style={textStyle}>
          No worries. Your cart is still available, and you can either try the
          payment again or submit a quote request instead.
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/checkout" style={primaryLinkStyle}>
            Return to Checkout
          </Link>

          <Link href="/order-request" style={secondaryLinkStyle}>
            Request Quote Instead
          </Link>
        </div>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  maxWidth: 900,
  margin: "0 auto",
  padding: "40px 20px 80px",
};

const cardStyle: React.CSSProperties = {
  border: "1px solid #ece3d7",
  background: "#fff",
  borderRadius: 24,
  padding: 32,
  display: "grid",
  gap: 16,
};

const badgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 32,
  width: "fit-content",
  padding: "0 14px",
  borderRadius: 999,
  background: "#fff4f4",
  color: "#9b2c2c",
  fontWeight: 800,
  fontSize: 12,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "clamp(2rem, 3vw, 3rem)",
  lineHeight: 1.05,
  fontWeight: 800,
  color: "#171717",
};

const textStyle: React.CSSProperties = {
  margin: 0,
  color: "#5d554a",
  lineHeight: 1.8,
  fontSize: 15,
};

const primaryLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 52,
  padding: "0 20px",
  borderRadius: 999,
  background: "#171717",
  color: "#fff",
  textDecoration: "none",
  fontWeight: 800,
  border: "1px solid #171717",
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