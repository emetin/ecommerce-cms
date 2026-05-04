"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type LoginResponse = {
  ok: boolean;
  error?: string;
  message?: string;
  next_path?: string;
  customer?: {
    customerId: string;
    email: string;
    companyName: string;
    contactName: string;
    priceTier: string;
    currency: string;
    mustChangePassword: boolean;
  };
};

type MeResponse = {
  ok: boolean;
  authenticated: boolean;
  customer?: {
    customerId: string;
    email: string;
    companyName: string;
    contactName: string;
    priceTier: string;
    currency: string;
    mustChangePassword: boolean;
  } | null;
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

export default function CustomerLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    async function checkCurrentSession() {
      try {
        const response = await fetch("/api/customer-auth/me", {
          cache: "no-store",
        });

        const data = await readJsonResponse<MeResponse>(
          response,
          "Failed to check customer session."
        );

        if (data.ok && data.authenticated && data.customer) {
          router.replace(
            data.customer.mustChangePassword
              ? "/customer/change-password"
              : "/customer/account"
          );
        }
      } catch {
        // Login page should stay available even if session check fails.
      } finally {
        setCheckingSession(false);
      }
    }

    checkCurrentSession();
  }, [router]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      const response = await fetch("/api/customer-auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await readJsonResponse<LoginResponse>(
        response,
        "Login request failed."
      );

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Invalid email or password.");
      }

      setSuccessMessage(data.message || "Login successful.");

      const nextPath = data.next_path?.startsWith("/")
        ? `/customer${data.next_path === "/account" ? "/account" : data.next_path}`
        : "/customer/account";

      router.replace(nextPath);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Login request failed."
      );
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <main style={pageStyle}>
        <section style={cardStyle}>
          <div style={loadingTextStyle}>Checking session...</div>
        </section>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <section style={cardStyle}>
        <div style={brandBlockStyle}>
          <div style={logoStyle}>GF</div>
          <div>
            <div style={eyebrowStyle}>Globaltex Fine Linens</div>
            <h1 style={titleStyle}>Customer Portal</h1>
            <p style={subtitleStyle}>
              Sign in to access your B2B account, order history, quotes, and
              account details.
            </p>
          </div>
        </div>

        {errorMessage ? <div style={errorBoxStyle}>{errorMessage}</div> : null}
        {successMessage ? (
          <div style={successBoxStyle}>{successMessage}</div>
        ) : null}

        <form onSubmit={handleLogin} style={formStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Email</label>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="email"
              placeholder="customer@example.com"
              style={inputStyle}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Password</label>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              style={inputStyle}
            />
          </div>

          <button type="submit" disabled={loading} style={primaryButtonStyle}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div style={footerNoteStyle}>
          If you do not have access yet, please contact your Globaltex sales
          representative.
        </div>
      </section>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background:
    "linear-gradient(135deg, #f6f3ee 0%, #ffffff 45%, #f8f5ef 100%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
};

const cardStyle: React.CSSProperties = {
  width: "min(480px, 100%)",
  background: "#fff",
  border: "1px solid #e2d8cb",
  borderRadius: 22,
  padding: 26,
  boxShadow: "0 24px 80px rgba(23,23,23,0.08)",
  display: "grid",
  gap: 18,
};

const brandBlockStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "52px minmax(0, 1fr)",
  gap: 14,
  alignItems: "start",
};

const logoStyle: React.CSSProperties = {
  width: 52,
  height: 52,
  borderRadius: 16,
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
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "#8a7f72",
  fontWeight: 900,
  marginBottom: 6,
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
};

const formStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
};

const fieldStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
};

const labelStyle: React.CSSProperties = {
  color: "#171717",
  fontSize: 12,
  fontWeight: 900,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 44,
  border: "1px solid #d8cebf",
  borderRadius: 12,
  background: "#fcfbf8",
  color: "#171717",
  padding: "0 12px",
  outline: "none",
  fontSize: 14,
};

const primaryButtonStyle: React.CSSProperties = {
  minHeight: 44,
  borderRadius: 12,
  border: "1px solid #2f7d62",
  background: "#2f7d62",
  color: "#fff",
  padding: "0 16px",
  fontSize: 14,
  fontWeight: 900,
  cursor: "pointer",
};

const errorBoxStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 12,
  background: "#fff1f1",
  border: "1px solid #f0c9c9",
  color: "#8d2f2f",
  fontSize: 13,
  fontWeight: 800,
};

const successBoxStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 12,
  background: "#eef8f0",
  border: "1px solid #cfe7d8",
  color: "#1d6a43",
  fontSize: 13,
  fontWeight: 800,
};

const footerNoteStyle: React.CSSProperties = {
  color: "#756b60",
  fontSize: 12,
  lineHeight: 1.5,
  borderTop: "1px solid #eee5d9",
  paddingTop: 14,
};

const loadingTextStyle: React.CSSProperties = {
  color: "#756b60",
  fontWeight: 800,
};