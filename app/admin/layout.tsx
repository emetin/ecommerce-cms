"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  children?: {
    href: string;
    label: string;
  }[];
};

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/collections", label: "Collections" },
  { href: "/admin/blog", label: "Blog" },
  { href: "/admin/media", label: "Media" },
  { href: "/admin/customer-applications", label: "Applications" },
  { href: "/admin/customers", label: "Customers" },
  {
    href: "/admin/orders",
    label: "Orders",
    children: [
      { href: "/admin/orders", label: "All Orders" },
      { href: "/admin/draft-orders", label: "Draft Orders" },
      { href: "/admin/abandoned-checkouts", label: "Abandoned Checkouts" },
      { href: "/admin/checkout-analytics", label: "Checkout Analytics" },
    ],
  },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/users", label: "Users & Roles" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div
      style={{
        minHeight: "100vh",
        height: "100vh",
        background: "#f6f3ee",
        color: "#171717",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "280px minmax(0, 1fr)",
          height: "100vh",
        }}
      >
        <aside
          style={{
            height: "100vh",
            borderRight: "1px solid #e5ddd1",
            background: "linear-gradient(180deg, #f8f5ef 0%, #f4efe7 100%)",
            display: "grid",
            gridTemplateRows: "auto minmax(0, 1fr) auto",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "26px 20px 18px",
              borderBottom: "1px solid #ece3d7",
            }}
          >
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 14,
                background:
                  "linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 900,
                fontSize: 16,
                letterSpacing: "0.04em",
                marginBottom: 16,
              }}
            >
              GF
            </div>

            <div
              style={{
                fontSize: 12,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#8a7f72",
                marginBottom: 8,
                fontWeight: 800,
              }}
            >
              Globaltex Fine Linens
            </div>

            <div
              style={{
                fontSize: 30,
                fontWeight: 800,
                lineHeight: 1,
                fontFamily: "var(--font-heading)",
                color: "#171717",
              }}
            >
              Admin
            </div>

            <div
              style={{
                marginTop: 10,
                fontSize: 13,
                color: "#6f6559",
                lineHeight: 1.6,
              }}
            >
              Hospitality B2B Management Panel
            </div>
          </div>

          <div
            style={{
              minHeight: 0,
              overflowY: "auto",
              padding: "18px 14px",
            }}
          >
            <nav
              style={{
                display: "grid",
                gap: 6,
              }}
            >
              {NAV_ITEMS.map((item) => (
                <AdminNavItem
                  key={item.href}
                  item={item}
                  currentPath={pathname}
                />
              ))}
            </nav>
          </div>

          <div
            style={{
              padding: "16px 14px 18px",
              borderTop: "1px solid #ece3d7",
              background: "rgba(248,245,239,0.96)",
              backdropFilter: "blur(8px)",
              display: "grid",
              gap: 10,
            }}
          >
            <Link href="/" style={viewSiteButtonStyle}>
              View Public Site
            </Link>

            <form
              method="POST"
              action="/api/admin-auth/logout"
              style={{ margin: 0 }}
            >
              <button type="submit" style={logoutButtonStyle}>
                Logout
              </button>
            </form>
          </div>
        </aside>

        <section
          style={{
            minWidth: 0,
            height: "100vh",
            display: "grid",
            gridTemplateRows: "auto minmax(0, 1fr)",
            overflow: "hidden",
          }}
        >
          <header
            style={{
              background: "rgba(246, 243, 238, 0.92)",
              backdropFilter: "blur(12px)",
              borderBottom: "1px solid #e3dbcf",
            }}
          >
            <div
              style={{
                padding: "22px 28px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 12,
                    textTransform: "uppercase",
                    letterSpacing: "0.14em",
                    color: "#8a7f72",
                    fontWeight: 800,
                    marginBottom: 6,
                  }}
                >
                  Admin Workspace
                </div>

                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    lineHeight: 1.1,
                    fontFamily: "var(--font-heading)",
                    color: "#171717",
                  }}
                >
                  {getPageTitle(pathname)}
                </div>
              </div>

              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  borderRadius: 999,
                  background: "#fff",
                  border: "1px solid #ddd3c5",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: "#63b66d",
                    display: "inline-block",
                  }}
                />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#5d554a",
                  }}
                >
                  System Ready
                </span>
              </div>
            </div>
          </header>

          <div
            style={{
              minHeight: 0,
              overflowY: "auto",
            }}
          >
            <main
              style={{
                padding: "28px",
                minWidth: 0,
              }}
            >
              {children}
            </main>
          </div>
        </section>
      </div>
    </div>
  );
}

function getPageTitle(pathname: string) {
  if (pathname === "/admin") return "Dashboard";
  if (pathname.startsWith("/admin/products")) return "Products";
  if (pathname.startsWith("/admin/collections")) return "Collections";
  if (pathname.startsWith("/admin/blog")) return "Blog";
  if (pathname.startsWith("/admin/media")) return "Media";
  if (pathname.startsWith("/admin/customer-applications")) return "Applications";
  if (pathname.startsWith("/admin/customers")) return "Customers";
  if (pathname.startsWith("/admin/draft-orders")) return "Draft Orders";
  if (pathname.startsWith("/admin/abandoned-checkouts")) {
    return "Abandoned Checkouts";
  }
  if (pathname.startsWith("/admin/checkout-analytics")) {
    return "Checkout Analytics";
  }
  if (pathname.startsWith("/admin/orders")) return "Orders";
  if (pathname.startsWith("/admin/reports")) return "Reports";
  if (pathname.startsWith("/admin/users")) return "Users & Roles";
  if (pathname.startsWith("/admin/roles")) return "Role Settings";
  return "Admin";
}

function isNavItemActive(item: NavItem, currentPath: string) {
  if (item.href === "/admin") {
    return currentPath === "/admin";
  }

  if (currentPath === item.href || currentPath.startsWith(`${item.href}/`)) {
    return true;
  }

  return Boolean(
    item.children?.some((child) => {
      return (
        currentPath === child.href || currentPath.startsWith(`${child.href}/`)
      );
    })
  );
}

function AdminNavItem({
  item,
  currentPath,
}: {
  item: NavItem;
  currentPath: string;
}) {
  const isActive = isNavItemActive(item, currentPath);
  const isOpen = isActive && item.children && item.children.length > 0;

  return (
    <div style={{ display: "grid", gap: 4 }}>
      <AdminNavLink href={item.href} currentPath={currentPath} isParent>
        <span>{item.label}</span>
        {item.children?.length ? (
          <span style={chevronStyle}>{isOpen ? "▾" : "▸"}</span>
        ) : null}
      </AdminNavLink>

      {isOpen ? (
        <div style={subMenuStyle}>
          {item.children?.map((child) => (
            <AdminSubNavLink
              key={child.href}
              href={child.href}
              currentPath={currentPath}
            >
              {child.label}
            </AdminSubNavLink>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AdminNavLink({
  href,
  currentPath,
  children,
  isParent = false,
}: {
  href: string;
  currentPath: string;
  children: ReactNode;
  isParent?: boolean;
}) {
  const isActive =
    href === "/admin"
      ? currentPath === "/admin"
      : currentPath === href || currentPath.startsWith(`${href}/`);

  const isOrdersParent =
    href === "/admin/orders" &&
    (currentPath.startsWith("/admin/orders") ||
      currentPath.startsWith("/admin/draft-orders") ||
      currentPath.startsWith("/admin/abandoned-checkouts") ||
      currentPath.startsWith("/admin/checkout-analytics"));

  const finalActive = isActive || isOrdersParent;

  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: isParent ? "space-between" : "flex-start",
        minHeight: 44,
        padding: "0 14px",
        borderRadius: 12,
        textDecoration: "none",
        background: finalActive ? "rgba(201,167,63,0.14)" : "transparent",
        color: finalActive ? "#171717" : "#2e2a25",
        fontWeight: finalActive ? 800 : 700,
        border: finalActive
          ? "1px solid rgba(201,167,63,0.28)"
          : "1px solid transparent",
        boxShadow: finalActive ? "0 6px 16px rgba(201,167,63,0.08)" : "none",
        transition: "all 0.2s ease",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          minWidth: 0,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: finalActive ? "var(--primary)" : "transparent",
            border: finalActive ? "none" : "1px solid #cfc4b5",
            marginRight: 12,
            flexShrink: 0,
          }}
        />
        <span>{children}</span>
      </span>
    </Link>
  );
}

function AdminSubNavLink({
  href,
  currentPath,
  children,
}: {
  href: string;
  currentPath: string;
  children: ReactNode;
}) {
  const isActive = currentPath === href || currentPath.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      style={{
        minHeight: 36,
        display: "flex",
        alignItems: "center",
        padding: "0 12px 0 34px",
        borderRadius: 10,
        textDecoration: "none",
        fontSize: 13,
        fontWeight: isActive ? 800 : 700,
        color: isActive ? "#171717" : "#6f6559",
        background: isActive ? "rgba(255,255,255,0.72)" : "transparent",
        border: isActive
          ? "1px solid rgba(201,167,63,0.18)"
          : "1px solid transparent",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: isActive ? "var(--primary)" : "#cfc4b5",
          marginRight: 10,
          flexShrink: 0,
        }}
      />
      <span>{children}</span>
    </Link>
  );
}

const subMenuStyle: React.CSSProperties = {
  display: "grid",
  gap: 4,
  marginLeft: 10,
  paddingLeft: 8,
  borderLeft: "1px solid #e5ddd1",
};

const chevronStyle: React.CSSProperties = {
  color: "#8a7f72",
  fontSize: 12,
  fontWeight: 900,
  marginLeft: 8,
};

const viewSiteButtonStyle: React.CSSProperties = {
  width: "100%",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 46,
  padding: "0 18px",
  borderRadius: 14,
  textDecoration: "none",
  background: "var(--primary)",
  color: "#fff",
  fontWeight: 800,
  border: "1px solid var(--primary)",
  boxShadow: "0 8px 18px rgba(201,167,63,0.16)",
};

const logoutButtonStyle: React.CSSProperties = {
  width: "100%",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 46,
  padding: "0 18px",
  borderRadius: 14,
  background: "#fff",
  color: "#171717",
  fontWeight: 800,
  border: "1px solid #ddd3c5",
  cursor: "pointer",
};