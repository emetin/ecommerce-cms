import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getOrderByNumber,
  type OrderItemRecord,
  type OrderRecord,
} from "../../../lib/order";

function formatMoney(value: string, currency: string) {
  const amount = Number(value || 0);

  if (!Number.isFinite(amount)) {
    return `${value} ${currency || "USD"}`;
  }

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency || "USD"}`;
  }
}

function formatDate(value?: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

type PageProps = {
  params: Promise<{
    orderNumber: string;
  }>;
};

export default async function OrderDetailPage({ params }: PageProps) {
  const { orderNumber } = await params;
  const decodedOrderNumber = decodeURIComponent(orderNumber || "").trim();

  if (!decodedOrderNumber) {
    notFound();
  }

  const result = await getOrderByNumber(decodedOrderNumber);

  if (!result?.order) {
    notFound();
  }

  const order: OrderRecord = result.order;
  const items: OrderItemRecord[] = result.items;

  return (
    <main
      style={{
        maxWidth: 1180,
        margin: "0 auto",
        padding: "48px 20px 80px",
      }}
    >
      <div style={{ display: "grid", gap: 24 }}>
        <section
          style={{
            border: "1px solid #e7ddcf",
            background: "#fff",
            borderRadius: 28,
            padding: 28,
            display: "flex",
            justifyContent: "space-between",
            gap: 20,
            flexWrap: "wrap",
            alignItems: "flex-start",
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                padding: "8px 14px",
                borderRadius: 999,
                background: "#eef8f0",
                border: "1px solid #cfe7d8",
                color: "#1d6a43",
                fontWeight: 800,
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 12,
              }}
            >
              Order Detail
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: "clamp(2rem, 3.4vw, 3.2rem)",
                lineHeight: 1.05,
                color: "#171717",
                fontWeight: 800,
              }}
            >
              {order.order_number}
            </h1>

            <p
              style={{
                margin: "12px 0 0",
                color: "#665d52",
                fontSize: 15,
                lineHeight: 1.8,
              }}
            >
              Submitted on {formatDate(order.created_at)}.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gap: 12,
              minWidth: 260,
            }}
          >
            <InfoCard label="Status" value={order.status || "-"} />
            <InfoCard
              label="Grand Total"
              value={formatMoney(order.grand_total, order.currency)}
            />
          </div>
        </section>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "320px minmax(0, 1fr)",
            gap: 24,
          }}
        >
          <aside
            style={{
              border: "1px solid #e7ddcf",
              background: "#fff",
              borderRadius: 28,
              padding: 24,
              alignSelf: "start",
            }}
          >
            <h2
              style={{
                marginTop: 0,
                marginBottom: 18,
                color: "#171717",
                fontSize: 22,
                fontWeight: 800,
              }}
            >
              Customer Details
            </h2>

            <div style={{ display: "grid", gap: 18 }}>
              <InfoRow
                label="Customer"
                value={[order.first_name, order.last_name].filter(Boolean).join(" ") || "-"}
              />
              <InfoRow label="Email" value={order.email || "-"} />
              <InfoRow label="Company" value={order.company || "-"} />
              <InfoRow label="Phone" value={order.phone || "-"} />
              <InfoRow label="Country" value={order.country || "-"} />
              <InfoRow label="City" value={order.city || "-"} />
              <InfoRow label="Address" value={order.address_line_1 || "-"} />
              <InfoRow label="Postal Code" value={order.postal_code || "-"} />
            </div>

            {order.note ? (
              <div
                style={{
                  marginTop: 20,
                  padding: 14,
                  borderRadius: 16,
                  background: "#fff7e8",
                  border: "1px solid #f0dfac",
                  color: "#6c5714",
                  fontWeight: 700,
                  lineHeight: 1.7,
                }}
              >
                Note: {order.note}
              </div>
            ) : null}
          </aside>

          <section
            style={{
              border: "1px solid #e7ddcf",
              background: "#fff",
              borderRadius: 28,
              padding: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                flexWrap: "wrap",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    color: "#171717",
                    fontSize: 22,
                    fontWeight: 800,
                  }}
                >
                  Order Items
                </h2>
                <p style={{ margin: "8px 0 0", color: "#665d52" }}>
                  Review the items included in this order.
                </p>
              </div>

              <div
                style={{
                  minWidth: 120,
                  textAlign: "center",
                  padding: "10px 14px",
                  borderRadius: 999,
                  background: "#f4efe7",
                  color: "#171717",
                  fontWeight: 800,
                }}
              >
                {items.length} Items
              </div>
            </div>

            <div style={{ display: "grid", gap: 16 }}>
              {items.map((item: OrderItemRecord) => (
                <article
                  key={item.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "96px minmax(0, 1fr)",
                    gap: 16,
                    padding: 18,
                    borderRadius: 20,
                    background: "#fcfaf6",
                    border: "1px solid #efe6da",
                  }}
                >
                  <div
                    style={{
                      width: 96,
                      height: 96,
                      borderRadius: 18,
                      overflow: "hidden",
                      background: "#f3eee6",
                    }}
                  >
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.product_title || item.product_slug}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    ) : null}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 800,
                        color: "#171717",
                        lineHeight: 1.3,
                      }}
                    >
                      {item.product_title || item.product_slug}
                    </div>

                    <div style={{ marginTop: 6, color: "#665d52" }}>
                      {item.variant_title || item.sku || "-"}
                    </div>

                    <div
                      style={{
                        marginTop: 12,
                        display: "flex",
                        gap: 18,
                        flexWrap: "wrap",
                        color: "#171717",
                        fontWeight: 700,
                      }}
                    >
                      <span>Qty: {item.quantity}</span>
                      <span>
                        Unit: {formatMoney(item.unit_price, order.currency)}
                      </span>
                      <span>
                        Total: {formatMoney(item.line_total, order.currency)}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div
              style={{
                marginTop: 22,
                paddingTop: 18,
                borderTop: "1px solid #efe6da",
                display: "grid",
                gap: 10,
              }}
            >
              <TotalRow
                label="Subtotal"
                value={formatMoney(order.subtotal, order.currency)}
              />
              <TotalRow
                label="Discount"
                value={formatMoney(order.discount_total, order.currency)}
              />
              <TotalRow
                label="Shipping"
                value={formatMoney(order.shipping_total, order.currency)}
              />
              <TotalRow
                label="Tax"
                value={formatMoney(order.tax_total, order.currency)}
              />
              <TotalRow
                label="Grand Total"
                value={formatMoney(order.grand_total, order.currency)}
                strong
              />
            </div>
          </section>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <Link href="/order-lookup" style={primaryLinkStyle}>
            Find Another Order
          </Link>

          <Link href="/account" style={secondaryLinkStyle}>
            Go to Account
          </Link>

          <Link href="/collections" style={secondaryLinkStyle}>
            Continue Shopping
          </Link>
        </div>
      </div>
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        style={{
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "#7a7166",
          fontWeight: 800,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ color: "#171717", fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: "#f8f4ed",
        borderRadius: 18,
        padding: "14px 16px",
      }}
    >
      <div
        style={{
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "#7a7166",
          fontWeight: 800,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ color: "#171717", fontWeight: 800 }}>{value}</div>
    </div>
  );
}

function TotalRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        color: "#171717",
        fontWeight: strong ? 800 : 700,
        fontSize: strong ? 18 : 15,
      }}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

const primaryLinkStyle: React.CSSProperties = {
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
};

const secondaryLinkStyle: React.CSSProperties = {
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
};