"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ScrollPromoProps = {
  items: string[];
};

export default function ScrollPromo({ items }: ScrollPromoProps) {
  const [isPaused, setIsPaused] = useState(false);
  const trackRef = useRef<HTMLDivElement | null>(null);

  const repeatedItems = useMemo(() => [...items, ...items], [items]);

  useEffect(() => {
    if (!trackRef.current) return;

    let frameId = 0;
    let position = 0;
    const speed = 0.42;

    const step = () => {
      if (!isPaused && trackRef.current) {
        position -= speed;

        const halfWidth = trackRef.current.scrollWidth / 2;
        if (Math.abs(position) >= halfWidth) {
          position = 0;
        }

        trackRef.current.style.transform = `translate3d(${position}px, 0, 0)`;
      }

      frameId = window.requestAnimationFrame(step);
    };

    frameId = window.requestAnimationFrame(step);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [isPaused]);

  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        background:
          "linear-gradient(180deg, #f4efe7 0%, #f8f5ef 45%, #ffffff 100%)",
        borderTop: "1px solid #e6ddd0",
        borderBottom: "1px solid #e6ddd0",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "linear-gradient(90deg, rgba(248,245,239,1) 0%, rgba(248,245,239,0) 9%, rgba(248,245,239,0) 91%, rgba(248,245,239,1) 100%)",
          zIndex: 2,
        }}
      />

      <div
        style={{
          maxWidth: 1320,
          margin: "0 auto",
          padding: "0 16px",
        }}
      >
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 0,
          }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div
            ref={trackRef}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              width: "max-content",
              padding: "18px 0",
              willChange: "transform",
            }}
          >
            {repeatedItems.map((item, index) => (
              <div
                key={`${item}-${index}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 18,
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    minHeight: 40,
                    padding: "0 16px",
                    borderRadius: 999,
                    background: "rgba(47,125,98,0.08)",
                    border: "1px solid rgba(47,125,98,0.12)",
                    color: "#2f7d62",
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    fontSize: 12,
                  }}
                >
                  {item}
                </span>

                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "rgba(47,125,98,0.34)",
                    display: "inline-block",
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}