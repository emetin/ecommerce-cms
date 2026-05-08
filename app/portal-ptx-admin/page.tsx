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
          setError(
            "Security validation could not be loaded. Please refresh the page."
          );
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
        nextPath?: string;
      };

      if (!response.ok || !data?.ok) {
        setError(data?.error || "Login failed.");
        return;
      }

      router.replace(data.nextPath || "/admin");
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
          maxWidth: 460,
          background: "rgba(255,255,255,0.96)",
          borderRadius: 18,
          padding: 28,
          boxShadow: "0 20px 70px rgba(0,0,0,0.10)",
          border: "1px solid #e6ddd0",
        }}
      >
        <div style={{ marginBottom: 22 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#8a7f72",
              marginBottom: 9,
            }}
          >
            Globaltex Fine Linens
          </div>

          <h1
            style={{
              fontSize: 30,
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
              marginTop: 10,
              marginBottom: 0,
              fontSize: 14,
              lineHeight: 1.65,
              color: "#5f564c",
            }}
          >
            Access the internal management panel for B2B hospitality operations.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <label
            htmlFor="username"
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 700,
              color: "#171717",
              marginBottom: 7,
            }}
          >
            Email
          </label>

          <input
            id="username"
            name="username"
            type="email"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="admin@globaltexusa.com"
            style={{
              width: "100%",
              height: 44,
              borderRadius: 12,
              border: "1px solid #d9cfbf",
              padding: "0 13px",
              fontSize: 14,
              marginBottom: 14,
              outline: "none",
              background: "#fcfbf8",
            }}
          />

          <label
            htmlFor="password"
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 700,
              color: "#171717",
              marginBottom: 7,
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
              height: 44,
              borderRadius: 12,
              border: "1px solid #d9cfbf",
              padding: "0 13px",
              fontSize: 14,
              marginBottom: 14,
              outline: "none",
              background: "#fcfbf8",
            }}
          />

          {error ? (
            <div
              style={{
                marginBottom: 14,
                borderRadius: 12,
                padding: "10px 12px",
                background: "#fff1f1",
                color: "#b42318",
                fontSize: 13,
                lineHeight: 1.6,
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
              height: 46,
              border: "none",
              borderRadius: 12,
              background: "#171717",
              color: "#ffffff",
              fontSize: 14,
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
            marginTop: 14,
            fontSize: 12,
            lineHeight: 1.6,
            color: "#6b6258",
            background: "#f8f5ef",
            border: "1px solid #e8dfd2",
            borderRadius: 12,
            padding: "10px 12px",
          }}
        >
          First-time users may be asked to set a new password after login.
        </div>
      </div>
    </main>
  );
}