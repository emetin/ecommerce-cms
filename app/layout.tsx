import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { Assistant } from "next/font/google";
import FooterNewsletterForm from "../components/layout/FooterNewsletterForm";

const assistant = Assistant({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-assistant",
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://www.pataktextile.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Patak Textile",
    template: "%s | Patak Textile",
  },
  description:
    "Patak Textile presents premium textile collections for hospitality, residences and refined project-based environments through a stronger corporate catalog structure.",
  keywords: [
    "Patak Textile",
    "hospitality textiles",
    "hotel bedding",
    "hotel towels",
    "bathrobes",
    "textile collections",
    "hotel linen supplier",
    "corporate textile catalog",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Patak Textile",
    description:
      "Patak Textile presents premium textile collections for hospitality, residences and refined project-based environments through a stronger corporate catalog structure.",
    url: SITE_URL,
    siteName: "Patak Textile",
    type: "website",
    images: [
      {
        url: "/og-default.jpg",
        width: 1200,
        height: 630,
        alt: "Patak Textile",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Patak Textile",
    description:
      "Patak Textile presents premium textile collections for hospitality, residences and refined project-based environments through a stronger corporate catalog structure.",
    images: ["/og-default.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={assistant.variable}>
        <div className="site-shell">
          <div className="site-topbar">
            <div className="container site-topbar__inner">
              <div className="site-topbar__left">
                <span>customerservice@globaltexusa.com</span>
                <span>+90 (258) 408 47 57</span>
              </div>

              <div className="site-topbar__right">
                <span>Premium Turkish Cotton Hotel Textiles</span>
              </div>
            </div>
          </div>

          <header className="site-header">
            <div className="container site-header__inner">
              <Link href="/" className="site-logo" aria-label="Patak Textile Home">
                <span className="site-logo__eyebrow">
                  Trusted by Hotels & Residences
                </span>
                <span className="site-logo__title">Patak Textile</span>
              </Link>

              <nav className="site-nav" aria-label="Main navigation">
                <Link href="/">Home</Link>
                <Link href="/about-us">About Us</Link>
                <Link href="/collections">Collections</Link>
                <Link href="/products">Products</Link>
                <Link href="/contact-us">Contact Us</Link>
                <Link href="/faq">FAQ</Link>
              </nav>

              <div className="site-header__actions">
                <Link href="/collections" className="button-link btn-primary">
                  Explore Collections
                </Link>
              </div>
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
                      Corporate Textile Presentation
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
                      Patak Textile
                    </span>
                  </div>

                  <p>
                    Premium hospitality textile solutions presented through a
                    cleaner and more trusted corporate catalog structure for hotels,
                    residences and refined project-based environments.
                  </p>

                  <div className="site-footer__meta">
                    <span>Phone: +90 (258) 408 47 57</span>
                    <span>
                      Address: Selçukbey Mah. Evora Houses, C1 Block 9/A Floor:17
                      No:156, Merkezefendi / Denizli / Türkiye
                    </span>
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
                    <Link href="/products">Product Showcase</Link>
                    <Link href="/blog">Editorial</Link>
                    <Link href="/faq">FAQ</Link>
                  </div>
                </div>

                <div className="site-footer__newsletter">
                  <h4>Stay Updated</h4>
                  <p>
                    Receive selected updates about collections, product categories
                    and future brand developments.
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
                <span>© 2026 Patak Textile. All rights reserved.</span>

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