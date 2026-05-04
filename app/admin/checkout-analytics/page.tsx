"use client";

import { useEffect, useMemo, useState } from "react";

type CheckoutSession = {
  id: string;
  cart_token: string;
  customer_id: string;
  email: string;
  company: string;
  status: string;
  stage: string;
  currency: string;
  subtotal: string;
  item_count: string;
  last_activity_at: string;
  recovered_order_id: string;
  note: string;
  created_at: string;
  updated_at: string;
};

type AnalyticsSummary = {
  totalSessions: number;
  totalValue: number;
  activeValue: number;
  abandonedValue: number;
  recoveredValue: number;
  dismissedValue: number;
  followedUpValue: number;
  totalItemCount: number;
  averageCheckoutValue: number;
  conversionRate: number;
  abandonmentRate: number;
  recoveryRate: number;
};

type BreakdownItem = {
  status?: string;
  stage?: string;
  count: number;
  rate: number;
};

type AnalyticsResponse = {
  ok: boolean;
  error?: string;
  summary?: AnalyticsSummary;
  statusCounts?: Record<string, number>;
  stageCounts?: Record<string, number>;
  statusBreakdown?: BreakdownItem[];
  stageBreakdown?: BreakdownItem[];
  recentSessions?: CheckoutSession[];
};

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function toNumber(value: unknown) {
  const next = Number(String(value || "0").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(next) ? next : 0;
}

function formatMoney(value: unknown, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function formatPercent(value: unknown) {
  return `${toNumber(value).toFixed(2)}%`;
}

function formatDate(value: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getMinutesAgo(value: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const hours = Math.floor(diffMinutes / 60);

  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);

  return `${days}d ago`;
}

function getStatusStyle(status: string): React.CSSProperties {
  const normalized = normalizeLower(status);

  if (normalized === "recovered") {
    return {
      background: "#eef8f0",
      color: "#2f7d62",
      border: "1px solid rgba(47,125,98,0.18)",
    };
  }

  if (normalized === "active") {
    return {
      background: "#eef4fb",
      color: "#315f95",
      border: "1px solid rgba(49,95,149,0.16)",
    };
  }

  if (normalized === "followed_up") {
    return {
      background: "#fff7e8",
      color: "#8a6418",
      border: "1px solid rgba(138,100,24,0.18)",
    };
  }

  if (normalized === "abandoned") {
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

async function readJsonResponse<T>(response: Response, fallbackMessage: string) {
  const contentType = response.headers.get("content-type") || "";
  const rawText = await response.text();

  if (!contentType.includes("application/json")) {
    const preview = rawText.slice(0, 180).replace(/\s+/g, " ").trim();
    throw new Error(
      `${fallbackMessage} API returned non-JSON response. Status: ${response.status}. Preview: ${preview}`
    );
  }

  try {
    return JSON.parse(rawText) as T;
  } catch {
    throw new Error(`${fallbackMessage} Invalid JSON response.`);
  }
}

export default function AdminCheckoutAnalyticsPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [statusBreakdown, setStatusBreakdown] = useState<BreakdownItem[]>([]);
  const [stageBreakdown, setStageBreakdown] = useState<BreakdownItem[]>([]);
  const [recentSessions, setRecentSessions] = useState<CheckoutSession[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadAnalytics() {
    try {
      setLoading(true);
      setErrorMessage("");

      const response = await fetch("/api/admin/checkout-analytics", {
        cache: "no-store",
      });

      const data = await readJsonResponse<AnalyticsResponse>(
        response,
        "Failed to load checkout analytics."
      );

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to load checkout analytics.");
      }

      setSummary(data.summary || null);
      setStatusBreakdown(
        Array.isArray(data.statusBreakdown) ? data.statusBreakdown : []
      );
      setStageBreakdown(
        Array.isArray(data.stageBreakdown) ? data.stageBreakdown : []
      );
      setRecentSessions(
        Array.isArray(data.recentSessions) ? data.recentSessions : []
      );
    } catch (error) {
      setSummary(null);
      setStatusBreakdown([]);
      setStageBreakdown([]);
      setRecentSessions([]);
      setErrorMessage(
        error instanceof Error ? error.message : "Unknown analytics error."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAnalytics();
  }, []);

  const topDropOffStage = useMemo(() => {
    const filtered = stageBreakdown.filter((item) => {
      const stage = normalizeLower(item.stage);
      return stage !== "completed";
    });

    return [...filtered].sort((a, b) => b.count - a.count)[0] || null;
  }, [stageBreakdown]);

  if (loading) {
    return <div style={loadingCardStyle}>Loading checkout analytics...</div>;
  }

  return (
    <div style={pageStyle}>
      <div style={pageHeaderStyle}>
        <div>
          <h1 style={titleStyle}>Checkout Analytics</h1>
          <p style={subtitleStyle}>
            Monitor B2B checkout performance, abandoned revenue, recovery rate,
            and where customers leave the buying journey.
          </p>
        </div>

        <button type="button" onClick={loadAnalytics} style={secondaryButtonStyle}>
          Refresh
        </button>
      </div>

      {errorMessage ? <div style={errorBoxStyle}>{errorMessage}</div> : null}

      <section style={metricsGridStyle}>
        <MetricCard
          label="Total Sessions"
          value={String(summary?.totalSessions || 0)}
          note="All tracked checkout sessions"
        />

        <MetricCard
          label="Potential Revenue"
          value={formatMoney(summary?.totalValue || 0)}
          note="Total value across sessions"
        />

        <MetricCard
          label="Abandoned Revenue"
          value={formatMoney(summary?.abandonedValue || 0)}
          note="Potential lost B2B revenue"
          warning
        />

        <MetricCard
          label="Recovered Revenue"
          value={formatMoney(summary?.recoveredValue || 0)}
          note="Revenue recovered from abandoned sessions"
          positive
        />

        <MetricCard
          label="Abandonment Rate"
          value={formatPercent(summary?.abandonmentRate || 0)}
          note="Abandoned sessions / total sessions"
          warning
        />

        <MetricCard
          label="Recovery Rate"
          value={formatPercent(summary?.recoveryRate || 0)}
          note="Recovered / abandoned + recovered"
          positive
        />

        <MetricCard
          label="Conversion Rate"
          value={formatPercent(summary?.conversionRate || 0)}
          note="Completed or recovered sessions"
          positive
        />

        <MetricCard
          label="Average Checkout"
          value={formatMoney(summary?.averageCheckoutValue || 0)}
          note="Average session value"
        />
      </section>

      <section style={insightGridStyle}>
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div>
              <div style={eyebrowStyle}>Journey</div>
              <h2 style={panelTitleStyle}>Stage Breakdown</h2>
            </div>
          </div>

          {stageBreakdown.length === 0 ? (
            <div style={emptyStateStyle}>No stage data available.</div>
          ) : (
            <div style={breakdownListStyle}>
              {stageBreakdown.map((item) => (
                <BreakdownRow
                  key={item.stage}
                  label={item.stage || "-"}
                  count={item.count}
                  rate={item.rate}
                />
              ))}
            </div>
          )}
        </div>

        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div>
              <div style={eyebrowStyle}>Status</div>
              <h2 style={panelTitleStyle}>Status Breakdown</h2>
            </div>
          </div>

          {statusBreakdown.length === 0 ? (
            <div style={emptyStateStyle}>No status data available.</div>
          ) : (
            <div style={breakdownListStyle}>
              {statusBreakdown.map((item) => (
                <BreakdownRow
                  key={item.status}
                  label={item.status || "-"}
                  count={item.count}
                  rate={item.rate}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <section style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div>
            <div style={eyebrowStyle}>Priority Insight</div>
            <h2 style={panelTitleStyle}>Highest Drop-Off Point</h2>
          </div>
        </div>

        {topDropOffStage ? (
          <div style={dropOffBoxStyle}>
            <div>
              <div style={dropOffLabelStyle}>Stage</div>
              <div style={dropOffValueStyle}>{topDropOffStage.stage}</div>
            </div>

            <div>
              <div style={dropOffLabelStyle}>Sessions</div>
              <div style={dropOffValueStyle}>{topDropOffStage.count}</div>
            </div>

            <div>
              <div style={dropOffLabelStyle}>Share</div>
              <div style={dropOffValueStyle}>
                {formatPercent(topDropOffStage.rate)}
              </div>
            </div>
          </div>
        ) : (
          <div style={emptyStateStyle}>No drop-off data available yet.</div>
        )}
      </section>

      <section style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div>
            <div style={eyebrowStyle}>Recent</div>
            <h2 style={panelTitleStyle}>Recent Checkout Sessions</h2>
          </div>
        </div>

        <div style={tableWrapStyle}>
          <div style={tableHeaderStyle}>
            <div>Customer</div>
            <div>Status</div>
            <div>Stage</div>
            <div>Items</div>
            <div>Subtotal</div>
            <div>Last Activity</div>
          </div>

          {recentSessions.length === 0 ? (
            <div style={emptyStateStyle}>No checkout sessions found.</div>
          ) : (
            recentSessions.map((session) => (
              <div key={session.id} style={tableRowStyle}>
                <div>
                  <div style={cellStrongStyle}>
                    {session.company || session.email || "Unknown customer"}
                  </div>
                  <div style={subTextStyle}>
                    {session.email || "No email"} •{" "}
                    {session.customer_id || "Guest"}
                  </div>
                </div>

                <div>
                  <span
                    style={{
                      ...statusPillStyle,
                      ...getStatusStyle(session.status),
                    }}
                  >
                    {session.status || "active"}
                  </span>
                </div>

                <div>{session.stage || "cart"}</div>

                <div>{session.item_count || "0"}</div>

                <div style={cellStrongStyle}>
                  {formatMoney(session.subtotal, session.currency)}
                </div>

                <div>
                  <div style={cellStrongStyle}>
                    {getMinutesAgo(session.last_activity_at)}
                  </div>
                  <div style={subTextStyle}>
                    {formatDate(session.last_activity_at)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  note,
  warning = false,
  positive = false,
}: {
  label: string;
  value: string;
  note: string;
  warning?: boolean;
  positive?: boolean;
}) {
  return (
    <div
      style={{
        ...metricCardStyle,
        ...(warning ? metricCardWarningStyle : {}),
        ...(positive ? metricCardPositiveStyle : {}),
      }}
    >
      <div style={metricLabelStyle}>{label}</div>
      <div style={metricValueStyle}>{value}</div>
      <div style={metricNoteStyle}>{note}</div>
    </div>
  );
}

function BreakdownRow({
  label,
  count,
  rate,
}: {
  label: string;
  count: number;
  rate: number;
}) {
  return (
    <div style={breakdownRowStyle}>
      <div>
        <div style={breakdownLabelStyle}>{label}</div>
        <div style={breakdownSubTextStyle}>{count} session(s)</div>
      </div>

      <div style={breakdownRateStyle}>{formatPercent(rate)}</div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  display: "grid",
  gap: 14,
};

const pageHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  flexWrap: "wrap",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 30,
  lineHeight: 1.1,
  fontWeight: 800,
  color: "#171717",
};

const subtitleStyle: React.CSSProperties = {
  margin: "6px 0 0",
  color: "#6f6559",
  fontSize: 13,
  lineHeight: 1.5,
  maxWidth: 780,
};

const secondaryButtonStyle: React.CSSProperties = {
  minHeight: 38,
  borderRadius: 10,
  border: "1px solid #d8cebf",
  background: "#fff",
  color: "#171717",
  padding: "0 14px",
  fontSize: 13,
  fontWeight: 900,
  cursor: "pointer",
};

const metricsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 12,
};

const metricCardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e2d8cb",
  borderRadius: 14,
  padding: 14,
  display: "grid",
  gap: 5,
};

const metricCardWarningStyle: React.CSSProperties = {
  background: "#fffaf2",
  border: "1px solid #ecd8ad",
};

const metricCardPositiveStyle: React.CSSProperties = {
  background: "#f4fbf6",
  border: "1px solid #cfe7d8",
};

const metricLabelStyle: React.CSSProperties = {
  color: "#756b60",
  fontSize: 12,
  fontWeight: 900,
};

const metricValueStyle: React.CSSProperties = {
  color: "#171717",
  fontSize: 24,
  lineHeight: 1.1,
  fontWeight: 900,
};

const metricNoteStyle: React.CSSProperties = {
  color: "#756b60",
  fontSize: 12,
  lineHeight: 1.4,
};

const insightGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
};

const panelStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e2d8cb",
  borderRadius: 14,
  padding: 14,
};

const panelHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 12,
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "#8a7f72",
  fontWeight: 900,
  marginBottom: 4,
};

const panelTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#171717",
  fontSize: 18,
  fontWeight: 900,
};

const breakdownListStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
};

const breakdownRowStyle: React.CSSProperties = {
  minHeight: 46,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  border: "1px solid #eee5d9",
  borderRadius: 10,
  background: "#fcfbf8",
  padding: "8px 10px",
};

const breakdownLabelStyle: React.CSSProperties = {
  color: "#171717",
  fontWeight: 900,
  fontSize: 13,
};

const breakdownSubTextStyle: React.CSSProperties = {
  color: "#756b60",
  fontWeight: 700,
  fontSize: 12,
  marginTop: 2,
};

const breakdownRateStyle: React.CSSProperties = {
  color: "#171717",
  fontWeight: 900,
  fontSize: 13,
};

const dropOffBoxStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 10,
  border: "1px solid #ecd8ad",
  background: "#fffaf2",
  borderRadius: 12,
  padding: 14,
};

const dropOffLabelStyle: React.CSSProperties = {
  color: "#8a6418",
  fontSize: 12,
  fontWeight: 900,
  marginBottom: 5,
};

const dropOffValueStyle: React.CSSProperties = {
  color: "#171717",
  fontSize: 20,
  fontWeight: 900,
};

const tableWrapStyle: React.CSSProperties = {
  border: "1px solid #e2d8cb",
  borderRadius: 12,
  overflow: "hidden",
};

const tableHeaderStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.7fr 0.8fr 0.8fr 0.4fr 0.8fr 1fr",
  gap: 10,
  minHeight: 38,
  alignItems: "center",
  padding: "0 10px",
  background: "#f8f5ef",
  borderBottom: "1px solid #e2d8cb",
  color: "#6f6559",
  fontSize: 12,
  fontWeight: 800,
};

const tableRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.7fr 0.8fr 0.8fr 0.4fr 0.8fr 1fr",
  gap: 10,
  minHeight: 52,
  alignItems: "center",
  padding: "8px 10px",
  borderBottom: "1px solid #f0e7da",
  fontSize: 13,
};

const cellStrongStyle: React.CSSProperties = {
  color: "#171717",
  fontWeight: 800,
};

const subTextStyle: React.CSSProperties = {
  marginTop: 3,
  color: "#756b60",
  fontSize: 12,
  lineHeight: 1.35,
};

const statusPillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 24,
  padding: "0 8px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const emptyStateStyle: React.CSSProperties = {
  padding: 16,
  color: "#756b60",
  fontWeight: 700,
};

const loadingCardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e2d8cb",
  borderRadius: 14,
  padding: 16,
  color: "#756b60",
  fontWeight: 800,
};

const errorBoxStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 12,
  background: "#fff1f1",
  border: "1px solid #f0c9c9",
  color: "#8d2f2f",
  fontWeight: 700,
};