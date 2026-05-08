"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

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
  const router = useRouter();

  async function handleLogout() {
    try {
      await fetch("/api/admin-auth/logout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });
    } finally {
      router.replace("/portal-ptx-admin");
      router.refresh();
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        height: "100vh",
        background: "#f7f5f1",
        color: "#1f1f1f",
        overflow: "hidden",
        fontSize: 13,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "238px minmax(0, 1fr)",
          height: "100vh",
        }}
      >
        <aside
          style={{
            height: "100vh",
            borderRight: "1px solid #e6ded2",
            background: "#fbfaf7",
            display: "grid",
            gridTemplateRows: "auto minmax(0, 1fr) auto",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "20px 16px 16px",
              borderBottom: "1px solid #ebe4da",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "var(--primary)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 800,
                fontSize: 13,
                letterSpacing: "0.04em",
                marginBottom: 12,
              }}
            >
              GF
            </div>

            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#8a8177",
                marginBottom: 6,
                fontWeight: 800,
              }}
            >
              Globaltex Fine Linens
            </div>

            <div
              style={{
                fontSize: 24,
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
                marginTop: 8,
                fontSize: 12,
                color: "#70675f",
                lineHeight: 1.5,
              }}
            >
              B2B Management Panel
            </div>
          </div>

          <div
            style={{
              minHeight: 0,
              overflowY: "auto",
              padding: "12px 10px",
            }}
          >
            <nav
              style={{
                display: "grid",
                gap: 3,
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
              padding: "12px 10px 14px",
              borderTop: "1px solid #ebe4da",
              background: "#fbfaf7",
              display: "grid",
              gap: 7,
            }}
          >
            <Link href="/" style={primaryFooterButtonStyle}>
              View Public Site
            </Link>

            <Link href="/admin/change-password" style={footerButtonStyle}>
              Change Password
            </Link>

            <button type="button" onClick={handleLogout} style={footerButtonStyle}>
              Logout
            </button>
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
              background: "rgba(247,245,241,0.94)",
              backdropFilter: "blur(12px)",
              borderBottom: "1px solid #e6ded2",
            }}
          >
            <div
              style={{
                minHeight: 74,
                padding: "16px 24px",
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
                    fontSize: 10,
                    textTransform: "uppercase",
                    letterSpacing: "0.13em",
                    color: "#8a8177",
                    fontWeight: 800,
                    marginBottom: 5,
                  }}
                >
                  Admin Workspace
                </div>

                <div
                  style={{
                    fontSize: 24,
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
                  gap: 8,
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: "#fff",
                  border: "1px solid #ded5c8",
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "#63b66d",
                    display: "inline-block",
                  }}
                />

                <span
                  style={{
                    fontSize: 12,
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
                padding: "22px 24px",
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
  if (pathname.startsWith("/admin/change-password")) return "Change Password";

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
    <div style={{ display: "grid", gap: 3 }}>
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
        minHeight: 36,
        padding: "0 10px",
        borderRadius: 9,
        textDecoration: "none",
        background: finalActive ? "rgba(201,167,63,0.13)" : "transparent",
        color: finalActive ? "#171717" : "#34302b",
        fontWeight: finalActive ? 800 : 650,
        fontSize: 13,
        border: finalActive
          ? "1px solid rgba(201,167,63,0.25)"
          : "1px solid transparent",
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
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: finalActive ? "var(--primary)" : "transparent",
            border: finalActive ? "none" : "1px solid #cfc4b5",
            marginRight: 9,
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
        minHeight: 30,
        display: "flex",
        alignItems: "center",
        padding: "0 10px 0 26px",
        borderRadius: 8,
        textDecoration: "none",
        fontSize: 12,
        fontWeight: isActive ? 800 : 650,
        color: isActive ? "#171717" : "#70675f",
        background: isActive ? "#fff" : "transparent",
        border: isActive
          ? "1px solid rgba(201,167,63,0.16)"
          : "1px solid transparent",
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: isActive ? "var(--primary)" : "#cfc4b5",
          marginRight: 8,
          flexShrink: 0,
        }}
      />

      <span>{children}</span>
    </Link>
  );
}

const subMenuStyle: React.CSSProperties = {
  display: "grid",
  gap: 3,
  marginLeft: 9,
  paddingLeft: 6,
  borderLeft: "1px solid #e5ddd1",
};

const chevronStyle: React.CSSProperties = {
  color: "#8a7f72",
  fontSize: 11,
  fontWeight: 900,
  marginLeft: 8,
};

const primaryFooterButtonStyle: React.CSSProperties = {
  width: "100%",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 38,
  padding: "0 14px",
  borderRadius: 10,
  textDecoration: "none",
  background: "var(--primary)",
  color: "#fff",
  fontSize: 13,
  fontWeight: 800,
  border: "1px solid var(--primary)",
};

const footerButtonStyle: React.CSSProperties = {
  width: "100%",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 36,
  padding: "0 14px",
  borderRadius: 10,
  textDecoration: "none",
  background: "#fff",
  color: "#171717",
  fontSize: 13,
  fontWeight: 750,
  border: "1px solid #ddd3c5",
  cursor: "pointer",
};