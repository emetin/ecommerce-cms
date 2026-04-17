"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import CartButton from "../cart/CartButton";

const navigation = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about-us" },
  { label: "Collections", href: "/collections" },
  { label: "Products", href: "/products" },
  { label: "Order Lookup", href: "/order-lookup" },
  { label: "Contact Us", href: "/contact-us" },
];

type CustomerSessionResponse = {
  ok: boolean;
  authenticated?: boolean;
  customer?: {
    customerId?: string;
    email?: string;
    companyName?: string;
    contactName?: string;
    priceTier?: string;
    currency?: string;
  } | null;
};

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();

  const [customer, setCustomer] = useState<CustomerSessionResponse["customer"]>(
    null
  );
  const [loadingCustomer, setLoadingCustomer] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadCustomer() {
      try {
        const response = await fetch("/api/customer-auth/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const data = (await response.json()) as CustomerSessionResponse;

        if (!active) return;

        if (response.ok && data?.authenticated && data?.customer) {
          setCustomer(data.customer);
        } else {
          setCustomer(null);
        }
      } catch {
        if (!active) return;
        setCustomer(null);
      } finally {
        if (active) {
          setLoadingCustomer(false);
        }
      }
    }

    loadCustomer();

    return () => {
      active = false;
    };
  }, [pathname]);

  const customerLabel = useMemo(() => {
    const contact = String(customer?.contactName || "").trim();
    const company = String(customer?.companyName || "").trim();

    return contact || company || "My Account";
  }, [customer]);

  async function handleLogout() {
    try {
      setLoggingOut(true);

      await fetch("/api/customer-auth/logout", {
        method: "POST",
        credentials: "include",
      });

      setCustomer(null);
      router.push("/portal-login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "rgba(255,255,255,0.88)",
        backdropFilter: "blur(14px)",
        borderBottom: "1px solid #ebe2d5",
      }}
    >
      <div
        style={{
          maxWidth: 1320,
          margin: "0 auto",
          padding: "0 20px",
        }}
      >
        <div
          style={{
            minHeight: 82,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 20,
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/"
            style={{
              textDecoration: "none",
              color: "#171717",
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              minWidth: 0,
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background:
                  "linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 900,
                fontSize: 16,
                letterSpacing: "0.04em",
                flexShrink: 0,
              }}
            >
              GF
            </div>

            <div style={{ display: "grid", gap: 2 }}>
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.1,
                  fontFamily: "var(--font-heading)",
                }}
              >
                Globaltex Fine Linens
              </span>
              <span
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "#7a7064",
                  fontWeight: 800,
                }}
              >
                Luxury Hospitality Textiles
              </span>
            </div>
          </Link>

          <nav
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            {navigation.map((item) => {
              const active = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    textDecoration: "none",
                    minHeight: 42,
                    padding: "0 16px",
                    borderRadius: 999,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    fontWeight: 800,
                    letterSpacing: "0.01em",
                    color: active ? "#ffffff" : "#2f2a24",
                    background: active ? "var(--primary)" : "transparent",
                    border: active
                      ? "1px solid var(--primary)"
                      : "1px solid transparent",
                    transition: "all 0.2s ease",
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
              justifyContent: "flex-end",
            }}
          >
            <CartButton />

            {!loadingCustomer && customer ? (
              <>
                <Link
                  href="/account"
                  style={{
                    textDecoration: "none",
                    minHeight: 44,
                    padding: "0 16px",
                    borderRadius: 14,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    fontWeight: 800,
                    color: "#171717",
                    background: "#fff",
                    border: "1px solid #ddd3c5",
                    whiteSpace: "nowrap",
                    maxWidth: 180,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={customerLabel}
                >
                  {customerLabel}
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  style={{
                    minHeight: 44,
                    padding: "0 16px",
                    borderRadius: 14,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    fontWeight: 800,
                    color: "#171717",
                    background: "#fff",
                    border: "1px solid #ddd3c5",
                    whiteSpace: "nowrap",
                    cursor: loggingOut ? "not-allowed" : "pointer",
                    opacity: loggingOut ? 0.65 : 1,
                  }}
                >
                  {loggingOut ? "Signing Out..." : "Logout"}
                </button>
              </>
            ) : (
              <Link
                href="/portal-login"
                style={{
                  textDecoration: "none",
                  minHeight: 46,
                  padding: "0 18px",
                  borderRadius: 14,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 800,
                  color: "#171717",
                  background: "#fff",
                  border: "1px solid #ddd3c5",
                  whiteSpace: "nowrap",
                }}
              >
                Login
              </Link>
            )}

            <Link
              href="/contact-us"
              style={{
                textDecoration: "none",
                minHeight: 46,
                padding: "0 18px",
                borderRadius: 14,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 800,
                color: "#ffffff",
                background: "var(--primary)",
                border: "1px solid var(--primary)",
                whiteSpace: "nowrap",
              }}
            >
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}