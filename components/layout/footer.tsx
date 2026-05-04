"use client";

import Link from "next/link";
import FooterNewsletterForm from "./FooterNewsletterForm";
import { SITE_SETTINGS } from "../../lib/site-settings";

export default function Footer() {
  return (
    <footer className="footer-root" style={footerRootStyle}>
      <div className="footer-container" style={footerContainerStyle}>
        <div className="footer-grid" style={footerGridStyle}>
          <div className="footer-brand">
            <div style={brandLogoWrapStyle}>
              <img
                src={SITE_SETTINGS.logo.footer}
                alt={SITE_SETTINGS.siteName}
                className="footer-logo-image"
                style={logoStyle}
              />
            </div>

            <p style={brandTextStyle}>{SITE_SETTINGS.footerDescription}</p>

            <div style={contactInfoStyle}>
              <div>{SITE_SETTINGS.phone}</div>
              <div>{SITE_SETTINGS.email}</div>
              {SITE_SETTINGS.address.map((line) => (
                <div key={line}>{line}</div>
              ))}
            </div>

            <div style={{ marginTop: 14 }}>
              <Link href="/contact-us" style={footerButtonStyle}>
                Contact Our Team
              </Link>
            </div>
          </div>

          <div className="footer-column">
            <div style={footerTitleStyle}>Quick Links</div>
            <div style={footerListStyle}>
              <Link href="/" style={footerLinkStyle}>Home</Link>
              <Link href="/about-us" style={footerLinkStyle}>About Us</Link>
              <Link href="/careers" style={footerLinkStyle}>Careers</Link>
              <Link href="/blog" style={footerLinkStyle}>Blog</Link>
              <Link href="/contact-us" style={footerLinkStyle}>Contact Us</Link>
            </div>
          </div>

          <div className="footer-column">
            <div style={footerTitleStyle}>Catalog</div>
            <div style={footerListStyle}>
              <Link href="/collections" style={footerLinkStyle}>Collections</Link>
              <Link href="/products" style={footerLinkStyle}>Products</Link>
              <Link href="/hospitality-projects" style={footerLinkStyle}>
                Hospitality Projects
              </Link>
              <Link href="/certifications" style={footerLinkStyle}>
                Certifications
              </Link>
            </div>
          </div>

          <div className="footer-newsletter">
            <div style={footerTitleStyle}>Subscribe to our newsletter</div>

            <p style={newsletterTextStyle}>
              Be the first to know about new hospitality collections, sourcing
              updates and Globaltex announcements.
            </p>

            <FooterNewsletterForm />

            <div style={socialWrapperStyle}>
              <a
                href={SITE_SETTINGS.social.instagram}
                aria-label="Instagram"
                className="footer-social-link"
                style={socialStyle}
              >
                <InstagramIcon />
              </a>

              <a
                href={SITE_SETTINGS.social.linkedin}
                aria-label="LinkedIn"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-social-link"
                style={socialStyle}
              >
                <LinkedInIcon />
              </a>

              <a
                href={SITE_SETTINGS.social.facebook}
                aria-label="Facebook"
                className="footer-social-link"
                style={socialStyle}
              >
                <FacebookIcon />
              </a>
            </div>
          </div>
        </div>

        <div style={policyBarStyle}>
          <Link href="/policies/privacy-policy" style={policyLinkStyle}>
            Privacy Policy
          </Link>
          <Link href="/policies/terms-and-conditions" style={policyLinkStyle}>
            Terms & Conditions
          </Link>
          <Link href="/policies/cookie-policy" style={policyLinkStyle}>
            Cookie Policy
          </Link>
          <Link href="/policies/return-policy" style={policyLinkStyle}>
            Return Policy
          </Link>
        </div>

        <div className="footer-bottom" style={footerBottomStyle}>
          <div>© 2026 {SITE_SETTINGS.siteName}. All rights reserved.</div>
          <div>
            Luxury hospitality textile presentation designed for long-term brand
            growth.
          </div>
        </div>
      </div>

      <style>{`
        .footer-logo-image {
          max-width: 180px;
          width: 100%;
          height: auto;
          object-fit: contain;
        }

        .footer-newsletter input::placeholder {
          color: rgba(255,255,255,0.48);
        }

        .footer-social-link:hover {
          transform: translateY(-4px);
          background: var(--primary) !important;
          border-color: var(--primary) !important;
          color: #ffffff !important;
          box-shadow: 0 14px 30px rgba(201,167,63,0.24);
        }

        @media (max-width: 1100px) {
          .footer-grid {
            grid-template-columns: 1.2fr 1fr !important;
            gap: 34px 28px !important;
          }

          .footer-brand {
            grid-column: span 2;
          }
        }

        @media (max-width: 720px) {
          .footer-root {
            margin-top: 56px !important;
          }

          .footer-container {
            padding: 42px 16px 22px !important;
          }

          .footer-grid {
            grid-template-columns: 1fr !important;
            gap: 30px !important;
            margin-bottom: 30px !important;
          }

          .footer-brand {
            grid-column: auto;
          }

          .footer-logo-image {
            max-width: 160px !important;
          }

          .footer-bottom {
            min-height: auto !important;
            align-items: flex-start !important;
            flex-direction: column !important;
            gap: 10px !important;
            font-size: 13px !important;
            line-height: 1.7 !important;
          }
        }
      `}</style>
    </footer>
  );
}

function InstagramIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.5" cy="6.5" r="1.3" fill="currentColor" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
      <path d="M6.5 9.5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M11 19V14.2C11 11.9 12.3 10.6 14.2 10.6C16.1 10.6 17.5 11.9 17.5 14.2V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="6.5" cy="6" r="1.5" fill="currentColor" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
      <path d="M14 8H16V4H13.5C10.8 4 9 5.8 9 8.6V11H6.8V15H9V20H13V15H15.6L16.2 11H13V8.8C13 8.3 13.3 8 14 8Z" fill="currentColor" />
    </svg>
  );
}

const footerRootStyle: React.CSSProperties = {
  marginTop: 80,
  background: "#111715",
  color: "#fff",
  borderTop: "1px solid rgba(255,255,255,0.06)",
};

const footerContainerStyle: React.CSSProperties = {
  maxWidth: 1320,
  margin: "0 auto",
  padding: "56px 20px 24px",
};

const footerGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.25fr 0.75fr 0.75fr 1fr",
  gap: 28,
  marginBottom: 36,
};

const brandLogoWrapStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 12,
  marginBottom: 16,
};

const logoStyle: React.CSSProperties = {
  width: 180,
  height: "auto",
  display: "block",
  objectFit: "contain",
  filter: "brightness(0) invert(1)",
};

const brandTextStyle: React.CSSProperties = {
  margin: "0 0 16px",
  color: "rgba(255,255,255,0.74)",
  lineHeight: 1.9,
  fontSize: 15,
  maxWidth: 420,
};

const contactInfoStyle: React.CSSProperties = {
  display: "grid",
  gap: 4,
  color: "rgba(255,255,255,0.68)",
  lineHeight: 1.75,
  fontSize: 14,
};

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
  background: "var(--primary)",
  color: "#fff",
  border: "1px solid var(--primary)",
  textDecoration: "none",
  fontWeight: 800,
};

const newsletterTextStyle: React.CSSProperties = {
  margin: "0 0 16px",
  color: "rgba(255,255,255,0.74)",
  lineHeight: 1.8,
  fontSize: 15,
};

const socialWrapperStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginTop: 18,
};

const socialStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: "50%",
  border: "1px solid rgba(255,255,255,0.18)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#ffffff",
  textDecoration: "none",
  background: "rgba(255,255,255,0.06)",
  transition: "all 0.22s ease",
};

const policyBarStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 18,
  flexWrap: "wrap",
  padding: "22px 0",
  marginTop: 8,
};

const policyLinkStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.58)",
  textDecoration: "none",
  fontSize: 13,
  fontWeight: 700,
};

const footerBottomStyle: React.CSSProperties = {
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
};