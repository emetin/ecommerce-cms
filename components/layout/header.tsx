"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
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

const CUSTOMER_CACHE_KEY = "ptx_customer_session_cache";
const CUSTOMER_CACHE_TTL_MS = 5 * 60 * 1000;

function readCustomerCache() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(CUSTOMER_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as {
      expiresAt?: number;
      customer?: CustomerSessionResponse["customer"];
    };

    if (!parsed.expiresAt || parsed.expiresAt < Date.now()) {
      window.sessionStorage.removeItem(CUSTOMER_CACHE_KEY);
      return null;
    }

    return parsed.customer || null;
  } catch {
    window.sessionStorage.removeItem(CUSTOMER_CACHE_KEY);
    return null;
  }
}

function writeCustomerCache(customer: CustomerSessionResponse["customer"]) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (!customer) {
      window.sessionStorage.removeItem(CUSTOMER_CACHE_KEY);
      return;
    }

    window.sessionStorage.setItem(
      CUSTOMER_CACHE_KEY,
      JSON.stringify({
        customer,
        expiresAt: Date.now() + CUSTOMER_CACHE_TTL_MS,
      })
    );
  } catch {
    // sessionStorage private mode veya browser kısıtında hata verebilir.
  }
}

function clearCustomerCache() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(CUSTOMER_CACHE_KEY);
  } catch {
    // ignore
  }
}

function useResponsiveHeader() {
  const [isMenuLayout, setIsMenuLayout] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const update = () => {
      setIsMenuLayout(window.innerWidth <= 1180);
    };

    update();
    window.addEventListener("resize", update);

    return () => window.removeEventListener("resize", update);
  }, []);

  return {
    isMenuLayout,
  };
}

export default function Header() {
  const pathname = usePathname();
  const { isMenuLayout } = useResponsiveHeader();

  const [customer, setCustomer] = useState<CustomerSessionResponse["customer"]>(
    null
  );
  const [loadingCustomer, setLoadingCustomer] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const loadCustomer = useCallback(
    async (options?: { force?: boolean }) => {
      try {
        if (!options?.force) {
          const cachedCustomer = readCustomerCache();

          if (cachedCustomer) {
            setCustomer(cachedCustomer);
            setLoadingCustomer(false);
            return;
          }
        }

        const response = await fetch("/api/customer-auth/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const data = (await response.json()) as CustomerSessionResponse;

        if (response.ok && data?.authenticated && data?.customer) {
          setCustomer(data.customer);
          writeCustomerCache(data.customer);
        } else {
          setCustomer(null);
          writeCustomerCache(null);
        }
      } catch {
        setCustomer(null);
        writeCustomerCache(null);
      } finally {
        setLoadingCustomer(false);
      }
    },
    []
  );

  useEffect(() => {
    const cachedCustomer = readCustomerCache();

    if (cachedCustomer) {
      setCustomer(cachedCustomer);
      setLoadingCustomer(false);
      return;
    }

    void loadCustomer();
  }, [loadCustomer]);

  useEffect(() => {
    const shouldRefreshCustomer =
      pathname === "/portal-login" ||
      pathname.startsWith("/account") ||
      pathname.startsWith("/portal");

    if (!shouldRefreshCustomer) return;

    void loadCustomer({ force: true });
  }, [pathname, loadCustomer]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMenuLayout) {
      setMenuOpen(false);
    }
  }, [isMenuLayout]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    document.body.style.overflow = menuOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

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

      clearCustomerCache();
      setCustomer(null);
      window.location.href = "/portal-login";
    } finally {
      setLoggingOut(false);
    }
  }

  const desktopRightActions = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "nowrap",
        justifyContent: "flex-end",
        minWidth: 0,
        flexShrink: 0,
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
              maxWidth: 140,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              flexShrink: 0,
            }}
            title={customerLabel}
          >
            <span
              style={{
                display: "block",
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {customerLabel}
            </span>
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
              flexShrink: 0,
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
            flexShrink: 0,
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
          flexShrink: 0,
        }}
      >
        Contact Us
      </Link>
    </div>
  );

  return (
    <>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 110,
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(14px)",
          borderBottom: "1px solid #ebe2d5",
          width: "100%",
          overflowX: "clip",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 1480,
            margin: "0 auto",
            padding: "0 16px",
            overflowX: "clip",
          }}
        >
          <div
            style={{
              minHeight: 82,
              width: "100%",
              display: "grid",
              gridTemplateColumns: isMenuLayout
                ? "minmax(0,1fr) auto"
                : "auto minmax(0,1fr) auto",
              alignItems: "center",
              gap: isMenuLayout ? 12 : 20,
            }}
          >
            <Link
              href="/"
              style={{
                textDecoration: "none",
                color: "#171717",
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                minWidth: 0,
                maxWidth: isMenuLayout ? "calc(100vw - 110px)" : "100%",
                flexShrink: 1,
                padding: "14px 0",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: isMenuLayout ? 36 : 42,
                  height: isMenuLayout ? 36 : 42,
                  borderRadius: 12,
                  background:
                    "linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontWeight: 900,
                  fontSize: isMenuLayout ? 14 : 16,
                  letterSpacing: "0.04em",
                  flexShrink: 0,
                }}
              >
                GF
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 2,
                  minWidth: 0,
                  overflow: "hidden",
                }}
              >
                <span
                  style={{
                    fontSize: isMenuLayout ? 13 : 18,
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                    lineHeight: 1.1,
                    fontFamily: "var(--font-heading)",
                    whiteSpace: isMenuLayout ? "normal" : "nowrap",
                    wordBreak: "break-word",
                  }}
                >
                  Globaltex Fine Linens
                </span>

                <span
                  style={{
                    fontSize: isMenuLayout ? 8.5 : 11,
                    textTransform: "uppercase",
                    letterSpacing: isMenuLayout ? "0.04em" : "0.08em",
                    color: "#7a7064",
                    fontWeight: 800,
                    whiteSpace: isMenuLayout ? "normal" : "nowrap",
                    wordBreak: "break-word",
                    lineHeight: 1.25,
                  }}
                >
                  Luxury Hospitality Textiles
                </span>
              </div>
            </Link>

            {!isMenuLayout ? (
              <>
                <nav
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    flexWrap: "nowrap",
                    minWidth: 0,
                    overflow: "hidden",
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
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>

                {desktopRightActions}
              </>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  justifyContent: "flex-end",
                  flexShrink: 0,
                }}
              >
                <CartButton />

                <button
                  type="button"
                  onClick={() => setMenuOpen((prev) => !prev)}
                  aria-label={menuOpen ? "Close menu" : "Open menu"}
                  aria-expanded={menuOpen}
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    border: "1px solid #ddd3c5",
                    background: "#fff",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    padding: 0,
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      width: 18,
                      display: "grid",
                      gap: 4,
                    }}
                  >
                    <span
                      style={{
                        display: "block",
                        height: 2,
                        background: "#171717",
                        borderRadius: 999,
                        transform: menuOpen
                          ? "translateY(6px) rotate(45deg)"
                          : "none",
                        transition: "all 0.2s ease",
                      }}
                    />
                    <span
                      style={{
                        display: "block",
                        height: 2,
                        background: "#171717",
                        borderRadius: 999,
                        opacity: menuOpen ? 0 : 1,
                        transition: "all 0.2s ease",
                      }}
                    />
                    <span
                      style={{
                        display: "block",
                        height: 2,
                        background: "#171717",
                        borderRadius: 999,
                        transform: menuOpen
                          ? "translateY(-6px) rotate(-45deg)"
                          : "none",
                        transition: "all 0.2s ease",
                      }}
                    />
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {isMenuLayout ? (
        <>
          {menuOpen ? (
            <div
              onClick={() => setMenuOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.35)",
                zIndex: 108,
              }}
            />
          ) : null}

          <aside
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              width: "100%",
              maxWidth: 360,
              height: "100vh",
              background: "#fff",
              zIndex: 109,
              transform: menuOpen ? "translateX(0)" : "translateX(100%)",
              transition: "transform 0.26s ease",
              boxShadow: "-10px 0 34px rgba(0,0,0,0.14)",
              display: "flex",
              flexDirection: "column",
              overflowX: "hidden",
            }}
          >
            <div
              style={{
                minHeight: 82,
                padding: "18px 18px",
                borderBottom: "1px solid #ece3d7",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div style={{ display: "grid", gap: 2, minWidth: 0 }}>
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    fontFamily: "var(--font-heading)",
                    color: "#171717",
                    lineHeight: 1.1,
                  }}
                >
                  Menu
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: "#7a7064",
                    fontWeight: 700,
                  }}
                >
                  Globaltex Fine Linens
                </span>
              </div>

              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  border: "1px solid #ddd3c5",
                  background: "#fff",
                  fontSize: 24,
                  lineHeight: 1,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: "auto",
                overflowX: "hidden",
                padding: "20px 18px 28px",
                display: "grid",
                alignContent: "start",
                gap: 24,
              }}
            >
              <nav
                style={{
                  display: "grid",
                  gap: 10,
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
                        minHeight: 50,
                        padding: "0 16px",
                        borderRadius: 14,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: 15,
                        fontWeight: 800,
                        color: active ? "#ffffff" : "#2f2a24",
                        background: active ? "var(--primary)" : "#faf7f1",
                        border: active
                          ? "1px solid var(--primary)"
                          : "1px solid #ebe2d5",
                      }}
                    >
                      <span>{item.label}</span>
                      <span style={{ opacity: 0.7 }}>›</span>
                    </Link>
                  );
                })}
              </nav>

              <div
                style={{
                  display: "grid",
                  gap: 12,
                  paddingTop: 4,
                }}
              >
                {!loadingCustomer && customer ? (
                  <>
                    <Link
                      href="/account"
                      style={{
                        textDecoration: "none",
                        minHeight: 48,
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
                      }}
                    >
                      {customerLabel}
                    </Link>

                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={loggingOut}
                      style={{
                        minHeight: 48,
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
                      minHeight: 48,
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
                    }}
                  >
                    Login
                  </Link>
                )}

                <Link
                  href="/contact-us"
                  style={{
                    textDecoration: "none",
                    minHeight: 50,
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
                  }}
                >
                  Contact Us
                </Link>
              </div>
            </div>
          </aside>
        </>
      ) : null}
    </>
  );
}