"use client";

import { memo, useEffect, useMemo, useState } from "react";
import {
  areSameImageUrls,
  normalizeImageUrl,
  uniqueImageUrls,
} from "../../lib/image-url";

type ProductGalleryProps = {
  title?: string;
  images: string[];
  controlledActiveImage?: string;
  onActiveImageChange?: (image: string) => void;
};

function ProductGalleryComponent({
  title = "Product",
  images,
  controlledActiveImage,
  onActiveImageChange,
}: ProductGalleryProps) {
  const validImages = useMemo(() => {
    return uniqueImageUrls(
      images
        .map((item) => normalizeImageUrl(String(item || "").trim()))
        .filter(Boolean)
    );
  }, [images]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const activeImage = validImages[activeIndex] || validImages[0] || "";

  useEffect(() => {
    if (!validImages.length) {
      setActiveIndex(0);
      return;
    }

    if (!controlledActiveImage) {
      setActiveIndex((prev) => (prev >= validImages.length ? 0 : prev));
      return;
    }

    const nextIndex = validImages.findIndex((item) =>
      areSameImageUrls(item, controlledActiveImage)
    );

    if (nextIndex >= 0) {
      setActiveIndex((prev) => (prev === nextIndex ? prev : nextIndex));
      return;
    }

    setActiveIndex((prev) => (prev >= validImages.length ? 0 : prev));
  }, [controlledActiveImage, validImages]);

  useEffect(() => {
    if (!validImages.length) return;

    const nextImage = validImages[activeIndex] || validImages[0];
    if (nextImage) {
      onActiveImageChange?.(nextImage);
    }
  }, [activeIndex, validImages, onActiveImageChange]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!lightboxOpen || !validImages.length) return;

      if (event.key === "Escape") {
        setLightboxOpen(false);
      }

      if (validImages.length > 1 && event.key === "ArrowLeft") {
        setActiveIndex((prev) => (prev === 0 ? validImages.length - 1 : prev - 1));
      }

      if (validImages.length > 1 && event.key === "ArrowRight") {
        setActiveIndex((prev) => (prev === validImages.length - 1 ? 0 : prev + 1));
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightboxOpen, validImages.length]);

  function goPrev() {
    setActiveIndex((prev) => (prev === 0 ? validImages.length - 1 : prev - 1));
  }

  function goNext() {
    setActiveIndex((prev) => (prev === validImages.length - 1 ? 0 : prev + 1));
  }

  if (!validImages.length) {
    return (
      <div
        style={{
          borderRadius: 30,
          overflow: "hidden",
          border: "1px solid #e7decf",
          background: "linear-gradient(180deg, #faf7f1 0%, #f4eee4 100%)",
          aspectRatio: "1 / 1",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#7a7266",
          fontWeight: 700,
          fontSize: 15,
        }}
      >
        No Image
      </div>
    );
  }

  return (
    <>
      <div style={{ display: "grid", gap: 16 }}>
        <div
          style={{
            position: "relative",
            borderRadius: 30,
            overflow: "hidden",
            border: "1px solid #e5ddd2",
            background: "linear-gradient(180deg, #fbf8f3 0%, #f3ece2 100%)",
            boxShadow: "0 18px 42px rgba(23,23,23,0.08)",
          }}
        >
          <img
            src={activeImage}
            alt={title}
            loading="eager"
            decoding="async"
            fetchPriority="high"
            onClick={() => setLightboxOpen(true)}
            style={{
              width: "100%",
              aspectRatio: "1 / 1",
              objectFit: "cover",
              display: "block",
              cursor: "zoom-in",
              transition: "transform 0.35s ease",
            }}
          />

          <div
            style={{
              position: "absolute",
              top: 18,
              left: 18,
              display: "inline-flex",
              alignItems: "center",
              minHeight: 34,
              padding: "0 12px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.88)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(231,222,207,0.95)",
              fontWeight: 800,
              fontSize: 12,
              color: "#4f473d",
              letterSpacing: "0.04em",
            }}
          >
            {activeIndex + 1} / {validImages.length}
          </div>

          {validImages.length > 1 ? (
            <>
              <button
                type="button"
                onClick={goPrev}
                style={navButtonLeftStyle}
                aria-label="Previous image"
              >
                ‹
              </button>

              <button
                type="button"
                onClick={goNext}
                style={navButtonRightStyle}
                aria-label="Next image"
              >
                ›
              </button>
            </>
          ) : null}

          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            style={zoomButtonStyle}
          >
            View Larger
          </button>
        </div>

        {validImages.length > 1 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            {validImages.slice(0, 10).map((image, index) => {
              const isActive = index === activeIndex;

              return (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  style={{
                    padding: 0,
                    borderRadius: 18,
                    overflow: "hidden",
                    border: isActive
                      ? "2px solid #2f7d62"
                      : "1px solid #e7decf",
                    background: "#fff",
                    cursor: "pointer",
                    boxShadow: isActive
                      ? "0 10px 24px rgba(47,125,98,0.16)"
                      : "0 4px 14px rgba(23,23,23,0.04)",
                    transform: isActive ? "translateY(-2px)" : "none",
                    transition: "all 0.2s ease",
                  }}
                >
                  <img
                    src={image}
                    alt={`${title} thumbnail ${index + 1}`}
                    loading="lazy"
                    decoding="async"
                    fetchPriority="low"
                    style={{
                      width: "100%",
                      aspectRatio: "1 / 1",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {lightboxOpen ? (
        <div style={lightboxOverlayStyle} onClick={() => setLightboxOpen(false)}>
          <div
            style={lightboxContentStyle}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              style={closeButtonStyle}
            >
              ✕
            </button>

            {validImages.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  style={lightboxNavLeftStyle}
                  aria-label="Previous image"
                >
                  ‹
                </button>

                <button
                  type="button"
                  onClick={goNext}
                  style={lightboxNavRightStyle}
                  aria-label="Next image"
                >
                  ›
                </button>
              </>
            ) : null}

            <img
              src={activeImage}
              alt={title}
              decoding="async"
              style={{
                width: "100%",
                maxHeight: "85vh",
                objectFit: "contain",
                display: "block",
                borderRadius: 18,
              }}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}

const navButtonBase: React.CSSProperties = {
  position: "absolute",
  top: "50%",
  transform: "translateY(-50%)",
  width: 48,
  height: 48,
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.7)",
  background: "rgba(255,255,255,0.9)",
  backdropFilter: "blur(8px)",
  cursor: "pointer",
  fontSize: 28,
  lineHeight: 1,
  color: "#171717",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 10px 24px rgba(23,23,23,0.12)",
};

const navButtonLeftStyle: React.CSSProperties = {
  ...navButtonBase,
  left: 18,
};

const navButtonRightStyle: React.CSSProperties = {
  ...navButtonBase,
  right: 18,
};

const zoomButtonStyle: React.CSSProperties = {
  position: "absolute",
  right: 18,
  bottom: 18,
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.72)",
  background: "rgba(255,255,255,0.93)",
  backdropFilter: "blur(8px)",
  padding: "10px 16px",
  fontWeight: 800,
  cursor: "pointer",
  color: "#171717",
  boxShadow: "0 10px 24px rgba(23,23,23,0.12)",
};

const lightboxOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.84)",
  zIndex: 1000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
};

const lightboxContentStyle: React.CSSProperties = {
  position: "relative",
  width: "min(1100px, 100%)",
};

const closeButtonStyle: React.CSSProperties = {
  position: "absolute",
  top: -10,
  right: -10,
  width: 42,
  height: 42,
  borderRadius: 999,
  border: "none",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 800,
  zIndex: 2,
};

const lightboxNavBase: React.CSSProperties = {
  position: "absolute",
  top: "50%",
  transform: "translateY(-50%)",
  width: 52,
  height: 52,
  borderRadius: 999,
  border: "none",
  background: "rgba(255,255,255,0.94)",
  cursor: "pointer",
  fontSize: 30,
  lineHeight: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const lightboxNavLeftStyle: React.CSSProperties = {
  ...lightboxNavBase,
  left: -16,
};

const lightboxNavRightStyle: React.CSSProperties = {
  ...lightboxNavBase,
  right: -16,
};

export default memo(ProductGalleryComponent);