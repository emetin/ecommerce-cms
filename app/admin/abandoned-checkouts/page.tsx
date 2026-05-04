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

type CheckoutSessionItem = {
  id: string;
  checkout_session_id: string;
  product_slug: string;
  variant_id: string;
  sku: string;
  product_title: string;
  variant_title: string;
  image: string;
  quantity: string;
  unit_price: string;
  line_total: string;
  created_at: string;
  updated_at: string;
};

type ListResponse = {
  ok: boolean;
  error?: string;
  items?: CheckoutSession[];
};

type DetailResponse = {
  ok: boolean;
  error?: string;
  session?: CheckoutSession;
  items?: CheckoutSessionItem[];
};

type StatusResponse = {
  ok: boolean;
  error?: string;
  message?: string;
  session?: CheckoutSession;
  items?: CheckoutSessionItem[];
};

type DetectResponse = {
  ok: boolean;
  error?: string;
  message?: string;
  updatedCount?: number;
  items?: CheckoutSession[];
};

const STATUS_OPTIONS = [
  "active",
  "abandoned",
  "followed_up",
  "recovered",
  "dismissed",
];

const STAGE_OPTIONS = [
  "cart",
  "checkout_started",
  "contact_info",
  "shipping",
  "payment",
  "completed",
];

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
    currency: currency || "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
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

function getStageStyle(stage: string): React.CSSProperties {
  const normalized = normalizeLower(stage);

  if (normalized === "completed") {
    return {
      background: "#eef8f0",
      color: "#2f7d62",
      border: "1px solid rgba(47,125,98,0.18)",
    };
  }

  if (normalized === "payment") {
    return {
      background: "#fff7e8",
      color: "#8a6418",
      border: "1px solid rgba(138,100,24,0.18)",
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

export default function AdminAbandonedCheckoutsPage() {
  const [sessions, setSessions] = useState<CheckoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [detecting, setDetecting] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");

  const [statusMap, setStatusMap] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState("");
  const [detailsMap, setDetailsMap] = useState<
    Record<string, CheckoutSessionItem[]>
  >({});
  const [detailLoadingId, setDetailLoadingId] = useState("");

  async function loadSessions() {
    try {
      setLoading(true);
      setErrorMessage("");

      const params = new URLSearchParams();

      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }

      if (stageFilter !== "all") {
        params.set("stage", stageFilter);
      }

      if (searchInput.trim()) {
        params.set("q", searchInput.trim());
      }

      const query = params.toString();
      const url = query
        ? `/api/admin/abandoned-checkouts/list?${query}`
        : "/api/admin/abandoned-checkouts/list";

      const response = await fetch(url, {
        cache: "no-store",
      });

      const data = await readJsonResponse<ListResponse>(
        response,
        "Failed to load abandoned checkouts."
      );

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to load abandoned checkouts.");
      }

      const nextItems = Array.isArray(data.items) ? data.items : [];
      setSessions(nextItems);

      const nextStatusMap: Record<string, string> = {};
      nextItems.forEach((item) => {
        nextStatusMap[item.id] = item.status || "active";
      });
      setStatusMap(nextStatusMap);
    } catch (error) {
      setSessions([]);
      setErrorMessage(
        error instanceof Error ? error.message : "Unknown loading error."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredSessions = useMemo(() => {
    const query = normalizeLower(searchInput);

    return sessions.filter((session) => {
      const matchesStatus =
        statusFilter === "all"
          ? true
          : normalizeLower(session.status) === normalizeLower(statusFilter);

      const matchesStage =
        stageFilter === "all"
          ? true
          : normalizeLower(session.stage) === normalizeLower(stageFilter);

      const haystack = [
        session.id,
        session.cart_token,
        session.customer_id,
        session.email,
        session.company,
        session.status,
        session.stage,
        session.note,
        session.recovered_order_id,
      ]
        .map(normalizeLower)
        .join(" ");

      const matchesSearch = query ? haystack.includes(query) : true;

      return matchesStatus && matchesStage && matchesSearch;
    });
  }, [sessions, searchInput, statusFilter, stageFilter]);

  const stats = useMemo(() => {
    return {
      total: sessions.length,
      active: sessions.filter((item) => normalizeLower(item.status) === "active")
        .length,
      abandoned: sessions.filter(
        (item) => normalizeLower(item.status) === "abandoned"
      ).length,
      followedUp: sessions.filter(
        (item) => normalizeLower(item.status) === "followed_up"
      ).length,
      recovered: sessions.filter(
        (item) => normalizeLower(item.status) === "recovered"
      ).length,
      dismissed: sessions.filter(
        (item) => normalizeLower(item.status) === "dismissed"
      ).length,
    };
  }, [sessions]);

  async function handleDetectAbandoned() {
    try {
      setDetecting(true);
      setErrorMessage("");
      setSuccessMessage("");

      const response = await fetch("/api/admin/abandoned-checkouts/detect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          minutesSinceLastActivity: 60,
        }),
      });

      const data = await readJsonResponse<DetectResponse>(
        response,
        "Failed to detect abandoned checkouts."
      );

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to detect abandoned checkouts.");
      }

      setSuccessMessage(
        data.message ||
          `${data.updatedCount || 0} checkout session(s) marked as abandoned.`
      );

      await loadSessions();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unknown detect error."
      );
    } finally {
      setDetecting(false);
    }
  }

  async function handleUpdateStatus(sessionId: string) {
    try {
      setSavingId(sessionId);
      setErrorMessage("");
      setSuccessMessage("");

      const response = await fetch(
        `/api/admin/abandoned-checkouts/${encodeURIComponent(sessionId)}/status`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: statusMap[sessionId] || "active",
          }),
        }
      );

      const data = await readJsonResponse<StatusResponse>(
        response,
        "Failed to update checkout status."
      );

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to update checkout status.");
      }

      setSuccessMessage("Checkout status updated successfully.");
      await loadSessions();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unknown status update error."
      );
    } finally {
      setSavingId("");
    }
  }

  async function loadSessionDetails(sessionId: string) {
    try {
      setDetailLoadingId(sessionId);
      setErrorMessage("");

      const response = await fetch(
        `/api/admin/abandoned-checkouts/${encodeURIComponent(sessionId)}`,
        {
          cache: "no-store",
        }
      );

      const data = await readJsonResponse<DetailResponse>(
        response,
        "Failed to load checkout details."
      );

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to load checkout details.");
      }

      setDetailsMap((previous) => ({
        ...previous,
        [sessionId]: Array.isArray(data.items) ? data.items : [],
      }));
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unknown details error."
      );
    } finally {
      setDetailLoadingId("");
    }
  }

  async function handleToggleDetails(sessionId: string) {
    if (expandedId === sessionId) {
      setExpandedId("");
      return;
    }

    setExpandedId(sessionId);

    if (!detailsMap[sessionId]) {
      await loadSessionDetails(sessionId);
    }
  }

  return (
    <div style={pageStyle}>
      <div style={pageHeaderStyle}>
        <div>
          <h1 style={titleStyle}>Abandoned Checkouts</h1>
          <p style={subtitleStyle}>
            Track checkout sessions, identify abandoned carts, and follow up
            before high-value B2B opportunities are lost.
          </p>
        </div>

        <div style={headerActionsStyle}>
          <button
            type="button"
            onClick={handleDetectAbandoned}
            disabled={detecting}
            style={primaryButtonStyle}
          >
            {detecting ? "Detecting..." : "Detect Abandoned"}
          </button>
        </div>
      </div>

      <section style={toolbarStyle}>
        <div style={statsBarStyle}>
          <Metric label="Total" value={stats.total} />
          <Metric label="Active" value={stats.active} />
          <Metric label="Abandoned" value={stats.abandoned} warning />
          <Metric label="Followed Up" value={stats.followedUp} />
          <Metric label="Recovered" value={stats.recovered} />
          <Metric label="Dismissed" value={stats.dismissed} />
        </div>

        <div style={filterGridStyle}>
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                loadSessions();
              }
            }}
            placeholder="Search email, company, cart token, customer ID..."
            style={inputStyle}
          />

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            style={selectStyle}
          >
            <option value="all">All statuses</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <select
            value={stageFilter}
            onChange={(event) => setStageFilter(event.target.value)}
            style={selectStyle}
          >
            <option value="all">All stages</option>
            {STAGE_OPTIONS.map((stage) => (
              <option key={stage} value={stage}>
                {stage}
              </option>
            ))}
          </select>

          <button type="button" onClick={loadSessions} style={secondaryButtonStyle}>
            Apply
          </button>
        </div>
      </section>

      {successMessage ? (
        <div style={successBoxStyle}>{successMessage}</div>
      ) : null}

      {errorMessage ? <div style={errorBoxStyle}>{errorMessage}</div> : null}

      <section style={tableWrapStyle}>
        <div style={tableHeaderStyle}>
          <div>Customer</div>
          <div>Stage</div>
          <div>Status</div>
          <div>Items</div>
          <div>Subtotal</div>
          <div>Last Activity</div>
          <div>Recovered Order</div>
          <div style={{ textAlign: "right" }}>Actions</div>
        </div>

        {loading ? (
          <div style={emptyStateStyle}>Loading checkout sessions...</div>
        ) : filteredSessions.length === 0 ? (
          <div style={emptyStateStyle}>
            No checkout sessions matched your filters.
          </div>
        ) : (
          filteredSessions.map((session) => {
            const isExpanded = expandedId === session.id;
            const details = detailsMap[session.id] || [];

            return (
              <div key={session.id}>
                <div style={tableRowStyle}>
                  <div>
                    <div style={cellStrongStyle}>
                      {session.company || session.email || "Unknown customer"}
                    </div>
                    <div style={subTextStyle}>
                      {session.email || "No email"} •{" "}
                      {session.customer_id || "Guest"}
                    </div>
                    <div style={tokenTextStyle}>
                      Cart: {session.cart_token || "-"}
                    </div>
                  </div>

                  <div>
                    <span
                      style={{
                        ...stagePillStyle,
                        ...getStageStyle(session.stage),
                      }}
                    >
                      {session.stage || "cart"}
                    </span>
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

                  <div style={cellStrongStyle}>{session.item_count || "0"}</div>

                  <div>
                    <div style={cellStrongStyle}>
                      {formatMoney(session.subtotal, session.currency)}
                    </div>
                    <div style={subTextStyle}>{session.currency || "USD"}</div>
                  </div>

                  <div>
                    <div style={cellStrongStyle}>
                      {getMinutesAgo(session.last_activity_at)}
                    </div>
                    <div style={subTextStyle}>
                      {formatDate(session.last_activity_at)}
                    </div>
                  </div>

                  <div>{session.recovered_order_id || "-"}</div>

                  <div style={rowActionsStyle}>
                    <select
                      value={statusMap[session.id] || session.status || "active"}
                      onChange={(event) =>
                        setStatusMap((previous) => ({
                          ...previous,
                          [session.id]: event.target.value,
                        }))
                      }
                      style={rowSelectStyle}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(session.id)}
                      disabled={savingId === session.id}
                      style={compactPrimaryButtonStyle}
                    >
                      {savingId === session.id ? "Saving" : "Save"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleDetails(session.id)}
                      style={compactButtonStyle}
                    >
                      {isExpanded ? "Hide" : "Items"}
                    </button>
                  </div>
                </div>

                {isExpanded ? (
                  <div style={expandedRowStyle}>
                    {detailLoadingId === session.id ? (
                      <div style={lineEmptyStyle}>
                        Loading checkout items...
                      </div>
                    ) : details.length === 0 ? (
                      <div style={lineEmptyStyle}>
                        No checkout items found for this session.
                      </div>
                    ) : (
                      <div style={lineTableStyle}>
                        <div style={lineHeaderStyle}>
                          <div>Product</div>
                          <div>Variant</div>
                          <div>SKU</div>
                          <div>Qty</div>
                          <div>Unit</div>
                          <div>Total</div>
                        </div>

                        {details.map((item) => (
                          <div key={item.id} style={lineRowStyle}>
                            <div>
                              <div style={cellStrongStyle}>
                                {item.product_title || "-"}
                              </div>
                              <div style={subTextStyle}>
                                {item.product_slug || "-"}
                              </div>
                            </div>

                            <div>{item.variant_title || "-"}</div>
                            <div>{item.sku || "-"}</div>
                            <div>{item.quantity || "0"}</div>
                            <div>
                              {formatMoney(item.unit_price, session.currency)}
                            </div>
                            <div style={cellStrongStyle}>
                              {formatMoney(item.line_total, session.currency)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {session.note ? (
                      <div style={noteBoxStyle}>Note: {session.note}</div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: number;
  warning?: boolean;
}) {
  return (
    <div style={warning ? metricWarningStyle : metricStyle}>
      <span>{label}</span>
      <strong>{value}</strong>
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
  maxWidth: 760,
};

const headerActionsStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
};

const toolbarStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e2d8cb",
  borderRadius: 14,
  padding: 12,
  display: "grid",
  gap: 10,
};

const statsBarStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const metricStyle: React.CSSProperties = {
  minHeight: 34,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "0 10px",
  borderRadius: 999,
  border: "1px solid #e2d8cb",
  background: "#faf8f4",
  color: "#5f554b",
  fontSize: 12,
  fontWeight: 700,
};

const metricWarningStyle: React.CSSProperties = {
  ...metricStyle,
  background: "#fff7e8",
  border: "1px solid #ecd8ad",
  color: "#8a6418",
};

const filterGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 180px 180px auto",
  gap: 10,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 38,
  border: "1px solid #d8cebf",
  borderRadius: 10,
  background: "#fcfbf8",
  padding: "0 12px",
  outline: "none",
  fontSize: 13,
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 38,
  border: "1px solid #d8cebf",
  borderRadius: 10,
  background: "#fcfbf8",
  padding: "0 10px",
  outline: "none",
  fontSize: 13,
};

const primaryButtonStyle: React.CSSProperties = {
  minHeight: 38,
  borderRadius: 10,
  border: "1px solid #2f7d62",
  background: "#2f7d62",
  color: "#fff",
  padding: "0 14px",
  fontSize: 13,
  fontWeight: 900,
  cursor: "pointer",
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

const tableWrapStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e2d8cb",
  borderRadius: 14,
  overflow: "hidden",
};

const tableHeaderStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.55fr 0.8fr 0.8fr 0.45fr 0.7fr 1fr 1fr 1.55fr",
  gap: 10,
  alignItems: "center",
  minHeight: 40,
  padding: "0 12px",
  background: "#f8f5ef",
  borderBottom: "1px solid #e2d8cb",
  color: "#6f6559",
  fontSize: 12,
  fontWeight: 800,
};

const tableRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.55fr 0.8fr 0.8fr 0.45fr 0.7fr 1fr 1fr 1.55fr",
  gap: 10,
  alignItems: "center",
  minHeight: 58,
  padding: "8px 12px",
  borderBottom: "1px solid #f0e7da",
  fontSize: 13,
  color: "#171717",
};

const cellStrongStyle: React.CSSProperties = {
  fontWeight: 800,
  color: "#171717",
};

const subTextStyle: React.CSSProperties = {
  marginTop: 3,
  color: "#756b60",
  fontSize: 12,
  lineHeight: 1.35,
};

const tokenTextStyle: React.CSSProperties = {
  marginTop: 3,
  color: "#9a8f82",
  fontSize: 11,
  lineHeight: 1.35,
  maxWidth: 260,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
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

const stagePillStyle: React.CSSProperties = {
  ...statusPillStyle,
};

const rowActionsStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  gap: 6,
};

const rowSelectStyle: React.CSSProperties = {
  width: 116,
  minHeight: 32,
  border: "1px solid #d8cebf",
  borderRadius: 8,
  background: "#fcfbf8",
  padding: "0 8px",
  outline: "none",
  fontSize: 12,
};

const compactButtonStyle: React.CSSProperties = {
  minHeight: 32,
  borderRadius: 8,
  border: "1px solid #d8cebf",
  background: "#fff",
  color: "#171717",
  padding: "0 10px",
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
};

const compactPrimaryButtonStyle: React.CSSProperties = {
  ...compactButtonStyle,
  background: "#2f7d62",
  border: "1px solid #2f7d62",
  color: "#fff",
};

const expandedRowStyle: React.CSSProperties = {
  background: "#fcfbf8",
  borderBottom: "1px solid #f0e7da",
  padding: "10px 12px 12px",
};

const lineTableStyle: React.CSSProperties = {
  border: "1px solid #e2d8cb",
  borderRadius: 12,
  overflow: "hidden",
  background: "#fff",
};

const lineHeaderStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.7fr 1fr 0.8fr 0.4fr 0.6fr 0.7fr",
  gap: 10,
  minHeight: 34,
  alignItems: "center",
  padding: "0 10px",
  background: "#f8f5ef",
  borderBottom: "1px solid #e2d8cb",
  fontSize: 12,
  fontWeight: 800,
  color: "#6f6559",
};

const lineRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.7fr 1fr 0.8fr 0.4fr 0.6fr 0.7fr",
  gap: 10,
  minHeight: 44,
  alignItems: "center",
  padding: "8px 10px",
  borderBottom: "1px solid #f0e7da",
  fontSize: 12,
};

const noteBoxStyle: React.CSSProperties = {
  marginTop: 10,
  border: "1px solid #e2d8cb",
  borderRadius: 10,
  background: "#fff",
  padding: 10,
  color: "#5f554b",
  fontSize: 12,
  lineHeight: 1.5,
};

const emptyStateStyle: React.CSSProperties = {
  padding: 18,
  color: "#756b60",
  fontWeight: 700,
};

const lineEmptyStyle: React.CSSProperties = {
  padding: 12,
  color: "#756b60",
  fontWeight: 700,
  fontSize: 13,
};

const successBoxStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 12,
  background: "#eef8f0",
  border: "1px solid #cfe7d8",
  color: "#1d6a43",
  fontWeight: 700,
};

const errorBoxStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 12,
  background: "#fff1f1",
  border: "1px solid #f0c9c9",
  color: "#8d2f2f",
  fontWeight: 700,
};