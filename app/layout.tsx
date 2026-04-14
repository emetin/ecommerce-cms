import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { Assistant } from "next/font/google";
import { cookies } from "next/headers";
import FooterNewsletterForm from "../components/layout/FooterNewsletterForm";
import { readCustomerFromSessionToken } from "../lib/customer-auth";

const assistant = Assistant({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-assistant",
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://www.globaltexusa.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Globaltex Fine Linens",
    template: "%s | Globaltex Fine Linens",
  },
  description:
    "Globaltex Fine Linens supplies premium hospitality textiles for hotels, resorts, residences, and large-scale B2B projects through a trusted wholesale platform.",
  keywords: [
    "Globaltex Fine Linens",
    "hotel linens wholesale supplier",
    "hospitality textiles",
    "hotel bedding supplier",
    "hotel towels wholesale",
    "bathrobes wholesale",
    "resort textiles",
    "wholesale hotel linens",
    "B2B hospitality supplier",
    "custom embroidery linens",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Globaltex Fine Linens",
    description:
      "Premium hospitality textiles for hotels, resorts, residences, and project-based B2B supply.",
    url: SITE_URL,
    siteName: "Globaltex Fine Linens",
    type: "website",
    images: [
      {
        url: "/og-default.jpg",
        width: 1200,
        height: 630,
        alt: "Globaltex Fine Linens",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Globaltex Fine Linens",
    description:
      "Premium hospitality textiles for hotels, resorts, residences, and project-based B2B supply.",
    images: ["/og-default.jpg"],
  },
};

async function HeaderAccountActions() {
  const cookieStore = await cookies();
  const token = cookieStore.get("ptx_customer_auth")?.value || null;
  const customer = await readCustomerFromSessionToken(token);

  if (customer) {
    return (
      <div
        className="site-header__actions"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          justifyContent: "flex-end",
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#6f6559",
            whiteSpace: "nowrap",
          }}
        >
          {customer.companyName}
        </div>

        <Link
          href="/account"
          className="button-link"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 46,
            padding: "0 18px",
            borderRadius: 999,
            border: "1px solid #d8cebf",
            background: "#fff",
            color: "#171717",
            fontWeight: 800,
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          My Account
        </Link>

        <form action="/api/customer-auth/logout" method="POST" style={{ margin: 0 }}>
          <button
            type="submit"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 46,
              padding: "0 18px",
              borderRadius: 999,
              border: "1px solid #171717",
              background: "#171717",
              color: "#fff",
              fontWeight: 800,
              textDecoration: "none",
              whiteSpace: "nowrap",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </form>
      </div>
    );
  }

  return (
    <div
      className="site-header__actions"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
        justifyContent: "flex-end",
      }}
    >
      <Link
        href="/portal-login"
        className="button-link"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 46,
          padding: "0 18px",
          borderRadius: 999,
          border: "1px solid #d8cebf",
          background: "#fff",
          color: "#171717",
          fontWeight: 800,
          textDecoration: "none",
          whiteSpace: "nowrap",
        }}
      >
        Customer Portal
      </Link>

      <Link
        href="/apply-for-account"
        className="button-link"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 46,
          padding: "0 18px",
          borderRadius: 999,
          border: "1px solid #d8cebf",
          background: "#fff",
          color: "#171717",
          fontWeight: 800,
          textDecoration: "none",
          whiteSpace: "nowrap",
        }}
      >
        Apply for Account
      </Link>

      <Link href="/collections" className="button-link btn-primary">
        Explore Collections
      </Link>
    </div>
  );
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const token = cookieStore.get("ptx_customer_auth")?.value || null;
  const customer = await readCustomerFromSessionToken(token);

  return (
    <html lang="en">
      <body className={assistant.variable}>
        <div className="site-shell">
          <div className="site-topbar">
            <div className="container site-topbar__inner">
              <div className="site-topbar__left">
                <span>customerservice@globaltexusa.com</span>
                <span>+1 (305) 751 2343</span>
              </div>

              <div className="site-topbar__right">
                <span>Premium Hospitality Textiles for Hotels & Resorts</span>
              </div>
            </div>
          </div>

          <header className="site-header">
            <div className="container site-header__inner">
              <Link
                href="/"
                className="site-logo"
                aria-label="Globaltex Fine Linens Home"
              >
                <span className="site-logo__eyebrow">
                  Trusted by Hotels, Resorts & Residences
                </span>
                <span className="site-logo__title">Globaltex Fine Linens</span>
              </Link>

              <nav className="site-nav" aria-label="Main navigation">
                <Link href="/">Home</Link>
                <Link href="/about-us">About Us</Link>
                <Link href="/collections">Collections</Link>
                <Link href="/products">Products</Link>
                <Link href="/contact-us">Contact Us</Link>
                <Link href="/faq">FAQ</Link>
                <Link href={customer ? "/account" : "/portal-login"}>
                  {customer ? "My Account" : "Customer Portal"}
                </Link>
              </nav>

              <HeaderAccountActions />
            </div>
          </header>

          <main className="site-main">{children}</main>

          <footer className="site-footer">
            <div className="container site-footer__top">
              <div className="site-footer__grid">
                <div className="site-footer__brand">
                  <div
                    style={{
                      display: "grid",
                      gap: 6,
                      marginBottom: 18,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.12em",
                        color: "rgba(255,255,255,0.52)",
                        fontWeight: 800,
                      }}
                    >
                      Luxury Hospitality Textile Supply
                    </span>
                    <span
                      style={{
                        fontSize: 28,
                        lineHeight: 1,
                        fontWeight: 800,
                        letterSpacing: "-0.02em",
                        color: "#ffffff",
                      }}
                    >
                      Globaltex Fine Linens
                    </span>
                  </div>

                  <p>
                    Globaltex Fine Linens supplies premium hospitality textiles for
                    hotels, resorts, property groups, residences, and large-scale
                    B2B projects with a focus on consistency, service, and
                    long-term performance.
                  </p>

                  <div className="site-footer__meta">
                    <span>Email: customerservice@globaltexusa.com</span>
                    <span>Phone: +1 (305) 751 2343</span>
                    <span>Miami, Houston, Orlando & Denizli</span>
                  </div>
                </div>

                <div className="site-footer__column">
                  <h4>Quick Links</h4>
                  <div className="site-footer__links">
                    <Link href="/about-us">About Us</Link>
                    <Link href="/collections">Collections</Link>
                    <Link href="/products">Products</Link>
                    <Link href="/contact-us">Contact Us</Link>
                  </div>
                </div>

                <div className="site-footer__column">
                  <h4>Explore</h4>
                  <div className="site-footer__links">
                    <Link href="/collections">Collection Directory</Link>
                    <Link href="/products">Product Catalog</Link>
                    <Link href="/blog">Editorial</Link>
                    <Link href="/faq">FAQ</Link>
                    <Link href={customer ? "/account" : "/portal-login"}>
                      {customer ? "My Account" : "Customer Portal"}
                    </Link>
                    {!customer ? (
                      <Link href="/apply-for-account">Apply for Account</Link>
                    ) : null}
                  </div>
                </div>

                <div className="site-footer__newsletter">
                  <h4>Stay Updated</h4>
                  <p>
                    Receive selected updates about hospitality collections,
                    wholesale opportunities, and project-based textile solutions.
                  </p>

                  <FooterNewsletterForm />

                  <div
                    style={{
                      marginTop: 14,
                      fontSize: 12,
                      lineHeight: 1.8,
                      color: "rgba(255,255,255,0.54)",
                    }}
                  >
                    By subscribing, you agree to our{" "}
                    <Link
                      href="/policies/privacy-policy"
                      style={{
                        color: "inherit",
                        textDecoration: "underline",
                        textUnderlineOffset: "3px",
                      }}
                    >
                      Privacy Policy
                    </Link>
                    .
                  </div>
                </div>
              </div>
            </div>

            <div className="container site-footer__bottom">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 18,
                  flexWrap: "wrap",
                }}
              >
                <span>© 2026 Globaltex Fine Linens. All rights reserved.</span>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 18,
                    flexWrap: "wrap",
                    color: "inherit",
                    fontSize: 13,
                    lineHeight: 1.7,
                  }}
                >
                  <Link href="/policies">Policies</Link>
                  <Link href="/policies/privacy-policy">Privacy Policy</Link>
                  <Link href="/policies/cookie-policy">Cookie Policy</Link>
                  <Link href="/policies/terms-and-conditions">
                    Terms & Conditions
                  </Link>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}