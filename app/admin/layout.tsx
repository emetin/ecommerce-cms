"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f6f3ee",
        color: "#171717",
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(246, 243, 238, 0.96)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid #e3dbcf",
        }}
      >
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            padding: "18px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 20,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 14,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#8a7f72",
                marginBottom: 6,
                fontWeight: 700,
              }}
            >
              Globaltex Fine Linens
            </div>

            <div
              style={{
                fontSize: 32,
                fontWeight: 800,
                lineHeight: 1,
                fontFamily: "var(--font-heading)",
              }}
            >
              Globaltex Admin
            </div>

            <div
              style={{
                marginTop: 8,
                fontSize: 13,
                color: "#6f6559",
              }}
            >
              Hospitality B2B Management Panel
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <Link href="/" style={viewSiteButtonStyle}>
              View Public Site
            </Link>

            <form method="POST" action="/api/admin-auth/logout" style={{ margin: 0 }}>
              <button type="submit" style={logoutButtonStyle}>
                Logout
              </button>
            </form>
          </div>
        </div>

        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            padding: "0 24px 18px",
          }}
        >
          <nav
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <AdminNavLink href="/admin" currentPath={pathname}>
              Dashboard
            </AdminNavLink>

            <AdminNavLink href="/admin/products" currentPath={pathname}>
              Products
            </AdminNavLink>

            <AdminNavLink href="/admin/collections" currentPath={pathname}>
              Collections
            </AdminNavLink>

            <AdminNavLink href="/admin/blog" currentPath={pathname}>
              Blog
            </AdminNavLink>

            <AdminNavLink href="/admin/customer-applications" currentPath={pathname}>
              Applications
            </AdminNavLink>

            <AdminNavLink href="/admin/customers" currentPath={pathname}>
              Customers
            </AdminNavLink>

            <AdminNavLink href="/admin/orders" currentPath={pathname}>
              Orders
            </AdminNavLink>
          </nav>
        </div>
      </header>

      <main
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "28px 24px 48px",
        }}
      >
        {children}
      </main>
    </div>
  );
}

function AdminNavLink({
  href,
  currentPath,
  children,
}: {
  href: string;
  currentPath: string;
  children: ReactNode;
}) {
  const isActive =
    href === "/admin"
      ? currentPath === "/admin"
      : currentPath === href || currentPath.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 46,
        padding: "0 18px",
        borderRadius: 999,
        textDecoration: "none",
        background: isActive ? "var(--primary)" : "#fff",
        color: isActive ? "#fff" : "#171717",
        fontWeight: 700,
        border: isActive
          ? "1px solid var(--primary)"
          : "1px solid #ddd3c5",
        boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
        transition: "all 0.2s ease",
      }}
    >
      {children}
    </Link>
  );
}

const viewSiteButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 46,
  padding: "0 18px",
  borderRadius: 999,
  textDecoration: "none",
  background: "var(--primary)",
  color: "#fff",
  fontWeight: 700,
  border: "1px solid var(--primary)",
};

const logoutButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 46,
  padding: "0 18px",
  borderRadius: 999,
  background: "#fff",
  color: "#171717",
  fontWeight: 700,
  border: "1px solid #ddd3c5",
  cursor: "pointer",
};