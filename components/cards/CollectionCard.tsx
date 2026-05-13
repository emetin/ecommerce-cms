import Link from "next/link";

type CollectionCardProps = {
  title: string;
  description: string;
  image: string;
  href: string;
  prefetch?: boolean;
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1400&q=80";

function getSafeImageSrc(value?: string) {
  const src = String(value || "").trim();
  return src || FALLBACK_IMAGE;
}

export default function CollectionCard({
  title,
  description,
  image,
  href,
  prefetch = false,
}: CollectionCardProps) {
  const imageSrc = getSafeImageSrc(image);

  return (
    <Link
      href={href}
      prefetch={prefetch}
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
          borderRadius: 20,
          overflow: "hidden",
          border: "1px solid #e5dbcf",
          background: "#fff",
          boxShadow: "0 8px 22px rgba(23,23,23,0.035)",
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
            src={imageSrc}
            alt={title}
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            style={{
              width: "100%",
              aspectRatio: "1 / 0.82",
              objectFit: "cover",
              display: "block",
            }}
          />

          <div
            style={{
              position: "absolute",
              left: 14,
              top: 14,
              display: "inline-flex",
              alignItems: "center",
              minHeight: 28,
              padding: "0 10px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.94)",
              color: "#2f7d62",
              fontWeight: 800,
              fontSize: 11,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            Collection
          </div>
        </div>

        <div
          style={{
            padding: 18,
            display: "grid",
            gap: 10,
            minHeight: 170,
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: 20,
              lineHeight: 1.18,
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
              lineHeight: 1.7,
              fontSize: 14,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {description}
          </p>

          <div
            style={{
              marginTop: "auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              borderTop: "1px solid #efe6da",
              paddingTop: 12,
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: "#7b7267",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Collection Detail
            </div>

            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 36,
                padding: "0 14px",
                borderRadius: 999,
                border: "1px solid #d9cfbf",
                fontWeight: 800,
                fontSize: 13,
                color: "#171717",
              }}
            >
              Explore →
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}