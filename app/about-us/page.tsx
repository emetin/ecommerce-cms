import type { Metadata } from "next";
import Container from "../../components/ui/Container";
import Section from "../../components/ui/Section";
import SectionHeading from "../../components/ui/SectionHeading";
import ButtonLink from "../../components/ui/ButtonLink";
import { buildPageMetadata } from "../../lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "About Us",
  description:
    "Learn more about Patak Textile, our production perspective, quality mindset and long-term approach to textile partnerships.",
  path: "/about-us",
});

export default function AboutUsPage() {
  return (
    <>
      <section
        style={{
          background:
            "linear-gradient(180deg, #f8f4ed 0%, #f3eee6 58%, #ffffff 100%)",
          borderBottom: "1px solid #ede3d7",
          padding: "84px 0 62px",
        }}
      >
        <Container>
          <div style={{ maxWidth: 900 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                minHeight: 34,
                padding: "0 14px",
                borderRadius: 999,
                background: "#e9e2d6",
                color: "#5f564c",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 18,
              }}
            >
              About Patak Textile
            </div>

            <h1
              style={{
                margin: "0 0 18px",
                fontSize: "clamp(2.5rem, 4.8vw, 4.6rem)",
                lineHeight: 1.02,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: "#171717",
              }}
            >
              A textile company positioned around trust, production discipline and
              long-term partnership
            </h1>

            <p
              style={{
                margin: 0,
                maxWidth: 760,
                color: "#5d554a",
                fontSize: 17,
                lineHeight: 1.9,
              }}
            >
              Patak Textile is presented through a stronger corporate identity,
              highlighting manufacturing clarity, category structure and a refined
              approach to textile supply for professional partners.
            </p>
          </div>
        </Container>
      </section>

      <Section>
        <Container>
          <div className="split-layout">
            <div className="split-card">
              <SectionHeading
                kicker="Our Perspective"
                title="Textile presentation with a more professional and premium tone"
                text="The purpose of this structure is not to look like a fast retail storefront, but to communicate reliability, production confidence and long-term business value."
              />

              <p
                style={{
                  margin: "0 0 18px",
                  color: "#4f4a42",
                  fontSize: 16,
                  lineHeight: 1.95,
                }}
              >
                Patak Textile is positioned as a corporate textile partner with a
                stronger emphasis on product families, manufacturing clarity and
                brand trust. The digital experience is intentionally structured to
                feel calm, premium and professional.
              </p>

              <p
                style={{
                  margin: 0,
                  color: "#4f4a42",
                  fontSize: 16,
                  lineHeight: 1.95,
                }}
              >
                Instead of pushing a retail purchase flow, the site supports a
                curated catalog journey where visitors understand the company,
                explore collections and approach the brand with greater confidence.
              </p>
            </div>

            <div className="split-media">
              <img
                src="https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1400&q=80"
                alt="Patak Textile production"
              />

              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(180deg, rgba(17,24,22,0.08) 0%, rgba(17,24,22,0.5) 100%)",
                }}
              />

              <div
                style={{
                  position: "absolute",
                  left: 24,
                  right: 24,
                  bottom: 24,
                  padding: 22,
                  borderRadius: 20,
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.16)",
                  backdropFilter: "blur(10px)",
                  color: "#fff",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: 8,
                    color: "rgba(255,255,255,0.78)",
                    fontWeight: 700,
                  }}
                >
                  Corporate Textile Identity
                </div>

                <div
                  style={{
                    fontSize: 24,
                    lineHeight: 1.28,
                    fontWeight: 800,
                    marginBottom: 8,
                  }}
                >
                  A calmer, stronger and more trustworthy brand presentation
                </div>

                <div style={{ fontSize: 14, lineHeight: 1.8 }}>
                  The site is designed to reinforce confidence before any future
                  ecommerce expansion.
                </div>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      <Section tone="soft">
        <Container>
          <SectionHeading
            kicker="Core Values"
            title="What this brand experience should communicate"
            text="The visual language and content structure should always reinforce these main perceptions."
          />

          <div className="value-grid">
            <article style={valueCardStyle}>
              <div style={valueKickerStyle}>01 / Quality</div>
              <h3 style={valueTitleStyle}>Reliable textile standards</h3>
              <p style={valueTextStyle}>
                Products should feel consistent, refined and suitable for
                hospitality-oriented expectations.
              </p>
            </article>

            <article style={valueCardStyle}>
              <div style={valueKickerStyle}>02 / Production</div>
              <h3 style={valueTitleStyle}>Manufacturing discipline</h3>
              <p style={valueTextStyle}>
                The company should appear structured, capable and ready for
                professional textile demand.
              </p>
            </article>

            <article style={valueCardStyle}>
              <div style={valueKickerStyle}>03 / Clarity</div>
              <h3 style={valueTitleStyle}>A clean category structure</h3>
              <p style={valueTextStyle}>
                Collections and products should help visitors understand the brand
                quickly and confidently.
              </p>
            </article>

            <article style={valueCardStyle}>
              <div style={valueKickerStyle}>04 / Trust</div>
              <h3 style={valueTitleStyle}>Long-term partnership focus</h3>
              <p style={valueTextStyle}>
                The digital experience should support relationship-building rather
                than a temporary sales push.
              </p>
            </article>
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <div
            style={{
              borderRadius: 30,
              padding: "40px 34px",
              background:
                "linear-gradient(135deg, #17352d 0%, #2f7d62 65%, #3b9276 100%)",
              color: "#fff",
            }}
          >
            <div style={{ maxWidth: 860 }}>
              <div
                style={{
                  fontSize: 12,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  fontWeight: 800,
                  marginBottom: 12,
                  color: "rgba(255,255,255,0.76)",
                }}
              >
                Build the relationship
              </div>

              <h2
                style={{
                  margin: "0 0 14px",
                  fontSize: "clamp(2rem, 3vw, 3rem)",
                  lineHeight: 1.08,
                  fontWeight: 800,
                }}
              >
                Discover collections, review categories and contact our team with confidence
              </h2>

              <p
                style={{
                  margin: "0 0 22px",
                  maxWidth: 720,
                  fontSize: 16,
                  lineHeight: 1.9,
                  color: "rgba(255,255,255,0.9)",
                }}
              >
                This corporate structure is built to support clarity today and
                allow stronger digital expansion tomorrow.
              </p>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <ButtonLink href="/collections">Explore Collections</ButtonLink>
                <ButtonLink href="/contact-us" variant="secondary">
                  Contact Us
                </ButtonLink>
              </div>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}

const valueCardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e6ddd0",
  borderRadius: 22,
  padding: 24,
  boxShadow: "0 10px 28px rgba(23,23,23,0.04)",
};

const valueKickerStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#7a7064",
  marginBottom: 12,
};

const valueTitleStyle: React.CSSProperties = {
  margin: "0 0 10px",
  fontSize: 22,
  lineHeight: 1.2,
  fontWeight: 800,
  color: "#171717",
};

const valueTextStyle: React.CSSProperties = {
  margin: 0,
  color: "#5a5349",
  lineHeight: 1.85,
  fontSize: 15,
};