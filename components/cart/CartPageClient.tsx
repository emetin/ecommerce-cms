"use client";

import { useEffect, useMemo } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
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
  boxQuantity: number;
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
  const boxQuantity =
    toPositiveInteger(item.box_quantity_number, 0) ||
    toPositiveInteger(item.box_quantity, 0) ||
    1;

  return {
    boxQuantity,
    message: boxQuantity > 1 ? `Box Quantity: ${boxQuantity}` : "",
  };
}

function normalizeQuantityToRule(quantity: number, rule: QuantityRule) {
  const safeQuantity = Math.max(
    rule.boxQuantity,
    Math.floor(Number(quantity) || rule.boxQuantity)
  );

  const remainder = safeQuantity % rule.boxQuantity;

  if (remainder === 0) {
    return safeQuantity;
  }

  return safeQuantity + (rule.boxQuantity - remainder);
}

function getCurrentQuantity(item: CartItem, rule: QuantityRule) {
  const current = Math.floor(Number(item.quantity || rule.boxQuantity));

  if (!Number.isFinite(current) || current <= 0) {
    return rule.boxQuantity;
  }

  return normalizeQuantityToRule(current, rule);
}

function getNextDecreaseQuantity(quantity: number, rule: QuantityRule) {
  const next = quantity - rule.boxQuantity;

  if (next < rule.boxQuantity) {
    return rule.boxQuantity;
  }

  return normalizeQuantityToRule(next, rule);
}

function getNextIncreaseQuantity(quantity: number, rule: QuantityRule) {
  return normalizeQuantityToRule(quantity + rule.boxQuantity, rule);
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
    lastQuantityRule,
    clearError,
    clearLastQuantityRule,
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

  const quantityNotice =
    lastQuantityRule?.adjusted && lastQuantityRule.message
      ? `${lastQuantityRule.message} Quantity was adjusted to ${lastQuantityRule.quantity}.`
      : "";

  async function safelyClearCart() {
    try {
      clearError();
      clearLastQuantityRule();
      await handleClearCart();
    } catch {
      // Shared cart error is rendered on this page.
    }
  }

  if (isBootstrapping) {
    return (
      <main style={pageStyle}>
        <section style={emptyCardStyle}>
          <div style={eyebrowStyle}>Quote Cart</div>
          <h1 style={titleStyle}>Loading your quote cart...</h1>
          <p style={textStyle}>
            Please wait while we prepare your selected hospitality products.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <section style={headerStyle}>
        <div>
          <div style={eyebrowStyle}>B2B Quote Cart</div>

          <h1 style={titleStyle}>Review Your Quote Cart</h1>

          <p style={textStyle}>
            Confirm selected products and quantities before submitting a
            wholesale quote request. Final pricing, freight, payment terms, and
            availability will be reviewed by the Globaltex sales team.
          </p>
        </div>

        <div style={headerActionsStyle}>
          <Link href="/products" style={secondaryLinkStyle}>
            Continue Browsing
          </Link>

          {items.length ? (
            <Link href="/checkout" style={primaryLinkStyle}>
              Submit Quote Request
            </Link>
          ) : null}
        </div>
      </section>

      {visibleError ? <div style={errorBoxStyle}>{visibleError}</div> : null}

      {quantityNotice ? (
        <div style={noticeBoxStyle}>{quantityNotice}</div>
      ) : null}

      {!items.length ? (
        <section style={emptyCardStyle}>
          <h2 style={emptyTitleStyle}>Your quote cart is empty.</h2>

          <p style={textStyle}>
            Add products from the catalog to start a B2B quote request for your
            hotel, resort, residence, or project-based sourcing needs.
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/collections" style={primaryLinkStyle}>
              Browse Collections
            </Link>

            <Link href="/products" style={secondaryLinkStyle}>
              View Products
            </Link>
          </div>
        </section>
      ) : (
        <section className="cart-page-layout" style={layoutStyle}>
          <div style={itemsWrapStyle}>
            {items.map((item) => (
              <CartPageItem
                key={item.id}
                item={item}
                isUpdating={isUpdating}
                onUpdateQuantity={handleUpdateQuantity}
                onRemoveItem={handleRemoveItem}
                clearError={clearError}
                clearLastQuantityRule={clearLastQuantityRule}
              />
            ))}
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

              <div style={grandTotalRowStyle}>
                <span>Estimated Total</span>
                <strong>{formatMoney(subtotal)}</strong>
              </div>
            </div>

            <div style={summaryNoticeStyle}>
              This is not an online payment checkout. Your request will be
              reviewed for final wholesale pricing, freight, lead time, and
              availability.
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <Link href="/checkout" style={primaryLinkStyle}>
                Submit Quote Request
              </Link>

              <Link href="/products" style={secondaryLinkStyle}>
                Add More Products
              </Link>

              <button
                type="button"
                onClick={safelyClearCart}
                disabled={isUpdating}
                style={{
                  ...clearButtonStyle,
                  opacity: isUpdating ? 0.65 : 1,
                  cursor: isUpdating ? "not-allowed" : "pointer",
                }}
              >
                {isUpdating ? "Updating..." : "Clear Quote Cart"}
              </button>
            </div>
          </aside>
        </section>
      )}

      <style jsx>{`
        @media (max-width: 980px) {
          .cart-page-layout {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 720px) {
          .cart-page-item {
            grid-template-columns: 1fr !important;
          }

          .cart-page-image {
            width: 100% !important;
            height: 240px !important;
          }

          .cart-item-meta-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}

function CartPageItem({
  item,
  isUpdating,
  onUpdateQuantity,
  onRemoveItem,
  clearError,
  clearLastQuantityRule,
}: {
  item: CartItem;
  isUpdating: boolean;
  onUpdateQuantity: (itemId: string, quantity: number) => Promise<unknown>;
  onRemoveItem: (itemId: string) => Promise<unknown>;
  clearError: () => void;
  clearLastQuantityRule: () => void;
}) {
  const quantityRule = useMemo(() => getQuantityRule(item), [item]);
  const quantity = getCurrentQuantity(item, quantityRule);

  const itemPrice = toSafeMoneyNumber(item.unit_price);
  const lineTotal = toSafeMoneyNumber(item.line_total || itemPrice * quantity);

  const imageUrl = normalizeText(item.image);

  const nextDecreaseQuantity = getNextDecreaseQuantity(quantity, quantityRule);
  const nextIncreaseQuantity = getNextIncreaseQuantity(quantity, quantityRule);

  async function safelyUpdateQuantity(nextQuantity: number) {
    try {
      clearError();
      clearLastQuantityRule();

      if (nextQuantity === quantity) {
        return;
      }

      await onUpdateQuantity(item.id, nextQuantity);
    } catch {
      // Shared cart error is rendered by parent page.
    }
  }

  async function safelyRemoveItem() {
    try {
      clearError();
      clearLastQuantityRule();
      await onRemoveItem(item.id);
    } catch {
      // Shared cart error is rendered by parent page.
    }
  }

  return (
    <article className="cart-page-item" style={itemCardStyle}>
      <div className="cart-page-image" style={imageWrapStyle}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={item.product_title || "Product"}
            loading="lazy"
            decoding="async"
            style={imageStyle}
          />
        ) : (
          <div style={imagePlaceholderStyle}>No Image</div>
        )}
      </div>

      <div style={itemContentStyle}>
        <div>
          <h2 style={itemTitleStyle}>{item.product_title || "Product"}</h2>

          {item.variant_title ? (
            <p style={variantTextStyle}>{item.variant_title}</p>
          ) : null}

          {item.sku ? <p style={skuTextStyle}>SKU: {item.sku}</p> : null}
        </div>

        <div className="cart-item-meta-grid" style={itemMetaGridStyle}>
          <InfoBlock label="Unit Price" value={formatMoney(itemPrice)} />
          <InfoBlock label="Line Total" value={formatMoney(lineTotal)} />
          <InfoBlock
            label="Box Quantity"
            value={String(quantityRule.boxQuantity)}
          />
        </div>

        {quantityRule.message ? (
          <div style={ruleNoteStyle}>{quantityRule.message}</div>
        ) : null}

        <div style={itemActionsStyle}>
          <div style={quantityRowStyle}>
            <button
              type="button"
              onClick={() => safelyUpdateQuantity(nextDecreaseQuantity)}
              disabled={isUpdating || quantity <= quantityRule.boxQuantity}
              style={{
                ...qtyButtonStyle,
                opacity:
                  isUpdating || quantity <= quantityRule.boxQuantity ? 0.65 : 1,
                cursor:
                  isUpdating || quantity <= quantityRule.boxQuantity
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              -
            </button>

            <span style={qtyValueStyle}>{quantity}</span>

            <button
              type="button"
              onClick={() => safelyUpdateQuantity(nextIncreaseQuantity)}
              disabled={isUpdating}
              style={{
                ...qtyButtonStyle,
                opacity: isUpdating ? 0.65 : 1,
                cursor: isUpdating ? "not-allowed" : "pointer",
              }}
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={safelyRemoveItem}
            disabled={isUpdating}
            style={{
              ...removeButtonStyle,
              opacity: isUpdating ? 0.65 : 1,
              cursor: isUpdating ? "not-allowed" : "pointer",
            }}
          >
            Remove
          </button>
        </div>
      </div>
    </article>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div style={infoBlockStyle}>
      <span style={infoLabelStyle}>{label}</span>
      <strong style={infoValueStyle}>{value}</strong>
    </div>
  );
}

const pageStyle: CSSProperties = {
  maxWidth: 1280,
  margin: "0 auto",
  padding: "48px 20px 90px",
};

const headerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 24,
  flexWrap: "wrap",
  alignItems: "flex-end",
  marginBottom: 28,
};

const eyebrowStyle: CSSProperties = {
  width: "fit-content",
  padding: "7px 12px",
  borderRadius: 999,
  background: "#f8f5ef",
  border: "1px solid #ece3d7",
  color: "#6b6256",
  fontSize: 12,
  fontWeight: 850,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginBottom: 12,
};

const titleStyle: CSSProperties = {
  margin: 0,
  color: "#171717",
  fontSize: "clamp(2.2rem, 4vw, 4rem)",
  lineHeight: 1.02,
  fontWeight: 850,
  letterSpacing: "-0.04em",
};

const textStyle: CSSProperties = {
  margin: "14px 0 0",
  color: "#5d554a",
  lineHeight: 1.8,
  fontSize: 15,
  maxWidth: 760,
};

const headerActionsStyle: CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const layoutStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 390px",
  gap: 24,
  alignItems: "start",
};

const itemsWrapStyle: CSSProperties = {
  display: "grid",
  gap: 16,
};

const itemCardStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "150px minmax(0, 1fr)",
  gap: 18,
  padding: 18,
  borderRadius: 24,
  background: "#fff",
  border: "1px solid #ece3d7",
  boxShadow: "0 10px 30px rgba(23,23,23,0.035)",
};

const imageWrapStyle: CSSProperties = {
  width: 150,
  minHeight: 150,
  borderRadius: 18,
  overflow: "hidden",
  background: "#f4efe7",
};

const imageStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

const imagePlaceholderStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  minHeight: 150,
  display: "grid",
  placeItems: "center",
  color: "#8a8175",
  fontSize: 13,
  fontWeight: 800,
};

const itemContentStyle: CSSProperties = {
  minWidth: 0,
  display: "grid",
  gap: 14,
};

const itemTitleStyle: CSSProperties = {
  margin: 0,
  color: "#171717",
  fontSize: 22,
  lineHeight: 1.22,
  fontWeight: 850,
};

const variantTextStyle: CSSProperties = {
  margin: "7px 0 0",
  color: "#5d554a",
  lineHeight: 1.5,
  fontSize: 14,
};

const skuTextStyle: CSSProperties = {
  margin: "6px 0 0",
  color: "#7b7367",
  fontSize: 12,
  fontWeight: 750,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
};

const itemMetaGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 10,
};

const infoBlockStyle: CSSProperties = {
  padding: 12,
  borderRadius: 16,
  background: "#faf7f1",
  border: "1px solid #eee5d9",
};

const infoLabelStyle: CSSProperties = {
  display: "block",
  color: "#7b7367",
  fontSize: 11,
  fontWeight: 850,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  marginBottom: 5,
};

const infoValueStyle: CSSProperties = {
  color: "#171717",
  fontSize: 14,
  lineHeight: 1.35,
};

const ruleNoteStyle: CSSProperties = {
  padding: 12,
  borderRadius: 14,
  background: "#fff8e7",
  border: "1px solid #eadbb5",
  color: "#6b5530",
  fontSize: 13,
  lineHeight: 1.6,
  fontWeight: 700,
};

const itemActionsStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
};

const quantityRowStyle: CSSProperties = {
  display: "inline-grid",
  gridTemplateColumns: "42px 64px 42px",
  alignItems: "center",
  border: "1px solid #ded4c7",
  borderRadius: 999,
  overflow: "hidden",
  background: "#fff",
};

const qtyButtonStyle: CSSProperties = {
  width: 42,
  height: 42,
  border: 0,
  background: "#f8f5ef",
  color: "#171717",
  fontSize: 18,
  fontWeight: 850,
};

const qtyValueStyle: CSSProperties = {
  minWidth: 64,
  textAlign: "center",
  color: "#171717",
  fontWeight: 850,
  fontSize: 14,
};

const removeButtonStyle: CSSProperties = {
  border: "1px solid #e5c9c9",
  background: "#fff5f5",
  color: "#8f2d2d",
  minHeight: 42,
  padding: "0 14px",
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 850,
};

const summaryCardStyle: CSSProperties = {
  position: "sticky",
  top: 20,
  display: "grid",
  gap: 16,
  padding: 24,
  borderRadius: 24,
  background: "#fff",
  border: "1px solid #ece3d7",
  boxShadow: "0 10px 30px rgba(23,23,23,0.035)",
};

const summaryTitleStyle: CSSProperties = {
  margin: 0,
  color: "#171717",
  fontSize: 22,
  fontWeight: 850,
};

const summaryRowsStyle: CSSProperties = {
  display: "grid",
  gap: 10,
};

const summaryRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  color: "#5d554a",
  fontSize: 14,
};

const grandTotalRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  paddingTop: 12,
  borderTop: "1px solid #eee5d9",
  color: "#171717",
  fontSize: 17,
  fontWeight: 850,
};

const summaryNoticeStyle: CSSProperties = {
  padding: 13,
  borderRadius: 16,
  border: "1px solid #eadbb5",
  background: "#fff8e7",
  color: "#6b5530",
  fontSize: 13,
  lineHeight: 1.65,
  fontWeight: 700,
};

const emptyCardStyle: CSSProperties = {
  display: "grid",
  gap: 16,
  padding: 32,
  borderRadius: 26,
  background: "#fff",
  border: "1px solid #ece3d7",
  boxShadow: "0 10px 30px rgba(23,23,23,0.035)",
};

const emptyTitleStyle: CSSProperties = {
  margin: 0,
  color: "#171717",
  fontSize: "clamp(1.8rem, 3vw, 2.8rem)",
  lineHeight: 1.08,
  fontWeight: 850,
};

const errorBoxStyle: CSSProperties = {
  marginBottom: 18,
  padding: 14,
  borderRadius: 16,
  background: "#fff1f1",
  border: "1px solid #efc9c9",
  color: "#7a2222",
  fontSize: 14,
  lineHeight: 1.6,
  fontWeight: 700,
};

const noticeBoxStyle: CSSProperties = {
  marginBottom: 18,
  padding: 14,
  borderRadius: 16,
  background: "#fff8e7",
  border: "1px solid #eadbb5",
  color: "#6b5530",
  fontSize: 14,
  lineHeight: 1.6,
  fontWeight: 700,
};

const primaryLinkStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 50,
  padding: "0 20px",
  borderRadius: 999,
  background: "#171717",
  color: "#fff",
  textDecoration: "none",
  fontWeight: 850,
  border: "1px solid #171717",
};

const secondaryLinkStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 50,
  padding: "0 20px",
  borderRadius: 999,
  background: "#fff",
  color: "#171717",
  textDecoration: "none",
  fontWeight: 850,
  border: "1px solid #ded4c7",
};

const clearButtonStyle: CSSProperties = {
  minHeight: 48,
  borderRadius: 999,
  background: "#fff",
  color: "#8f2d2d",
  fontWeight: 850,
  border: "1px solid #e5c9c9",
};