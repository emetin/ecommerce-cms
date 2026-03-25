import Link from "next/link";

type ProductCardProps = {
  title: string;
  description?: string;
  image: string;
  href: string;
  collectionLabel?: string;
};

export default function ProductCard({
  title,
  description,
  image,
  href,
}: ProductCardProps) {
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
            src={
              image?.trim() ||
              "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80"
            }
            alt={title}
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

          {description ? (
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
              Product Detail
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