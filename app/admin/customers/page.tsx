"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CustomerAnalyticsPanel from "../../../components/admin/CustomerAnalyticsPanel";

type CustomerItem = {
  id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  company: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  address_line_1: string;
  address_line_2: string;
  postal_code: string;
  status: string;
  customer_code: string;
  price_tier: string;
  currency: string;
  tax_exempt: string;
  approved_at: string;
  created_at: string;
  updated_at: string;
  last_login_at: string;
};

type ResetResult = {
  customerId: string;
  companyName: string;
  email: string;
  temporaryPassword: string;
  expiresAt?: string;
};

const STATUS_OPTIONS = ["active", "inactive"];

const PRICE_TIER_OPTIONS = [
  "all",
  "standard",
  "wholesale",
  "distributor",
  "vip",
];

function normalizeText(value?: string) {
  return String(value || "").trim();
}

function normalizeLower(value?: string) {
  return normalizeText(value).toLowerCase();
}

function formatDate(value?: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

function getStatusStyle(value?: string): React.CSSProperties {
  const raw = normalizeLower(value);

  if (raw === "active") {
    return {
      background: "#eef8f0",
      color: "#2f7d62",
      border: "1px solid rgba(47,125,98,0.18)",
    };
  }

  return {
    background: "#fff4f2",
    color: "#a54a3f",
    border: "1px solid rgba(165,74,63,0.18)",
  };
}

function generateEmailTemplate(
  contactName: string,
  email: string,
  password: string
) {
  return `Dear ${contactName || "Partner"},

We are pleased to share your updated customer portal login credentials for Globaltex Fine Linens.

Portal Access: https://www.globaltexusa.com/portal-login
Email: ${email}
Temporary Password: ${password}

Through your account, you can:
- access your assigned pricing structure
- review available hospitality collections
- prepare and submit order requests
- manage your account workflow more efficiently

For security reasons, you will be asked to update your password after your next login.

If you need support regarding orders, custom developments, or hospitality project requirements, our team will be pleased to assist you.

Warm regards,
Globaltex Fine Linens
customerservice@globaltexusa.com
https://www.globaltexusa.com/`;
}

export default function AdminCustomersPage() {
  const [items, setItems] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priceTierFilter, setPriceTierFilter] = useState("all");

  const [resetLoadingId, setResetLoadingId] = useState("");
  const [statusLoadingId, setStatusLoadingId] = useState("");
  const [expandedCustomerId, setExpandedCustomerId] = useState("");

  const [statusMap, setStatusMap] = useState<Record<string, string>>({});
  const [resetResult, setResetResult] = useState<ResetResult | null>(null);
  const [generatedEmail, setGeneratedEmail] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const didLoadRef = useRef(false);

  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const response = await fetch("/api/admin/customers/list", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Failed to load customers.");
      }

      const nextItems = Array.isArray(data.items) ? data.items : [];

      setItems(nextItems);

      const nextStatusMap: Record<string, string> = {};

      nextItems.forEach((item: CustomerItem) => {
        nextStatusMap[item.id] =
          normalizeLower(item.status || "inactive") || "inactive";
      });

      setStatusMap(nextStatusMap);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "An unknown error occurred."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (didLoadRef.current) {
      return;
    }

    didLoadRef.current = true;

    loadCustomers();
  }, [loadCustomers]);

  const filteredItems = useMemo(() => {
    const query = normalizeLower(searchInput);

    return items.filter((item) => {
      const itemStatus = normalizeLower(item.status);
      const itemTier = normalizeLower(item.price_tier);

      const matchesSearch =
        !query ||
        normalizeLower(item.company).includes(query) ||
        normalizeLower(item.full_name).includes(query) ||
        normalizeLower(item.email).includes(query) ||
        normalizeLower(item.phone).includes(query) ||
        normalizeLower(item.customer_code).includes(query);

      const matchesStatus =
        statusFilter === "all"
          ? true
          : itemStatus === normalizeLower(statusFilter);

      const matchesTier =
        priceTierFilter === "all"
          ? true
          : itemTier === normalizeLower(priceTierFilter);

      return matchesSearch && matchesStatus && matchesTier;
    });
  }, [items, searchInput, statusFilter, priceTierFilter]);

  const activeCount = useMemo(
    () => items.filter((item) => normalizeLower(item.status) === "active").length,
    [items]
  );

  const inactiveCount = useMemo(
    () => items.filter((item) => normalizeLower(item.status) !== "active").length,
    [items]
  );

  async function handleResetPassword(item: CustomerItem) {
    try {
      setResetLoadingId(item.id);
      setResetResult(null);
      setGeneratedEmail("");
      setSuccessMessage("");

      const response = await fetch("/api/admin/customers/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId: item.id,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Failed to reset password.");
      }

      const nextEmail = data?.customer?.email || item.email;
      const nextPassword = data?.temporaryPassword || "";
      const nextCompanyName = data?.customer?.companyName || item.company;
      const nextContactName = data?.customer?.contactName || item.full_name;

      setResetResult({
        customerId: data?.customer?.id || item.id,
        companyName: nextCompanyName,
        email: nextEmail,
        temporaryPassword: nextPassword,
        expiresAt: data?.expiresAt || "",
      });

      setGeneratedEmail(
        generateEmailTemplate(nextContactName, nextEmail, nextPassword)
      );

      setSuccessMessage("Temporary password generated successfully.");

      await loadCustomers();
    } catch (error) {
      alert(error instanceof Error ? error.message : "An unknown error occurred.");
    } finally {
      setResetLoadingId("");
    }
  }

  async function handleUpdateStatus(item: CustomerItem) {
    try {
      setStatusLoadingId(item.id);
      setSuccessMessage("");

      const response = await fetch("/api/admin/customers/update-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId: item.id,
          status: statusMap[item.id] || "inactive",
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Failed to update customer status.");
      }

      setSuccessMessage(
        `Customer ${item.company || item.email} updated successfully.`
      );

      await loadCustomers();
    } catch (error) {
      alert(error instanceof Error ? error.message : "An unknown error occurred.");
    } finally {
      setStatusLoadingId("");
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
    <div style={{ display: "grid", gap: 20 }}>
      <div style={pageHeaderStyle}>
        <div>
          <h1 style={titleStyle}>Customers</h1>
          <p style={subtitleStyle}>
            Review customer portal accounts, update access, generate temporary
            passwords, and inspect customer-level purchase analytics.
          </p>
        </div>

        <div style={headerActionsStyle}>
          <a href="/admin/customers/new" style={primaryButtonStyle}>
            + New Customer
          </a>

          <a
            href="/api/admin/customers/export?format=csv"
            style={secondaryButtonStyle}
          >
            Export CSV
          </a>

          <a
            href="/api/admin/customers/export?format=json"
            style={secondaryButtonStyle}
          >
            Export JSON
          </a>

          <a
            href="/api/admin/customers/export?format=xml"
            style={secondaryButtonStyle}
          >
            Export XML
          </a>
        </div>
      </div>

      <div style={filterCardStyle}>
        <div style={statsRowStyle}>
          <div style={statBoxStyle}>
            <div style={statLabelStyle}>Total Customers</div>
            <div style={statValueStyle}>{items.length}</div>
          </div>

          <div style={statBoxStyle}>
            <div style={statLabelStyle}>Active</div>
            <div style={statValueStyle}>{activeCount}</div>
          </div>

          <div style={warningStatBoxStyle}>
            <div style={statLabelStyle}>Inactive</div>
            <div style={warningStatValueStyle}>{inactiveCount}</div>
          </div>

          <div style={statBoxStyle}>
            <div style={statLabelStyle}>Filtered Results</div>
            <div style={statValueStyle}>{filteredItems.length}</div>
          </div>
        </div>

        <div style={filterGridStyle}>
          <div>
            <label style={labelStyle}>Search</label>
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by name, company, email, phone, or customer code"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Status</label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              style={inputStyle}
            >
              <option value="all">all</option>
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Price Tier</label>
            <select
              value={priceTierFilter}
              onChange={(event) => setPriceTierFilter(event.target.value)}
              style={inputStyle}
            >
              {PRICE_TIER_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {successMessage ? <div style={successBoxStyle}>{successMessage}</div> : null}

      {resetResult ? (
        <div style={successBoxStyle}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>
            Temporary password generated
          </div>

          <div style={{ lineHeight: 1.8 }}>
            <div>
              <strong>Company:</strong> {resetResult.companyName}
            </div>

            <div>
              <strong>Email:</strong> {resetResult.email}
            </div>

            <div>
              <strong>Temporary Password:</strong>{" "}
              {resetResult.temporaryPassword}
            </div>

            {resetResult.expiresAt ? (
              <div>
                <strong>Expires:</strong> {formatDate(resetResult.expiresAt)}
              </div>
            ) : null}
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
              onClick={() => handleCopyText(resetResult?.temporaryPassword || "")}
              style={secondaryButtonStyle}
            >
              Copy Password
            </button>

            <button
              type="button"
              onClick={() => handleCopyText(resetResult?.email || "")}
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
        <div style={errorBoxStyle}>{errorMessage}</div>
      ) : filteredItems.length === 0 ? (
        <div style={cardStyle}>No customers matched your current filters.</div>
      ) : (
        <div style={tableWrapStyle}>
          <div style={tableHeadStyle}>
            <div>Name</div>
            <div>Company</div>
            <div>Contact</div>
            <div>Status</div>
            <div>Tier</div>
            <div>Approved</div>
            <div style={{ textAlign: "right" }}>Actions</div>
          </div>

          {filteredItems.map((item) => {
            const isExpanded = expandedCustomerId === item.id;

            return (
              <div key={item.id} style={rowWrapStyle}>
                <div style={tableRowStyle}>
                  <div style={nameCellStyle}>
                    <div style={primaryTextStyle}>{item.full_name || "-"}</div>

                    {item.customer_code ? (
                      <div style={secondaryTextStyle}>
                        Code: {item.customer_code}
                      </div>
                    ) : null}
                  </div>

                  <div style={cellStyle}>
                    <div style={primaryTextStyle}>{item.company || "-"}</div>
                  </div>

                  <div style={cellStyle}>
                    <div style={primaryTextStyle}>{item.email || "-"}</div>

                    {item.phone ? (
                      <div style={secondaryTextStyle}>{item.phone}</div>
                    ) : null}
                  </div>

                  <div style={cellStyle}>
                    <span
                      style={{
                        ...statusPillStyle,
                        ...getStatusStyle(item.status),
                      }}
                    >
                      {item.status || "inactive"}
                    </span>
                  </div>

                  <div style={cellStyle}>
                    <div style={primaryTextStyle}>{item.price_tier || "-"}</div>
                    <div style={secondaryTextStyle}>{item.currency || "-"}</div>
                  </div>

                  <div style={cellStyle}>
                    <div style={primaryTextStyle}>
                      {formatDate(item.approved_at)}
                    </div>
                  </div>

                  <div style={actionsCellStyle}>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedCustomerId((prev) =>
                          prev === item.id ? "" : item.id
                        )
                      }
                      style={secondaryButtonStyleCompact}
                    >
                      {isExpanded ? "Hide" : "Details"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleResetPassword(item)}
                      disabled={resetLoadingId === item.id}
                      style={{
                        ...primaryButtonStyleCompact,
                        opacity: resetLoadingId === item.id ? 0.7 : 1,
                        cursor:
                          resetLoadingId === item.id ? "not-allowed" : "pointer",
                      }}
                    >
                      {resetLoadingId === item.id
                        ? "Generating..."
                        : "Temp Password"}
                    </button>
                  </div>
                </div>

                {isExpanded ? (
                  <div style={detailsPanelStyle}>
                    <div style={detailsGridStyle}>
                      <div>
                        <div style={metaLabelStyle}>First Name</div>
                        <div style={metaValueStyle}>
                          {item.first_name || "-"}
                        </div>
                      </div>

                      <div>
                        <div style={metaLabelStyle}>Last Name</div>
                        <div style={metaValueStyle}>{item.last_name || "-"}</div>
                      </div>

                      <div>
                        <div style={metaLabelStyle}>Tax Exempt</div>
                        <div style={metaValueStyle}>
                          {item.tax_exempt || "-"}
                        </div>
                      </div>

                      <div>
                        <div style={metaLabelStyle}>Country</div>
                        <div style={metaValueStyle}>{item.country || "-"}</div>
                      </div>

                      <div>
                        <div style={metaLabelStyle}>City</div>
                        <div style={metaValueStyle}>{item.city || "-"}</div>
                      </div>

                      <div>
                        <div style={metaLabelStyle}>Postal Code</div>
                        <div style={metaValueStyle}>
                          {item.postal_code || "-"}
                        </div>
                      </div>

                      <div style={{ gridColumn: "1 / -1" }}>
                        <div style={metaLabelStyle}>Address</div>
                        <div style={metaValueStyle}>
                          {[
                            item.address_line_1,
                            item.address_line_2,
                            item.city,
                            item.country,
                            item.postal_code,
                          ]
                            .filter(Boolean)
                            .join(", ") || "-"}
                        </div>
                      </div>

                      <div>
                        <div style={metaLabelStyle}>Created</div>
                        <div style={metaValueStyle}>
                          {formatDate(item.created_at)}
                        </div>
                      </div>

                      <div>
                        <div style={metaLabelStyle}>Updated</div>
                        <div style={metaValueStyle}>
                          {formatDate(item.updated_at)}
                        </div>
                      </div>

                      <div>
                        <div style={metaLabelStyle}>Last Login</div>
                        <div style={metaValueStyle}>
                          {formatDate(item.last_login_at)}
                        </div>
                      </div>
                    </div>

                    <div style={analyticsWrapStyle}>
                      <CustomerAnalyticsPanel customerId={item.id} />
                    </div>

                    <div style={detailsActionsBarStyle}>
                      <div style={statusEditorInlineStyle}>
                        <select
                          value={
                            statusMap[item.id] ||
                            normalizeLower(item.status) ||
                            "inactive"
                          }
                          onChange={(event) =>
                            setStatusMap((prev) => ({
                              ...prev,
                              [item.id]: event.target.value,
                            }))
                          }
                          style={compactSelectStyle}
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(item)}
                          disabled={statusLoadingId === item.id}
                          style={{
                            ...secondaryButtonStyleCompact,
                            opacity: statusLoadingId === item.id ? 0.7 : 1,
                            cursor:
                              statusLoadingId === item.id
                                ? "not-allowed"
                                : "pointer",
                          }}
                        >
                          {statusLoadingId === item.id
                            ? "Saving..."
                            : "Save Status"}
                        </button>
                      </div>
                    </div>
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
  lineHeight: 1.7,
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
  gridTemplateColumns: "2fr 1fr 1fr",
  gap: 16,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 8,
  fontWeight: 800,
  fontSize: 15,
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

const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #ddd3c5",
  borderRadius: 20,
  padding: 20,
  boxShadow: "0 10px 30px rgba(23,23,23,0.04)",
};

const tableWrapStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
};

const tableHeadStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.2fr 1fr 1.2fr 0.8fr 0.8fr 0.8fr 1.2fr",
  gap: 14,
  padding: "0 16px",
  color: "#7a7166",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  fontWeight: 800,
};

const rowWrapStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #ddd3c5",
  borderRadius: 20,
  boxShadow: "0 10px 30px rgba(23,23,23,0.04)",
  overflow: "hidden",
};

const tableRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.2fr 1fr 1.2fr 0.8fr 0.8fr 0.8fr 1.2fr",
  gap: 14,
  alignItems: "center",
  padding: "16px",
};

const nameCellStyle: React.CSSProperties = {
  minWidth: 0,
};

const cellStyle: React.CSSProperties = {
  minWidth: 0,
};

const primaryTextStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 800,
  color: "#171717",
  lineHeight: 1.4,
  wordBreak: "break-word",
};

const secondaryTextStyle: React.CSSProperties = {
  marginTop: 4,
  fontSize: 13,
  color: "#6f6559",
  lineHeight: 1.5,
  wordBreak: "break-word",
};

const statusPillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 32,
  padding: "0 12px",
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const actionsCellStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  flexWrap: "wrap",
};

const detailsPanelStyle: React.CSSProperties = {
  padding: "0 16px 16px",
  borderTop: "1px solid #eee5d9",
  background: "#fcfaf6",
};

const detailsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 14,
  paddingTop: 16,
};

const analyticsWrapStyle: React.CSSProperties = {
  marginTop: 16,
};

const detailsActionsBarStyle: React.CSSProperties = {
  marginTop: 16,
  paddingTop: 14,
  borderTop: "1px solid #eee5d9",
};

const statusEditorInlineStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "center",
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
  wordBreak: "break-word",
};

const compactSelectStyle: React.CSSProperties = {
  minHeight: 42,
  padding: "0 14px",
  borderRadius: 12,
  border: "1px solid #d9cfbf",
  background: "#fff",
  outline: "none",
  fontSize: 14,
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

const primaryButtonStyleCompact: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 40,
  padding: "0 14px",
  borderRadius: 12,
  border: "1px solid #2f7d62",
  background: "#2f7d62",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
  textDecoration: "none",
  fontSize: 14,
  whiteSpace: "nowrap",
};

const secondaryButtonStyleCompact: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 40,
  padding: "0 14px",
  borderRadius: 12,
  border: "1px solid #d9cfbf",
  background: "#fff",
  color: "#171717",
  fontWeight: 800,
  cursor: "pointer",
  textDecoration: "none",
  fontSize: 14,
  whiteSpace: "nowrap",
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

const errorBoxStyle: React.CSSProperties = {
  padding: 18,
  borderRadius: 18,
  background: "#fff1f1",
  border: "1px solid #efc9c9",
  color: "#7a2222",
  fontWeight: 700,
};