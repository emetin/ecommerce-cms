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

export default function OrderSuccessPageClient({
  orderNumber,
}: {
  orderNumber: string;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [items, setItems] = useState<OrderItemRecord[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function loadOrder() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/orders/${encodeURIComponent(orderNumber)}`,
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

  return (
    <div style={pageStyle}>
      {loading ? (
        <div style={cardStyle}>
          <h1 style={titleStyle}>Loading order...</h1>
        </div>
      ) : error ? (
        <div style={cardStyle}>
          <h1 style={titleStyle}>Order Lookup</h1>
          <div style={errorStyle}>{error}</div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/order-lookup" style={primaryLinkStyle}>
              Find Another Order
            </Link>
            <Link href="/collections" style={secondaryLinkStyle}>
              Browse Collections
            </Link>
          </div>
        </div>
      ) : order ? (
        <div style={{ display: "grid", gap: 24 }}>
          <div style={cardStyle}>
            <div style={successBadgeStyle}>Order Received</div>

            <h1 style={titleStyle}>Thank you. Your request is in review.</h1>

            <p style={textStyle}>
              Your order request number is <strong>{order.order_number}</strong>.
              Our team will review your requested products and follow up with
              pricing, availability, and next steps.
            </p>

            <div style={summaryGridStyle}>
              <SummaryBox
                label="Order Number"
                value={order.order_number}
              />
              <SummaryBox
                label="Status"
                value={order.status}
              />
              <SummaryBox
                label="Email"
                value={order.email || "-"}
              />
              <SummaryBox
                label="Total"
                value={formatMoney(order.grand_total)}
              />
            </div>
          </div>

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
                        Qty: {item.quantity} • {formatMoney(item.line_total)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <aside style={cardStyle}>
              <h2 style={sectionTitleStyle}>Order Summary</h2>

              <div style={totalsWrapStyle}>
                <div style={totalRowStyle}>
                  <span>Items</span>
                  <span>{order.item_count}</span>
                </div>

                <div style={totalRowStyle}>
                  <span>Subtotal</span>
                  <span>{formatMoney(order.subtotal)}</span>
                </div>

                <div style={grandTotalRowStyle}>
                  <span>Total</span>
                  <span>{formatMoney(order.grand_total)}</span>
                </div>
              </div>

              <div style={{ display: "grid", gap: 10, marginTop: 22 }}>
                <Link href="/order-lookup" style={primaryLinkStyle}>
                  Find Another Order
                </Link>

                <Link href="/collections" style={secondaryLinkStyle}>
                  Browse More Products
                </Link>
              </div>
            </aside>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SummaryBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={summaryBoxStyle}>
      <div style={summaryLabelStyle}>{label}</div>
      <div style={summaryValueStyle}>{value}</div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  maxWidth: 1280,
  margin: "0 auto",
  padding: "40px 20px 80px",
};

const layoutStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 360px",
  gap: 24,
  alignItems: "start",
};

const cardStyle: React.CSSProperties = {
  border: "1px solid #ece3d7",
  background: "#fff",
  borderRadius: 24,
  padding: 24,
};

const titleStyle: React.CSSProperties = {
  margin: "0 0 12px",
  fontSize: "clamp(2rem, 3vw, 3rem)",
  lineHeight: 1.05,
  fontWeight: 800,
  color: "#171717",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: "0 0 18px",
  fontSize: 22,
  fontWeight: 800,
  color: "#171717",
};

const textStyle: React.CSSProperties = {
  margin: 0,
  color: "#5d554a",
  lineHeight: 1.8,
  fontSize: 15,
};

const successBadgeStyle: React.CSSProperties = {
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
  marginBottom: 16,
};

const summaryGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 14,
  marginTop: 24,
};

const summaryBoxStyle: React.CSSProperties = {
  border: "1px solid #eee5d9",
  borderRadius: 18,
  padding: 16,
  background: "#fffaf4",
};

const summaryLabelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  color: "#7b7367",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: 8,
};

const summaryValueStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  color: "#171717",
  wordBreak: "break-word",
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

const totalsWrapStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
};

const totalRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  color: "#5d554a",
  fontSize: 15,
};

const grandTotalRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  color: "#171717",
  fontSize: 18,
  fontWeight: 800,
  paddingTop: 8,
  borderTop: "1px solid #eee5d9",
  marginTop: 4,
};

const errorStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid #f1c7c7",
  background: "#fff4f4",
  color: "#9b2c2c",
  fontSize: 14,
  fontWeight: 600,
  marginBottom: 16,
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