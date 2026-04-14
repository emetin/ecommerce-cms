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

type ApprovalResult = {
  companyName: string;
  email: string;
  temporaryPassword: string;
};

type ApprovalConfig = {
  priceTier: string;
  currency: string;
  shippingTerms: string;
  paymentTerms: string;
  taxExempt: string;
};

const INITIAL_APPROVAL_CONFIG: ApprovalConfig = {
  priceTier: "wholesale",
  currency: "USD",
  shippingTerms: "FOB",
  paymentTerms: "Net 30",
  taxExempt: "false",
};

const PRICE_TIER_OPTIONS = ["standard", "wholesale", "distributor", "vip"];
const STATUS_FILTER_OPTIONS = ["all", "pending", "approved"];
const CURRENCY_OPTIONS = ["USD", "EUR", "GBP"];
const TAX_EXEMPT_OPTIONS = ["false", "true"];

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

function normalizeStatusLabel(value?: string) {
  const raw = normalizeLower(value);
  if (!raw) return "Pending";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function getStatusStyle(value?: string): React.CSSProperties {
  const raw = normalizeLower(value);

  if (raw === "approved") {
    return {
      background: "#eef8f0",
      color: "#2f7d62",
      border: "1px solid rgba(47,125,98,0.18)",
    };
  }

  return {
    background: "#fff7e8",
    color: "#8a6418",
    border: "1px solid #ecd8ad",
  };
}

function generateEmailTemplate(
  contactName: string,
  email: string,
  password: string
) {
  return `Dear ${contactName || "Partner"},

We are pleased to inform you that your company has been successfully approved as a B2B partner of Globaltex Fine Linens.

You may now access your customer portal using the credentials below:

Portal Access: https://www.globaltexusa.com/portal-login
Email: ${email}
Temporary Password: ${password}

Through your account, you will be able to:
- access your assigned wholesale pricing structure
- review our hospitality collections
- create and submit order requests
- manage your account workflow more efficiently

For security reasons, we recommend updating your password after your first login.

If you require support for hospitality sourcing, custom developments, embroidery, or bulk project requirements, our team will be pleased to assist you.

Warm regards,
Globaltex Fine Linens
customerservice@globaltexusa.com
https://www.globaltexusa.com/`;
}

export default function AdminCustomerApplicationsPage() {
  const [items, setItems] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [approveLoadingId, setApproveLoadingId] = useState("");
  const [approvalResult, setApprovalResult] = useState<ApprovalResult | null>(null);
  const [generatedEmail, setGeneratedEmail] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedApplicationId, setExpandedApplicationId] = useState("");

  const [approvalConfigMap, setApprovalConfigMap] = useState<
    Record<string, ApprovalConfig>
  >({});

  async function loadApplications() {
    try {
      setLoading(true);
      setErrorMessage("");

      const response = await fetch("/api/admin/customer-applications/list", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Failed to load applications.");
      }

      const nextItems = Array.isArray(data.items) ? data.items : [];
      setItems(nextItems);

      const nextConfigMap: Record<string, ApprovalConfig> = {};
      nextItems.forEach((item: ApplicationItem) => {
        nextConfigMap[item.id] = approvalConfigMap[item.id] || {
          ...INITIAL_APPROVAL_CONFIG,
        };
      });
      setApprovalConfigMap(nextConfigMap);
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
  }, []);

  const filteredItems = useMemo(() => {
    const query = normalizeLower(searchInput);

    return items.filter((item) => {
      const matchesSearch =
        !query ||
        normalizeLower(item.company_name).includes(query) ||
        normalizeLower(item.contact_name).includes(query) ||
        normalizeLower(item.email).includes(query) ||
        normalizeLower(item.country).includes(query) ||
        normalizeLower(item.business_type).includes(query);

      const matchesStatus =
        statusFilter === "all"
          ? true
          : normalizeLower(item.status) === normalizeLower(statusFilter);

      return matchesSearch && matchesStatus;
    });
  }, [items, searchInput, statusFilter]);

  const stats = useMemo(() => {
    const pending = items.filter((item) => normalizeLower(item.status) === "pending").length;
    const approved = items.filter((item) => normalizeLower(item.status) === "approved").length;

    return {
      total: items.length,
      pending,
      approved,
      filtered: filteredItems.length,
    };
  }, [items, filteredItems.length]);

  function updateApprovalConfig(
    applicationId: string,
    field: keyof ApprovalConfig,
    value: string
  ) {
    setApprovalConfigMap((prev) => ({
      ...prev,
      [applicationId]: {
        ...(prev[applicationId] || INITIAL_APPROVAL_CONFIG),
        [field]: value,
      },
    }));
  }

  async function handleApprove(item: ApplicationItem) {
    try {
      setApproveLoadingId(item.id);
      setApprovalResult(null);
      setGeneratedEmail("");
      setSuccessMessage("");

      const approvalConfig =
        approvalConfigMap[item.id] || INITIAL_APPROVAL_CONFIG;

      const response = await fetch("/api/admin/customer-applications/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          applicationId: item.id,
          priceTier: approvalConfig.priceTier,
          currency: approvalConfig.currency,
          shippingTerms: approvalConfig.shippingTerms,
          paymentTerms: approvalConfig.paymentTerms,
          taxExempt: approvalConfig.taxExempt,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Approval failed.");
      }

      const nextEmail = data?.customer?.email || item.email;
      const nextPassword = data?.temporaryPassword || "";

      setApprovalResult({
        companyName: data?.customer?.companyName || item.company_name,
        email: nextEmail,
        temporaryPassword: nextPassword,
      });

      setGeneratedEmail(
        generateEmailTemplate(item.contact_name, nextEmail, nextPassword)
      );

      setSuccessMessage("Application approved and customer account created.");
      await loadApplications();
    } catch (error) {
      alert(error instanceof Error ? error.message : "An unknown error occurred.");
    } finally {
      setApproveLoadingId("");
    }
  }

  async function handleCopyEmail() {
    try {
      await navigator.clipboard.writeText(generatedEmail);
      alert("Email copied successfully.");
    } catch {
      alert("Failed to copy email.");
    }
  }

  async function handleCopyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      alert("Copied successfully.");
    } catch {
      alert("Failed to copy.");
    }
  }

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div style={pageHeaderStyle}>
        <div>
          <h1 style={titleStyle}>Customer Applications</h1>
          <p style={subtitleStyle}>
            Review incoming B2B applications, inspect company information, and
            approve qualified companies into active Globaltex Fine Linens portal
            customers with defined commercial terms.
          </p>
        </div>

        <div style={headerActionsStyle}>
          <a
            href="/api/admin/customer-applications/export?format=csv"
            style={secondaryButtonStyle}
          >
            Export CSV
          </a>
          <a
            href="/api/admin/customer-applications/export?format=json"
            style={secondaryButtonStyle}
          >
            Export JSON
          </a>
          <a
            href="/api/admin/customer-applications/export?format=xml"
            style={secondaryButtonStyle}
          >
            Export XML
          </a>
        </div>
      </div>

      <div style={filterCardStyle}>
        <div style={statsRowStyle}>
          <div style={statBoxStyle}>
            <div style={statLabelStyle}>Total Applications</div>
            <div style={statValueStyle}>{stats.total}</div>
          </div>

          <div style={warningStatBoxStyle}>
            <div style={statLabelStyle}>Pending</div>
            <div style={warningStatValueStyle}>{stats.pending}</div>
          </div>

          <div style={statBoxStyle}>
            <div style={statLabelStyle}>Approved</div>
            <div style={statValueStyle}>{stats.approved}</div>
          </div>

          <div style={statBoxStyle}>
            <div style={statLabelStyle}>Filtered Results</div>
            <div style={statValueStyle}>{stats.filtered}</div>
          </div>
        </div>

        <div style={filterGridStyle}>
          <div>
            <label style={labelStyle}>Search</label>
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by company, contact, email, country, or business type"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={inputStyle}
            >
              {STATUS_FILTER_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {successMessage ? <div style={successBoxStyle}>{successMessage}</div> : null}

      {approvalResult ? (
        <div style={successBoxStyle}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>
            Customer approved successfully
          </div>
          <div style={{ lineHeight: 1.8 }}>
            <div>
              <strong>Company:</strong> {approvalResult.companyName}
            </div>
            <div>
              <strong>Email:</strong> {approvalResult.email}
            </div>
            <div>
              <strong>Temporary Password:</strong> {approvalResult.temporaryPassword}
            </div>
          </div>
        </div>
      ) : null}

      {generatedEmail ? (
        <div style={emailBoxStyle}>
          <div style={{ fontWeight: 800, fontSize: 18, color: "#171717" }}>
            Ready Email
          </div>

          <textarea value={generatedEmail} readOnly style={emailTextareaStyle} />

          <div style={emailActionsStyle}>
            <button
              type="button"
              onClick={() => handleCopyText(approvalResult?.temporaryPassword || "")}
              style={secondaryButtonStyle}
            >
              Copy Password
            </button>

            <button
              type="button"
              onClick={() => handleCopyText(approvalResult?.email || "")}
              style={secondaryButtonStyle}
            >
              Copy Email Address
            </button>

            <button
              type="button"
              onClick={handleCopyEmail}
              style={primaryButtonStyle}
            >
              Copy Email
            </button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div style={cardStyle}>Loading...</div>
      ) : errorMessage ? (
        <div style={errorBoxStyle}>
          <strong>Error:</strong>
          <div style={{ marginTop: 8 }}>{errorMessage}</div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div style={emptyStateStyle}>No applications matched your filters.</div>
      ) : (
        <div style={listGridStyle}>
          {filteredItems.map((item) => {
            const pending = normalizeLower(item.status) === "pending";
            const isExpanded = expandedApplicationId === item.id;
            const approvalConfig =
              approvalConfigMap[item.id] || INITIAL_APPROVAL_CONFIG;

            return (
              <div key={item.id} style={cardStyle}>
                <div style={cardTopStyle}>
                  <div>
                    <div style={companyTitleStyle}>{item.company_name || "-"}</div>
                    <div style={contactStyle}>
                      {item.contact_name || "-"} • {item.email || "-"}
                    </div>
                  </div>

                  <div
                    style={{
                      ...statusPillStyle,
                      ...getStatusStyle(item.status),
                    }}
                  >
                    {normalizeStatusLabel(item.status)}
                  </div>
                </div>

                <div style={summaryGridStyle}>
                  <div>
                    <div style={metaLabelStyle}>Country</div>
                    <div style={metaValueStyle}>{item.country || "-"}</div>
                  </div>

                  <div>
                    <div style={metaLabelStyle}>Business Type</div>
                    <div style={metaValueStyle}>{item.business_type || "-"}</div>
                  </div>

                  <div>
                    <div style={metaLabelStyle}>Submitted</div>
                    <div style={metaValueStyle}>{formatDate(item.created_at)}</div>
                  </div>

                  <div>
                    <div style={metaLabelStyle}>Phone</div>
                    <div style={metaValueStyle}>{item.phone || "-"}</div>
                  </div>
                </div>

                <div style={actionsWrapStyle}>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedApplicationId((prev) =>
                        prev === item.id ? "" : item.id
                      )
                    }
                    style={secondaryButtonStyle}
                  >
                    {isExpanded ? "Hide Details" : "View Details"}
                  </button>

                  {pending ? (
                    <button
                      type="button"
                      onClick={() => handleApprove(item)}
                      disabled={approveLoadingId === item.id}
                      style={primaryButtonStyle}
                    >
                      {approveLoadingId === item.id
                        ? "Approving..."
                        : "Approve & Create Customer"}
                    </button>
                  ) : null}
                </div>

                {isExpanded ? (
                  <div style={detailsPanelStyle}>
                    <div style={detailsGridStyle}>
                      <div>
                        <div style={metaLabelStyle}>Website</div>
                        <div style={metaValueStyle}>{item.website || "-"}</div>
                      </div>

                      <div>
                        <div style={metaLabelStyle}>Tax ID</div>
                        <div style={metaValueStyle}>{item.tax_id || "-"}</div>
                      </div>

                      <div>
                        <div style={metaLabelStyle}>Reviewed By</div>
                        <div style={metaValueStyle}>{item.reviewed_by || "-"}</div>
                      </div>

                      <div>
                        <div style={metaLabelStyle}>Approved At</div>
                        <div style={metaValueStyle}>{formatDate(item.approved_at)}</div>
                      </div>
                    </div>

                    {item.notes ? (
                      <div style={notesBoxStyle}>
                        <strong>Notes:</strong> {item.notes}
                      </div>
                    ) : null}

                    {pending ? (
                      <div style={approvalPanelStyle}>
                        <div style={approvalPanelTitleStyle}>
                          Approval Configuration
                        </div>

                        <div style={approvalGridStyle}>
                          <div>
                            <label style={labelStyle}>Price Tier</label>
                            <select
                              value={approvalConfig.priceTier}
                              onChange={(e) =>
                                updateApprovalConfig(
                                  item.id,
                                  "priceTier",
                                  e.target.value
                                )
                              }
                              style={inputStyle}
                            >
                              {PRICE_TIER_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label style={labelStyle}>Currency</label>
                            <select
                              value={approvalConfig.currency}
                              onChange={(e) =>
                                updateApprovalConfig(
                                  item.id,
                                  "currency",
                                  e.target.value
                                )
                              }
                              style={inputStyle}
                            >
                              {CURRENCY_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label style={labelStyle}>Shipping Terms</label>
                            <input
                              value={approvalConfig.shippingTerms}
                              onChange={(e) =>
                                updateApprovalConfig(
                                  item.id,
                                  "shippingTerms",
                                  e.target.value
                                )
                              }
                              style={inputStyle}
                            />
                          </div>

                          <div>
                            <label style={labelStyle}>Payment Terms</label>
                            <input
                              value={approvalConfig.paymentTerms}
                              onChange={(e) =>
                                updateApprovalConfig(
                                  item.id,
                                  "paymentTerms",
                                  e.target.value
                                )
                              }
                              style={inputStyle}
                            />
                          </div>

                          <div>
                            <label style={labelStyle}>Tax Exempt</label>
                            <select
                              value={approvalConfig.taxExempt}
                              onChange={(e) =>
                                updateApprovalConfig(
                                  item.id,
                                  "taxExempt",
                                  e.target.value
                                )
                              }
                              style={inputStyle}
                            >
                              {TAX_EXEMPT_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={approvedMetaStyle}>
                        This application has already been approved.
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const pageHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 20,
  flexWrap: "wrap",
};

const headerActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
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
  maxWidth: 820,
};

const filterCardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #ddd3c5",
  borderRadius: 24,
  padding: 24,
  boxShadow: "0 10px 30px rgba(23,23,23,0.04)",
};

const statsRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 14,
  flexWrap: "wrap",
  marginBottom: 20,
};

const statBoxStyle: React.CSSProperties = {
  minWidth: 180,
  background: "#f8f5ef",
  border: "1px solid #e3dbcf",
  borderRadius: 18,
  padding: 16,
};

const warningStatBoxStyle: React.CSSProperties = {
  minWidth: 180,
  background: "#fff7e8",
  border: "1px solid #ecd8ad",
  borderRadius: 18,
  padding: 16,
};

const statLabelStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#7c7267",
  marginBottom: 8,
  fontWeight: 700,
};

const statValueStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 800,
};

const warningStatValueStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 800,
  color: "#8a6418",
};

const filterGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr",
  gap: 16,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 8,
  fontWeight: 800,
  fontSize: 14,
  color: "#171717",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 52,
  padding: "14px 16px",
  borderRadius: 16,
  border: "1px solid #d9cfbf",
  background: "#fcfbf8",
  outline: "none",
  fontSize: 15,
};

const listGridStyle: React.CSSProperties = {
  display: "grid",
  gap: 18,
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #ddd3c5",
  borderRadius: 24,
  padding: 24,
  boxShadow: "0 10px 30px rgba(23,23,23,0.04)",
};

const cardTopStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  flexWrap: "wrap",
  marginBottom: 18,
};

const companyTitleStyle: React.CSSProperties = {
  fontSize: 24,
  lineHeight: 1.15,
  fontWeight: 800,
  color: "#171717",
  marginBottom: 6,
};

const contactStyle: React.CSSProperties = {
  color: "#665d52",
  lineHeight: 1.7,
  fontSize: 14,
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

const summaryGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 14,
};

const metaLabelStyle: React.CSSProperties = {
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#7a7166",
  fontWeight: 800,
  marginBottom: 6,
};

const metaValueStyle: React.CSSProperties = {
  color: "#171717",
  lineHeight: 1.7,
  fontWeight: 700,
  fontSize: 14,
};

const actionsWrapStyle: React.CSSProperties = {
  marginTop: 18,
  paddingTop: 16,
  borderTop: "1px solid #eee5d9",
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
};

const detailsPanelStyle: React.CSSProperties = {
  marginTop: 18,
  paddingTop: 18,
  borderTop: "1px solid #eee5d9",
  display: "grid",
  gap: 16,
};

const detailsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 14,
};

const notesBoxStyle: React.CSSProperties = {
  padding: 14,
  borderRadius: 16,
  background: "#faf8f4",
  border: "1px solid #e8dfd2",
  color: "#665d52",
  lineHeight: 1.8,
  fontSize: 14,
};

const approvalPanelStyle: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid #e8dfd2",
  background: "#fcfbf8",
  padding: 18,
  display: "grid",
  gap: 14,
};

const approvalPanelTitleStyle: React.CSSProperties = {
  fontSize: 18,
  lineHeight: 1.2,
  fontWeight: 800,
  color: "#171717",
};

const approvalGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 14,
};

const approvedMetaStyle: React.CSSProperties = {
  color: "#665d52",
  lineHeight: 1.8,
  fontSize: 14,
  fontWeight: 700,
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
  cursor: "pointer",
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
  cursor: "pointer",
  textDecoration: "none",
};

const successBoxStyle: React.CSSProperties = {
  padding: 18,
  borderRadius: 18,
  background: "#eef8f0",
  border: "1px solid #cfe7d8",
  color: "#1d6a43",
};

const emailBoxStyle: React.CSSProperties = {
  padding: 20,
  borderRadius: 18,
  background: "#f8f5ef",
  border: "1px solid #e5ddd2",
  display: "grid",
  gap: 12,
};

const emailTextareaStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 320,
  borderRadius: 14,
  border: "1px solid #d9cfbf",
  padding: 14,
  fontSize: 14,
  lineHeight: 1.7,
  background: "#fff",
  resize: "vertical",
  outline: "none",
};

const emailActionsStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 12,
  flexWrap: "wrap",
};

const emptyStateStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #ddd3c5",
  borderRadius: 24,
  padding: 28,
  color: "#6f6559",
  fontWeight: 700,
};

const errorBoxStyle: React.CSSProperties = {
  padding: 18,
  borderRadius: 16,
  background: "#fff1f1",
  border: "1px solid #f0c9c9",
  color: "#8d2f2f",
};