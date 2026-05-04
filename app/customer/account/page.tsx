"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Customer = {
  customerId: string;
  email: string;
  companyName: string;
  contactName: string;
  priceTier: string;
  currency: string;
  mustChangePassword: boolean;
};

type MeResponse = {
  ok: boolean;
  authenticated: boolean;
  customer?: Customer | null;
  error?: string;
};

type LogoutResponse = {
  ok: boolean;
  message?: string;
  error?: string;
};

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

export default function CustomerAccountPage() {
  const router = useRouter();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadCustomer() {
    try {
      setLoading(true);
      setErrorMessage("");

      const response = await fetch("/api/customer-auth/me", {
        cache: "no-store",
      });

      const data = await readJsonResponse<MeResponse>(
        response,
        "Failed to load customer session."
      );

      if (!data.ok || !data.authenticated || !data.customer) {
        router.replace("/customer/login");
        return;
      }

      if (data.customer.mustChangePassword) {
        router.replace("/customer/change-password");
        return;
      }

      setCustomer(data.customer);
    } catch (error) {
      setCustomer(null);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Customer account could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogout() {
    try {
      setLoggingOut(true);
      setErrorMessage("");

      const response = await fetch("/api/customer-auth/logout", {
        method: "POST",
      });

      const data = await readJsonResponse<LogoutResponse>(
        response,
        "Logout request failed."
      );

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Logout request failed.");
      }

      router.replace("/customer/login");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Logout request failed."
      );
    } finally {
      setLoggingOut(false);
    }
  }

  const initials = useMemo(() => {
    const base =
      customer?.companyName ||
      customer?.contactName ||
      customer?.email ||
      "Customer";

    return base
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  }, [customer]);

  if (loading) {
    return (
      <main style={pageStyle}>
        <div style={loadingCardStyle}>Loading account...</div>
      </main>
    );
  }

  if (!customer) {
    return (
      <main style={pageStyle}>
        <div style={errorBoxStyle}>
          {errorMessage || "Customer session could not be loaded."}
        </div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <section style={headerCardStyle}>
        <div style={identityStyle}>
          <div style={avatarStyle}>{initials || "C"}</div>

          <div>
            <div style={eyebrowStyle}>Customer Portal</div>
            <h1 style={titleStyle}>
              {customer.companyName || "Customer Account"}
            </h1>
            <p style={subtitleStyle}>
              Welcome back, {customer.contactName || customer.email}. Manage
              your account, orders, quotes, and B2B preferences.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          style={logoutButtonStyle}
        >
          {loggingOut ? "Logging out..." : "Logout"}
        </button>
      </section>

      {errorMessage ? <div style={errorBoxStyle}>{errorMessage}</div> : null}

      <section style={metricsGridStyle}>
        <InfoCard label="Email" value={customer.email || "-"} />
        <InfoCard label="Price Tier" value={customer.priceTier || "standard"} />
        <InfoCard label="Currency" value={customer.currency || "USD"} />
        <InfoCard
          label="Password Status"
          value={
            customer.mustChangePassword
              ? "Password change required"
              : "Active"
          }
        />
      </section>

      <section style={contentGridStyle}>
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div>
              <div style={eyebrowStyle}>Account</div>
              <h2 style={panelTitleStyle}>Company Details</h2>
            </div>
          </div>

          <div style={detailGridStyle}>
            <DetailRow label="Customer ID" value={customer.customerId} />
            <DetailRow label="Company" value={customer.companyName || "-"} />
            <DetailRow label="Contact" value={customer.contactName || "-"} />
            <DetailRow label="Email" value={customer.email || "-"} />
            <DetailRow label="Price Tier" value={customer.priceTier || "-"} />
            <DetailRow label="Currency" value={customer.currency || "-"} />
          </div>
        </div>

        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div>
              <div style={eyebrowStyle}>Quick Access</div>
              <h2 style={panelTitleStyle}>Customer Tools</h2>
            </div>
          </div>

          <div style={quickLinksStyle}>
            <a href="/customer/orders" style={quickLinkStyle}>
              <strong>Order History</strong>
              <span>View submitted and processed B2B orders.</span>
            </a>

            <a href="/customer/draft-orders" style={quickLinkStyle}>
              <strong>Quotes & Draft Orders</strong>
              <span>Review quotes prepared by the sales team.</span>
            </a>

            <a href="/customer/account" style={quickLinkStyle}>
              <strong>Account Details</strong>
              <span>Manage your company and contact information.</span>
            </a>
          </div>
        </div>
      </section>

      <section style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div>
            <div style={eyebrowStyle}>Next Step</div>
            <h2 style={panelTitleStyle}>Order History Module</h2>
          </div>
        </div>

        <p style={paragraphStyle}>
          The customer portal login is now connected. The next step is to add
          customer-specific order history and draft order history endpoints, so
          this account page can show real order records for this customer.
        </p>
      </section>
    </main>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={infoCardStyle}>
      <div style={infoLabelStyle}>{label}</div>
      <div style={infoValueStyle}>{value}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={detailRowStyle}>
      <span>{label}</span>
      <strong>{value || "-"}</strong>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#f6f3ee",
  color: "#171717",
  padding: 24,
  display: "grid",
  gap: 14,
  alignContent: "start",
};

const headerCardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e2d8cb",
  borderRadius: 18,
  padding: 18,
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 16,
  flexWrap: "wrap",
};

const identityStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "56px minmax(0, 1fr)",
  gap: 14,
  alignItems: "start",
};

const avatarStyle: React.CSSProperties = {
  width: 56,
  height: 56,
  borderRadius: 18,
  background:
    "linear-gradient(135deg, var(--primary, #c9a73f), var(--primary-dark, #8f7327))",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 900,
  letterSpacing: "0.04em",
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#8a7f72",
  fontWeight: 900,
  marginBottom: 5,
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  color: "#171717",
  fontSize: 30,
  lineHeight: 1.05,
  fontWeight: 900,
};

const subtitleStyle: React.CSSProperties = {
  margin: "8px 0 0",
  color: "#6f6559",
  fontSize: 13,
  lineHeight: 1.55,
  maxWidth: 780,
};

const logoutButtonStyle: React.CSSProperties = {
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

const infoCardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e2d8cb",
  borderRadius: 14,
  padding: 14,
  display: "grid",
  gap: 5,
};

const infoLabelStyle: React.CSSProperties = {
  color: "#756b60",
  fontSize: 12,
  fontWeight: 900,
};

const infoValueStyle: React.CSSProperties = {
  color: "#171717",
  fontSize: 18,
  fontWeight: 900,
  wordBreak: "break-word",
};

const contentGridStyle: React.CSSProperties = {
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
  marginBottom: 12,
};

const panelTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#171717",
  fontSize: 18,
  fontWeight: 900,
};

const detailGridStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
};

const detailRowStyle: React.CSSProperties = {
  minHeight: 40,
  border: "1px solid #eee5d9",
  background: "#fcfbf8",
  borderRadius: 10,
  padding: "8px 10px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  color: "#756b60",
  fontSize: 13,
};

const quickLinksStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
};

const quickLinkStyle: React.CSSProperties = {
  minHeight: 58,
  border: "1px solid #eee5d9",
  background: "#fcfbf8",
  borderRadius: 12,
  padding: 12,
  display: "grid",
  gap: 4,
  color: "#171717",
  textDecoration: "none",
};

const paragraphStyle: React.CSSProperties = {
  margin: 0,
  color: "#6f6559",
  fontSize: 13,
  lineHeight: 1.6,
};

const errorBoxStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 12,
  background: "#fff1f1",
  border: "1px solid #f0c9c9",
  color: "#8d2f2f",
  fontWeight: 800,
};

const loadingCardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e2d8cb",
  borderRadius: 14,
  padding: 16,
  color: "#756b60",
  fontWeight: 800,
};