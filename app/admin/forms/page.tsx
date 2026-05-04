"use client";

import { useEffect, useMemo, useState } from "react";

type FormType = "contact" | "newsletter" | "career";

type FormRecord = Record<string, string>;

type ApiResponse = {
  ok?: boolean;
  error?: string;
  items?: FormRecord[];
  total?: number;
  totalPages?: number;
};

const PAGE_SIZE = 50;

const tabs: Array<{ value: FormType; label: string }> = [
  { value: "contact", label: "Contact Us" },
  { value: "newsletter", label: "Newsletter" },
  { value: "career", label: "Career" },
];

function value(item: FormRecord, key: string) {
  return String(item[key] || "").trim();
}

export default function AdminFormsPage() {
  const [activeType, setActiveType] = useState<FormType>("contact");
  const [items, setItems] = useState<FormRecord[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setPage(1);
  }, [activeType, status, search]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams();
        params.set("type", activeType);
        params.set("page", String(page));
        params.set("limit", String(PAGE_SIZE));

        if (search.trim()) params.set("q", search.trim());
        if (status !== "all") params.set("status", status);

        const response = await fetch(`/api/admin/forms?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        const data = (await response.json()) as ApiResponse;

        if (!response.ok || !data.ok) {
          throw new Error(data.error || "Failed to load form records.");
        }

        setItems(Array.isArray(data.items) ? data.items : []);
        setTotal(Number(data.total || 0));
        setTotalPages(Number(data.totalPages || 1));
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Unknown error.");
      } finally {
        setLoading(false);
      }
    }

    loadData();

    return () => controller.abort();
  }, [activeType, page, search, status]);

  const statusOptions = useMemo(() => {
    const values = new Set<string>();

    items.forEach((item) => {
      const itemStatus = value(item, "status");
      if (itemStatus) values.add(itemStatus);
    });

    return ["all", ...Array.from(values)];
  }, [items]);

  return (
    <div style={pageWrapStyle}>
      <div style={headerStyle}>
        <div>
          <div style={eyebrowStyle}>Forms Center</div>
          <h1 style={titleStyle}>Form Records</h1>
          <p style={subtitleStyle}>
            View Contact Us, Newsletter and Career form submissions from Google
            Sheets.
          </p>
        </div>

        <div style={statBoxStyle}>
          <div style={statLabelStyle}>Total Results</div>
          <div style={statValueStyle}>{total}</div>
        </div>
      </div>

      <div style={tabsStyle}>
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveType(tab.value)}
            style={{
              ...tabButtonStyle,
              ...(activeType === tab.value ? activeTabButtonStyle : {}),
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={filterCardStyle}>
        <div>
          <label style={labelStyle}>Search</label>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, email, phone, message, position..."
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
            {statusOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={cardStyle}>Loading...</div>
      ) : error ? (
        <div style={errorStyle}>{error}</div>
      ) : items.length === 0 ? (
        <div style={cardStyle}>No records found.</div>
      ) : activeType === "contact" ? (
        <ContactTable items={items} />
      ) : activeType === "newsletter" ? (
        <NewsletterTable items={items} />
      ) : (
        <CareerTable items={items} />
      )}

      <div style={paginationStyle}>
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          style={{
            ...secondaryButtonStyle,
            ...(page <= 1 ? disabledButtonStyle : {}),
          }}
        >
          Previous
        </button>

        <strong>
          Page {page} / {totalPages}
        </strong>

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          style={{
            ...secondaryButtonStyle,
            ...(page >= totalPages ? disabledButtonStyle : {}),
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
}

function ContactTable({ items }: { items: FormRecord[] }) {
  return (
    <Table
      headers={[
        "Date",
        "Name",
        "Email",
        "Phone",
        "Company",
        "Message",
        "Status",
      ]}
      rows={items.map((item) => [
        value(item, "created_at"),
        `${value(item, "first_name")} ${value(item, "last_name")}`.trim(),
        value(item, "email"),
        value(item, "phone"),
        value(item, "company"),
        value(item, "message"),
        value(item, "status"),
      ])}
    />
  );
}

function NewsletterTable({ items }: { items: FormRecord[] }) {
  return (
    <Table
      headers={["Date", "Email", "Source Page", "Status", "Email Sent"]}
      rows={items.map((item) => [
        value(item, "created_at"),
        value(item, "email"),
        value(item, "source_page"),
        value(item, "status"),
        value(item, "email_sent"),
      ])}
    />
  );
}

function CareerTable({ items }: { items: FormRecord[] }) {
  return (
    <div style={tableCardStyle}>
      <div style={tableScrollStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              {[
                "Date",
                "Position",
                "Name",
                "Email",
                "Phone",
                "Location",
                "Resume",
                "Links",
                "Cover Note",
                "Status",
              ].map((header) => (
                <th key={header} style={thStyle}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {items.map((item, index) => (
              <tr key={value(item, "id") || index}>
                <td style={tdStyle}>{value(item, "created_at")}</td>
                <td style={tdStyle}>{value(item, "position") || "-"}</td>
                <td style={tdStyle}>{value(item, "full_name") || "-"}</td>
                <td style={tdStyle}>{value(item, "email") || "-"}</td>
                <td style={tdStyle}>{value(item, "phone") || "-"}</td>
                <td style={tdStyle}>{value(item, "location") || "-"}</td>
                <td style={tdStyle}>
                  {value(item, "resume_url") ? (
                    <a
                      href={value(item, "resume_url")}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={primarySmallButtonStyle}
                    >
                      View Resume
                    </a>
                  ) : (
                    "-"
                  )}
                  <div style={mutedStyle}>{value(item, "resume_file_name")}</div>
                </td>
                <td style={tdStyle}>
                  <LinkList item={item} />
                </td>
                <td style={tdStyle}>{value(item, "cover_note") || "-"}</td>
                <td style={tdStyle}>
                  <span style={statusPillStyle}>{value(item, "status") || "new"}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LinkList({ item }: { item: FormRecord }) {
  const links = [
    { label: "LinkedIn", url: value(item, "linkedin_url") },
    { label: "Portfolio", url: value(item, "portfolio_url") },
  ].filter((link) => link.url);

  if (!links.length) return <>-</>;

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {links.map((link) => (
        <a
          key={link.label}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          style={secondarySmallButtonStyle}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div style={tableCardStyle}>
      <div style={tableScrollStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              {headers.map((header) => (
                <th key={header} style={thStyle}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} style={tdStyle}>
                    {cell || "-"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const pageWrapStyle: React.CSSProperties = {
  display: "grid",
  gap: 24,
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 20,
  flexWrap: "wrap",
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#8a7f72",
  marginBottom: 8,
};

const titleStyle: React.CSSProperties = {
  fontSize: 42,
  margin: 0,
  fontWeight: 900,
  color: "#171717",
};

const subtitleStyle: React.CSSProperties = {
  marginTop: 10,
  color: "#6f6559",
  fontSize: 16,
  lineHeight: 1.75,
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #ddd3c5",
  borderRadius: 24,
  padding: 24,
};

const statBoxStyle: React.CSSProperties = {
  minWidth: 180,
  background: "#fff",
  border: "1px solid #ddd3c5",
  borderRadius: 20,
  padding: 18,
  boxShadow: "0 10px 30px rgba(23,23,23,0.04)",
};

const statLabelStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#7c7267",
  fontWeight: 800,
};

const statValueStyle: React.CSSProperties = {
  fontSize: 32,
  fontWeight: 900,
  color: "#171717",
};

const tabsStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const tabButtonStyle: React.CSSProperties = {
  minHeight: 46,
  padding: "0 18px",
  borderRadius: 14,
  border: "1px solid #d9cfbf",
  background: "#fff",
  color: "#171717",
  fontWeight: 800,
  cursor: "pointer",
};

const activeTabButtonStyle: React.CSSProperties = {
  background: "#2f7d62",
  color: "#fff",
  border: "1px solid #2f7d62",
};

const filterCardStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr",
  gap: 16,
  background: "#fff",
  border: "1px solid #ddd3c5",
  borderRadius: 24,
  padding: 24,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 8,
  fontWeight: 800,
  color: "#171717",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 52,
  padding: "14px 16px",
  borderRadius: 16,
  border: "1px solid #d9cfbf",
  background: "#fcfbf8",
  fontSize: 15,
  outline: "none",
};

const tableCardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #ddd3c5",
  borderRadius: 24,
  overflow: "hidden",
  boxShadow: "0 10px 30px rgba(23,23,23,0.04)",
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
  padding: 16,
  fontSize: 13,
  textTransform: "uppercase",
  color: "#7d7266",
  background: "#f8f5ef",
  borderBottom: "1px solid #e5dccf",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: 16,
  borderBottom: "1px solid #efe8dc",
  verticalAlign: "top",
  fontSize: 14,
  lineHeight: 1.6,
  color: "#332f2a",
};

const errorStyle: React.CSSProperties = {
  padding: 18,
  borderRadius: 16,
  background: "#fff1f1",
  border: "1px solid #f0c9c9",
  color: "#8d2f2f",
};

const paginationStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
};

const secondaryButtonStyle: React.CSSProperties = {
  minHeight: 42,
  padding: "0 16px",
  borderRadius: 12,
  border: "1px solid #d9cfbf",
  background: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};

const disabledButtonStyle: React.CSSProperties = {
  opacity: 0.5,
  cursor: "not-allowed",
};

const primarySmallButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  minHeight: 36,
  alignItems: "center",
  justifyContent: "center",
  padding: "0 12px",
  borderRadius: 10,
  background: "#2f7d62",
  color: "#fff",
  textDecoration: "none",
  fontWeight: 800,
};

const secondarySmallButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  minHeight: 34,
  alignItems: "center",
  justifyContent: "center",
  padding: "0 12px",
  borderRadius: 10,
  border: "1px solid #d9cfbf",
  color: "#171717",
  textDecoration: "none",
  fontWeight: 700,
};

const statusPillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 30,
  padding: "0 10px",
  borderRadius: 999,
  background: "#edf5f1",
  color: "#245845",
  border: "1px solid rgba(47,125,98,0.18)",
  fontSize: 12,
  fontWeight: 900,
};

const mutedStyle: React.CSSProperties = {
  marginTop: 8,
  fontSize: 12,
  color: "#7c7267",
};