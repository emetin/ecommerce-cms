"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

function useResponsiveFooter() {
  const [mode, setMode] = useState<"mobile" | "tablet" | "desktop">("desktop");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const update = () => {
      const width = window.innerWidth;

      if (width <= 767) {
        setMode("mobile");
        return;
      }

      if (width <= 1080) {
        setMode("tablet");
        return;
      }

      setMode("desktop");
    };

    update();
    window.addEventListener("resize", update);

    return () => window.removeEventListener("resize", update);
  }, []);

  return {
    isMobile: mode === "mobile",
    isTablet: mode === "tablet",
    isDesktop: mode === "desktop",
  };
}

export default function Footer() {
  const { isMobile, isTablet } = useResponsiveFooter();

  return (
    <footer
      style={{
        marginTop: isMobile ? 56 : 80,
        background: "#111715",
        color: "#fff",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        width: "100%",
        overflowX: "hidden",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1320,
          margin: "0 auto",
          padding: isMobile ? "40px 16px 20px" : "56px 20px 24px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "1fr"
              : isTablet
              ? "1.15fr 0.85fr"
              : "1.25fr 0.75fr 0.75fr 1fr",
            gap: isMobile ? 28 : isTablet ? 24 : 28,
            marginBottom: isMobile ? 28 : 36,
            alignItems: "start",
          }}
        >
          <div
            style={{
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 16,
                maxWidth: "100%",
              }}
            >
              <div
                style={{
                  width: isMobile ? 38 : 42,
                  height: isMobile ? 38 : 42,
                  borderRadius: 12,
                  background:
                    "linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontWeight: 900,
                  fontSize: isMobile ? 14 : 16,
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
                }}
              >
                <span
                  style={{
                    fontSize: isMobile ? 16 : 18,
                    fontWeight: 800,
                    letterSpacing: "-0.02em",
                    lineHeight: 1.1,
                    fontFamily: "var(--font-heading)",
                    whiteSpace: isMobile ? "normal" : "nowrap",
                    wordBreak: "break-word",
                  }}
                >
                  Globaltex Fine Linens
                </span>
                <span
                  style={{
                    fontSize: isMobile ? 10 : 11,
                    textTransform: "uppercase",
                    letterSpacing: isMobile ? "0.05em" : "0.08em",
                    color: "rgba(255,255,255,0.52)",
                    fontWeight: 800,
                    whiteSpace: isMobile ? "normal" : "nowrap",
                    wordBreak: "break-word",
                    lineHeight: 1.25,
                  }}
                >
                  Luxury Hospitality Textiles
                </span>
              </div>
            </div>

            <p
              style={{
                margin: 0,
                color: "rgba(255,255,255,0.74)",
                fontSize: isMobile ? 14 : 15,
                lineHeight: isMobile ? 1.8 : 1.9,
                maxWidth: isMobile ? "100%" : 420,
              }}
            >
              Premium textile solutions for hotels, resorts, residences, and
              hospitality-driven projects. Explore our collections, product
              range, and sourcing support through a refined, professional
              presentation.
            </p>
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={footerTitleStyle}>Navigation</div>
            <div style={footerListStyle}>
              <Link href="/" style={footerLinkStyle}>
                Home
              </Link>
              <Link href="/about-us" style={footerLinkStyle}>
                About Us
              </Link>
              <Link href="/collections" style={footerLinkStyle}>
                Collections
              </Link>
              <Link href="/products" style={footerLinkStyle}>
                Products
              </Link>
              <Link href="/contact-us" style={footerLinkStyle}>
                Contact Us
              </Link>
            </div>
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={footerTitleStyle}>Catalog</div>
            <div style={footerListStyle}>
              <Link href="/collections" style={footerLinkStyle}>
                Explore Collections
              </Link>
              <Link href="/products" style={footerLinkStyle}>
                Product Showcase
              </Link>
              <Link href="/about-us" style={footerLinkStyle}>
                Brand Story
              </Link>
            </div>
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={footerTitleStyle}>Contact</div>

            <div
              style={{
                display: "grid",
                gap: 12,
                color: "rgba(255,255,255,0.74)",
                lineHeight: isMobile ? 1.8 : 1.9,
                fontSize: isMobile ? 14 : 15,
              }}
            >
              <div>
                Connect with our team for hospitality sourcing, collection
                inquiries, and product discussions.
              </div>

              <div>
                Discover textile solutions tailored for premium guest
                experiences.
              </div>

              <div style={{ marginTop: 4 }}>
                <Link href="/contact-us" style={footerButtonStyle}>
                  Contact Our Team
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            minHeight: isMobile ? "auto" : 64,
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            alignItems: isMobile ? "flex-start" : "center",
            justifyContent: "space-between",
            gap: isMobile ? 10 : 18,
            flexWrap: "wrap",
            paddingTop: 20,
            borderTop: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.55)",
            fontSize: isMobile ? 13 : 14,
            lineHeight: 1.7,
          }}
        >
          <div>© 2026 Globaltex Fine Linens. All rights reserved.</div>

          <div
            style={{
              maxWidth: isMobile ? "100%" : 520,
            }}
          >
            Luxury hospitality textile presentation designed for long-term brand
            growth.
          </div>
        </div>
      </div>
    </footer>
  );
}

const footerTitleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.52)",
  marginBottom: 14,
};

const footerListStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
};

const footerLinkStyle: React.CSSProperties = {
  color: "#fff",
  textDecoration: "none",
  fontSize: 15,
  fontWeight: 700,
  lineHeight: 1.5,
};

const footerButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 44,
  padding: "0 16px",
  borderRadius: 12,
  background: "var(--primary)",
  color: "#fff",
  border: "1px solid var(--primary)",
  textDecoration: "none",
  fontWeight: 800,
  width: "fit-content",
  maxWidth: "100%",
};