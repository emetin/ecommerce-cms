import Link from "next/link";
import { normalizeImageUrl } from "../../lib/image-url";

type ProductCardProps = {
  title: string;
  description?: string;
  image: string;
  href: string;
  collectionLabel?: string;
  vendor?: string;
  productCategory?: string;
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80";

export default function ProductCard({
  title,
  description,
  image,
  href,
  collectionLabel,
  vendor,
  productCategory,
}: ProductCardProps) {
  const finalImage =
    normalizeImageUrl(String(image || "").trim()) || FALLBACK_IMAGE;

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
            src={finalImage}
            alt={title}
            loading="lazy"
            decoding="async"
            style={{
              width: "100%",
              aspectRatio: "1 / 0.82",
              objectFit: "cover",
              display: "block",
            }}
          />
        </div>

        <div
          style={{
            padding: 18,
            display: "grid",
            gap: 10,
            minHeight: 210,
          }}
        >
          {collectionLabel || vendor || productCategory ? (
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              {collectionLabel ? (
                <span style={badgeStyle}>{collectionLabel}</span>
              ) : null}

              {vendor ? (
                <span style={badgeStyleAlt}>{vendor}</span>
              ) : null}

              {productCategory ? (
                <span style={badgeStyleAlt}>{productCategory}</span>
              ) : null}
            </div>
          ) : null}

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

          {description ? (
            <p
              style={{
                margin: 0,
                color: "#5d554a",
                lineHeight: 1.7,
                fontSize: 14,
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {description}
            </p>
          ) : null}

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
              B2B Product Detail
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
              Review →
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

const badgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 28,
  padding: "0 10px",
  borderRadius: 999,
  background: "#f3ede3",
  color: "#2f7d62",
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const badgeStyleAlt: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 28,
  padding: "0 10px",
  borderRadius: 999,
  background: "#faf7f1",
  color: "#6a6155",
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
};