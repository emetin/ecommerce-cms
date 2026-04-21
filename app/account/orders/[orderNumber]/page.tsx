"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatMoney } from "../../../../lib/money";
import ReorderButton from "../../../../components/account/ReorderButton";

type Order = {
  id: string;
  order_number: string;
  status: string;
  currency: string;
  subtotal: number;
  discount_total: number;
  shipping_total: number;
  tax_total: number;
  grand_total: number;
  item_count: number;
  first_name: string;
  last_name: string;
  company: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  address_line_1: string;
  address_line_2: string;
  postal_code: string;
  note: string;
  created_at: string;
};

type OrderItem = {
  id: string;
  product_slug: string;
  variant_id: string;
  product_title: string;
  variant_title: string;
  sku: string;
  image: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

type OrderDetailApiResponse = {
  ok: boolean;
  error?: string;
  order?: Order;
  items?: OrderItem[];
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
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
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

  if (normalized === "processing" || normalized === "shipped") {
    return {
      background: "#eff6ff",
      color: "#1d4ed8",
      border: "1px solid #bfdbfe",
    };
  }

  return {
    background: "#fff8e8",
    color: "#8a5a00",
    border: "1px solid #f5deb0",
  };
}

export default function AccountOrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const [orderNumber, setOrderNumber] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const resolved = await params;
        if (!active) return;

        setOrderNumber(resolved.orderNumber);

        const response = await fetch(
          `/api/account/orders/${encodeURIComponent(resolved.orderNumber)}`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }
        );

        const data = (await parseJsonSafe(
          response
        )) as OrderDetailApiResponse | null;

        if (!active) return;

        if (!response.ok || !data?.ok || !data.order) {
          throw new Error(data?.error || "Failed to load order.");
        }

        setOrder(data.order);
        setItems(data.items || []);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load order.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [params]);

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>Order Detail</p>
          <h1 style={titleStyle}>{orderNumber || "Order"}</h1>
          {order ? (
            <p style={subtitleStyle}>Placed on {formatDate(order.created_at)}</p>
          ) : null}
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {items.length ? (
            <ReorderButton
              items={items}
              label="Re-order This Order"
              variant="dark"
            />
          ) : null}

          <Link href="/account" style={secondaryButtonStyle}>
            Back to Account
          </Link>
        </div>
      </div>

      {loading ? (
        <div style={cardStyle}>Loading order...</div>
      ) : error ? (
        <div style={errorStyle}>{error}</div>
      ) : !order ? (
        <div style={cardStyle}>Order not found.</div>
      ) : (
        <div style={layoutStyle}>
          <div style={{ display: "grid", gap: 20 }}>
            <div style={cardStyle}>
              <div style={sectionHeaderStyle}>
                <div>
                  <div style={orderNumberStyle}>{order.order_number}</div>
                  <div style={orderMetaStyle}>
                    {order.item_count} item{order.item_count === 1 ? "" : "s"}
                  </div>
                </div>

                <span
                  style={{
                    ...statusBadgeStyle,
                    ...getStatusStyles(order.status),
                  }}
                >
                  {order.status || "submitted"}
                </span>
              </div>
            </div>

            <div style={cardStyle}>
              <h3 style={sectionTitleStyle}>Items</h3>

              <div style={{ display: "grid", gap: 18 }}>
                {items.map((item) => (
                  <div key={item.id} style={itemRowStyle}>
                    <div style={itemImageWrapStyle}>
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.product_title}
                          style={itemImageStyle}
                        />
                      ) : null}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={itemTitleStyle}>{item.product_title}</div>

                      {item.variant_title ? (
                        <div style={itemVariantStyle}>{item.variant_title}</div>
                      ) : null}

                      {item.sku ? (
                        <div style={itemSkuStyle}>SKU: {item.sku}</div>
                      ) : null}

                      <div style={itemMetaStyle}>
                        Qty: {item.quantity} • Unit: {formatMoney(item.unit_price)}
                      </div>
                    </div>

                    <div style={itemLineTotalStyle}>
                      {formatMoney(item.line_total)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside style={{ display: "grid", gap: 20 }}>
            <div style={cardStyle}>
              <h3 style={sectionTitleStyle}>Summary</h3>

              <div style={summaryRowsStyle}>
                <div style={summaryRowStyle}>
                  <span>Subtotal</span>
                  <span>{formatMoney(order.subtotal)}</span>
                </div>

                <div style={summaryRowStyle}>
                  <span>Discount</span>
                  <span>{formatMoney(order.discount_total)}</span>
                </div>

                <div style={summaryRowStyle}>
                  <span>Shipping</span>
                  <span>{formatMoney(order.shipping_total)}</span>
                </div>

                <div style={summaryRowStyle}>
                  <span>Tax</span>
                  <span>{formatMoney(order.tax_total)}</span>
                </div>

                <div style={grandTotalRowStyle}>
                  <span>Total</span>
                  <span>{formatMoney(order.grand_total)}</span>
                </div>
              </div>
            </div>

            <div style={cardStyle}>
              <h3 style={sectionTitleStyle}>Billing & Shipping</h3>

              <div style={addressTextStyle}>
                <strong>
                  {order.first_name} {order.last_name}
                </strong>
                {order.company ? <div>{order.company}</div> : null}
                {order.email ? <div>{order.email}</div> : null}
                {order.phone ? <div>{order.phone}</div> : null}
                {order.address_line_1 ? <div>{order.address_line_1}</div> : null}
                {order.address_line_2 ? <div>{order.address_line_2}</div> : null}
                {(order.city || order.postal_code) && (
                  <div>
                    {order.city}
                    {order.city && order.postal_code ? ", " : ""}
                    {order.postal_code}
                  </div>
                )}
                {order.country ? <div>{order.country}</div> : null}
              </div>
            </div>

            {order.note ? (
              <div style={cardStyle}>
                <h3 style={sectionTitleStyle}>Order Note</h3>
                <p style={noteTextStyle}>{order.note}</p>
              </div>
            ) : null}
          </aside>
        </div>
      )}
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  maxWidth: 1180,
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
  fontSize: 34,
  lineHeight: 1.05,
  fontWeight: 800,
  color: "#171717",
  fontFamily: "var(--font-heading)",
};

const subtitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#6b6256",
  fontSize: 15,
};

const layoutStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 360px",
  gap: 24,
  alignItems: "start",
};

const cardStyle: React.CSSProperties = {
  border: "1px solid #ece3d7",
  borderRadius: 24,
  background: "#fff",
  padding: 24,
};

const errorStyle: React.CSSProperties = {
  border: "1px solid #f1c7c7",
  borderRadius: 18,
  background: "#fff4f4",
  color: "#9b2c2c",
  padding: 18,
  fontWeight: 600,
};

const sectionHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 16,
  flexWrap: "wrap",
};

const orderNumberStyle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 800,
  color: "#171717",
};

const orderMetaStyle: React.CSSProperties = {
  marginTop: 6,
  fontSize: 14,
  color: "#756b5f",
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

const sectionTitleStyle: React.CSSProperties = {
  margin: "0 0 16px",
  fontSize: 18,
  fontWeight: 800,
  color: "#171717",
};

const itemRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "82px minmax(0,1fr) auto",
  gap: 14,
  alignItems: "center",
};

const itemImageWrapStyle: React.CSSProperties = {
  width: 82,
  height: 82,
  borderRadius: 14,
  overflow: "hidden",
  background: "#f7f4ef",
};

const itemImageStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const itemTitleStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  color: "#171717",
};

const itemVariantStyle: React.CSSProperties = {
  marginTop: 4,
  fontSize: 13,
  color: "#7b7367",
};

const itemSkuStyle: React.CSSProperties = {
  marginTop: 4,
  fontSize: 12,
  color: "#8c8378",
};

const itemMetaStyle: React.CSSProperties = {
  marginTop: 8,
  fontSize: 13,
  color: "#5d554a",
};

const itemLineTotalStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 800,
  color: "#171717",
  whiteSpace: "nowrap",
};

const summaryRowsStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
};

const summaryRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  fontSize: 14,
  color: "#5d554a",
};

const grandTotalRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  fontSize: 18,
  fontWeight: 800,
  color: "#171717",
  paddingTop: 6,
  borderTop: "1px solid #eee5d9",
  marginTop: 4,
};

const addressTextStyle: React.CSSProperties = {
  display: "grid",
  gap: 4,
  fontSize: 14,
  color: "#5d554a",
  lineHeight: 1.8,
};

const noteTextStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 14,
  color: "#5d554a",
  lineHeight: 1.8,
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