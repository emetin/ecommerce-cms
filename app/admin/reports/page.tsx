"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type RangeKey = "today" | "week" | "month" | "year" | "all" | "custom";
type ReportView = "overview" | "customers" | "products";

type ReportsResponse = {
  ok: boolean;
  error?: string;
  range: {
    range: RangeKey;
    start: string | null;
    end: string | null;
    label: string;
  };
  summary: {
    totalCustomers: number;
    activeCustomers: number;
    inactiveCustomers: number;
    newCustomers: number;
    spendingCustomers: number;
    nonSpendingCustomers: number;
    totalOrders: number;
    totalRevenue: number;
    totalItems: number;
    averageOrderValue: number;
    revenuePerSpendingCustomer: number;
    currency: string;
  };
  revenueByDay: Array<{
    date: string;
    orders: number;
    revenue: number;
  }>;
  customerGrowthByDay: Array<{
    date: string;
    customers: number;
  }>;
  statusBreakdown: Array<{
    status: string;
    count: number;
    revenue: number;
  }>;
  topCustomers: Array<{
    id: string;
    company: string;
    name: string;
    email: string;
    status: string;
    price_tier: string;
    totalOrders: number;
    totalRevenue: number;
    totalItems: number;
    averageOrderValue: number;
    lastOrderDate: string;
  }>;
  newCustomersList: Array<{
    id: string;
    company: string;
    name: string;
    email: string;
    status: string;
    price_tier: string;
    created_at: string;
  }>;
  topProducts: Array<{
    product_slug: string;
    product_title: string;
    quantity: number;
    revenue: number;
    order_count: number;
  }>;
};

const RANGE_OPTIONS: Array<{ value: RangeKey; label: string }> = [
  { value: "today", label: "Today" },
  { value: "week", label: "Last 7 Days" },
  { value: "month", label: "Last 30 Days" },
  { value: "year", label: "Last 365 Days" },
  { value: "all", label: "All Time" },
  { value: "custom", label: "Custom Range" },
];

const VIEW_OPTIONS: Array<{ value: ReportView; label: string }> = [
  { value: "overview", label: "Overview" },
  { value: "customers", label: "Customers" },
  { value: "products", label: "Products" },
];

function formatMoney(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(Number(value || 0));
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

function buildQuery(range: RangeKey, startDate: string, endDate: string) {
  const params = new URLSearchParams();
  params.set("range", range);

  if (range === "custom") {
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
  }

  return params.toString();
}

export default function AdminReportsPage() {
  const [range, setRange] = useState<RangeKey>("month");
  const [view, setView] = useState<ReportView>("overview");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [data, setData] = useState<ReportsResponse | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadReports(nextRange = range) {
    try {
      if (!data) {
        setInitialLoading(true);
      } else {
        setUpdating(true);
      }

      setErrorMessage("");

      const query = buildQuery(nextRange, startDate, endDate);

      const response = await fetch(`/api/admin/reports/summary?${query}`, {
        cache: "no-store",
      });

      const result = (await response.json()) as ReportsResponse;

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Failed to load reports.");
      }

      setData(result);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "An unknown error occurred."
      );
    } finally {
      setInitialLoading(false);
      setUpdating(false);
    }
  }

  useEffect(() => {
    loadReports("month");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleRangeChange(nextRange: RangeKey) {
    setRange(nextRange);

    if (nextRange !== "custom") {
      loadReports(nextRange);
    }
  }

  const currency = data?.summary?.currency || "USD";

  const revenueChartData = useMemo(() => {
    if (!data) return [];

    return data.revenueByDay.map((item) => ({
      label: item.date,
      revenue: item.revenue,
      orders: item.orders,
    }));
  }, [data]);

  const customerChartData = useMemo(() => {
    if (!data) return [];

    return data.customerGrowthByDay.map((item) => ({
      label: item.date,
      customers: item.customers,
    }));
  }, [data]);

  if (initialLoading) {
    return <div style={loadingCardStyle}>Loading reports...</div>;
  }

  if (!data && errorMessage) {
    return <div style={errorBoxStyle}>{errorMessage}</div>;
  }

  if (!data) {
    return <div style={loadingCardStyle}>No report data found.</div>;
  }

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <div style={eyebrowStyle}>Reports</div>
          <h1 style={titleStyle}>Business Reports</h1>
          <p style={subtitleStyle}>
            A compact view of sales, customers, acquisition, and product performance.
          </p>
        </div>

        <div style={toolbarStyle}>
          <Field label="View">
            <select
              value={view}
              onChange={(e) => setView(e.target.value as ReportView)}
              style={selectStyle}
            >
              {VIEW_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Period">
            <select
              value={range}
              onChange={(e) => handleRangeChange(e.target.value as RangeKey)}
              style={selectStyle}
            >
              {RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          {range === "custom" ? (
            <>
              <Field label="Start">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={dateInputStyle}
                />
              </Field>

              <Field label="End">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={dateInputStyle}
                />
              </Field>

              <button
                type="button"
                onClick={() => loadReports("custom")}
                style={applyButtonStyle}
              >
                Apply
              </button>
            </>
          ) : null}

          {updating ? <div style={updatingStyle}>Updating...</div> : null}
        </div>
      </div>

      {errorMessage ? <div style={errorBoxStyle}>{errorMessage}</div> : null}

      {view === "overview" ? (
        <>
          <section style={metricsGridStyle}>
            <Metric
              label={data.range.label}
              value={formatMoney(data.summary.totalRevenue, currency)}
              helper="Revenue"
            />
            <Metric
              label="Orders"
              value={formatNumber(data.summary.totalOrders)}
              helper={`${formatNumber(data.summary.totalItems)} items`}
            />
            <Metric
              label="Average Order"
              value={formatMoney(data.summary.averageOrderValue, currency)}
              helper="AOV"
            />
            <Metric
              label="Spending Customers"
              value={formatNumber(data.summary.spendingCustomers)}
              helper={`${formatMoney(
                data.summary.revenuePerSpendingCustomer,
                currency
              )} per customer`}
            />
          </section>

          <section style={mainGridStyle}>
            <Panel title="Revenue Trend" kicker="Sales">
              <div style={chartBoxStyle}>
                {revenueChartData.length === 0 ? (
                  <Empty message="No sales data for selected period." />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={revenueChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip
                        formatter={(value, name) => {
                          if (name === "revenue") {
                            return formatMoney(Number(value), currency);
                          }

                          return formatNumber(Number(value));
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Panel>

            <Panel title="Order Status" kicker="Operations">
              <div style={smallListStyle}>
                {data.statusBreakdown.length === 0 ? (
                  <Empty message="No order status data." />
                ) : (
                  data.statusBreakdown.map((item) => (
                    <div key={item.status} style={statusRowStyle}>
                      <div>
                        <div style={strongTextStyle}>{item.status}</div>
                        <div style={mutedTextStyle}>{item.count} orders</div>
                      </div>

                      <div style={rightStrongTextStyle}>
                        {formatMoney(item.revenue, currency)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Panel>
          </section>
        </>
      ) : null}

      {view === "customers" ? (
        <>
          <section style={metricsGridStyle}>
            <Metric
              label="Total Customers"
              value={formatNumber(data.summary.totalCustomers)}
              helper={`${formatNumber(data.summary.activeCustomers)} active`}
            />
            <Metric
              label="New Customers"
              value={formatNumber(data.summary.newCustomers)}
              helper={data.range.label}
            />
            <Metric
              label="Spending Customers"
              value={formatNumber(data.summary.spendingCustomers)}
              helper="Customers with orders"
            />
            <Metric
              label="Non-Spending"
              value={formatNumber(data.summary.nonSpendingCustomers)}
              helper="Active but no orders"
            />
          </section>

          <section style={mainGridStyle}>
            <Panel title="Customer Acquisition" kicker="Growth">
              <div style={chartBoxStyle}>
                {customerChartData.length === 0 ? (
                  <Empty message="No new customer data for selected period." />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={customerChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="customers"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Panel>

            <Panel title="New Customers" kicker="Acquisition">
              <div style={smallListStyle}>
                {data.newCustomersList.length === 0 ? (
                  <Empty message="No new customers for selected period." />
                ) : (
                  data.newCustomersList.slice(0, 8).map((item) => (
                    <div key={item.id || item.email} style={statusRowStyle}>
                      <div>
                        <div style={strongTextStyle}>
                          {item.company || item.name || "-"}
                        </div>
                        <div style={mutedTextStyle}>{item.email || "-"}</div>
                      </div>

                      <div style={mutedTextStyle}>
                        {formatDate(item.created_at)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Panel>
          </section>

          <Panel title="Spending Customers" kicker="Revenue">
            <div style={tableStyle}>
              <div style={customerHeadStyle}>
                <div>Customer</div>
                <div>Orders</div>
                <div>Items</div>
                <div>Average</div>
                <div style={{ textAlign: "right" }}>Revenue</div>
              </div>

              {data.topCustomers.length === 0 ? (
                <Empty message="No spending customers for selected period." />
              ) : (
                data.topCustomers.map((item) => (
                  <div key={item.id || item.email} style={customerRowStyle}>
                    <div>
                      <div style={strongTextStyle}>
                        {item.company || item.name || "-"}
                      </div>
                      <div style={mutedTextStyle}>{item.email || "-"}</div>
                    </div>
                    <div>{formatNumber(item.totalOrders)}</div>
                    <div>{formatNumber(item.totalItems)}</div>
                    <div>{formatMoney(item.averageOrderValue, currency)}</div>
                    <div style={rightStrongTextStyle}>
                      {formatMoney(item.totalRevenue, currency)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Panel>
        </>
      ) : null}

      {view === "products" ? (
        <>
          <section style={metricsGridStyle}>
            <Metric
              label="Revenue"
              value={formatMoney(data.summary.totalRevenue, currency)}
              helper={data.range.label}
            />
            <Metric
              label="Items Sold"
              value={formatNumber(data.summary.totalItems)}
              helper="Total quantity"
            />
            <Metric
              label="Orders"
              value={formatNumber(data.summary.totalOrders)}
              helper="Order count"
            />
            <Metric
              label="Listed Products"
              value={formatNumber(data.topProducts.length)}
              helper="Ranked by revenue"
            />
          </section>

          <Panel title="Top Products" kicker="Product Performance">
            <div style={tableStyle}>
              <div style={productHeadStyle}>
                <div>Product</div>
                <div>Quantity</div>
                <div>Orders</div>
                <div style={{ textAlign: "right" }}>Revenue</div>
              </div>

              {data.topProducts.length === 0 ? (
                <Empty message="No product data for selected period." />
              ) : (
                data.topProducts.map((item) => (
                  <div
                    key={item.product_slug || item.product_title}
                    style={productRowStyle}
                  >
                    <div style={strongTextStyle}>{item.product_title}</div>
                    <div>{formatNumber(item.quantity)}</div>
                    <div>{formatNumber(item.order_count)}</div>
                    <div style={rightStrongTextStyle}>
                      {formatMoney(item.revenue, currency)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Panel>
        </>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={fieldStyle}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function Metric({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div style={metricStyle}>
      <div style={metricLabelStyle}>{label}</div>
      <div style={metricValueStyle}>{value}</div>
      <div style={metricHelperStyle}>{helper}</div>
    </div>
  );
}

function Panel({
  title,
  kicker,
  children,
}: {
  title: string;
  kicker: string;
  children: ReactNode;
}) {
  return (
    <section style={panelStyle}>
      <div style={panelHeaderStyle}>
        <div style={panelKickerStyle}>{kicker}</div>
        <h2 style={panelTitleStyle}>{title}</h2>
      </div>

      {children}
    </section>
  );
}

function Empty({ message }: { message: string }) {
  return <div style={emptyStyle}>{message}</div>;
}

const pageStyle: CSSProperties = {
  display: "grid",
  gap: 14,
};

const headerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 14,
  flexWrap: "wrap",
};

const eyebrowStyle: CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  color: "#8a7f72",
  fontWeight: 800,
  marginBottom: 5,
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 30,
  lineHeight: 1.12,
  fontWeight: 800,
  color: "#171717",
};

const subtitleStyle: CSSProperties = {
  margin: "7px 0 0",
  color: "#6b6257",
  fontSize: 13,
  lineHeight: 1.55,
  maxWidth: 640,
};

const toolbarStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  gap: 8,
  flexWrap: "wrap",
  background: "#fff",
  border: "1px solid #e4dccf",
  borderRadius: 14,
  padding: 10,
};

const fieldStyle: CSSProperties = {
  display: "grid",
  gap: 4,
};

const labelStyle: CSSProperties = {
  fontSize: 10,
  color: "#7a7166",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const selectStyle: CSSProperties = {
  minWidth: 145,
  height: 34,
  borderRadius: 9,
  border: "1px solid #d8cebf",
  background: "#fff",
  padding: "0 10px",
  fontWeight: 700,
  color: "#171717",
  outline: "none",
  fontSize: 13,
};

const dateInputStyle: CSSProperties = {
  height: 34,
  borderRadius: 9,
  border: "1px solid #d8cebf",
  background: "#fff",
  padding: "0 9px",
  color: "#171717",
  outline: "none",
  fontSize: 13,
};

const applyButtonStyle: CSSProperties = {
  height: 34,
  borderRadius: 9,
  border: "1px solid #171717",
  background: "#171717",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
  padding: "0 12px",
  fontSize: 13,
};

const updatingStyle: CSSProperties = {
  color: "#7a7166",
  fontSize: 12,
  fontWeight: 700,
  paddingBottom: 8,
};

const metricsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 10,
};

const metricStyle: CSSProperties = {
  background: "#fff",
  border: "1px solid #e4dccf",
  borderRadius: 14,
  padding: 14,
  minHeight: 86,
};

const metricLabelStyle: CSSProperties = {
  fontSize: 11,
  color: "#7a7166",
  fontWeight: 800,
  marginBottom: 7,
};

const metricValueStyle: CSSProperties = {
  fontSize: 22,
  fontWeight: 800,
  color: "#171717",
  lineHeight: 1.1,
};

const metricHelperStyle: CSSProperties = {
  marginTop: 6,
  color: "#6b6257",
  fontSize: 12,
};

const mainGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.35fr) minmax(320px, 0.65fr)",
  gap: 12,
};

const panelStyle: CSSProperties = {
  background: "#fff",
  border: "1px solid #e4dccf",
  borderRadius: 15,
  padding: 15,
};

const panelHeaderStyle: CSSProperties = {
  marginBottom: 10,
};

const panelKickerStyle: CSSProperties = {
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: "#8a7f72",
  fontWeight: 800,
  marginBottom: 4,
};

const panelTitleStyle: CSSProperties = {
  margin: 0,
  color: "#171717",
  fontWeight: 800,
  fontSize: 18,
  lineHeight: 1.2,
};

const chartBoxStyle: CSSProperties = {
  height: 230,
  width: "100%",
};

const smallListStyle: CSSProperties = {
  display: "grid",
  gap: 0,
};

const statusRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  borderTop: "1px solid #f0e7da",
  padding: "10px 0",
};

const tableStyle: CSSProperties = {
  display: "grid",
  gap: 0,
};

const customerHeadStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.5fr 0.55fr 0.55fr 0.8fr 0.85fr",
  gap: 10,
  color: "#8a7f72",
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  fontWeight: 800,
  paddingBottom: 7,
};

const customerRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.5fr 0.55fr 0.55fr 0.8fr 0.85fr",
  gap: 10,
  alignItems: "center",
  borderTop: "1px solid #f0e7da",
  padding: "10px 0",
  fontSize: 13,
};

const productHeadStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.6fr 0.55fr 0.55fr 0.9fr",
  gap: 10,
  color: "#8a7f72",
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  fontWeight: 800,
  paddingBottom: 7,
};

const productRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.6fr 0.55fr 0.55fr 0.9fr",
  gap: 10,
  alignItems: "center",
  borderTop: "1px solid #f0e7da",
  padding: "10px 0",
  fontSize: 13,
};

const strongTextStyle: CSSProperties = {
  fontWeight: 800,
  color: "#171717",
  lineHeight: 1.35,
};

const rightStrongTextStyle: CSSProperties = {
  fontWeight: 700,
  color: "#171717",
  lineHeight: 1.35,
  textAlign: "right",
};

const mutedTextStyle: CSSProperties = {
  color: "#6b6257",
  fontSize: 12,
  lineHeight: 1.4,
  marginTop: 3,
};

const emptyStyle: CSSProperties = {
  borderRadius: 12,
  border: "1px dashed #d9cfbf",
  background: "#faf8f4",
  padding: 13,
  color: "#6b6257",
  fontWeight: 700,
  fontSize: 12,
};

const loadingCardStyle: CSSProperties = {
  background: "#fff",
  border: "1px solid #e3dbcf",
  borderRadius: 14,
  padding: 16,
  color: "#6b6257",
  fontWeight: 700,
};

const errorBoxStyle: CSSProperties = {
  padding: 12,
  borderRadius: 12,
  background: "#fff1f1",
  border: "1px solid #f0c9c9",
  color: "#8d2f2f",
  fontWeight: 700,
  fontSize: 12,
};