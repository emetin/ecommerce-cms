"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatMoney } from "../../../lib/money";

type Order = {
  id: string;
  order_number: string;
  status: string;
  grand_total: number;
  subtotal?: number;
  item_count: number;
  currency: string;
  company?: string;
  created_at: string;
  updated_at?: string;
};

type OrdersApiResponse = {
  ok: boolean;
  error?: string;
  total?: number;
  orders?: Order[];
};

async function parseJsonSafe(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function formatDate(value: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getStatusStyles(status: string): React.CSSProperties {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "paid" || normalized === "completed") {
    return {
      background: "#ecfdf3",
      color: "#166534",
      border: "1px solid #bbf7d0",
    };
  }

  if (normalized === "cancelled") {
    return {
      background: "#fef2f2",
      color: "#b91c1c",
      border: "1px solid #fecaca",
    };
  }

  if (
    normalized === "processing" ||
    normalized === "shipped" ||
    normalized === "approved" ||
    normalized === "quoted"
  ) {
    return {
      background: "#eff6ff",
      color: "#1d4ed8",
      border: "1px solid #bfdbfe",
    };
  }

  if (normalized === "reviewing" || normalized === "submitted") {
    return {
      background: "#fff8e8",
      color: "#8a5a00",
      border: "1px solid #f5deb0",
    };
  }

  return {
    background: "#f8f5ef",
    color: "#6a6156",
    border: "1px solid #e5ddd2",
  };
}

function getStatusLabel(status: string) {
  const normalized = String(status || "submitted").toLowerCase();

  const labels: Record<string, string> = {
    submitted: "Submitted",
    reviewing: "Under Review",
    quoted: "Quoted",
    approved: "Approved",
    processing: "Processing",
    completed: "Completed",
    cancelled: "Cancelled",
    paid: "Paid",
  };

  return labels[normalized] || normalized;
}

export default function AccountOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadOrders() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/account/orders", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const data = (await parseJsonSafe(response)) as OrdersApiResponse | null;

        if (!active) return;

        if (!response.ok || !data?.ok) {
          throw new Error(data?.error || "Failed to load quote requests.");
        }

        setOrders(data.orders || []);
      } catch (err) {
        if (!active) return;

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load quote requests."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadOrders();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>Customer Account</p>

          <h1 style={titleStyle}>My Quote Requests</h1>

          <p style={subtitleStyle}>
            Review your submitted B2B quote requests, request status, estimated
            totals, and item details.
          </p>
        </div>

        <Link href="/account" style={secondaryButtonStyle}>
          Back to Account
        </Link>
      </div>

      {loading ? (
        <div style={cardStyle}>Loading quote requests...</div>
      ) : error ? (
        <div style={errorStyle}>{error}</div>
      ) : !orders.length ? (
        <div style={cardStyle}>
          <h3 style={emptyTitleStyle}>No quote requests yet</h3>

          <p style={emptyTextStyle}>
            Once you submit a quote request, it will appear here with its latest
            review status.
          </p>

          <Link href="/collections" style={primaryButtonStyle}>
            Browse Collections
          </Link>
        </div>
      ) : (
        <div style={listWrapStyle}>
          {orders.map((order) => {
            const estimatedTotal = Number(order.grand_total || order.subtotal || 0);

            return (
              <Link
                key={order.id}
                href={`/account/orders/${encodeURIComponent(
                  order.order_number
                )}`}
                style={orderCardStyle}
              >
                <div style={orderTopStyle}>
                  <div>
                    <div style={orderNumberStyle}>{order.order_number}</div>

                    <div style={orderMetaStyle}>
                      {formatDate(order.created_at)} · {order.item_count} item
                      {order.item_count === 1 ? "" : "s"}
                    </div>

                    {order.company ? (
                      <div style={companyStyle}>{order.company}</div>
                    ) : null}
                  </div>

                  <span
                    style={{
                      ...statusBadgeStyle,
                      ...getStatusStyles(order.status),
                    }}
                  >
                    {getStatusLabel(order.status)}
                  </span>
                </div>

                <div style={noticeStyle}>
                  Final pricing, freight, availability, and payment terms are
                  reviewed by the Globaltex Fine Linens sales team.
                </div>

                <div style={orderBottomStyle}>
                  <div>
                    <div style={totalLabelStyle}>Estimated Total</div>
                    <div style={orderTotalStyle}>
                      {formatMoney(estimatedTotal)}
                    </div>
                  </div>

                  <div style={viewDetailsStyle}>View Details →</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto",
  padding: "40px 20px 70px",
  display: "grid",
  gap: 24,
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 20,
  flexWrap: "wrap",
};

const eyebrowStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#b7962e",
};

const titleStyle: React.CSSProperties = {
  margin: "6px 0 8px",
  fontSize: 36,
  lineHeight: 1.05,
  fontWeight: 800,
  color: "#171717",
};

const subtitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#6b6256",
  fontSize: 15,
  lineHeight: 1.8,
  maxWidth: 760,
};

const cardStyle: React.CSSProperties = {
  border: "1px solid #ece3d7",
  borderRadius: 24,
  background: "#fff",
  padding: 26,
};

const errorStyle: React.CSSProperties = {
  border: "1px solid #f1c7c7",
  borderRadius: 18,
  background: "#fff4f4",
  color: "#9b2c2c",
  padding: 18,
  fontWeight: 600,
};

const emptyTitleStyle: React.CSSProperties = {
  margin: "0 0 8px",
  color: "#171717",
  fontSize: 22,
  fontWeight: 800,
};

const emptyTextStyle: React.CSSProperties = {
  margin: "0 0 18px",
  color: "#6b6256",
  fontSize: 15,
  lineHeight: 1.8,
};

const listWrapStyle: React.CSSProperties = {
  display: "grid",
  gap: 16,
};

const orderCardStyle: React.CSSProperties = {
  display: "grid",
  gap: 16,
  padding: 22,
  borderRadius: 22,
  border: "1px solid #ece3d7",
  background: "#fff",
  textDecoration: "none",
  color: "inherit",
  boxShadow: "0 10px 24px rgba(17,17,17,0.04)",
};

const orderTopStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 14,
  flexWrap: "wrap",
};

const orderNumberStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 800,
  color: "#171717",
};

const orderMetaStyle: React.CSSProperties = {
  marginTop: 6,
  fontSize: 14,
  color: "#756b5f",
};

const companyStyle: React.CSSProperties = {
  marginTop: 4,
  fontSize: 13,
  color: "#8c8378",
  fontWeight: 700,
};

const statusBadgeStyle: React.CSSProperties = {
  minHeight: 34,
  padding: "0 12px",
  borderRadius: 999,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 12,
  fontWeight: 800,
  textTransform: "capitalize",
  whiteSpace: "nowrap",
};

const noticeStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 16,
  background: "#f8f5ef",
  border: "1px solid #eee5d9",
  color: "#6b6256",
  fontSize: 13,
  lineHeight: 1.7,
};

const orderBottomStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: 12,
};

const totalLabelStyle: React.CSSProperties = {
  color: "#756b5f",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  marginBottom: 5,
};

const orderTotalStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 800,
  color: "#171717",
};

const viewDetailsStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: "#b7962e",
  whiteSpace: "nowrap",
};

const primaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 48,
  padding: "0 20px",
  borderRadius: 999,
  background: "#171717",
  color: "#fff",
  textDecoration: "none",
  fontWeight: 800,
};

const secondaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 46,
  padding: "0 18px",
  borderRadius: 999,
  background: "#fff",
  color: "#171717",
  textDecoration: "none",
  fontWeight: 800,
  border: "1px solid #ddd3c5",
};