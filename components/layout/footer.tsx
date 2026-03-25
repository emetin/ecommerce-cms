import Link from "next/link";

export default function Footer() {
  return (
    <footer
      style={{
        marginTop: 80,
        background: "#111715",
        color: "#fff",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        style={{
          maxWidth: 1320,
          margin: "0 auto",
          padding: "56px 20px 24px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.25fr 0.75fr 0.75fr 1fr",
            gap: 28,
            marginBottom: 36,
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background:
                    "linear-gradient(135deg, #17352d 0%, #2f7d62 75%, #49a487 100%)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontWeight: 900,
                  fontSize: 16,
                  letterSpacing: "0.04em",
                }}
              >
                PT
              </div>

              <div style={{ display: "grid", gap: 2 }}>
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    letterSpacing: "-0.02em",
                    lineHeight: 1.1,
                  }}
                >
                  Patak Textile
                </span>
                <span
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "rgba(255,255,255,0.52)",
                    fontWeight: 800,
                  }}
                >
                  Corporate Textile Presentation
                </span>
              </div>
            </div>

            <p
              style={{
                margin: 0,
                color: "rgba(255,255,255,0.74)",
                fontSize: 15,
                lineHeight: 1.9,
                maxWidth: 420,
              }}
            >
              A more confident digital structure for presenting textile categories,
              collections and brand trust in a professional, future-ready format.
            </p>
          </div>

          <div>
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

          <div>
            <div style={footerTitleStyle}>Catalog</div>
            <div style={footerListStyle}>
              <Link href="/collections" style={footerLinkStyle}>
                Explore Collections
              </Link>
              <Link href="/products" style={footerLinkStyle}>
                Product Showcase
              </Link>
              <Link href="/about-us" style={footerLinkStyle}>
                Corporate Story
              </Link>
            </div>
          </div>

          <div>
            <div style={footerTitleStyle}>Contact</div>
            <div style={{ color: "rgba(255,255,255,0.74)", lineHeight: 1.9, fontSize: 15 }}>
              <div>Use this area for corporate contact details.</div>
              <div>General inquiries, collection reviews and textile discussions.</div>
              <div style={{ marginTop: 14 }}>
                <Link href="/contact-us" style={footerButtonStyle}>
                  Contact Our Team
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            minHeight: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 18,
            flexWrap: "wrap",
            paddingTop: 20,
            borderTop: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.55)",
            fontSize: 14,
          }}
        >
          <div>© 2026 Patak Textile. All rights reserved.</div>
          <div>
            Corporate textile catalog presentation designed for long-term brand growth.
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
};

const footerButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 44,
  padding: "0 16px",
  borderRadius: 12,
  background: "#2f7d62",
  color: "#fff",
  border: "1px solid #2f7d62",
  textDecoration: "none",
  fontWeight: 800,
};