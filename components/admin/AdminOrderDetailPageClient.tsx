"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatMoney } from "../../lib/money";

type OrderRecord = {
  id: string;
  order_number: string;
  cart_token: string;
  cart_id: string;
  customer_id: string;
  email: string;
  first_name: string;
  last_name: string;
  company: string;
  phone: string;
  country: string;
  city: string;
  address_line_1: string;
  address_line_2: string;
  postal_code: string;
  note: string;
  status: string;
  currency: string;
  subtotal: string;
  discount_total: string;
  shipping_total: string;
  tax_total: string;
  grand_total: string;
  item_count: string;
  created_at: string;
  updated_at: string;
};

type OrderItemRecord = {
  id: string;
  order_id: string;
  product_slug: string;
  variant_id: string;
  product_title: string;
  variant_title: string;
  sku: string;
  image: string;
  unit_price: string;
  compare_at_price: string;
  quantity: string;
  line_total: string;
  created_at: string;
  updated_at: string;
};

type OrderApiResponse = {
  ok: boolean;
  error?: string;
  order?: OrderRecord;
  items?: OrderItemRecord[];
};

async function parseJsonSafe(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

const STATUS_OPTIONS = [
  "pending",
  "submitted",
  "reviewing",
  "quoted",
  "approved",
  "processing",
  "completed",
  "cancelled",
];

function formatDate(value?: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function AdminOrderDetailPageClient({
  orderNumber,
}: {
  orderNumber: string;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [items, setItems] = useState<OrderItemRecord[]>([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadOrder() {
      try {
        setLoading(true);
        setError("");
        setSuccessMessage("");

        const response = await fetch(
          `/api/admin/orders/${encodeURIComponent(orderNumber)}`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }
        );

        const data = (await parseJsonSafe(response)) as OrderApiResponse | null;

        if (!response.ok || !data?.ok || !data.order) {
          throw new Error(data?.error || "Failed to load order.");
        }

        if (!isMounted) return;

        setOrder(data.order);
        setItems(data.items || []);
        setStatus(data.order.status || "submitted");
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Failed to load order.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadOrder();

    return () => {
      isMounted = false;
    };
  }, [orderNumber]);

  async function onSaveStatus() {
    try {
      setSaving(true);
      setError("");
      setSuccessMessage("");

      const response = await fetch(
        `/api/admin/orders/${encodeURIComponent(orderNumber)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ status }),
        }
      );

      const data = (await parseJsonSafe(response)) as OrderApiResponse | null;

      if (!response.ok || !data?.ok || !data.order) {
        throw new Error(data?.error || "Failed to update order.");
      }

      setOrder(data.order);
      setItems(data.items || []);
      setStatus(data.order.status || status);
      setSuccessMessage("Order status updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update order.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={pageStyle}>
      <div style={topBarStyle}>
        <Link href="/admin/orders" style={backLinkStyle}>
          ← Back to Orders
        </Link>
      </div>

      {loading ? (
        <div style={cardStyle}>Loading order...</div>
      ) : error ? (
        <div style={errorStyle}>{error}</div>
      ) : order ? (
        <div style={{ display: "grid", gap: 24 }}>
          <div style={headerCardStyle}>
            <div>
              <h1 style={titleStyle}>{order.order_number}</h1>
              <p style={textStyle}>
                Submitted {formatDate(order.created_at)}
              </p>
            </div>

            <div style={statusPanelStyle}>
              <label style={labelStyle}>Status</label>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  style={selectStyle}
                >
                  {STATUS_OPTIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={onSaveStatus}
                  disabled={saving}
                  style={saveButtonStyle}
                >
                  {saving ? "Saving..." : "Update Status"}
                </button>
              </div>
            </div>
          </div>

          {successMessage ? (
            <div style={successStyle}>{successMessage}</div>
          ) : null}

          <div style={layoutStyle}>
            <div style={cardStyle}>
              <h2 style={sectionTitleStyle}>Requested Items</h2>

              <div style={{ display: "grid", gap: 16 }}>
                {items.map((item) => (
                  <div key={item.id} style={itemRowStyle}>
                    <div style={imageWrapStyle}>
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.product_title}
                          style={imageStyle}
                        />
                      ) : null}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={itemTitleStyle}>{item.product_title}</div>

                      {item.variant_title ? (
                        <div style={itemMetaStyle}>{item.variant_title}</div>
                      ) : null}

                      {item.sku ? (
                        <div style={itemMetaStyle}>SKU: {item.sku}</div>
                      ) : null}

                      <div style={itemMetaStyle}>
                        Qty: {item.quantity} • Unit:{" "}
                        {formatMoney(item.unit_price, order.currency || "USD")} •
                        Line: {formatMoney(item.line_total, order.currency || "USD")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <aside style={sideGridStyle}>
              <div style={cardStyle}>
                <h2 style={sectionTitleStyle}>Customer</h2>

                <div style={metaGridStyle}>
                  <MetaRow
                    label="Name"
                    value={
                      [order.first_name, order.last_name]
                        .filter(Boolean)
                        .join(" ") || "-"
                    }
                  />
                  <MetaRow label="Email" value={order.email || "-"} />
                  <MetaRow label="Company" value={order.company || "-"} />
                  <MetaRow label="Phone" value={order.phone || "-"} />
                </div>
              </div>

              <div style={cardStyle}>
                <h2 style={sectionTitleStyle}>Project Details</h2>

                <div style={metaGridStyle}>
                  <MetaRow label="Country" value={order.country || "-"} />
                  <MetaRow label="City" value={order.city || "-"} />
                  <MetaRow label="Address 1" value={order.address_line_1 || "-"} />
                  <MetaRow label="Address 2" value={order.address_line_2 || "-"} />
                  <MetaRow label="Postal Code" value={order.postal_code || "-"} />
                  <MetaRow label="Note" value={order.note || "-"} />
                </div>
              </div>

              <div style={cardStyle}>
                <h2 style={sectionTitleStyle}>Summary</h2>

                <div style={metaGridStyle}>
                  <MetaRow label="Items" value={order.item_count || "0"} />
                  <MetaRow
                    label="Subtotal"
                    value={formatMoney(order.subtotal, order.currency || "USD")}
                  />
                  <MetaRow
                    label="Discount"
                    value={formatMoney(order.discount_total, order.currency || "USD")}
                  />
                  <MetaRow
                    label="Shipping"
                    value={formatMoney(order.shipping_total, order.currency || "USD")}
                  />
                  <MetaRow
                    label="Tax"
                    value={formatMoney(order.tax_total, order.currency || "USD")}
                  />
                  <MetaRow
                    label="Total"
                    value={formatMoney(order.grand_total, order.currency || "USD")}
                  />
                </div>
              </div>
            </aside>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={metaRowStyle}>
      <span style={metaLabelStyle}>{label}</span>
      <span style={metaValueStyle}>{value}</span>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  maxWidth: 1400,
  margin: "0 auto",
  padding: "32px 20px 60px",
};

const topBarStyle: React.CSSProperties = {
  marginBottom: 18,
};

const backLinkStyle: React.CSSProperties = {
  textDecoration: "none",
  color: "#171717",
  fontWeight: 700,
};

const headerCardStyle: React.CSSProperties = {
  border: "1px solid #ece3d7",
  background: "#fff",
  borderRadius: 24,
  padding: 24,
  display: "flex",
  alignItems: "start",
  justifyContent: "space-between",
  gap: 20,
  flexWrap: "wrap",
};

const layoutStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 380px",
  gap: 24,
  alignItems: "start",
};

const sideGridStyle: React.CSSProperties = {
  display: "grid",
  gap: 24,
  alignSelf: "start",
};

const cardStyle: React.CSSProperties = {
  border: "1px solid #ece3d7",
  background: "#fff",
  borderRadius: 24,
  padding: 24,
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

const sectionTitleStyle: React.CSSProperties = {
  margin: "0 0 18px",
  fontSize: 22,
  fontWeight: 800,
  color: "#171717",
};

const statusPanelStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  color: "#7b7367",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const selectStyle: React.CSSProperties = {
  minWidth: 180,
  minHeight: 46,
  borderRadius: 14,
  border: "1px solid #ddd3c5",
  padding: "0 12px",
  background: "#fff",
  fontSize: 14,
};

const saveButtonStyle: React.CSSProperties = {
  minHeight: 46,
  padding: "0 16px",
  borderRadius: 14,
  border: "1px solid #171717",
  background: "#171717",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};

const itemRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "88px 1fr",
  gap: 14,
  alignItems: "center",
  paddingBottom: 16,
  borderBottom: "1px solid #f1ece4",
};

const imageWrapStyle: React.CSSProperties = {
  width: 88,
  height: 88,
  borderRadius: 14,
  overflow: "hidden",
  background: "#f7f4ef",
};

const imageStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

const itemTitleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  color: "#171717",
};

const itemMetaStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#6b6256",
  marginTop: 6,
};

const metaGridStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
};

const metaRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  paddingBottom: 10,
  borderBottom: "1px solid #eee5d9",
};

const metaLabelStyle: React.CSSProperties = {
  color: "#7b7367",
  fontWeight: 700,
  fontSize: 13,
};

const metaValueStyle: React.CSSProperties = {
  color: "#171717",
  fontWeight: 700,
  fontSize: 13,
  textAlign: "right",
  whiteSpace: "pre-wrap",
};

const successStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid #cfe6d5",
  background: "#f3fbf5",
  color: "#1f6b3b",
  fontSize: 14,
  fontWeight: 600,
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