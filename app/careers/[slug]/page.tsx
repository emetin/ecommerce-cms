import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Section from "../../../components/ui/Section";
import Container from "../../../components/ui/Container";
import CareerApplicationForm from "../../../components/careers/CareerApplicationForm";
import {
  careerPositions,
  getCareerPosition,
} from "../../../lib/career-positions";
import { buildPageMetadata } from "../../../lib/seo";

type CareerPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return careerPositions.map((position) => ({
    slug: position.slug,
  }));
}

export async function generateMetadata({
  params,
}: CareerPageProps): Promise<Metadata> {
  const { slug } = await params;
  const position = getCareerPosition(slug);

  if (!position) {
    return buildPageMetadata({
      title: "Career Opportunity",
      description: "Explore career opportunities at Globaltex Fine Linens.",
      path: "/careers",
    });
  }

  return buildPageMetadata({
    title: `${position.title} Career Opportunity`,
    description: position.summary,
    path: `/careers/${position.slug}`,
  });
}

export default async function CareerDetailPage({ params }: CareerPageProps) {
  const { slug } = await params;
  const position = getCareerPosition(slug);

  if (!position) {
    notFound();
  }

  return (
    <>
      <Section tone="soft">
        <Container>
          <Link href="/careers" style={backLinkStyle}>
            Back to careers
          </Link>

          <div className="career-hero-grid">
            <div>
              <div style={kickerStyle}>{position.department}</div>
              <h1 style={heroTitleStyle}>{position.title}</h1>
              <p style={heroTextStyle}>{position.summary}</p>

              <div style={metaGridStyle}>
                <div style={metaCardStyle}>
                  <span style={metaLabelStyle}>Location</span>
                  <strong>{position.location}</strong>
                </div>

                <div style={metaCardStyle}>
                  <span style={metaLabelStyle}>Employment Type</span>
                  <strong>{position.type}</strong>
                </div>

                <div style={metaCardStyle}>
                  <span style={metaLabelStyle}>Department</span>
                  <strong>{position.department}</strong>
                </div>
              </div>
            </div>

            <aside style={sideCardStyle}>
              <h2 style={sideTitleStyle}>Start your journey</h2>
              <p style={sideTextStyle}>
                If this role matches your experience and career goals, submit
                your application below. Our team will review your profile and
                contact suitable candidates.
              </p>

              <a href="#application-form" style={sideButtonStyle}>
                Apply for this role
              </a>
            </aside>
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <div className="career-content-grid">
            <div style={contentMainStyle}>
              <div style={contentBlockStyle}>
                <div style={kickerStyle}>About the Role</div>
                <p style={paragraphStyle}>{position.intro}</p>
              </div>

              <CareerList
                title="Key Responsibilities"
                items={position.responsibilities}
              />

              <CareerList
                title="Required Qualifications"
                items={position.requirements}
              />

              <CareerList
                title="Preferred Qualifications"
                items={position.preferred}
              />
            </div>

            <div id="application-form">
              <CareerApplicationForm positionTitle={position.title} />
            </div>
          </div>
        </Container>
      </Section>

      <Section tone="soft">
        <Container>
          <div className="career-cta-panel" style={ctaStyle}>
            <div>
              <div style={kickerStyle}>Alternative Application</div>
              <h2 style={ctaTitleStyle}>Prefer applying via LinkedIn?</h2>
              <p style={ctaTextStyle}>
                You can also review our company updates and open roles through
                our LinkedIn presence.
              </p>
            </div>

            <a
              href="https://www.linkedin.com/company/globaltexfinelinens/jobs/"
              target="_blank"
              rel="noopener"
              style={linkedinButtonStyle}
            >
              View roles on LinkedIn
            </a>
          </div>
        </Container>
      </Section>
    </>
  );
}

function CareerList({ title, items }: { title: string; items: string[] }) {
  return (
    <div style={contentBlockStyle}>
      <h2 style={sectionTitleStyle}>{title}</h2>
      <ul style={listStyle}>
        {items.map((item) => (
          <li key={item} style={listItemStyle}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

const backLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  marginBottom: 24,
  color: "#2f7d62",
  fontWeight: 900,
  textDecoration: "none",
};

const kickerStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#2f7d62",
  marginBottom: 10,
};

const heroTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "clamp(2.4rem, 4vw, 4.6rem)",
  lineHeight: 1,
  color: "#171717",
  fontWeight: 900,
};

const heroTextStyle: React.CSSProperties = {
  margin: "18px 0 0",
  maxWidth: 760,
  color: "#5a5349",
  fontSize: 18,
  lineHeight: 1.8,
};

const metaGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 14,
  marginTop: 28,
};

const metaCardStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e6ddd0",
  borderRadius: 20,
  padding: 18,
  display: "grid",
  gap: 6,
};

const metaLabelStyle: React.CSSProperties = {
  color: "#7a7064",
  fontSize: 12,
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const sideCardStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e6ddd0",
  borderRadius: 28,
  padding: 28,
  boxShadow: "0 18px 45px rgba(23,23,23,0.06)",
};

const sideTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 28,
  lineHeight: 1.15,
  color: "#171717",
};

const sideTextStyle: React.CSSProperties = {
  margin: "12px 0 22px",
  color: "#5a5349",
  fontSize: 15,
  lineHeight: 1.8,
};

const sideButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  justifyContent: "center",
  width: "100%",
  borderRadius: 999,
  padding: "13px 20px",
  background: "#2f7d62",
  color: "#ffffff",
  textDecoration: "none",
  fontWeight: 900,
};

const contentMainStyle: React.CSSProperties = {
  display: "grid",
  gap: 20,
};

const contentBlockStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e6ddd0",
  borderRadius: 24,
  padding: 26,
};

const sectionTitleStyle: React.CSSProperties = {
  margin: "0 0 14px",
  fontSize: 26,
  lineHeight: 1.15,
  color: "#171717",
};

const paragraphStyle: React.CSSProperties = {
  margin: 0,
  color: "#5a5349",
  fontSize: 16,
  lineHeight: 1.85,
};

const listStyle: React.CSSProperties = {
  margin: 0,
  paddingLeft: 20,
  display: "grid",
  gap: 10,
};

const listItemStyle: React.CSSProperties = {
  color: "#5a5349",
  fontSize: 16,
  lineHeight: 1.75,
};

const ctaStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e6ddd0",
  borderRadius: 28,
  padding: 28,
};

const ctaTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 28,
  color: "#171717",
};

const ctaTextStyle: React.CSSProperties = {
  margin: "8px 0 0",
  color: "#5a5349",
  fontSize: 15,
  lineHeight: 1.75,
};

const linkedinButtonStyle: React.CSSProperties = {
  flexShrink: 0,
  border: "1px solid #2f7d62",
  borderRadius: 999,
  padding: "12px 22px",
  color: "#2f7d62",
  textDecoration: "none",
  fontWeight: 900,
  background: "#ffffff",
};