"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useCart } from "./CartContext";
import { formatMoney } from "../../lib/money";

type CartItem = {
  id: string;
  product_title?: string;
  variant_title?: string;
  image?: string;
  unit_price?: number | string;
  quantity?: number | string;
  line_total?: number | string;
  sku?: string;

  min_quantity?: number | string;
  box_quantity?: number | string;
  case_quantity?: number | string;
  step_quantity?: number | string;

  min_quantity_number?: number;
  box_quantity_number?: number;
  case_quantity_number?: number;
  step_quantity_number?: number;
};

type QuantityRule = {
  minQuantity: number;
  boxQuantity: number;
  caseQuantity: number;
  stepQuantity: number;
  message: string;
};

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function toPositiveInteger(value: unknown, fallback: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  const floored = Math.floor(parsed);

  return floored > 0 ? floored : fallback;
}

function toSafeMoneyNumber(value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return parsed;
}

function getQuantityRule(item: CartItem): QuantityRule {
  const minQuantity =
    toPositiveInteger(item.min_quantity_number, 0) ||
    toPositiveInteger(item.min_quantity, 0) ||
    1;

  const boxQuantity =
    toPositiveInteger(item.box_quantity_number, 0) ||
    toPositiveInteger(item.box_quantity, 0) ||
    0;

  const caseQuantity =
    toPositiveInteger(item.case_quantity_number, 0) ||
    toPositiveInteger(item.case_quantity, 0) ||
    0;

  const stepQuantity =
    toPositiveInteger(item.step_quantity_number, 0) ||
    toPositiveInteger(item.step_quantity, 0) ||
    caseQuantity ||
    boxQuantity ||
    minQuantity ||
    1;

  let message = "";

  if (caseQuantity > 0) {
    message = `Case multiple: ${caseQuantity}`;
  } else if (boxQuantity > 0) {
    message = `Box multiple: ${boxQuantity}`;
  } else if (stepQuantity > 1) {
    message = `Step: ${stepQuantity}`;
  } else if (minQuantity > 1) {
    message = `Minimum: ${minQuantity}`;
  }

  return {
    minQuantity,
    boxQuantity,
    caseQuantity,
    stepQuantity,
    message,
  };
}

function normalizeQuantityToRule(quantity: number, rule: QuantityRule) {
  const safeQuantity = Math.max(
    rule.minQuantity,
    Math.floor(Number(quantity) || rule.minQuantity)
  );

  const remainder = (safeQuantity - rule.minQuantity) % rule.stepQuantity;

  if (remainder === 0) {
    return safeQuantity;
  }

  return safeQuantity + (rule.stepQuantity - remainder);
}

function getCurrentQuantity(item: CartItem, rule: QuantityRule) {
  const current = Math.floor(Number(item.quantity || rule.minQuantity));

  if (!Number.isFinite(current) || current <= 0) {
    return rule.minQuantity;
  }

  return normalizeQuantityToRule(current, rule);
}

function getNextDecreaseQuantity(quantity: number, rule: QuantityRule) {
  const next = quantity - rule.stepQuantity;

  if (next < rule.minQuantity) {
    return rule.minQuantity;
  }

  return normalizeQuantityToRule(next, rule);
}

function getNextIncreaseQuantity(quantity: number, rule: QuantityRule) {
  return normalizeQuantityToRule(quantity + rule.stepQuantity, rule);
}

function isTechnicalCartError(message: string) {
  const normalized = String(message || "").toLowerCase();

  return (
    normalized.includes("cart not found") ||
    normalized.includes("cart token not found") ||
    normalized.includes("cart row could not be found")
  );
}

export default function CartPageClient() {
  const {
    cart,
    isBootstrapping,
    isUpdating,
    error,
    clearError,
    refreshCart,
    handleUpdateQuantity,
    handleRemoveItem,
    handleClearCart,
  } = useCart();

  useEffect(() => {
    void refreshCart();
  }, [refreshCart]);

  const items = useMemo(() => {
    return Array.isArray(cart?.items) ? (cart.items as CartItem[]) : [];
  }, [cart]);

  const subtotal = Number(cart?.totals?.subtotal || 0);
  const itemCount = Number(cart?.totals?.item_count || 0);
  const visibleError = error && !isTechnicalCartError(error) ? error : "";

  async function safelyUpdateQuantity(itemId: string, quantity: number) {
    try {
      clearError();
      await handleUpdateQuantity(itemId, quantity);
    } catch {
      // Shared cart error is rendered below header.
    }
  }

  async function safelyRemoveItem(itemId: string) {
    try {
      clearError();
      await handleRemoveItem(itemId);
    } catch {
      // Shared cart error is rendered below header.
    }
  }

  async function safelyClearCart() {
    try {
      clearError();
      await handleClearCart();
    } catch {
      // Shared cart error is rendered below header.
    }
  }

  if (isBootstrapping) {
    return (
      <div style={pageStyle}>
        <div style={emptyBoxStyle}>
          <div style={eyebrowStyle}>B2B Quote Request</div>
          <h1 style={titleStyle}>Quote Cart</h1>
          <p style={introTextStyle}>Loading your quote cart...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <div style={eyebrowStyle}>B2B Quote Request</div>

          <h1 style={titleStyle}>Quote Cart</h1>

          <p style={introTextStyle}>
            Review selected hospitality products before submitting your quote
            request. Final pricing, freight, availability, and payment terms are
            reviewed by the Globaltex Fine Linens sales team.
          </p>
        </div>

        <Link href="/collections" style={secondaryButtonStyle}>
          Continue Browsing
        </Link>
      </div>

      {visibleError ? <div style={errorBoxStyle}>{visibleError}</div> : null}

      {!items.length ? (
        <div style={emptyBoxStyle}>
          <div>
            <h2 style={emptyTitleStyle}>Your quote cart is empty.</h2>

            <p style={emptyTextStyle}>
              Add products from the catalog to start a wholesale quote request
              for your hotel, hospitality project, or bulk procurement needs.
            </p>
          </div>

          <Link href="/collections" style={primaryLinkStyle}>
            Browse Collections
          </Link>
        </div>
      ) : (
        <div className="cart-page-layout" style={layoutStyle}>
          <div style={itemsCardStyle}>
            <div style={itemsHeaderStyle}>
              <div>
                <h2 style={sectionTitleStyle}>Selected Products</h2>

                <p style={sectionTextStyle}>
                  Quantities can be adjusted before submitting your request.
                </p>
              </div>

              <div style={itemBadgeStyle}>
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </div>
            </div>

            <div style={{ display: "grid" }}>
              {items.map((item, index) => (
                <CartPageItem
                  key={item.id}
                  item={item}
                  index={index}
                  isUpdating={isUpdating}
                  onUpdateQuantity={safelyUpdateQuantity}
                  onRemoveItem={safelyRemoveItem}
                />
              ))}
            </div>
          </div>

          <aside style={summaryCardStyle}>
            <h2 style={summaryTitleStyle}>Quote Summary</h2>

            <div style={summaryRowsStyle}>
              <div style={summaryRowStyle}>
                <span>Items</span>
                <strong>{itemCount}</strong>
              </div>

              <div style={summaryRowStyle}>
                <span>Estimated Subtotal</span>
                <strong>{formatMoney(subtotal)}</strong>
              </div>
            </div>

            <div style={summaryTotalStyle}>
              <span>Estimated Total</span>
              <strong>{formatMoney(subtotal)}</strong>
            </div>

            <div style={noticeStyle}>
              This is not a final invoice. Your submitted request will be
              reviewed for B2B pricing, availability, freight, lead time, and
              payment terms.
            </div>

            <div style={buttonGridStyle}>
              <Link href="/checkout" style={primaryButtonStyle}>
                Submit Quote Request
              </Link>

              <Link href="/collections" style={secondaryButtonStyle}>
                Continue Browsing
              </Link>

              <button
                type="button"
                onClick={safelyClearCart}
                disabled={isUpdating}
                style={{
                  ...clearButtonStyle,
                  cursor: isUpdating ? "not-allowed" : "pointer",
                  opacity: isUpdating ? 0.65 : 1,
                }}
              >
                {isUpdating ? "Updating..." : "Clear Quote Cart"}
              </button>
            </div>
          </aside>
        </div>
      )}

      <style jsx>{`
        @media (max-width: 980px) {
          .cart-page-layout {
            grid-template-columns: 1fr !important;
          }

          .cart-page-item {
            grid-template-columns: 112px minmax(0, 1fr) !important;
          }

          .cart-page-desktop-total {
            grid-column: 2 !important;
            text-align: left !important;
          }
        }

        @media (max-width: 620px) {
          .cart-page-item {
            grid-template-columns: 1fr !important;
          }

          .cart-page-desktop-total {
            grid-column: auto !important;
          }
        }
      `}</style>
    </div>
  );
}

function CartPageItem({
  item,
  index,
  isUpdating,
  onUpdateQuantity,
  onRemoveItem,
}: {
  item: CartItem;
  index: number;
  isUpdating: boolean;
  onUpdateQuantity: (itemId: string, quantity: number) => Promise<void>;
  onRemoveItem: (itemId: string) => Promise<void>;
}) {
  const quantityRule = useMemo(() => getQuantityRule(item), [item]);
  const quantity = getCurrentQuantity(item, quantityRule);

  const unitPrice = toSafeMoneyNumber(item.unit_price);
  const lineTotal = toSafeMoneyNumber(item.line_total || unitPrice * quantity);
  const imageUrl = normalizeText(item.image);

  const nextDecreaseQuantity = getNextDecreaseQuantity(quantity, quantityRule);
  const nextIncreaseQuantity = getNextIncreaseQuantity(quantity, quantityRule);

  async function handleDecrease() {
    if (quantity <= quantityRule.minQuantity) {
      return;
    }

    await onUpdateQuantity(item.id, nextDecreaseQuantity);
  }

  async function handleIncrease() {
    await onUpdateQuantity(item.id, nextIncreaseQuantity);
  }

  return (
    <div
      className="cart-page-item"
      style={{
        ...cartItemStyle,
        borderTop: index === 0 ? "none" : "1px solid #f0e7db",
      }}
    >
      <div style={imageWrapStyle}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={item.product_title || "Product"}
            loading="lazy"
            decoding="async"
            style={imageStyle}
          />
        ) : (
          <div style={placeholderStyle}>No Image</div>
        )}
      </div>

      <div style={contentStyle}>
        <div style={productTitleStyle}>{item.product_title || "Product"}</div>

        {item.variant_title ? (
          <div style={variantStyle}>{item.variant_title}</div>
        ) : null}

        {item.sku ? <div style={skuStyle}>SKU: {item.sku}</div> : null}

        <div style={priceGridStyle}>
          <div>
            <div style={priceLabelStyle}>Unit Price</div>
            <div style={priceValueStyle}>{formatMoney(unitPrice)}</div>
          </div>

          <div>
            <div style={priceLabelStyle}>Line Total</div>
            <div style={priceValueStyle}>{formatMoney(lineTotal)}</div>
          </div>
        </div>

        <div style={quantityRuleStyle}>
          Min: {quantityRule.minQuantity} · Step: {quantityRule.stepQuantity}
          {quantityRule.message ? <> · {quantityRule.message}</> : null}
        </div>

        <div style={actionsRowStyle}>
          <div style={quantityWrapStyle}>
            <button
              type="button"
              onClick={handleDecrease}
              disabled={isUpdating || quantity <= quantityRule.minQuantity}
              style={{
                ...qtyButtonStyle,
                cursor:
                  isUpdating || quantity <= quantityRule.minQuantity
                    ? "not-allowed"
                    : "pointer",
                opacity: isUpdating || quantity <= quantityRule.minQuantity ? 0.65 : 1,
              }}
            >
              -
            </button>

            <span style={qtyValueStyle}>{quantity}</span>

            <button
              type="button"
              onClick={handleIncrease}
              disabled={isUpdating}
              style={{
                ...qtyButtonStyle,
                cursor: isUpdating ? "not-allowed" : "pointer",
                opacity: isUpdating ? 0.65 : 1,
              }}
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={() => onRemoveItem(item.id)}
            disabled={isUpdating}
            style={{
              ...removeButtonStyle,
              cursor: isUpdating ? "not-allowed" : "pointer",
              opacity: isUpdating ? 0.65 : 1,
            }}
          >
            Remove item
          </button>
        </div>
      </div>

      <div className="cart-page-desktop-total" style={desktopLineTotalStyle}>
        <div style={priceLabelStyle}>Line Total</div>
        <div style={desktopLineTotalValueStyle}>{formatMoney(lineTotal)}</div>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  maxWidth: 1240,
  margin: "0 auto",
  padding: "44px 20px 84px",
};

const headerStyle: React.CSSProperties = {
  marginBottom: 28,
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 18,
  flexWrap: "wrap",
};

const eyebrowStyle: React.CSSProperties = {
  width: "fit-content",
  padding: "7px 12px",
  borderRadius: 999,
  background: "#f8f5ef",
  border: "1px solid #ece3d7",
  color: "#6b6256",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginBottom: 10,
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "clamp(2.2rem, 4vw, 4rem)",
  lineHeight: 1,
  color: "#171717",
  fontWeight: 850,
  letterSpacing: "-0.04em",
};

const introTextStyle: React.CSSProperties = {
  margin: "12px 0 0",
  maxWidth: 820,
  color: "#5d554a",
  fontSize: 16,
  lineHeight: 1.8,
};

const errorBoxStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid #f1c7c7",
  background: "#fff4f4",
  color: "#9b2c2c",
  fontSize: 14,
  fontWeight: 700,
  lineHeight: 1.6,
  marginBottom: 16,
};

const emptyBoxStyle: React.CSSProperties = {
  border: "1px solid #ece3d7",
  borderRadius: 24,
  padding: 32,
  background: "#fffaf4",
  display: "grid",
  gap: 20,
};

const emptyTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#171717",
  fontSize: 26,
  lineHeight: 1.2,
  fontWeight: 800,
};

const emptyTextStyle: React.CSSProperties = {
  margin: "10px 0 0",
  color: "#5d554a",
  fontSize: 15,
  lineHeight: 1.8,
  maxWidth: 720,
};

const layoutStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 390px",
  gap: 24,
  alignItems: "start",
};

const itemsCardStyle: React.CSSProperties = {
  border: "1px solid #ece3d7",
  borderRadius: 24,
  background: "#fff",
  overflow: "hidden",
};

const itemsHeaderStyle: React.CSSProperties = {
  padding: 22,
  background: "#fffaf4",
  borderBottom: "1px solid #ece3d7",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 16,
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#171717",
  fontSize: 22,
  lineHeight: 1.2,
  fontWeight: 800,
};

const sectionTextStyle: React.CSSProperties = {
  margin: "7px 0 0",
  color: "#6b6256",
  fontSize: 14,
  lineHeight: 1.6,
};

const itemBadgeStyle: React.CSSProperties = {
  flex: "0 0 auto",
  padding: "8px 12px",
  borderRadius: 999,
  background: "#fff",
  border: "1px solid #ece3d7",
  color: "#171717",
  fontSize: 13,
  fontWeight: 800,
};

const cartItemStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "132px minmax(0, 1fr) 140px",
  gap: 18,
  padding: 22,
  alignItems: "start",
};

const imageWrapStyle: React.CSSProperties = {
  width: 132,
  height: 132,
  borderRadius: 18,
  background: "#f7f4ef",
  overflow: "hidden",
};

const imageStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

const placeholderStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  display: "grid",
  placeItems: "center",
  color: "#9b9288",
  fontSize: 12,
  fontWeight: 700,
};

const contentStyle: React.CSSProperties = {
  minWidth: 0,
};

const productTitleStyle: React.CSSProperties = {
  color: "#171717",
  fontSize: 18,
  lineHeight: 1.35,
  fontWeight: 800,
  marginBottom: 6,
};

const variantStyle: React.CSSProperties = {
  color: "#7b7367",
  fontSize: 14,
  lineHeight: 1.5,
  marginBottom: 6,
};

const skuStyle: React.CSSProperties = {
  color: "#8a8176",
  fontSize: 13,
  lineHeight: 1.5,
  marginBottom: 14,
};

const priceGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
  marginBottom: 14,
};

const priceLabelStyle: React.CSSProperties = {
  color: "#7b7367",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  marginBottom: 5,
};

const priceValueStyle: React.CSSProperties = {
  color: "#171717",
  fontSize: 15,
  fontWeight: 800,
};

const quantityRuleStyle: React.CSSProperties = {
  color: "#7b7367",
  fontSize: 13,
  lineHeight: 1.5,
  fontWeight: 700,
  marginBottom: 14,
};

const actionsRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 14,
};

const quantityWrapStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  padding: 6,
  borderRadius: 999,
  border: "1px solid #ddd3c5",
  background: "#fff",
};

const qtyButtonStyle: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 999,
  border: "1px solid #ddd3c5",
  background: "#fffaf4",
  color: "#171717",
  fontSize: 17,
  lineHeight: 1,
};

const qtyValueStyle: React.CSSProperties = {
  minWidth: 34,
  textAlign: "center",
  color: "#171717",
  fontSize: 15,
  fontWeight: 800,
};

const removeButtonStyle: React.CSSProperties = {
  border: "none",
  background: "transparent",
  padding: 0,
  color: "#7b7367",
  fontSize: 14,
  textDecoration: "underline",
};

const desktopLineTotalStyle: React.CSSProperties = {
  textAlign: "right",
};

const desktopLineTotalValueStyle: React.CSSProperties = {
  color: "#171717",
  fontSize: 17,
  fontWeight: 850,
};

const summaryCardStyle: React.CSSProperties = {
  border: "1px solid #ece3d7",
  borderRadius: 24,
  background: "#fff",
  padding: 24,
  position: "sticky",
  top: 20,
};

const summaryTitleStyle: React.CSSProperties = {
  margin: "0 0 18px",
  color: "#171717",
  fontSize: 22,
  lineHeight: 1.2,
  fontWeight: 850,
};

const summaryRowsStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
  marginBottom: 16,
};

const summaryRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  color: "#5d554a",
  fontSize: 15,
};

const summaryTotalStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  paddingTop: 16,
  borderTop: "1px solid #ece3d7",
  color: "#171717",
  fontSize: 18,
  fontWeight: 850,
  marginBottom: 16,
};

const noticeStyle: React.CSSProperties = {
  padding: "13px 14px",
  borderRadius: 16,
  background: "#f8f5ef",
  border: "1px solid #eee5d9",
  color: "#6b6256",
  fontSize: 13,
  lineHeight: 1.7,
  marginBottom: 16,
};

const buttonGridStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
};

const primaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 54,
  padding: "0 20px",
  borderRadius: 999,
  background: "#171717",
  color: "#fff",
  textDecoration: "none",
  fontWeight: 850,
  fontSize: 14,
  border: "1px solid #171717",
};

const secondaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 52,
  padding: "0 20px",
  borderRadius: 999,
  background: "#fff",
  color: "#171717",
  textDecoration: "none",
  fontWeight: 800,
  fontSize: 14,
  border: "1px solid #ddd3c5",
};

const clearButtonStyle: React.CSSProperties = {
  minHeight: 52,
  padding: "0 20px",
  borderRadius: 999,
  background: "#fff",
  color: "#171717",
  border: "1px solid #ddd3c5",
  fontWeight: 700,
  fontSize: 14,
};

const primaryLinkStyle: React.CSSProperties = {
  width: "fit-content",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 52,
  padding: "0 20px",
  borderRadius: 999,
  background: "#171717",
  color: "#fff",
  textDecoration: "none",
  fontWeight: 850,
  fontSize: 14,
  border: "1px solid #171717",
};