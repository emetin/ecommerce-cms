"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type ApplicationItem = {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  status: string;
  created_at: string;
};

type CustomerItem = {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  status: string;
  price_tier: string;
  created_at: string;
};

type OrderItem = {
  id: string;
  order_number: string;
  customer_id: string;
  company_name: string;
  status: string;
  subtotal: number;
  currency: string;
  created_at: string;
  updated_at: string;
};

type DashboardStats = {
  productTotal: number;
  pendingApplications: number;
  approvedApplications: number;
  activeCustomers: number;
  inactiveCustomers: number;
  pendingOrders: number;
  processingOrders: number;
  completedOrders: number;
  orderVolume: number;
};

type DashboardSummaryResponse = {
  ok?: boolean;
  error?: string;
  stats?: DashboardStats;
  recentApplications?: ApplicationItem[];
  recentCustomers?: CustomerItem[];
  recentOrders?: OrderItem[];
};

const emptyStats: DashboardStats = {
  productTotal: 0,
  pendingApplications: 0,
  approvedApplications: 0,
  activeCustomers: 0,
  inactiveCustomers: 0,
  pendingOrders: 0,
  processingOrders: 0,
  completedOrders: 0,
  orderVolume: 0,
};

function normalizeText(value?: string) {
  return String(value || "").trim();
}

function normalizeLower(value?: string) {
  return normalizeText(value).toLowerCase();
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

function formatMoney(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(value || 0);
}

async function readJsonResponse<T>(
  response: Response,
  fallbackMessage: string
): Promise<T> {
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();

  if (!contentType.includes("application/json")) {
    throw new Error(
      response.status === 401 || response.status === 403
        ? "Admin session expired. Please log in again."
        : `${fallbackMessage} Endpoint returned HTML instead of JSON. Status: ${response.status}`
    );
  }

  try {
    const data = JSON.parse(text) as T & {
      ok?: boolean;
      error?: string;
    };

    if (!response.ok || data?.ok === false) {
      throw new Error(data?.error || fallbackMessage);
    }

    return data as T;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }

    throw new Error(`${fallbackMessage} Invalid JSON response.`);
  }
}

function getStatusPillStyle(value?: string): React.CSSProperties {
  const raw = normalizeLower(value);

  if (raw === "active" || raw === "approved" || raw === "completed") {
    return {
      background: "#eef8f0",
      color: "#2f7d62",
      border: "1px solid rgba(47,125,98,0.18)",
    };
  }

  if (raw === "processing") {
    return {
      background: "#eef4fb",
      color: "#315f95",
      border: "1px solid rgba(49,95,149,0.16)",
    };
  }

  if (raw === "pending" || raw === "submitted" || raw === "reviewing") {
    return {
      background: "#fff7e8",
      color: "#8a6418",
      border: "1px solid #ecd8ad",
    };
  }

  if (raw === "quoted") {
    return {
      background: "#eef4fb",
      color: "#315f95",
      border: "1px solid rgba(49,95,149,0.16)",
    };
  }

  if (raw === "inactive" || raw === "cancelled") {
    return {
      background: "#fff4f2",
      color: "#a54a3f",
      border: "1px solid rgba(165,74,63,0.18)",
    };
  }

  return {
    background: "#f8f5ef",
    color: "#6a6156",
    border: "1px solid #e5ddd2",
  };
}

export default function AdminDashboardPage() {
  const hasLoadedRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [recentApplications, setRecentApplications] = useState<
    ApplicationItem[]
  >([]);
  const [recentCustomers, setRecentCustomers] = useState<CustomerItem[]>([]);
  const [recentOrders, setRecentOrders] = useState<OrderItem[]>([]);

  async function loadDashboard() {
    try {
      setLoading(true);
      setErrorMessage("");

      const response = await fetch("/api/admin/dashboard/summary", {
        cache: "no-store",
        credentials: "same-origin",
      });

      const data = await readJsonResponse<DashboardSummaryResponse>(
        response,
        "Failed to load dashboard summary."
      );

      setStats(data.stats || emptyStats);

      setRecentApplications(
        Array.isArray(data.recentApplications) ? data.recentApplications : []
      );

      setRecentCustomers(
        Array.isArray(data.recentCustomers) ? data.recentCustomers : []
      );

      setRecentOrders(Array.isArray(data.recentOrders) ? data.recentOrders : []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "An unknown error occurred."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (hasLoadedRef.current) return;

    hasLoadedRef.current = true;
    loadDashboard();
  }, []);

  if (loading) {
    return <div style={cardStyle}>Loading dashboard...</div>;
  }

  if (errorMessage) {
    return (
      <div style={errorBoxStyle}>
        <strong>Dashboard could not be loaded.</strong>
        <br />
        {errorMessage}
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div style={heroWrapStyle}>
        <div>
          <div style={eyebrowStyle}>Globaltex Admin Dashboard</div>
          <h1 style={titleStyle}>Operations overview</h1>
          <p style={subtitleStyle}>
            Review product catalog size, incoming applications, customer account
            health, and recent B2B order activity from one place.
          </p>
        </div>

        <div style={heroActionsStyle}>
          <Link href="/admin/products/new" style={primaryButtonStyle}>
            + New Product
          </Link>
          <Link href="/admin/customer-applications" style={secondaryButtonStyle}>
            Review Applications
          </Link>
        </div>
      </div>

      <section style={statsGridStyle}>
        <StatCard
          label="Products"
          value={String(stats.productTotal)}
          helper="Catalog entries currently available"
        />
        <StatCard
          label="Pending Applications"
          value={String(stats.pendingApplications)}
          helper={`${stats.approvedApplications} approved applications`}
          warning
        />
        <StatCard
          label="Active Customers"
          value={String(stats.activeCustomers)}
          helper={`${stats.inactiveCustomers} inactive accounts`}
        />
        <StatCard
          label="Pending Quote Requests"
          value={String(stats.pendingOrders)}
          helper={`${stats.processingOrders} in progress`}
          warning
        />
        <StatCard
          label="Completed Orders"
          value={String(stats.completedOrders)}
          helper="Operationally finalized orders"
        />
        <StatCard
          label="Quote Volume"
          value={formatMoney(stats.orderVolume, "USD")}
          helper="Combined subtotal of listed quote requests"
        />
      </section>

      <section style={quickGridStyle}>
        <QuickLinkCard
          title="Products"
          text="Manage product data, media readiness, and publishing status."
          href="/admin/products"
          cta="Open Products"
        />
        <QuickLinkCard
          title="Applications"
          text="Review new B2B requests and approve qualified companies."
          href="/admin/customer-applications"
          cta="Open Applications"
        />
        <QuickLinkCard
          title="Customers"
          text="Control account status, pricing access, and temporary passwords."
          href="/admin/customers"
          cta="Open Customers"
        />
        <QuickLinkCard
          title="Quote Requests"
          text="Track quote request progress and inspect submitted line items."
          href="/admin/orders"
          cta="Open Requests"
        />
      </section>

      <div style={contentGridStyle}>
        <section style={cardStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <div style={sectionKickerStyle}>Recent Quote Requests</div>
              <div style={sectionTitleStyle}>Latest B2B activity</div>
            </div>

            <Link href="/admin/orders" style={inlineLinkStyle}>
              View all
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div style={emptyStateStyle}>No recent quote requests found.</div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {recentOrders.map((item) => (
                <div key={item.id} style={listItemCardStyle}>
                  <div style={listItemTopStyle}>
                    <div>
                      <div style={listItemTitleStyle}>
                        {item.order_number || "Quote Request"}
                      </div>
                      <div style={listItemMetaStyle}>
                        {item.company_name || "-"} • {item.customer_id || "-"}
                      </div>
                    </div>

                    <div
                      style={{
                        ...statusPillStyle,
                        ...getStatusPillStyle(item.status),
                      }}
                    >
                      {item.status || "submitted"}
                    </div>
                  </div>

                  <div style={miniMetaGridStyle}>
                    <div>
                      <div style={miniMetaLabelStyle}>Subtotal</div>
                      <div style={miniMetaValueStyle}>
                        {formatMoney(item.subtotal, item.currency)}
                      </div>
                    </div>
                    <div>
                      <div style={miniMetaLabelStyle}>Created</div>
                      <div style={miniMetaValueStyle}>
                        {formatDate(item.created_at)}
                      </div>
                    </div>
                    <div>
                      <div style={miniMetaLabelStyle}>Updated</div>
                      <div style={miniMetaValueStyle}>
                        {formatDate(item.updated_at)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={cardStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <div style={sectionKickerStyle}>Applications</div>
              <div style={sectionTitleStyle}>Newest requests</div>
            </div>

            <Link href="/admin/customer-applications" style={inlineLinkStyle}>
              View all
            </Link>
          </div>

          {recentApplications.length === 0 ? (
            <div style={emptyStateStyle}>No applications found.</div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {recentApplications.map((item) => (
                <div key={item.id} style={listItemCardStyle}>
                  <div style={listItemTopStyle}>
                    <div>
                      <div style={listItemTitleStyle}>
                        {item.company_name || "-"}
                      </div>
                      <div style={listItemMetaStyle}>
                        {item.contact_name || "-"} • {item.email || "-"}
                      </div>
                    </div>

                    <div
                      style={{
                        ...statusPillStyle,
                        ...getStatusPillStyle(item.status),
                      }}
                    >
                      {item.status || "pending"}
                    </div>
                  </div>

                  <div style={miniMetaGridStyle}>
                    <div>
                      <div style={miniMetaLabelStyle}>Submitted</div>
                      <div style={miniMetaValueStyle}>
                        {formatDate(item.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section style={cardStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <div style={sectionKickerStyle}>Customers</div>
            <div style={sectionTitleStyle}>Recently added accounts</div>
          </div>

          <Link href="/admin/customers" style={inlineLinkStyle}>
            View all
          </Link>
        </div>

        {recentCustomers.length === 0 ? (
          <div style={emptyStateStyle}>No customer accounts found.</div>
        ) : (
          <div style={customerGridStyle}>
            {recentCustomers.map((item) => (
              <div key={item.id} style={customerCardStyle}>
                <div style={customerCardTitleStyle}>
                  {item.company_name || "-"}
                </div>
                <div style={customerCardMetaStyle}>
                  {item.contact_name || "-"}
                </div>
                <div style={customerCardMetaStyle}>{item.email || "-"}</div>

                <div style={customerCardBottomStyle}>
                  <div
                    style={{
                      ...statusPillStyle,
                      ...getStatusPillStyle(item.status),
                    }}
                  >
                    {item.status || "inactive"}
                  </div>

                  <div style={customerTierBadgeStyle}>
                    {item.price_tier || "standard"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  helper,
  warning = false,
}: {
  label: string;
  value: string;
  helper: string;
  warning?: boolean;
}) {
  return (
    <div style={warning ? warningStatCardStyle : statCardStyle}>
      <div style={statCardLabelStyle}>{label}</div>
      <div style={statCardValueStyle}>{value}</div>
      <div style={statCardHelperStyle}>{helper}</div>
    </div>
  );
}

function QuickLinkCard({
  title,
  text,
  href,
  cta,
}: {
  title: string;
  text: string;
  href: string;
  cta: string;
}) {
  return (
    <Link href={href} style={quickCardStyle}>
      <div style={quickCardTitleStyle}>{title}</div>
      <div style={quickCardTextStyle}>{text}</div>
      <div style={quickCardCtaStyle}>{cta} →</div>
    </Link>
  );
}

const heroWrapStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 20,
  flexWrap: "wrap",
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#7a7166",
  fontWeight: 800,
  marginBottom: 10,
};

const titleStyle: React.CSSProperties = {
  fontSize: 42,
  lineHeight: 1.08,
  margin: "0 0 10px",
  fontWeight: 800,
  color: "#171717",
};

const subtitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#6f6559",
  fontSize: 16,
  lineHeight: 1.8,
  maxWidth: 820,
};

const heroActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
};

const primaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 48,
  padding: "0 18px",
  borderRadius: 14,
  border: "1px solid #2f7d62",
  background: "#2f7d62",
  color: "#fff",
  fontWeight: 800,
  textDecoration: "none",
};

const secondaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 48,
  padding: "0 18px",
  borderRadius: 14,
  border: "1px solid #d9cfbf",
  background: "#fff",
  color: "#171717",
  fontWeight: 800,
  textDecoration: "none",
};

const statsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 16,
};

const statCardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e3dbcf",
  borderRadius: 22,
  padding: 20,
  boxShadow: "0 10px 30px rgba(23,23,23,0.04)",
};

const warningStatCardStyle: React.CSSProperties = {
  background: "#fff7e8",
  border: "1px solid #ecd8ad",
  borderRadius: 22,
  padding: 20,
  boxShadow: "0 10px 30px rgba(23,23,23,0.04)",
};

const statCardLabelStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#7c7267",
  marginBottom: 10,
  fontWeight: 700,
};

const statCardValueStyle: React.CSSProperties = {
  fontSize: 30,
  lineHeight: 1.1,
  fontWeight: 800,
  color: "#171717",
  marginBottom: 8,
};

const statCardHelperStyle: React.CSSProperties = {
  color: "#665d52",
  fontSize: 13,
  lineHeight: 1.6,
};

const quickGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 16,
};

const quickCardStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
  background: "#fff",
  border: "1px solid #ddd3c5",
  borderRadius: 22,
  padding: 20,
  textDecoration: "none",
  color: "#171717",
  boxShadow: "0 10px 30px rgba(23,23,23,0.04)",
};

const quickCardTitleStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 800,
  lineHeight: 1.2,
};

const quickCardTextStyle: React.CSSProperties = {
  color: "#665d52",
  fontSize: 14,
  lineHeight: 1.75,
};

const quickCardCtaStyle: React.CSSProperties = {
  color: "#2f7d62",
  fontWeight: 800,
  fontSize: 14,
};

const contentGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.15fr 0.85fr",
  gap: 20,
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #ddd3c5",
  borderRadius: 24,
  padding: 24,
  boxShadow: "0 10px 30px rgba(23,23,23,0.04)",
};

const sectionHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 14,
  flexWrap: "wrap",
  marginBottom: 18,
};

const sectionKickerStyle: React.CSSProperties = {
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#7a7166",
  fontWeight: 800,
  marginBottom: 6,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 24,
  lineHeight: 1.15,
  fontWeight: 800,
  color: "#171717",
};

const inlineLinkStyle: React.CSSProperties = {
  color: "#2f7d62",
  fontWeight: 800,
  textDecoration: "none",
};

const emptyStateStyle: React.CSSProperties = {
  borderRadius: 18,
  border: "1px dashed #d9cfbf",
  background: "#faf8f4",
  padding: 22,
  color: "#6f6559",
  fontWeight: 700,
};

const listItemCardStyle: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid #e8dfd2",
  background: "#fcfbf8",
  padding: 16,
  display: "grid",
  gap: 12,
};

const listItemTopStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  flexWrap: "wrap",
};

const listItemTitleStyle: React.CSSProperties = {
  fontSize: 18,
  lineHeight: 1.25,
  fontWeight: 800,
  color: "#171717",
  marginBottom: 4,
};

const listItemMetaStyle: React.CSSProperties = {
  color: "#665d52",
  fontSize: 14,
  lineHeight: 1.7,
};

const statusPillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 34,
  padding: "0 12px",
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 800,
};

const miniMetaGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 12,
};

const miniMetaLabelStyle: React.CSSProperties = {
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#7a7166",
  fontWeight: 800,
  marginBottom: 6,
};

const miniMetaValueStyle: React.CSSProperties = {
  color: "#171717",
  fontWeight: 700,
  fontSize: 14,
  lineHeight: 1.6,
};

const customerGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
  gap: 14,
};

const customerCardStyle: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid #e8dfd2",
  background: "#fcfbf8",
  padding: 16,
  display: "grid",
  gap: 8,
};

const customerCardTitleStyle: React.CSSProperties = {
  fontSize: 16,
  lineHeight: 1.3,
  fontWeight: 800,
  color: "#171717",
};

const customerCardMetaStyle: React.CSSProperties = {
  color: "#665d52",
  fontSize: 13,
  lineHeight: 1.6,
  wordBreak: "break-word",
};

const customerCardBottomStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 8,
};

const customerTierBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 30,
  padding: "0 10px",
  borderRadius: 999,
  background: "#f3ede3",
  color: "#6b6256",
  fontWeight: 800,
  fontSize: 12,
  textTransform: "uppercase",
};

const errorBoxStyle: React.CSSProperties = {
  padding: 18,
  borderRadius: 16,
  background: "#fff1f1",
  border: "1px solid #f0c9c9",
  color: "#8d2f2f",
  lineHeight: 1.7,
};