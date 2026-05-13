type ScrollPromoProps = {
  items: string[];
};

export default function ScrollPromo({ items }: ScrollPromoProps) {
  const safeItems = items.filter(Boolean);
  const repeatedItems = [...safeItems, ...safeItems];

  if (!safeItems.length) {
    return null;
  }

  return (
    <section className="scroll-promo" aria-label="Globaltex highlights">
      <style>
        {`
          .scroll-promo {
            position: relative;
            overflow: hidden;
            background: linear-gradient(180deg, #f4efe7 0%, #f8f5ef 45%, #ffffff 100%);
            border-top: 1px solid #e6ddd0;
            border-bottom: 1px solid #e6ddd0;
          }

          .scroll-promo::before,
          .scroll-promo::after {
            content: "";
            position: absolute;
            top: 0;
            bottom: 0;
            width: 9%;
            pointer-events: none;
            z-index: 2;
          }

          .scroll-promo::before {
            left: 0;
            background: linear-gradient(90deg, rgba(248,245,239,1) 0%, rgba(248,245,239,0) 100%);
          }

          .scroll-promo::after {
            right: 0;
            background: linear-gradient(270deg, rgba(248,245,239,1) 0%, rgba(248,245,239,0) 100%);
          }

          .scroll-promo__container {
            max-width: 1320px;
            margin: 0 auto;
            padding: 0 16px;
          }

          .scroll-promo__viewport {
            position: relative;
            overflow: hidden;
          }

          .scroll-promo__track {
            display: flex;
            align-items: center;
            gap: 18px;
            width: max-content;
            padding: 18px 0;
            animation: scrollPromoMove 28s linear infinite;
            will-change: transform;
          }

          .scroll-promo__viewport:hover .scroll-promo__track {
            animation-play-state: paused;
          }

          .scroll-promo__item {
            display: inline-flex;
            align-items: center;
            gap: 18px;
            white-space: nowrap;
          }

          .scroll-promo__pill {
            display: inline-flex;
            align-items: center;
            min-height: 40px;
            padding: 0 16px;
            border-radius: 999px;
            background: rgba(47,125,98,0.08);
            border: 1px solid rgba(47,125,98,0.12);
            color: #2f7d62;
            font-weight: 800;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            font-size: 12px;
          }

          .scroll-promo__dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: rgba(47,125,98,0.34);
            display: inline-block;
          }

          @keyframes scrollPromoMove {
            from {
              transform: translate3d(0, 0, 0);
            }

            to {
              transform: translate3d(-50%, 0, 0);
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .scroll-promo__track {
              animation: none;
            }
          }
        `}
      </style>

      <div className="scroll-promo__container">
        <div className="scroll-promo__viewport">
          <div className="scroll-promo__track">
            {repeatedItems.map((item, index) => (
              <div className="scroll-promo__item" key={`${item}-${index}`}>
                <span className="scroll-promo__pill">{item}</span>
                <span className="scroll-promo__dot" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}