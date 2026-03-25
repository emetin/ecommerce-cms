import Container from "../ui/Container";

type DetailHeroStat = {
  label: string;
  value: string | number;
};

type DetailHeroProps = {
  kicker: string;
  title: string;
  text: string;
  image: string;
  stats?: DetailHeroStat[];
  actions?: React.ReactNode;
};

export default function DetailHero({
  kicker,
  title,
  text,
  image,
  actions,
}: DetailHeroProps) {
  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        background: "#f7f3ed",
        borderBottom: "1px solid #ede3d7",
        padding: "18px 0 28px",
      }}
    >
      <Container>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.05fr",
            gap: 24,
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "grid",
              alignContent: "center",
              gap: 14,
              padding: "6px 0",
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#6a6258",
              }}
            >
              {kicker}
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: "clamp(2.2rem, 4vw, 4.4rem)",
                lineHeight: 1.02,
                fontWeight: 800,
                letterSpacing: "-0.035em",
                color: "#171717",
                maxWidth: 720,
              }}
            >
              {title}
            </h1>

            <p
              style={{
                margin: 0,
                maxWidth: 700,
                color: "#5d554a",
                fontSize: 16,
                lineHeight: 1.75,
              }}
            >
              {text}
            </p>

            {actions ? (
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  marginTop: 4,
                }}
              >
                {actions}
              </div>
            ) : null}
          </div>

          <div
            style={{
              position: "relative",
              overflow: "hidden",
              borderRadius: 24,
              minHeight: 340,
              background: "#ece3d7",
            }}
          >
            <img
              src={
                image?.trim() ||
                "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1600&q=80"
              }
              alt={title}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          </div>
        </div>
      </Container>
    </section>
  );
}