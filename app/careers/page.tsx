"use client";

import Link from "next/link";
import { careerPositions } from "../../lib/career-positions";

const heroImage = "https://www.globaltexusa.com/image_10.png";

const awardImage =
  "https://cdn.shopify.com/s/files/1/0765/3320/3253/files/top.png?v=1763127613";

const linkedinLogo =
  "https://cdn.shopify.com/s/files/1/0765/3320/3253/files/LI-In-Bug_87e5d980-b84a-447b-b78c-859681f64566.png?v=1762523429";

const ratings = [
  {
    name: "Globaltex Fine Linens Rating",
    logo: "http://www.globaltexusa.com/LOGO%20500x201-1.png",
    score: "5.0",
    fill: "100%",
  },
  {
    name: "Glassdoor Rating",
    logo: "http://www.globaltexusa.com/glassdoor-new-20235206.logowik.com.webp",
    score: "4.6",
    fill: "92%",
  },
  {
    name: "Indeed Rating",
    logo: "http://www.globaltexusa.com/Indeed-logo.jpg",
    score: "4.2",
    fill: "84%",
  },
];

const faqItems = [
  {
    question: "How can I apply for a position?",
    answer:
      "You can apply directly through our Open Positions section by clicking on the job that interests you and submitting your application online.",
  },
  {
    question: "Can I apply for multiple roles at once?",
    answer:
      "Yes. We encourage you to apply to all roles that match your experience and interests.",
  },
  {
    question: "Do you offer remote or hybrid work options?",
    answer:
      "Some positions may offer remote or hybrid flexibility depending on the role and location. Please check the job description for specific details.",
  },
  {
    question: "What does your recruitment process look like?",
    answer:
      "Our typical process includes application review, initial screening, interviews with the hiring team and final evaluation.",
  },
  {
    question: "Do you provide internship opportunities?",
    answer:
      "Yes, we welcome students and recent graduates to apply for internships. Keep an eye on our Start Your Journey section for openings.",
  },
  {
    question: "Do you support international applications?",
    answer:
      "Yes, we welcome applications from candidates across the globe. Please ensure you meet the legal requirements to work in the country where the position is based.",
  },
];

const featuredPositions = careerPositions.filter(
  (position) => position.region === "usa"
);

const usaPositionCategories = Array.from(
  new Set(featuredPositions.map((position) => position.category))
).map((category) => ({
  category,
  positions: featuredPositions.filter((position) => position.category === category),
}));

export default function CareersPage() {
  return (
    <>
      <section className="careerHero">
        <div className="careerHeroImageWrap">
          <img
            src={heroImage}
            alt="Modern office environment at Globaltex Fine Linens"
            className="careerHeroImage"
          />
        </div>

        <div className="careerHeroContent">
          <div className="careerHeroPanel">
            <div className="eyebrow">Careers at Globaltex</div>
            <h1>Join the World of Globaltex</h1>
            <p>
              At Globaltex Fine Linens, we do not just produce textiles, we
              create comfort, elegance, and global experiences. Discover your
              place in a company that brings hotel luxury to life.
            </p>
          </div>
        </div>
      </section>

      <section className="appointmentSection">
        <div className="container">
          <div className="appointmentBox">
            <div>
              <div className="eyebrow">Interview Appointment</div>
              <h2>Ready to schedule your interview?</h2>
              <p>
                If your profile matches our expectations, you can choose a
                convenient time slot and meet with our team through our online
                interview appointment page.
              </p>
            </div>

            <a
              href="/pages/book-your-interview-appointment"
              className="blueButton"
            >
              Book your interview appointment
            </a>
          </div>
        </div>
      </section>

      <section className="awardSection">
        <div className="container awardGrid">
          <div className="awardImageWrap">
            <img
              src={awardImage}
              alt="South Florida Business Journal Award - Globaltex Fine Linens"
            />
          </div>

          <div>
            <div className="eyebrow">Recognition</div>
            <h2>Honored by South Florida Business Journal</h2>

            <p className="lead">
              Globaltex Fine Linens is proud to be recognized for our continued
              growth and contribution to the hospitality industry.
            </p>

            <p>
              This recognition highlights our commitment to delivering
              high-performance linens, reliable lead times and a service mindset
              that supports hotel groups, resorts and boutique properties across
              the United States.
            </p>

            <p>
              From our production teams to our warehouse and customer care
              departments, the Globaltex family works together to maintain
              consistent quality and a smooth purchasing experience.
            </p>
          </div>
        </div>
      </section>

      <section className="whySection">
        <div className="container centered">
          <div className="eyebrow">Why Join Globaltex?</div>
          <h2>Build your career with a global hospitality textile brand</h2>

          <p className="sectionIntro">
            We are more than a textile company. We are a team committed to
            excellence, innovation and long-term value.
          </p>

          <div className="whyGrid">
            <InfoCard
              title="Global Vision"
              text="Be part of an international brand serving hospitality partners across key markets."
            />

            <InfoCard
              title="Career Development"
              text="We invest in people through learning, responsibility and advancement opportunities across departments."
            />

            <InfoCard
              title="Stability & Trust"
              text="As a growing company with years of experience, we provide a stable environment where your contribution matters."
            />
          </div>
        </div>
      </section>

      <section className="positionsSection" id="open-positions">
        <div className="container">
          <div className="positionsHeader">
            <div>
              <div className="eyebrow">Open Positions</div>
              <h2>Explore current opportunities in the United States</h2>
              <p>
                Discover open roles across sales, operations, production,
                customer support and administration. Each position has a
                dedicated application page connected to our career form system.
              </p>
            </div>
          </div>

          <div className="categoryStack">
            {usaPositionCategories.map((group) => (
              <div key={group.category} className="positionCategory">
                <h3>{group.category}</h3>

                <div className="positionsGrid">
                  {group.positions.map((position) => (
                    <Link
                      key={position.slug}
                      href={`/careers/${position.slug}`}
                      className="positionCard"
                    >
                      <div className="positionImageWrap">
                        <img
                          src={position.image}
                          alt={position.title}
                          className="positionImage"
                        />

                        <div className="positionImageOverlay" />
                      </div>

                      <div className="positionContent">
                        <div className="positionTopLine">
                          <span className="positionDepartment">
                            {position.department}
                          </span>

                          <span className="positionType">{position.type}</span>
                        </div>

                        <h4>{position.title}</h4>

                        <p className="positionLocation">{position.location}</p>

                        <p className="positionSummary">{position.summary}</p>

                        <div className="positionFooter">
                          <span>View Role</span>
                          <span className="arrow">→</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="generalApplication">
        <div className="container generalBox">
          <div>
            <div className="eyebrow">General Application</div>
            <h2>Didn't find a suitable position?</h2>
            <p>
              We are always looking for talented individuals. If you believe you
              would be a great fit for Globaltex Fine Linens, feel free to share
              your resume with us.
            </p>
          </div>

          <Link
            href="/careers/intern-miami-fl#application-form"
            className="darkButton"
          >
            Submit Your Resume
          </Link>
        </div>
      </section>

      <section className="linkedinSection">
        <div className="container linkedinBox">
          <div className="linkedinLeft">
            <img src={linkedinLogo} alt="LinkedIn" />

            <div>
              <h3>Prefer applying via LinkedIn?</h3>
              <p>
                You can also review our open roles and apply directly with your
                LinkedIn profile as an alternative to our Career page form.
              </p>
            </div>
          </div>

          <a
            href="https://www.linkedin.com/company/globaltexfinelinens/jobs/"
            target="_blank"
            rel="noopener noreferrer"
            className="outlineGoldButton"
          >
            View roles on LinkedIn
          </a>
        </div>
      </section>

      <section className="ratingsSection">
        <div className="container centered">
          <div className="eyebrow">Employer Ratings</div>
          <h2>Our Ratings</h2>

          <p className="sectionIntro">
            See how team members rate their experience on trusted platforms.
          </p>

          <div className="ratingsGrid">
            {ratings.map((rating) => (
              <article key={rating.name} className="ratingCard">
                <div className="ratingLogo">
                  <img src={rating.logo} alt={rating.name} />
                </div>

                <div>
                  <div className="score">
                    <strong>{rating.score}</strong>
                    <span>/ 5</span>
                  </div>

                  <div className="stars">
                    <span className="starsBg">★★★★★</span>
                    <span className="starsFill" style={{ width: rating.fill }}>
                      ★★★★★
                    </span>
                  </div>

                  <div className="ratingLabel">{rating.name}</div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="faqSection">
        <div className="container narrow">
          <div className="centered">
            <div className="eyebrow">Career Questions</div>
            <h2>Frequently Asked Questions</h2>
          </div>

          <div className="faqList">
            {faqItems.map((item) => (
              <details key={item.question} className="faqItem">
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <style jsx>{`
        .container {
          width: min(1180px, calc(100% - 40px));
          margin: 0 auto;
        }

        .narrow {
          width: min(980px, calc(100% - 40px));
        }

        .centered {
          text-align: center;
        }

        .eyebrow {
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #d8bc55;
          margin-bottom: 10px;
        }

        h1,
        h2,
        h3,
        h4 {
          font-family: var(--font-heading);
        }

        .careerHero {
          position: relative;
          width: 100%;
          overflow: hidden;
          background: #0f172a;
        }

        .careerHeroImageWrap {
          width: 100%;
          line-height: 0;
        }

        .careerHeroImage {
          width: 100%;
          height: auto;
          display: block;
        }

        .careerHeroContent {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 3vw;
          text-align: center;
        }

        .careerHeroPanel {
          max-width: 760px;
          width: min(46vw, 760px);
          padding: 26px 34px;
          color: #fff;
          background: rgba(4, 10, 22, 0.58);
          border: 1px solid rgba(255, 255, 255, 0.24);
          border-radius: 24px;
          box-shadow: 0 24px 70px rgba(0, 0, 0, 0.45);
          backdrop-filter: blur(10px);
        }

        .careerHeroPanel h1 {
          margin: 0 0 12px;
          font-size: clamp(32px, 3.6vw, 54px);
          line-height: 1.02;
          color: #d8bc55;
          font-weight: 500;
        }

        .careerHeroPanel p {
          margin: 0;
          font-size: clamp(15px, 1.2vw, 18px);
          line-height: 1.7;
        }

        .appointmentSection {
          padding: 28px 0;
          background: linear-gradient(
            180deg,
            rgba(47, 109, 179, 0.06),
            transparent 65%
          );
        }

        .appointmentBox,
        .generalBox,
        .linkedinBox {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 28px;
          padding: 32px 40px;
          border-radius: 28px;
          background: #fff;
          border: 1px solid rgba(216, 188, 85, 0.35);
          box-shadow: 0 22px 70px rgba(0, 0, 0, 0.08);
        }

        .appointmentBox h2,
        .generalBox h2,
        .linkedinBox h3 {
          margin: 0 0 8px;
          font-size: 28px;
          color: #151515;
          font-weight: 500;
        }

        .appointmentBox p,
        .generalBox p,
        .linkedinBox p {
          margin: 0;
          color: #4a4a4a;
          line-height: 1.85;
        }

        .blueButton,
        .darkButton,
        .outlineGoldButton {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 48px;
          padding: 0 26px;
          border-radius: 999px;
          text-decoration: none;
          font-weight: 800;
          white-space: nowrap;
          transition: transform 0.18s ease, box-shadow 0.18s ease,
            background 0.18s ease, color 0.18s ease;
        }

        .blueButton {
          background: #2f6db3;
          color: #fff;
          border: 1px solid #2f6db3;
          box-shadow: 0 10px 26px rgba(47, 109, 179, 0.2);
        }

        .blueButton:hover {
          background: #224e86;
          border-color: #224e86;
          transform: translateY(-1px);
          box-shadow: 0 14px 32px rgba(34, 78, 134, 0.32);
        }

        .darkButton {
          background: #001c39;
          color: #fff;
          border: 1px solid #001c39;
        }

        .darkButton:hover {
          transform: translateY(-1px);
          box-shadow: 0 14px 30px rgba(0, 28, 57, 0.22);
        }

        .outlineGoldButton {
          background: #fff;
          color: #d8bc55;
          border: 1px solid #d8bc55;
          box-shadow: 0 8px 18px rgba(216, 188, 85, 0.22);
        }

        .outlineGoldButton:hover {
          background: #d8bc55;
          color: #fff;
          transform: translateY(-1px);
          box-shadow: 0 12px 26px rgba(216, 188, 85, 0.32);
        }

        .awardSection,
        .positionsSection,
        .ratingsSection,
        .faqSection {
          padding: 70px 0;
          background: #fff;
        }

        .whySection,
        .generalApplication {
          padding: 70px 0;
          background: #f9f9f9;
        }

        .linkedinSection {
          padding: 40px 0;
          background: #fff;
        }

        .awardGrid {
          display: grid;
          grid-template-columns: 280px minmax(0, 1fr);
          gap: 44px;
          align-items: center;
        }

        .awardImageWrap img {
          width: 100%;
          border-radius: 18px;
          box-shadow: 0 18px 45px rgba(0, 0, 0, 0.1);
        }

        .awardGrid h2,
        .whySection h2,
        .positionsSection h2,
        .ratingsSection h2,
        .faqSection h2 {
          margin: 0 0 14px;
          font-size: clamp(30px, 3vw, 42px);
          color: #001c39;
          font-weight: 500;
        }

        .lead,
        .sectionIntro {
          color: #555;
          font-size: 17px;
          line-height: 1.75;
        }

        .awardGrid p {
          color: #444;
          line-height: 1.8;
        }

        .whyGrid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          margin-top: 38px;
        }

        .infoCard {
          background: #fff;
          border: 1px solid #eee5d8;
          border-radius: 24px;
          padding: 28px;
          box-shadow: 0 14px 35px rgba(0, 0, 0, 0.05);
        }

        .infoCard h3 {
          margin: 0 0 10px;
          color: #001c39;
          font-size: 22px;
          font-weight: 500;
        }

        .infoCard p {
          margin: 0;
          color: #555;
          line-height: 1.75;
        }

        .positionsHeader {
          max-width: 820px;
          margin-bottom: 42px;
        }

        .positionsHeader p {
          max-width: 760px;
          color: #555;
          line-height: 1.75;
          margin: 0;
        }

        .categoryStack {
          display: grid;
          gap: 64px;
        }

        .positionCategory h3 {
          margin: 0 0 30px;
          padding-bottom: 16px;
          border-bottom: 1px solid #e6ddd0;
          text-align: center;
          color: #d8bc55;
          font-size: 30px;
          line-height: 1.2;
          font-weight: 500;
        }

        .positionsGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 28px;
        }

        .positionCard {
          overflow: hidden;
          border-radius: 26px;
          border: 1px solid #e6ddd0;
          background: #fff;
          color: inherit;
          text-decoration: none;
          box-shadow: 0 14px 34px rgba(0, 0, 0, 0.045);
          transition: transform 0.22s ease, box-shadow 0.22s ease,
            border-color 0.22s ease;
        }

        .positionCard:hover {
          transform: translateY(-6px);
          border-color: rgba(216, 188, 85, 0.72);
          box-shadow: 0 24px 55px rgba(0, 0, 0, 0.11);
        }

        .positionImageWrap {
          position: relative;
          height: 220px;
          overflow: hidden;
          background: #001c39;
        }

        .positionImage {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 0.35s ease;
        }

        .positionCard:hover .positionImage {
          transform: scale(1.05);
        }

        .positionImageOverlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            rgba(0, 28, 57, 0.05) 0%,
            rgba(0, 28, 57, 0.54) 100%
          );
        }

        .positionContent {
          padding: 24px;
        }

        .positionTopLine {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
        }

        .positionDepartment {
          min-height: 30px;
          display: inline-flex;
          align-items: center;
          padding: 0 11px;
          border-radius: 999px;
          background: #f8f4e8;
          color: #8a6b16;
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .positionType {
          color: #7a7064;
          font-size: 13px;
          font-weight: 800;
          white-space: nowrap;
        }

        .positionContent h4 {
          min-height: 56px;
          margin: 0 0 10px;
          color: #001c39;
          font-size: 24px;
          line-height: 1.16;
          font-weight: 500;
        }

        .positionLocation {
          margin: 0 0 12px;
          color: #5a5349;
          font-size: 14px;
          line-height: 1.6;
          font-weight: 700;
        }

        .positionSummary {
          min-height: 76px;
          margin: 0;
          color: #666;
          font-size: 14px;
          line-height: 1.7;
        }

        .positionFooter {
          margin-top: 20px;
          padding-top: 18px;
          border-top: 1px solid #eee5d8;
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #2f6db3;
          font-weight: 900;
        }

        .arrow {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #eef4fb;
          color: #2f6db3;
        }

        .linkedinLeft {
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .linkedinLeft img {
          width: 42px;
          height: 42px;
          object-fit: contain;
        }

        .ratingsGrid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-top: 34px;
        }

        .ratingCard {
          display: flex;
          align-items: center;
          gap: 24px;
          padding: 24px;
          border-radius: 22px;
          border: 1px solid rgba(15, 23, 42, 0.1);
          background: #fff;
          box-shadow: 0 12px 34px rgba(15, 23, 42, 0.06);
        }

        .ratingLogo img {
          max-width: 170px;
          max-height: 54px;
          object-fit: contain;
        }

        .score strong {
          font-size: 32px;
          color: #0f172a;
        }

        .score span {
          color: #64748b;
          margin-left: 6px;
        }

        .stars {
          position: relative;
          display: inline-block;
          font-size: 18px;
          letter-spacing: 2px;
          margin: 4px 0 6px;
        }

        .starsBg {
          color: rgba(15, 23, 42, 0.2);
        }

        .starsFill {
          position: absolute;
          left: 0;
          top: 0;
          white-space: nowrap;
          overflow: hidden;
          color: #d8bc55;
        }

        .ratingLabel {
          color: #64748b;
          font-size: 13px;
        }

        .faqList {
          margin-top: 36px;
          display: grid;
          gap: 12px;
        }

        .faqItem {
          background: #fff;
          border: 1px solid #e6ddd0;
          border-radius: 18px;
          padding: 0 20px;
        }

        .faqItem summary {
          cursor: pointer;
          padding: 18px 0;
          font-weight: 900;
          color: #001c39;
          list-style: none;
        }

        .faqItem p {
          margin: 0 0 18px;
          color: #555;
          line-height: 1.7;
        }

        @media (max-width: 980px) {
          .careerHeroContent {
            position: static;
            background: #fff;
            padding: 20px;
          }

          .careerHeroPanel {
            width: 100%;
            background: #fff;
            color: #111827;
            box-shadow: none;
            border: none;
            padding: 18px 0;
          }

          .careerHeroPanel h1 {
            font-size: 30px;
          }

          .appointmentBox,
          .generalBox,
          .linkedinBox {
            flex-direction: column;
            align-items: flex-start;
            padding: 26px 22px;
          }

          .awardGrid,
          .whyGrid,
          .ratingsGrid,
          .positionsGrid {
            grid-template-columns: 1fr;
          }

          .blueButton,
          .darkButton,
          .outlineGoldButton {
            width: 100%;
          }

          .positionCategory h3 {
            text-align: left;
            font-size: 25px;
          }

          .positionContent h4,
          .positionSummary {
            min-height: auto;
          }

          .linkedinLeft {
            align-items: flex-start;
          }
        }
      `}</style>
    </>
  );
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <article className="infoCard">
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}