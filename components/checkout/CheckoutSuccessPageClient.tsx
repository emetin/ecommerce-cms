"use client";

import Link from "next/link";

export default function CheckoutSuccessPageClient({
  sessionId,
}: {
  sessionId?: string;
}) {
  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={badgeStyle}>Payment Successful</div>

        <h1 style={titleStyle}>Thank you for your payment</h1>

        <p style={textStyle}>
          Your payment was completed successfully.
        </p>

        {sessionId ? (
          <p style={subtleStyle}>
            Stripe Session ID: <strong>{sessionId}</strong>
          </p>
        ) : null}

        <p style={textStyle}>
          Your paid order will be recorded automatically after the Stripe webhook
          is received.
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/collections" style={primaryLinkStyle}>
            Continue Shopping
          </Link>

          <Link href="/order-lookup" style={secondaryLinkStyle}>
            Find My Order
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
  background: "#eef8f0",
  color: "#1f6b3b",
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

const subtleStyle: React.CSSProperties = {
  margin: 0,
  color: "#7b7367",
  fontSize: 14,
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