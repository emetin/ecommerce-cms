"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CustomerAnalyticsPanel from "../../../components/admin/CustomerAnalyticsPanel";

type CustomerItem = {
  id: string;
  customer_user_id: string;
  company_id: string;

  name: string;
  full_name?: string;
  first_name: string;
  last_name: string;

  email: string;
  phone: string;
  role: string;
  status: string;
  is_primary: boolean;

  company_name: string;
  company?: string;
  company_email: string;
  company_phone: string;
  website: string;

  country: string;
  state: string;
  city: string;
  address_line_1: string;
  address_line_2: string;
  postal_code: string;

  company_status: string;
  customer_type: string;
  industry: string;
  source: string;
  payment_terms: string;
  currency: string;
  notes: string;

  customer_code?: string;
  price_tier?: string;
  tax_exempt?: string;
  approved_at?: string;

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

type CustomersApiResponse = {
  ok?: boolean;
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  items?: CustomerItem[];
  error?: string;
};

const STATUS_OPTIONS = ["pending", "active", "suspended", "archived"];

const TYPE_OPTIONS = [
  "all",
  "hotel",
  "hospitality",
  "spa",
  "resort",
  "property-management",
  "designer",
  "distributor",
  "other",
];

function normalizeText(value?: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value?: unknown) {
  return normalizeText(value).toLowerCase();
}

function getCustomerId(item: CustomerItem) {
  return item.customer_user_id || item.id;
}

function getCustomerName(item: CustomerItem) {
  return (
    normalizeText(item.name) ||
    normalizeText(item.full_name) ||
    [item.first_name, item.last_name].filter(Boolean).join(" ").trim() ||
    item.email
  );
}

function getCompanyName(item: CustomerItem) {
  return normalizeText(item.company_name || item.company);
}

function getCustomerType(item: CustomerItem) {
  return normalizeLower(item.customer_type || item.price_tier || "other");
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

  if (raw === "pending") {
    return {
      background: "#fff7e8",
      color: "#8a6418",
      border: "1px solid rgba(138,100,24,0.18)",
    };
  }

  if (raw === "suspended") {
    return {
      background: "#fff4f2",
      color: "#a54a3f",
      border: "1px solid rgba(165,74,63,0.18)",
    };
  }

  return {
    background: "#f3f3f3",
    color: "#5e5e5e",
    border: "1px solid rgba(94,94,94,0.18)",
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
- access your assigned wholesale account
- review available hospitality collections
- prepare and submit quote requests
- manage your account workflow more efficiently

For security reasons, please update your password after your next login.

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
  const [typeFilter, setTypeFilter] = useState("all");

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

      const params = new URLSearchParams();

      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }

      if (searchInput.trim()) {
        params.set("q", searchInput.trim());
      }

      params.set("limit", "200");

      const response = await fetch(
        `/api/admin/customers/list?${params.toString()}`,
        {
          cache: "no-store",
        }
      );

      const data = (await response.json()) as CustomersApiResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Failed to load customers.");
      }

      const nextItems = Array.isArray(data.items) ? data.items : [];

      setItems(nextItems);

      const nextStatusMap: Record<string, string> = {};

      nextItems.forEach((item) => {
        const id = getCustomerId(item);
        nextStatusMap[id] =
          normalizeLower(item.status || "pending") || "pending";
      });

      setStatusMap(nextStatusMap);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "An unknown error occurred."
      );
    } finally {
      setLoading(false);
    }
  }, [searchInput, statusFilter]);

  useEffect(() => {
    if (didLoadRef.current) {
      return;
    }

    didLoadRef.current = true;
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    if (!didLoadRef.current) return;

    const timeout = setTimeout(() => {
      loadCustomers();
    }, 350);

    return () => clearTimeout(timeout);
  }, [searchInput, statusFilter, loadCustomers]);

  const filteredItems = useMemo(() => {
    const query = normalizeLower(searchInput);

    return items.filter((item) => {
      const itemStatus = normalizeLower(item.status);
      const itemType = getCustomerType(item);

      const matchesSearch =
        !query ||
        normalizeLower(getCompanyName(item)).includes(query) ||
        normalizeLower(getCustomerName(item)).includes(query) ||
        normalizeLower(item.email).includes(query) ||
        normalizeLower(item.phone).includes(query) ||
        normalizeLower(item.customer_code).includes(query) ||
        normalizeLower(item.company_email).includes(query) ||
        normalizeLower(item.city).includes(query) ||
        normalizeLower(item.country).includes(query);

      const matchesStatus =
        statusFilter === "all"
          ? true
          : itemStatus === normalizeLower(statusFilter);

      const matchesType =
        typeFilter === "all" ? true : itemType === normalizeLower(typeFilter);

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [items, searchInput, statusFilter, typeFilter]);

  const activeCount = useMemo(
    () => items.filter((item) => normalizeLower(item.status) === "active").length,
    [items]
  );

  const pendingCount = useMemo(
    () => items.filter((item) => normalizeLower(item.status) === "pending").length,
    [items]
  );

  const suspendedCount = useMemo(
    () =>
      items.filter((item) => normalizeLower(item.status) === "suspended").length,
    [items]
  );

  const archivedCount = useMemo(
    () =>
      items.filter((item) => normalizeLower(item.status) === "archived").length,
    [items]
  );

  async function handleResetPassword(item: CustomerItem) {
    const id = getCustomerId(item);

    try {
      setResetLoadingId(id);
      setResetResult(null);
      setGeneratedEmail("");
      setSuccessMessage("");

      const response = await fetch("/api/admin/customers/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer_user_id: id,
          company_id: item.company_id,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Failed to reset password.");
      }

      const nextEmail = data?.customer?.email || item.email;
      const nextPassword = data?.temporaryPassword || "";
      const nextCompanyName =
        data?.customer?.companyName || getCompanyName(item) || "-";
      const nextContactName =
        data?.customer?.contactName || getCustomerName(item);

      setResetResult({
        customerId: data?.customer?.id || id,
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
    const id = getCustomerId(item);

    try {
      setStatusLoadingId(id);
      setSuccessMessage("");

      const response = await fetch("/api/admin/customers/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer_user_id: id,
          company_id: item.company_id,
          status: statusMap[id] || "pending",
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Failed to update customer status.");
      }

      setSuccessMessage(
        `Customer ${getCompanyName(item) || item.email} updated successfully.`
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
            Review member portal accounts, approve wholesale access, suspend
            users, generate temporary passwords, and inspect customer-level
            activity.
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
            <div style={statLabelStyle}>Pending</div>
            <div style={warningStatValueStyle}>{pendingCount}</div>
          </div>

          <div style={dangerStatBoxStyle}>
            <div style={statLabelStyle}>Suspended</div>
            <div style={dangerStatValueStyle}>{suspendedCount}</div>
          </div>

          <div style={statBoxStyle}>
            <div style={statLabelStyle}>Archived</div>
            <div style={statValueStyle}>{archivedCount}</div>
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
              placeholder="Search by name, company, email, phone, city, country"
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
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Customer Type</label>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              style={inputStyle}
            >
              {TYPE_OPTIONS.map((option) => (
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
            <div>Type</div>
            <div>Created</div>
            <div style={{ textAlign: "right" }}>Actions</div>
          </div>

          {filteredItems.map((item) => {
            const id = getCustomerId(item);
            const isExpanded = expandedCustomerId === id;
            const currentStatus =
              statusMap[id] || normalizeLower(item.status) || "pending";

            return (
              <div key={id} style={rowWrapStyle}>
                <div style={tableRowStyle}>
                  <div style={nameCellStyle}>
                    <div style={primaryTextStyle}>{getCustomerName(item)}</div>

                    {item.customer_code ? (
                      <div style={secondaryTextStyle}>
                        Code: {item.customer_code}
                      </div>
                    ) : null}

                    {item.is_primary ? (
                      <div style={secondaryTextStyle}>Primary Contact</div>
                    ) : null}
                  </div>

                  <div style={cellStyle}>
                    <div style={primaryTextStyle}>
                      {getCompanyName(item) || "-"}
                    </div>

                    <div style={secondaryTextStyle}>
                      {item.company_email || item.company_phone || "-"}
                    </div>
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
                      {item.status || "pending"}
                    </span>
                  </div>

                  <div style={cellStyle}>
                    <div style={primaryTextStyle}>
                      {item.customer_type || item.price_tier || "-"}
                    </div>
                    <div style={secondaryTextStyle}>
                      {item.currency || "USD"}
                    </div>
                  </div>

                  <div style={cellStyle}>
                    <div style={primaryTextStyle}>
                      {formatDate(item.created_at)}
                    </div>
                  </div>

                  <div style={actionsCellStyle}>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedCustomerId((prev) =>
                          prev === id ? "" : id
                        )
                      }
                      style={secondaryButtonStyleCompact}
                    >
                      {isExpanded ? "Hide" : "Details"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleResetPassword(item)}
                      disabled={resetLoadingId === id}
                      style={{
                        ...primaryButtonStyleCompact,
                        opacity: resetLoadingId === id ? 0.7 : 1,
                        cursor:
                          resetLoadingId === id ? "not-allowed" : "pointer",
                      }}
                    >
                      {resetLoadingId === id
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
                        <div style={metaLabelStyle}>Role</div>
                        <div style={metaValueStyle}>{item.role || "-"}</div>
                      </div>

                      <div>
                        <div style={metaLabelStyle}>Company Status</div>
                        <div style={metaValueStyle}>
                          {item.company_status || "-"}
                        </div>
                      </div>

                      <div>
                        <div style={metaLabelStyle}>Customer Type</div>
                        <div style={metaValueStyle}>
                          {item.customer_type || "-"}
                        </div>
                      </div>

                      <div>
                        <div style={metaLabelStyle}>Payment Terms</div>
                        <div style={metaValueStyle}>
                          {item.payment_terms || "-"}
                        </div>
                      </div>

                      <div>
                        <div style={metaLabelStyle}>Country</div>
                        <div style={metaValueStyle}>{item.country || "-"}</div>
                      </div>

                      <div>
                        <div style={metaLabelStyle}>State</div>
                        <div style={metaValueStyle}>{item.state || "-"}</div>
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

                      <div>
                        <div style={metaLabelStyle}>Source</div>
                        <div style={metaValueStyle}>{item.source || "-"}</div>
                      </div>

                      <div>
                        <div style={metaLabelStyle}>Website</div>
                        <div style={metaValueStyle}>{item.website || "-"}</div>
                      </div>

                      <div style={{ gridColumn: "1 / -1" }}>
                        <div style={metaLabelStyle}>Address</div>
                        <div style={metaValueStyle}>
                          {[
                            item.address_line_1,
                            item.address_line_2,
                            item.city,
                            item.state,
                            item.country,
                            item.postal_code,
                          ]
                            .filter(Boolean)
                            .join(", ") || "-"}
                        </div>
                      </div>

                      <div style={{ gridColumn: "1 / -1" }}>
                        <div style={metaLabelStyle}>Notes</div>
                        <div style={metaValueStyle}>{item.notes || "-"}</div>
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
                      <CustomerAnalyticsPanel customerId={id} />
                    </div>

                    <div style={detailsActionsBarStyle}>
                      <div style={statusEditorInlineStyle}>
                        <select
                          value={currentStatus}
                          onChange={(event) =>
                            setStatusMap((prev) => ({
                              ...prev,
                              [id]: event.target.value,
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
                          disabled={statusLoadingId === id}
                          style={{
                            ...secondaryButtonStyleCompact,
                            opacity: statusLoadingId === id ? 0.7 : 1,
                            cursor:
                              statusLoadingId === id
                                ? "not-allowed"
                                : "pointer",
                          }}
                        >
                          {statusLoadingId === id ? "Saving..." : "Save Status"}
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
  minWidth: 170,
  background: "#f8f5ef",
  border: "1px solid #e3dbcf",
  borderRadius: 18,
  padding: 16,
};

const warningStatBoxStyle: React.CSSProperties = {
  minWidth: 170,
  background: "#fff7e8",
  border: "1px solid #ecd8ad",
  borderRadius: 18,
  padding: 16,
};

const dangerStatBoxStyle: React.CSSProperties = {
  minWidth: 170,
  background: "#fff4f2",
  border: "1px solid rgba(165,74,63,0.18)",
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

const dangerStatValueStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 800,
  color: "#a54a3f",
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