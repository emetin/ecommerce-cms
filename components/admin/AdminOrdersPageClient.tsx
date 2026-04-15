"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatMoney } from "../../lib/money";

type OrderRecord = {
  id: string;
  order_number: string;
  email: string;
  first_name: string;
  last_name: string;
  company: string;
  phone: string;
  status: string;
  currency: string;
  subtotal: string;
  grand_total: string;
  item_count: string;
  created_at: string;
  updated_at: string;
};

type OrdersApiResponse = {
  ok: boolean;
  error?: string;
  orders?: OrderRecord[];
};

async function parseJsonSafe(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export default function AdminOrdersPageClient() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadOrders() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/admin/orders", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const data = (await parseJsonSafe(response)) as OrdersApiResponse | null;

        if (!response.ok || !data?.ok) {
          throw new Error(data?.error || "Failed to load orders.");
        }

        if (!isMounted) return;
        setOrders(data.orders || []);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Failed to load orders.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadOrders();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredOrders = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return orders;

    return orders.filter((order) => {
      return [
        order.order_number,
        order.email,
        order.first_name,
        order.last_name,
        order.company,
        order.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [orders, query]);

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Orders</h1>
          <p style={textStyle}>
            Review submitted B2B order requests and update their status.
          </p>
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search order number, email, company..."
          style={searchInputStyle}
        />
      </div>

      {loading ? (
        <div style={cardStyle}>Loading orders...</div>
      ) : error ? (
        <div style={errorStyle}>{error}</div>
      ) : !filteredOrders.length ? (
        <div style={cardStyle}>No orders found.</div>
      ) : (
        <div style={tableWrapStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Order</th>
                <th style={thStyle}>Customer</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Items</th>
                <th style={thStyle}>Total</th>
                <th style={thStyle}>Created</th>
                <th style={thStyle}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 700 }}>{order.order_number}</div>
                    <div style={subtleTextStyle}>{order.email || "-"}</div>
                  </td>

                  <td style={tdStyle}>
                    <div>
                      {[order.first_name, order.last_name]
                        .filter(Boolean)
                        .join(" ") || "-"}
                    </div>
                    <div style={subtleTextStyle}>{order.company || "-"}</div>
                  </td>

                  <td style={tdStyle}>
                    <span style={statusBadge(order.status)}>
                      {order.status || "-"}
                    </span>
                  </td>

                  <td style={tdStyle}>{order.item_count || "0"}</td>

                  <td style={tdStyle}>{formatMoney(order.grand_total)}</td>

                  <td style={tdStyle}>
                    {order.created_at
                      ? new Date(order.created_at).toLocaleString()
                      : "-"}
                  </td>

                  <td style={tdStyle}>
                    <Link
                      href={`/admin/orders/${encodeURIComponent(
                        order.order_number
                      )}`}
                      style={actionLinkStyle}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function statusBadge(status: string): React.CSSProperties {
  const value = String(status || "").toLowerCase();

  if (value === "submitted" || value === "pending") {
    return {
      ...badgeBaseStyle,
      background: "#fff7e8",
      color: "#9a6700",
      border: "1px solid #f1ddb0",
    };
  }

  if (value === "reviewing") {
    return {
      ...badgeBaseStyle,
      background: "#eef4ff",
      color: "#1d4ed8",
      border: "1px solid #cfe0ff",
    };
  }

  if (value === "quoted") {
    return {
      ...badgeBaseStyle,
      background: "#f5efff",
      color: "#6d28d9",
      border: "1px solid #ddd0ff",
    };
  }

  if (value === "approved") {
    return {
      ...badgeBaseStyle,
      background: "#eef8f0",
      color: "#1f6b3b",
      border: "1px solid #cfe6d5",
    };
  }

  if (value === "cancelled") {
    return {
      ...badgeBaseStyle,
      background: "#fff4f4",
      color: "#9b2c2c",
      border: "1px solid #f1c7c7",
    };
  }

  return {
    ...badgeBaseStyle,
    background: "#f6f6f6",
    color: "#555",
    border: "1px solid #e1e1e1",
  };
}

const pageStyle: React.CSSProperties = {
  maxWidth: 1400,
  margin: "0 auto",
  padding: "32px 20px 60px",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "end",
  justifyContent: "space-between",
  gap: 16,
  flexWrap: "wrap",
  marginBottom: 24,
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 34,
  fontWeight: 800,
  color: "#171717",
};

const textStyle: React.CSSProperties = {
  margin: "8px 0 0",
  color: "#5d554a",
  fontSize: 15,
  lineHeight: 1.7,
};

const searchInputStyle: React.CSSProperties = {
  minWidth: 320,
  minHeight: 48,
  borderRadius: 14,
  border: "1px solid #ddd3c5",
  padding: "0 14px",
  fontSize: 15,
  background: "#fff",
};

const tableWrapStyle: React.CSSProperties = {
  overflowX: "auto",
  border: "1px solid #ece3d7",
  borderRadius: 20,
  background: "#fff",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "16px 18px",
  fontSize: 13,
  color: "#7b7367",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  borderBottom: "1px solid #eee5d9",
  background: "#fffaf4",
};

const tdStyle: React.CSSProperties = {
  padding: "16px 18px",
  borderBottom: "1px solid #f3ece2",
  verticalAlign: "top",
  color: "#171717",
  fontSize: 14,
};

const cardStyle: React.CSSProperties = {
  border: "1px solid #ece3d7",
  borderRadius: 20,
  background: "#fff",
  padding: 24,
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

const subtleTextStyle: React.CSSProperties = {
  color: "#7b7367",
  fontSize: 13,
  marginTop: 4,
};

const badgeBaseStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 28,
  padding: "0 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const actionLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 38,
  padding: "0 14px",
  borderRadius: 999,
  border: "1px solid #ddd3c5",
  textDecoration: "none",
  color: "#171717",
  fontWeight: 700,
};