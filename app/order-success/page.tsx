"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function OrderSuccessPage() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order") || "";

  return (
    <main
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: "60px 20px 100px",
      }}
    >
      <div
        style={{
          border: "1px solid #e7ddcf",
          background: "#fff",
          borderRadius: 24,
          padding: 32,
          display: "grid",
          gap: 18,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            width: "fit-content",
            padding: "8px 14px",
            borderRadius: 999,
            background: "#eef8f0",
            border: "1px solid #cfe7d8",
            color: "#1d6a43",
            fontWeight: 800,
            fontSize: 13,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Order Submitted
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: "clamp(2rem, 4vw, 3.2rem)",
            lineHeight: 1.05,
            color: "#171717",
            fontWeight: 800,
          }}
        >
          Thank you. Your order has been created successfully.
        </h1>

        <p
          style={{
            margin: 0,
            color: "#5d554a",
            lineHeight: 1.8,
            fontSize: 16,
            maxWidth: 760,
          }}
        >
          Our team will review your order and continue the next process with you.
          Please keep your order number for future reference.
        </p>

        <div
          style={{
            padding: 18,
            borderRadius: 18,
            background: "#f8f5ef",
            border: "1px solid #e5ddd2",
            color: "#171717",
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "#7a7166",
              marginBottom: 8,
            }}
          >
            Order Number
          </div>

          <div
            style={{
              fontSize: 28,
              fontWeight: 800,
              lineHeight: 1.1,
            }}
          >
            {orderNumber || "-"}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            marginTop: 6,
          }}
        >
          <Link
            href="/order-lookup"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 50,
              padding: "0 20px",
              borderRadius: 999,
              border: "1px solid #171717",
              background: "#171717",
              color: "#fff",
              textDecoration: "none",
              fontWeight: 800,
            }}
          >
            Track Your Order
          </Link>

          <Link
            href="/account"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 50,
              padding: "0 20px",
              borderRadius: 999,
              border: "1px solid #ddd3c5",
              background: "#fff",
              color: "#171717",
              textDecoration: "none",
              fontWeight: 800,
            }}
          >
            Go to Account
          </Link>

          <Link
            href="/collections"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 50,
              padding: "0 20px",
              borderRadius: 999,
              border: "1px solid #ddd3c5",
              background: "#fff",
              color: "#171717",
              textDecoration: "none",
              fontWeight: 800,
            }}
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </main>
  );
}