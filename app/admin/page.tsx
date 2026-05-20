"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";

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
  publishedProducts: number;
  draftProducts: number;
  archivedProducts: number;
  missingImageProducts: number;
  missingPriceProducts: number;
  missingSeoProducts: number;
  pendingApplications: number;
  approvedApplications: number;
  activeCustomers: number;
  inactiveCustomers: number;
  pendingOrders: number;
  processingOrders: number;
  completedOrders: number;
  orderVolume: number;
  monthlyQuoteVolume: number;
};

type DashboardSummaryResponse = {
  ok?: boolean;
  error?: string;
  stats?: Partial<DashboardStats>;
  recentApplications?: ApplicationItem[];
  recentCustomers?: CustomerItem[];
  recentOrders?: OrderItem[];
};

const emptyStats: DashboardStats = {
  productTotal: 0,
  publishedProducts: 0,
  draftProducts: 0,
  archivedProducts: 0,
  missingImageProducts: 0,
  missingPriceProducts: 0,
  missingSeoProducts: 0,
  pendingApplications: 0,
  approvedApplications: 0,
  activeCustomers: 0,
  inactiveCustomers: 0,
  pendingOrders: 0,
  processingOrders: 0,
  completedOrders: 0,
  orderVolume: 0,
  monthlyQuoteVolume: 0,
};

function normalizeText(value?: unknown) {
  return String(value ?? "").trim();
}

function normalizeLower(value?: unknown) {
  return normalizeText(value).toLowerCase();
}

function mergeStats(stats?: Partial<DashboardStats>): DashboardStats {
  return {
    ...emptyStats,
    ...(stats || {}),
  };
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

function formatDateTime(value?: string) {
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

function formatMoney(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function calculateReadinessScore(stats: DashboardStats) {
  if (!stats.productTotal) return 100;

  const issueTotal =
    stats.missingImageProducts +
    stats.missingPriceProducts +
    stats.missingSeoProducts;

  const rawScore = 100 - Math.round((issueTotal / stats.productTotal) * 100);

  return Math.max(0, Math.min(100, rawScore));
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

function getStatusPillStyle(value?: string): CSSProperties {
  const raw = normalizeLower(value);

  if (raw === "active" || raw === "approved" || raw === "completed") {
    return {
      background: "#eef8f0",
      color: "#2f7d62",
      border: "1px solid rgba(47,125,98,0.18)",
    };
  }

  if (raw === "processing" || raw === "quoted") {
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

  if (raw === "inactive" || raw === "cancelled" || raw === "canceled") {
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
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [recentApplications, setRecentApplications] = useState<ApplicationItem[]>(
    []
  );
  const [recentCustomers, setRecentCustomers] = useState<CustomerItem[]>([]);
  const [recentOrders, setRecentOrders] = useState<OrderItem[]>([]);

  const readinessScore = useMemo(() => {
    return calculateReadinessScore(stats);
  }, [stats]);

  const issueTotal = useMemo(() => {
    return (
      stats.missingImageProducts +
      stats.missingPriceProducts +
      stats.missingSeoProducts
    );
  }, [stats]);

  async function loadDashboard(options?: { silent?: boolean }) {
    try {
      if (options?.silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setErrorMessage("");

      const response = await fetch("/api/admin/dashboard/summary", {
        cache: "no-store",
        credentials: "same-origin",
      });

      const data = await readJsonResponse<DashboardSummaryResponse>(
        response,
        "Failed to load dashboard summary."
      );

      setStats(mergeStats(data.stats));

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
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (hasLoadedRef.current) return;

    hasLoadedRef.current = true;
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div style={loadingCardStyle}>
        <div style={loadingTitleStyle}>Loading dashboard...</div>
        <div style={loadingTextStyle}>Preparing admin overview.</div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div style={errorBoxStyle}>
        <strong>Dashboard could not be loaded.</strong>
        <br />
        {errorMessage}
        <div style={{ marginTop: 16 }}>
          <button
            type="button"
            onClick={() => loadDashboard()}
            style={primaryButtonStyle}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={pageWrapStyle}>
      <div style={heroWrapStyle}>
        <div>
          <div style={eyebrowStyle}>Globaltex Admin Dashboard</div>
          <h1 style={titleStyle}>Operations overview</h1>
          <p style={subtitleStyle}>
            Review catalog readiness, quote activity, customer accounts, and
            pending operational work from one place.
          </p>
        </div>

        <div style={heroActionsStyle}>
          <button
            type="button"
            onClick={() => loadDashboard({ silent: true })}
            style={secondaryButtonStyle}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>

          <Link href="/admin/products/new" style={primaryButtonStyle}>
            + New Product
          </Link>

          <Link href="/admin/products" style={secondaryButtonStyle}>
            Open Products
          </Link>
        </div>
      </div>

      <section style={statsGridStyle}>
        <StatCard
          label="Total Products"
          value={String(stats.productTotal)}
          helper={`${stats.publishedProducts} published, ${stats.draftProducts} draft`}
          tone="default"
          href="/admin/products"
        />

        <StatCard
          label="Catalog Readiness"
          value={`${readinessScore}%`}
          helper={`${issueTotal} total content issues`}
          tone={readinessScore >= 90 ? "success" : "warning"}
          href="/admin/products"
        />

        <StatCard
          label="Missing Images"
          value={String(stats.missingImageProducts)}
          helper="Products without primary image"
          tone={stats.missingImageProducts > 0 ? "warning" : "success"}
          href="/admin/products"
        />

        <StatCard
          label="Missing Prices"
          value={String(stats.missingPriceProducts)}
          helper="Products without base price"
          tone={stats.missingPriceProducts > 0 ? "danger" : "success"}
          href="/admin/products"
        />

        <StatCard
          label="Pending Quote Requests"
          value={String(stats.pendingOrders)}
          helper={`${stats.processingOrders} currently in progress`}
          tone={stats.pendingOrders > 0 ? "warning" : "default"}
          href="/admin/orders"
        />

        <StatCard
          label="Quote Volume"
          value={formatMoney(stats.orderVolume, "USD")}
          helper={`${formatMoney(stats.monthlyQuoteVolume, "USD")} in last 30 days`}
          tone="default"
          href="/admin/orders"
        />

        <StatCard
          label="Completed Orders"
          value={String(stats.completedOrders)}
          helper="Operationally finalized orders"
          tone="success"
          href="/admin/orders"
        />

        <StatCard
          label="Active Customers"
          value={String(stats.activeCustomers)}
          helper={`${stats.inactiveCustomers} inactive accounts`}
          tone="default"
          href="/admin/customers"
        />

        <StatCard
          label="Missing SEO"
          value={String(stats.missingSeoProducts)}
          helper="Products missing title or description"
          tone={stats.missingSeoProducts > 0 ? "warning" : "success"}
          href="/admin/products"
        />
      </section>

      <section style={healthGridStyle}>
        <div style={healthCardStyle}>
          <div style={sectionKickerStyle}>Catalog Health</div>
          <h2 style={sectionTitleLargeStyle}>Product readiness summary</h2>
          <p style={sectionDescriptionStyle}>
            This score checks images, prices, and SEO readiness across your
            published catalog.
          </p>

          <div style={progressOuterStyle}>
            <div
              style={{
                ...progressInnerStyle,
                width: `${readinessScore}%`,
              }}
            />
          </div>

          <div style={healthMetaGridStyle}>
            <HealthMetric
              label="Published"
              value={String(stats.publishedProducts)}
            />
            <HealthMetric
              label="Missing Image"
              value={String(stats.missingImageProducts)}
            />
            <HealthMetric
              label="Missing Price"
              value={String(stats.missingPriceProducts)}
            />
            <HealthMetric
              label="Missing SEO"
              value={String(stats.missingSeoProducts)}
            />
          </div>
        </div>

        <div style={healthCardStyle}>
          <div style={sectionKickerStyle}>Quote Pipeline</div>
          <h2 style={sectionTitleLargeStyle}>Current request status</h2>
          <p style={sectionDescriptionStyle}>
            Monitor submitted, reviewing, quoted, approved, processing, and
            completed quote activity.
          </p>

          <div style={pipelineGridStyle}>
            <PipelineItem
              label="Pending"
              value={stats.pendingOrders}
              tone="warning"
            />
            <PipelineItem
              label="In Progress"
              value={stats.processingOrders}
              tone="info"
            />
            <PipelineItem
              label="Completed"
              value={stats.completedOrders}
              tone="success"
            />
          </div>

          <Link href="/admin/orders" style={inlineActionStyle}>
            Review quote requests →
          </Link>
        </div>
      </section>

      <section style={quickGridStyle}>
        <QuickLinkCard
          title="Products"
          text="Manage product data, media readiness, pricing, and publishing status."
          href="/admin/products"
          cta="Open Products"
        />

        <QuickLinkCard
          title="Orders"
          text="Track quote requests, inspect line items, and update request status."
          href="/admin/orders"
          cta="Open Orders"
        />

        <QuickLinkCard
          title="Customers"
          text="Control account status, customer access, and B2B account activity."
          href="/admin/customers"
          cta="Open Customers"
        />

        <QuickLinkCard
          title="Reports"
          text="Review performance, catalog health, and operational reporting."
          href="/admin/reports"
          cta="Open Reports"
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
                        {item.company_name || "-"} •{" "}
                        {formatDateTime(item.created_at)}
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

                  {item.order_number ? (
                    <Link
                      href={`/admin/orders/${item.order_number}`}
                      style={smallActionStyle}
                    >
                      Open request →
                    </Link>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>

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
            <div style={{ display: "grid", gap: 12 }}>
              {recentCustomers.map((item) => (
                <div key={item.id} style={customerRowStyle}>
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
                    {item.status || "inactive"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {recentApplications.length > 0 ? (
        <section style={cardStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <div style={sectionKickerStyle}>Applications</div>
              <div style={sectionTitleStyle}>Newest B2B requests</div>
            </div>

            <Link href="/admin/customer-applications" style={inlineLinkStyle}>
              View all
            </Link>
          </div>

          <div style={customerGridStyle}>
            {recentApplications.map((item) => (
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
                    {item.status || "pending"}
                  </div>

                  <div style={customerTierBadgeStyle}>
                    {formatDate(item.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  helper,
  tone = "default",
  href,
}: {
  label: string;
  value: string;
  helper: string;
  tone?: "default" | "success" | "warning" | "danger";
  href?: string;
}) {
  const card = (
    <div style={{ ...statCardStyle, ...getStatToneStyle(tone) }}>
      <div style={statCardLabelStyle}>{label}</div>
      <div style={statCardValueStyle}>{value}</div>
      <div style={statCardHelperStyle}>{helper}</div>
    </div>
  );

  if (!href) {
    return card;
  }

  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      {card}
    </Link>
  );
}

function getStatToneStyle(tone: "default" | "success" | "warning" | "danger") {
  if (tone === "success") {
    return {
      background: "#f3fbf5",
      border: "1px solid #cfe7d8",
    };
  }

  if (tone === "warning") {
    return {
      background: "#fff8e9",
      border: "1px solid #ecd8ad",
    };
  }

  if (tone === "danger") {
    return {
      background: "#fff4f2",
      border: "1px solid rgba(165,74,63,0.18)",
    };
  }

  return {};
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

function HealthMetric({ label, value }: { label: string; value: string }) {
  return (
    <div style={healthMetricStyle}>
      <div style={healthMetricLabelStyle}>{label}</div>
      <div style={healthMetricValueStyle}>{value}</div>
    </div>
  );
}

function PipelineItem({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "warning" | "info" | "success";
}) {
  const color =
    tone === "warning" ? "#8a6418" : tone === "info" ? "#315f95" : "#2f7d62";

  return (
    <div style={pipelineItemStyle}>
      <div style={{ ...pipelineValueStyle, color }}>{value}</div>
      <div style={pipelineLabelStyle}>{label}</div>
    </div>
  );
}

const pageWrapStyle: CSSProperties = {
  display: "grid",
  gap: 24,
};

const loadingCardStyle: CSSProperties = {
  background: "#fff",
  border: "1px solid #e3dbcf",
  borderRadius: 22,
  padding: 24,
};

const loadingTitleStyle: CSSProperties = {
  fontSize: 18,
  fontWeight: 850,
  color: "#171717",
};

const loadingTextStyle: CSSProperties = {
  marginTop: 6,
  color: "#6f6559",
  fontSize: 14,
};

const heroWrapStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 20,
  flexWrap: "wrap",
};

const eyebrowStyle: CSSProperties = {
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#7a7166",
  fontWeight: 800,
  marginBottom: 10,
};

const titleStyle: CSSProperties = {
  fontSize: 42,
  lineHeight: 1.08,
  margin: "0 0 10px",
  fontWeight: 850,
  color: "#171717",
  letterSpacing: "-0.04em",
};

const subtitleStyle: CSSProperties = {
  margin: 0,
  color: "#6f6559",
  fontSize: 16,
  lineHeight: 1.8,
  maxWidth: 820,
};

const heroActionsStyle: CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
};

const primaryButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 48,
  padding: "0 18px",
  borderRadius: 14,
  border: "1px solid #2f7d62",
  background: "#2f7d62",
  color: "#fff",
  fontWeight: 850,
  textDecoration: "none",
  cursor: "pointer",
};

const secondaryButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 48,
  padding: "0 18px",
  borderRadius: 14,
  border: "1px solid #d9cfbf",
  background: "#fff",
  color: "#171717",
  fontWeight: 850,
  textDecoration: "none",
  cursor: "pointer",
};

const statsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 16,
};

const statCardStyle: CSSProperties = {
  background: "#fff",
  border: "1px solid #e3dbcf",
  borderRadius: 22,
  padding: 20,
  boxShadow: "0 10px 30px rgba(23,23,23,0.04)",
  minHeight: 126,
  display: "grid",
  alignContent: "space-between",
  transition: "transform 160ms ease, box-shadow 160ms ease",
};

const statCardLabelStyle: CSSProperties = {
  fontSize: 13,
  color: "#6f6559",
  fontWeight: 850,
};

const statCardValueStyle: CSSProperties = {
  marginTop: 10,
  fontSize: 32,
  lineHeight: 1,
  color: "#111",
  fontWeight: 900,
};

const statCardHelperStyle: CSSProperties = {
  marginTop: 12,
  color: "#6f6559",
  fontSize: 13,
  lineHeight: 1.45,
};

const healthGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 16,
};

const healthCardStyle: CSSProperties = {
  background: "#fff",
  border: "1px solid #e3dbcf",
  borderRadius: 24,
  padding: 24,
  boxShadow: "0 10px 30px rgba(23,23,23,0.04)",
};

const sectionKickerStyle: CSSProperties = {
  color: "#b5962f",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const sectionTitleLargeStyle: CSSProperties = {
  margin: "8px 0 8px",
  fontSize: 26,
  lineHeight: 1.15,
  color: "#171717",
  fontWeight: 900,
  letterSpacing: "-0.03em",
};

const sectionDescriptionStyle: CSSProperties = {
  margin: 0,
  color: "#6f6559",
  fontSize: 14,
  lineHeight: 1.7,
};

const progressOuterStyle: CSSProperties = {
  marginTop: 22,
  height: 14,
  background: "#f2ece2",
  borderRadius: 999,
  overflow: "hidden",
  border: "1px solid #e3dbcf",
};

const progressInnerStyle: CSSProperties = {
  height: "100%",
  background: "#2f7d62",
  borderRadius: 999,
};

const healthMetaGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 10,
  marginTop: 18,
};

const healthMetricStyle: CSSProperties = {
  background: "#faf7f1",
  border: "1px solid #e8dfd2",
  borderRadius: 16,
  padding: 12,
};

const healthMetricLabelStyle: CSSProperties = {
  color: "#7b7367",
  fontSize: 11,
  fontWeight: 850,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const healthMetricValueStyle: CSSProperties = {
  marginTop: 8,
  color: "#171717",
  fontSize: 22,
  fontWeight: 900,
};

const pipelineGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 10,
  marginTop: 22,
};

const pipelineItemStyle: CSSProperties = {
  background: "#faf7f1",
  border: "1px solid #e8dfd2",
  borderRadius: 16,
  padding: 14,
};

const pipelineValueStyle: CSSProperties = {
  fontSize: 28,
  fontWeight: 900,
  lineHeight: 1,
};

const pipelineLabelStyle: CSSProperties = {
  marginTop: 8,
  color: "#6f6559",
  fontSize: 12,
  fontWeight: 850,
};

const inlineActionStyle: CSSProperties = {
  display: "inline-flex",
  marginTop: 18,
  color: "#2f7d62",
  fontWeight: 900,
  textDecoration: "none",
};

const quickGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 16,
};

const quickCardStyle: CSSProperties = {
  display: "grid",
  gap: 12,
  padding: 20,
  background: "#fff",
  border: "1px solid #e3dbcf",
  borderRadius: 22,
  boxShadow: "0 10px 30px rgba(23,23,23,0.04)",
  color: "#171717",
  textDecoration: "none",
};

const quickCardTitleStyle: CSSProperties = {
  fontSize: 22,
  fontWeight: 900,
  color: "#171717",
};

const quickCardTextStyle: CSSProperties = {
  color: "#6f6559",
  fontSize: 14,
  lineHeight: 1.65,
};

const quickCardCtaStyle: CSSProperties = {
  color: "#2f7d62",
  fontWeight: 900,
};

const contentGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.2fr 0.8fr",
  gap: 16,
};

const cardStyle: CSSProperties = {
  background: "#fff",
  border: "1px solid #e3dbcf",
  borderRadius: 24,
  padding: 22,
  boxShadow: "0 10px 30px rgba(23,23,23,0.04)",
};

const sectionHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 14,
  marginBottom: 16,
};

const sectionTitleStyle: CSSProperties = {
  marginTop: 5,
  fontSize: 22,
  color: "#171717",
  fontWeight: 900,
};

const inlineLinkStyle: CSSProperties = {
  color: "#2f7d62",
  fontWeight: 900,
  textDecoration: "none",
  whiteSpace: "nowrap",
};

const emptyStateStyle: CSSProperties = {
  background: "#faf7f1",
  border: "1px dashed #d8cdbd",
  borderRadius: 18,
  padding: 18,
  color: "#7b7367",
  fontWeight: 750,
};

const listItemCardStyle: CSSProperties = {
  border: "1px solid #e8dfd2",
  borderRadius: 18,
  padding: 16,
  background: "#fff",
};

const listItemTopStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
};

const listItemTitleStyle: CSSProperties = {
  color: "#171717",
  fontSize: 16,
  fontWeight: 900,
};

const listItemMetaStyle: CSSProperties = {
  marginTop: 5,
  color: "#6f6559",
  fontSize: 13,
  lineHeight: 1.5,
};

const statusPillStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 28,
  padding: "0 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 900,
  textTransform: "capitalize",
  whiteSpace: "nowrap",
};

const miniMetaGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 10,
  marginTop: 14,
};

const miniMetaLabelStyle: CSSProperties = {
  color: "#7b7367",
  fontSize: 11,
  fontWeight: 850,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const miniMetaValueStyle: CSSProperties = {
  marginTop: 5,
  color: "#171717",
  fontSize: 13,
  fontWeight: 850,
};

const smallActionStyle: CSSProperties = {
  display: "inline-flex",
  marginTop: 14,
  color: "#2f7d62",
  fontWeight: 900,
  textDecoration: "none",
};

const customerRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 14,
  alignItems: "center",
  border: "1px solid #e8dfd2",
  borderRadius: 18,
  padding: 16,
};

const customerGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 14,
};

const customerCardStyle: CSSProperties = {
  border: "1px solid #e8dfd2",
  borderRadius: 18,
  padding: 16,
  background: "#fff",
};

const customerCardTitleStyle: CSSProperties = {
  fontSize: 16,
  color: "#171717",
  fontWeight: 900,
};

const customerCardMetaStyle: CSSProperties = {
  marginTop: 6,
  color: "#6f6559",
  fontSize: 13,
};

const customerCardBottomStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "center",
  marginTop: 14,
};

const customerTierBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 28,
  padding: "0 10px",
  borderRadius: 999,
  background: "#f8f5ef",
  border: "1px solid #e3dbcf",
  color: "#6f6559",
  fontSize: 12,
  fontWeight: 850,
};

const errorBoxStyle: CSSProperties = {
  padding: 18,
  borderRadius: 18,
  background: "#fff4f2",
  border: "1px solid rgba(165,74,63,0.18)",
  color: "#7a2222",
  fontSize: 14,
  lineHeight: 1.6,
};
