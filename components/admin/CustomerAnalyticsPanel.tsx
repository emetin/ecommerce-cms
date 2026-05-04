"use client";

import { useEffect, useState } from "react";

type CustomerAnalyticsResponse = {
  ok: boolean;
  error?: string;
  customer: {
    id: string;
    company: string;
    name: string;
    email: string;
    status: string;
    price_tier: string;
    currency: string;
  };
  metrics: {
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    todayOrders: number;
    todayRevenue: number;
    weekOrders: number;
    weekRevenue: number;
    monthOrders: number;
    monthRevenue: number;
    yearOrders: number;
    yearRevenue: number;
    lastOrderDate: string;
  };
  recentOrders: Array<{
    id: string;
    order_number: string;
    status: string;
    currency: string;
    grand_total: number;
    subtotal: number;
    created_at: string;
    updated_at: string;
  }>;
  topProducts: Array<{
    product_slug: string;
    product_title: string;
    quantity: number;
    revenue: number;
    order_count: number;
  }>;
};

function formatMoney(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(Number(value || 0));
}

function formatDate(value: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

export default function CustomerAnalyticsPanel({
  customerId,
}: {
  customerId: string;
}) {
  const [data, setData] = useState<CustomerAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadAnalytics() {
    try {
      setLoading(true);
      setErrorMessage("");

      const response = await fetch(
        `/api/admin/customers/${encodeURIComponent(customerId)}/analytics`,
        {
          cache: "no-store",
        }
      );

      const result = (await response.json()) as CustomerAnalyticsResponse;

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Failed to load customer analytics.");
      }

      setData(result);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "An unknown error occurred."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (customerId) {
      loadAnalytics();
    }
  }, [customerId]);

  if (loading) {
    return <div style={boxStyle}>Loading customer analytics...</div>;
  }

  if (errorMessage) {
    return <div style={errorBoxStyle}>{errorMessage}</div>;
  }

  if (!data) {
    return <div style={boxStyle}>No customer analytics found.</div>;
  }

  const currency = data.customer.currency || "USD";

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={analyticsGridStyle}>
        <MetricCard
          label="Today"
          value={formatMoney(data.metrics.todayRevenue, currency)}
          helper={`${data.metrics.todayOrders} orders`}
        />
        <MetricCard
          label="This Week"
          value={formatMoney(data.metrics.weekRevenue, currency)}
          helper={`${data.metrics.weekOrders} orders`}
        />
        <MetricCard
          label="This Month"
          value={formatMoney(data.metrics.monthRevenue, currency)}
          helper={`${data.metrics.monthOrders} orders`}
        />
        <MetricCard
          label="This Year"
          value={formatMoney(data.metrics.yearRevenue, currency)}
          helper={`${data.metrics.yearOrders} orders`}
        />
        <MetricCard
          label="Total Revenue"
          value={formatMoney(data.metrics.totalRevenue, currency)}
          helper={`${data.metrics.totalOrders} total orders`}
        />
        <MetricCard
          label="Average Order"
          value={formatMoney(data.metrics.averageOrderValue, currency)}
          helper={`Last order: ${formatDate(data.metrics.lastOrderDate)}`}
        />
      </div>

      <div style={twoColumnStyle}>
        <div style={boxStyle}>
          <div style={sectionTitleStyle}>Recent Orders</div>

          {data.recentOrders.length === 0 ? (
            <div style={emptyStyle}>No orders found for this customer.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {data.recentOrders.map((order) => (
                <div key={order.id} style={orderRowStyle}>
                  <div>
                    <div style={primaryTextStyle}>{order.order_number}</div>
                    <div style={secondaryTextStyle}>
                      {formatDate(order.created_at)} · {order.status}
                    </div>
                  </div>

                  <div style={{ fontWeight: 800 }}>
                    {formatMoney(order.grand_total, order.currency)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={boxStyle}>
          <div style={sectionTitleStyle}>Top Products</div>

          {data.topProducts.length === 0 ? (
            <div style={emptyStyle}>No product data found.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {data.topProducts.slice(0, 6).map((product) => (
                <div
                  key={product.product_slug || product.product_title}
                  style={orderRowStyle}
                >
                  <div>
                    <div style={primaryTextStyle}>{product.product_title}</div>
                    <div style={secondaryTextStyle}>
                      Qty: {product.quantity} · Orders: {product.order_count}
                    </div>
                  </div>

                  <div style={{ fontWeight: 800 }}>
                    {formatMoney(product.revenue, currency)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div style={metricCardStyle}>
      <div style={metricLabelStyle}>{label}</div>
      <div style={metricValueStyle}>{value}</div>
      <div style={metricHelperStyle}>{helper}</div>
    </div>
  );
}

const analyticsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 12,
};

const metricCardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e4dacc",
  borderRadius: 18,
  padding: 16,
};

const metricLabelStyle: React.CSSProperties = {
  color: "#7a7166",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  fontWeight: 800,
  marginBottom: 8,
};

const metricValueStyle: React.CSSProperties = {
  color: "#171717",
  fontSize: 20,
  fontWeight: 800,
  marginBottom: 6,
};

const metricHelperStyle: React.CSSProperties = {
  color: "#665d52",
  fontSize: 13,
  lineHeight: 1.5,
};

const twoColumnStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 14,
};

const boxStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e4dacc",
  borderRadius: 18,
  padding: 16,
};

const errorBoxStyle: React.CSSProperties = {
  background: "#fff1f1",
  border: "1px solid #f0c9c9",
  color: "#8d2f2f",
  borderRadius: 18,
  padding: 16,
  fontWeight: 700,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 800,
  color: "#171717",
  marginBottom: 14,
};

const orderRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  border: "1px solid #efe5d8",
  borderRadius: 14,
  padding: 12,
};

const primaryTextStyle: React.CSSProperties = {
  fontWeight: 800,
  color: "#171717",
  lineHeight: 1.4,
};

const secondaryTextStyle: React.CSSProperties = {
  color: "#665d52",
  fontSize: 13,
  lineHeight: 1.5,
};

const emptyStyle: React.CSSProperties = {
  border: "1px dashed #d9cfbf",
  borderRadius: 14,
  padding: 16,
  color: "#665d52",
  background: "#faf8f4",
};