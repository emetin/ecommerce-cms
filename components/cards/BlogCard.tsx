import Link from "next/link";

type BlogCardProps = {
  title: string;
  excerpt: string;
  image: string;
  href: string;
};

export default function BlogCard({
  title,
  excerpt,
  image,
  href,
}: BlogCardProps) {
  return (
    <Link
      href={href}
      style={{
        textDecoration: "none",
        color: "inherit",
        display: "block",
        height: "100%",
      }}
    >
      <article
        style={{
          height: "100%",
          borderRadius: 26,
          overflow: "hidden",
          border: "1px solid #e5dbcf",
          background: "#fff",
          boxShadow: "0 12px 32px rgba(23,23,23,0.04)",
        }}
      >
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            background: "#f6f2eb",
          }}
        >
          <img
            src={
              image?.trim() ||
              "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=80"
            }
            alt={title}
            style={{
              width: "100%",
              aspectRatio: "1 / 1.08",
              objectFit: "cover",
              display: "block",
            }}
          />

          <div
            style={{
              position: "absolute",
              left: 18,
              top: 18,
              display: "inline-flex",
              alignItems: "center",
              minHeight: 32,
              padding: "0 12px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.92)",
              color: "#2f7d62",
              fontWeight: 800,
              fontSize: 12,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            Editorial
          </div>
        </div>

        <div
          style={{
            padding: 24,
            display: "grid",
            gap: 14,
            minHeight: 250,
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: 24,
              lineHeight: 1.2,
              fontWeight: 800,
              color: "#171717",
            }}
          >
            {title}
          </h3>

          <p
            style={{
              margin: 0,
              color: "#5d554a",
              lineHeight: 1.85,
              fontSize: 15,
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {excerpt}
          </p>

          <div
            style={{
              marginTop: "auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              borderTop: "1px solid #efe6da",
              paddingTop: 16,
            }}
          >
            <div
              style={{
                fontSize: 13,
                color: "#7b7267",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Article Detail
            </div>

            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 42,
                padding: "0 16px",
                borderRadius: 999,
                border: "1px solid #d9cfbf",
                fontWeight: 800,
                fontSize: 14,
                color: "#171717",
              }}
            >
              Read →
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}