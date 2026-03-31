"use client";

import { useEffect, useMemo, useState } from "react";

type ProductGalleryProps = {
  title?: string;
  images: string[];
  controlledActiveImage?: string;
  onActiveImageChange?: (image: string) => void;
};

export default function ProductGallery({
  title = "Product",
  images,
  controlledActiveImage,
  onActiveImageChange,
}: ProductGalleryProps) {
  const validImages = useMemo(
    () => images.map((item) => String(item || "").trim()).filter(Boolean),
    [images]
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    if (!validImages.length) {
      setActiveIndex(0);
      return;
    }

    if (!controlledActiveImage) {
      setActiveIndex((prev) => (prev >= validImages.length ? 0 : prev));
      return;
    }

    const nextIndex = validImages.findIndex(
      (item) => item.trim() === controlledActiveImage.trim()
    );

    if (nextIndex >= 0) {
      setActiveIndex(nextIndex);
    }
  }, [controlledActiveImage, validImages]);

  useEffect(() => {
    if (!validImages.length) return;
    onActiveImageChange?.(validImages[activeIndex]);
  }, [activeIndex, validImages, onActiveImageChange]);

  if (!validImages.length) {
    return (
      <div
        style={{
          borderRadius: 28,
          overflow: "hidden",
          border: "1px solid #e5ddd2",
          background: "#f7f4ef",
          aspectRatio: "1 / 1",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#7a7266",
          fontWeight: 700,
        }}
      >
        No Image
      </div>
    );
  }

  const activeImage = validImages[activeIndex];

  function goPrev() {
    setActiveIndex((prev) => (prev === 0 ? validImages.length - 1 : prev - 1));
  }

  function goNext() {
    setActiveIndex((prev) => (prev === validImages.length - 1 ? 0 : prev + 1));
  }

  return (
    <>
      <div>
        <div
          style={{
            position: "relative",
            borderRadius: 28,
            overflow: "hidden",
            border: "1px solid #e5ddd2",
            background: "#f7f4ef",
          }}
        >
          <img
            src={activeImage}
            alt={title}
            onClick={() => setLightboxOpen(true)}
            style={{
              width: "100%",
              aspectRatio: "1 / 1",
              objectFit: "cover",
              display: "block",
              cursor: "zoom-in",
            }}
          />

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
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 12,
              marginTop: 14,
            }}
          >
            {validImages.slice(0, 8).map((image, index) => (
              <button
                key={`${image}-${index}`}
                type="button"
                onClick={() => setActiveIndex(index)}
                style={{
                  padding: 0,
                  borderRadius: 18,
                  overflow: "hidden",
                  border:
                    index === activeIndex
                      ? "2px solid #2f7d62"
                      : "1px solid #e5ddd2",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                <img
                  src={image}
                  alt={`${title} thumbnail ${index + 1}`}
                  style={{
                    width: "100%",
                    aspectRatio: "1 / 1",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              </button>
            ))}
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
  width: 44,
  height: 44,
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.65)",
  background: "rgba(255,255,255,0.88)",
  cursor: "pointer",
  fontSize: 28,
  lineHeight: 1,
  color: "#171717",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const navButtonLeftStyle: React.CSSProperties = {
  ...navButtonBase,
  left: 16,
};

const navButtonRightStyle: React.CSSProperties = {
  ...navButtonBase,
  right: 16,
};

const zoomButtonStyle: React.CSSProperties = {
  position: "absolute",
  right: 16,
  bottom: 16,
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.7)",
  background: "rgba(255,255,255,0.92)",
  padding: "10px 14px",
  fontWeight: 700,
  cursor: "pointer",
};

const lightboxOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.82)",
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