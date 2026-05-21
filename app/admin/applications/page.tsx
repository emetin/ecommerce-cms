"use client";

import { useEffect, useMemo, useState } from "react";

type ApplicationItem = {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  country: string;
  business_type: string;
  tax_id: string;
  website: string;
  notes: string;
  status: string;
  created_at: string;
  approved_at: string;
  reviewed_by: string;
};

type ApplicationsResponse = {
  ok?: boolean;
  total?: number;
  items?: ApplicationItem[];
  summary?: {
    pending: number;
    approved: number;
    rejected: number;
  };
  error?: string;
};

function formatDate(value: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function getStatusBadgeStyle(status: string): React.CSSProperties {
  const normalized = status.toLowerCase();

  if (normalized === "approved") {
    return {
      ...badgeStyle,
      background: "#edf8f1",
      borderColor: "#cfe7d8",
      color: "#1d6a43",
    };
  }

  if (normalized === "rejected") {
    return {
      ...badgeStyle,
      background: "#fff1f1",
      borderColor: "#f0c9c9",
      color: "#8d2f2f",
    };
  }

  return {
    ...badgeStyle,
    background: "#fff9e8",
    borderColor: "#ead9a4",
    color: "#8a6420",
  };
}

export default function AdminApplicationsPage() {
  const [items, setItems] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadApplications() {
    try {
      setLoading(true);
      setErrorMessage("");

      const url = new URL(
        "/api/customer-applications/list",
        window.location.origin
      );

      if (status !== "all") {
        url.searchParams.set("status", status);
      }

      if (search.trim()) {
        url.searchParams.set("q", search.trim());
      }

      url.searchParams.set("t", String(Date.now()));

      const response = await fetch(url.toString(), {
        cache: "no-store",
      });

      const data = (await response.json()) as ApplicationsResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to load applications.");
      }

      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "An unknown error occurred."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return items;

    return items.filter((item) =>
      [
        item.company_name,
        item.contact_name,
        item.email,
        item.phone,
        item.country,
        item.business_type,
        item.tax_id,
        item.website,
        item.notes,
        item.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [items, search]);

  const summary = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        if (item.status === "pending") acc.pending += 1;
        if (item.status === "approved") acc.approved += 1;
        if (item.status === "rejected") acc.rejected += 1;

        return acc;
      },
      {
        pending: 0,
        approved: 0,
        rejected: 0,
      }
    );
  }, [items]);

  async function updateStatus(application: ApplicationItem, nextStatus: string) {
    const actionLabel =
      nextStatus === "approved"
        ? "approve"
        : nextStatus === "rejected"
          ? "reject"
          : "update";

    const confirmed = window.confirm(
      `Are you sure you want to ${actionLabel} this application?`
    );

    if (!confirmed) return;

    try {
      setUpdatingId(application.id);
      setErrorMessage("");
      setSuccessMessage("");

      const response = await fetch("/api/customer-applications/update-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: application.id,
          status: nextStatus,
          create_customer: nextStatus === "approved" ? "true" : "false",
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to update application status.");
      }

      setSuccessMessage(
        nextStatus === "approved"
          ? data.customer_created
            ? "Application approved and customer account created."
            : "Application approved."
          : "Application status updated."
      );

      await loadApplications();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Status update failed."
      );
    } finally {
      setUpdatingId("");
    }
  }

  return (
    <div style={pageWrapStyle}>
      <div style={pageHeaderStyle}>
        <div>
          <h1 style={titleStyle}>Customer Applications</h1>
          <p style={subtitleStyle}>
            Review B2B account requests and approve qualified customers.
          </p>
        </div>

        <button type="button" onClick={loadApplications} style={secondaryButtonStyle}>
          Refresh
        </button>
      </div>

      <div style={summaryGridStyle}>
        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Total Applications</span>
          <strong style={summaryValueStyle}>{items.length}</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Pending</span>
          <strong style={summaryValueStyle}>{summary.pending}</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Approved</span>
          <strong style={summaryValueStyle}>{summary.approved}</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Rejected</span>
          <strong style={summaryValueStyle}>{summary.rejected}</strong>
        </div>
      </div>

      <div style={filterCardStyle}>
        <div>
          <label style={labelStyle}>Search</label>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                loadApplications();
              }
            }}
            placeholder="Search company, contact, email, country..."
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Status</label>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            style={inputStyle}
          >
            <option value="all">all</option>
            <option value="pending">pending</option>
            <option value="approved">approved</option>
            <option value="rejected">rejected</option>
          </select>
        </div>

        <button type="button" onClick={loadApplications} style={primaryButtonStyle}>
          Apply
        </button>
      </div>

      {errorMessage ? <div style={errorBoxStyle}>{errorMessage}</div> : null}
      {successMessage ? <div style={successBoxStyle}>{successMessage}</div> : null}

      <div style={tableCardStyle}>
        {loading ? (
          <div style={emptyStateStyle}>Loading applications...</div>
        ) : filteredItems.length === 0 ? (
          <div style={emptyStateStyle}>No applications found.</div>
        ) : (
          <div style={tableScrollStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Company</th>
                  <th style={thStyle}>Contact</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Country</th>
                  <th style={thStyle}>Business Type</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id} style={trStyle}>
                    <td style={tdStyle}>
                      <div style={strongTextStyle}>{item.company_name || "-"}</div>
                      {item.website ? (
                        <a
                          href={item.website}
                          target="_blank"
                          rel="noreferrer"
                          style={smallLinkStyle}
                        >
                          Website
                        </a>
                      ) : null}
                    </td>

                    <td style={tdStyle}>
                      <div>{item.contact_name || "-"}</div>
                      <div style={mutedTextStyle}>{item.phone || "-"}</div>
                    </td>

                    <td style={tdStyle}>{item.email || "-"}</td>
                    <td style={tdStyle}>{item.country || "-"}</td>
                    <td style={tdStyle}>{item.business_type || "-"}</td>

                    <td style={tdStyle}>
                      <span style={getStatusBadgeStyle(item.status)}>
                        {item.status || "pending"}
                      </span>
                    </td>

                    <td style={tdStyle}>{formatDate(item.created_at)}</td>

                    <td style={tdStyle}>
                      <div style={actionsStyle}>
                        {item.status !== "approved" ? (
                          <button
                            type="button"
                            onClick={() => updateStatus(item, "approved")}
                            disabled={updatingId === item.id}
                            style={approveButtonStyle}
                          >
                            {updatingId === item.id ? "Updating..." : "Approve"}
                          </button>
                        ) : null}

                        {item.status !== "rejected" ? (
                          <button
                            type="button"
                            onClick={() => updateStatus(item, "rejected")}
                            disabled={updatingId === item.id}
                            style={rejectButtonStyle}
                          >
                            Reject
                          </button>
                        ) : null}
                      </div>

                      {item.notes ? (
                        <details style={detailsStyle}>
                          <summary>Notes</summary>
                          <p style={notesStyle}>{item.notes}</p>
                        </details>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={footerNoteStyle}>
        Showing {filteredItems.length} of {items.length} application(s).
      </div>
    </div>
  );
}

const pageWrapStyle: React.CSSProperties = {
  display: "grid",
  gap: 22,
};

const pageHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 20,
  flexWrap: "wrap",
};

const titleStyle: React.CSSProperties = {
  fontSize: 42,
  lineHeight: 1.1,
  margin: 0,
  fontWeight: 800,
};

const subtitleStyle: React.CSSProperties = {
  marginTop: 10,
  marginBottom: 0,
  color: "#6f6559",
  fontSize: 16,
};

const summaryGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 14,
};

const summaryCardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #ddd3c5",
  borderRadius: 18,
  padding: 18,
  display: "grid",
  gap: 8,
};

const summaryLabelStyle: React.CSSProperties = {
  color: "#6f6559",
  fontSize: 13,
  fontWeight: 800,
};

const summaryValueStyle: React.CSSProperties = {
  fontSize: 30,
  lineHeight: 1,
};

const filterCardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #ddd3c5",
  borderRadius: 22,
  padding: 22,
  display: "grid",
  gridTemplateColumns: "1fr 260px auto",
  gap: 16,
  alignItems: "end",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 8,
  fontWeight: 800,
  fontSize: 14,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 50,
  padding: "13px 15px",
  borderRadius: 14,
  border: "1px solid #d9cfbf",
  background: "#fcfbf8",
  outline: "none",
  fontSize: 14,
};

const primaryButtonStyle: React.CSSProperties = {
  minHeight: 50,
  padding: "0 22px",
  borderRadius: 14,
  border: "1px solid #2f7d62",
  background: "#2f7d62",
  color: "#fff",
  fontWeight: 900,
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  minHeight: 46,
  padding: "0 18px",
  borderRadius: 13,
  border: "1px solid #d9cfbf",
  background: "#fff",
  color: "#171717",
  fontWeight: 800,
  cursor: "pointer",
};

const errorBoxStyle: React.CSSProperties = {
  padding: 14,
  borderRadius: 14,
  background: "#fff1f1",
  border: "1px solid #f0c9c9",
  color: "#8d2f2f",
  fontWeight: 700,
};

const successBoxStyle: React.CSSProperties = {
  padding: 14,
  borderRadius: 14,
  background: "#edf8f1",
  border: "1px solid #cfe7d8",
  color: "#1d6a43",
  fontWeight: 700,
};

const tableCardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #ddd3c5",
  borderRadius: 22,
  overflow: "hidden",
};

const tableScrollStyle: React.CSSProperties = {
  overflowX: "auto",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "13px 16px",
  fontSize: 13,
  color: "#6f6559",
  background: "#faf8f4",
  borderBottom: "1px solid #eee6da",
  fontWeight: 800,
};

const trStyle: React.CSSProperties = {
  borderBottom: "1px solid #eee6da",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 16px",
  verticalAlign: "top",
  fontSize: 14,
};

const strongTextStyle: React.CSSProperties = {
  fontWeight: 900,
  color: "#171717",
};

const mutedTextStyle: React.CSSProperties = {
  color: "#6f6559",
  marginTop: 4,
};

const smallLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  marginTop: 6,
  color: "#2f7d62",
  fontWeight: 800,
  fontSize: 12,
  textDecoration: "none",
};

const badgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 28,
  padding: "0 10px",
  borderRadius: 999,
  border: "1px solid transparent",
  fontWeight: 900,
  fontSize: 12,
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
};

const approveButtonStyle: React.CSSProperties = {
  minHeight: 34,
  padding: "0 11px",
  borderRadius: 10,
  border: "1px solid #2f7d62",
  background: "#2f7d62",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
  fontSize: 12,
};

const rejectButtonStyle: React.CSSProperties = {
  minHeight: 34,
  padding: "0 11px",
  borderRadius: 10,
  border: "1px solid #e5c9c9",
  background: "#fff5f5",
  color: "#8f2d2d",
  fontWeight: 800,
  cursor: "pointer",
  fontSize: 12,
};

const detailsStyle: React.CSSProperties = {
  marginTop: 10,
  color: "#6f6559",
  fontSize: 13,
};

const notesStyle: React.CSSProperties = {
  marginTop: 8,
  lineHeight: 1.5,
};

const emptyStateStyle: React.CSSProperties = {
  padding: 26,
  color: "#6f6559",
  fontWeight: 700,
};

const footerNoteStyle: React.CSSProperties = {
  color: "#6f6559",
  fontSize: 13,
  fontWeight: 700,
};