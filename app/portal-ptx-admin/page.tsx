"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function PortalAdminLoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [csrfToken, setCsrfToken] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCsrf, setIsLoadingCsrf] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadCsrf() {
      try {
        const response = await fetch("/api/admin-auth/csrf", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const data = (await response.json()) as {
          ok?: boolean;
          csrfToken?: string;
        };

        if (!response.ok || !data?.ok || !data?.csrfToken) {
          throw new Error("CSRF token could not be loaded.");
        }

        if (isMounted) {
          setCsrfToken(data.csrfToken);
        }
      } catch {
        if (isMounted) {
          setError("Security validation could not be loaded. Please refresh the page.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingCsrf(false);
        }
      }
    }

    loadCsrf();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!csrfToken) {
      setError("Security validation is not ready yet.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin-auth/login", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || !data?.ok) {
        setError(data?.error || "Login failed.");
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setError("A connection error occurred during login.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "32px 16px",
        background:
          "linear-gradient(180deg, #f7f4ee 0%, #f2ede4 45%, #ece5d8 100%)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          background: "rgba(255,255,255,0.96)",
          borderRadius: 24,
          padding: 32,
          boxShadow: "0 24px 80px rgba(0,0,0,0.10)",
          border: "1px solid #e6ddd0",
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#8a7f72",
              marginBottom: 10,
            }}
          >
            Globaltex Fine Linens
          </div>

          <h1
            style={{
              fontSize: 32,
              lineHeight: 1.12,
              margin: 0,
              color: "#171717",
              fontWeight: 800,
            }}
          >
            Globaltex Admin Login
          </h1>

          <p
            style={{
              marginTop: 12,
              marginBottom: 0,
              fontSize: 15,
              lineHeight: 1.75,
              color: "#5f564c",
            }}
          >
            Access the internal management panel for hospitality collections,
            customer applications, B2B orders, and account operations.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <label
            htmlFor="username"
            style={{
              display: "block",
              fontSize: 14,
              fontWeight: 700,
              color: "#171717",
              marginBottom: 8,
            }}
          >
            Username
          </label>

          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="admin"
            style={{
              width: "100%",
              height: 50,
              borderRadius: 14,
              border: "1px solid #d9cfbf",
              padding: "0 14px",
              fontSize: 15,
              marginBottom: 16,
              outline: "none",
              background: "#fcfbf8",
            }}
          />

          <label
            htmlFor="password"
            style={{
              display: "block",
              fontSize: 14,
              fontWeight: 700,
              color: "#171717",
              marginBottom: 8,
            }}
          >
            Password
          </label>

          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            style={{
              width: "100%",
              height: 50,
              borderRadius: 14,
              border: "1px solid #d9cfbf",
              padding: "0 14px",
              fontSize: 15,
              marginBottom: 16,
              outline: "none",
              background: "#fcfbf8",
            }}
          />

          {error ? (
            <div
              style={{
                marginBottom: 16,
                borderRadius: 14,
                padding: "12px 14px",
                background: "#fff1f1",
                color: "#b42318",
                fontSize: 14,
                lineHeight: 1.7,
                border: "1px solid #f0c9c9",
              }}
            >
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting || isLoadingCsrf}
            style={{
              width: "100%",
              height: 52,
              border: "none",
              borderRadius: 14,
              background: "#171717",
              color: "#ffffff",
              fontSize: 15,
              fontWeight: 800,
              cursor:
                isSubmitting || isLoadingCsrf ? "not-allowed" : "pointer",
              opacity: isSubmitting || isLoadingCsrf ? 0.7 : 1,
            }}
          >
            {isLoadingCsrf
              ? "Preparing security..."
              : isSubmitting
              ? "Signing in..."
              : "Sign In"}
          </button>
        </form>

        <div
          style={{
            marginTop: 16,
            fontSize: 13,
            lineHeight: 1.7,
            color: "#6b6258",
            background: "#f8f5ef",
            border: "1px solid #e8dfd2",
            borderRadius: 14,
            padding: "12px 14px",
          }}
        >
          Password recovery is intentionally disabled for security.
          Admin password changes must be performed securely by updating the
          server environment variables.
        </div>
      </div>
    </main>
  );
}