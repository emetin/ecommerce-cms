"use client";

import { memo, useMemo } from "react";
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

function CartDrawerComponent() {
  const {
    cart,
    isDrawerOpen,
    closeDrawer,
    isUpdating,
    error,
    lastQuantityRule,
    clearError,
    clearLastQuantityRule,
    handleUpdateQuantity,
    handleRemoveItem,
    handleClearCart,
  } = useCart();

  const items = useMemo(() => {
    return Array.isArray(cart?.items) ? (cart.items as CartItem[]) : [];
  }, [cart]);

  const subtotal = useMemo(() => {
    return Number(cart?.totals?.subtotal || 0);
  }, [cart]);

  const itemCount = useMemo(() => {
    return Number(cart?.totals?.item_count || 0);
  }, [cart]);

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
      // Shared cart error is rendered inside drawer.
    }
  }

  function closeCartDrawer() {
    clearError();
    clearLastQuantityRule();
    closeDrawer();
  }

  return (
    <>
      {isDrawerOpen ? <div onClick={closeCartDrawer} style={overlayStyle} /> : null}

      <aside
        style={{
          ...drawerStyle,
          transform: isDrawerOpen ? "translateX(0)" : "translateX(100%)",
          pointerEvents: isDrawerOpen ? "auto" : "none",
        }}
        aria-hidden={!isDrawerOpen}
        aria-label="Quote cart drawer"
      >
        <div style={headerStyle}>
          <div>
            <h3 style={titleStyle}>Quote Cart</h3>

            <p style={subtitleStyle}>
              Review selected products before submitting a B2B quote request.
            </p>
          </div>

          <button
            type="button"
            onClick={closeCartDrawer}
            aria-label="Close quote cart"
            style={closeButtonStyle}
          >
            ×
          </button>
        </div>

        <div style={bodyStyle}>
          {visibleError ? <div style={errorBoxStyle}>{visibleError}</div> : null}

          {quantityNotice ? (
            <div style={noticeBoxStyle}>{quantityNotice}</div>
          ) : null}

          {!items.length ? (
            <div style={emptyBoxStyle}>
              <p style={emptyTextStyle}>
                Your quote cart is currently empty. Add products from the
                catalog to start a wholesale request.
              </p>

              <Link
                href="/collections"
                onClick={closeCartDrawer}
                style={emptyLinkStyle}
              >
                Browse Collections
              </Link>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {items.map((item) => (
                <CartDrawerItem
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
          )}
        </div>

        <div style={footerStyle}>
          <div style={summaryWrapStyle}>
            <div style={summaryRowStyle}>
              <span>Items</span>
              <strong>{itemCount}</strong>
            </div>

            <div style={summaryRowStyle}>
              <span>Estimated Subtotal</span>
              <strong>{formatMoney(subtotal)}</strong>
            </div>
          </div>

          <div style={noticeStyle}>
            Final pricing, freight, availability, and payment terms will be
            reviewed by the Globaltex sales team.
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <Link
              href="/cart"
              onClick={closeCartDrawer}
              style={secondaryLinkStyle}
            >
              View Quote Cart
            </Link>

            {items.length ? (
              <Link
                href="/checkout"
                onClick={closeCartDrawer}
                style={primaryLinkStyle}
              >
                Submit Quote Request
              </Link>
            ) : null}

            {items.length ? (
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
            ) : null}
          </div>
        </div>
      </aside>
    </>
  );
}

function CartDrawerItemComponent({
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
      // Shared cart error is rendered by drawer parent.
    }
  }

  async function safelyRemoveItem() {
    try {
      clearError();
      clearLastQuantityRule();
      await onRemoveItem(item.id);
    } catch {
      // Shared cart error is rendered by drawer parent.
    }
  }

  return (
    <div style={itemWrapStyle}>
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
          <div style={imagePlaceholderStyle}>No Image</div>
        )}
      </div>

      <div style={{ minWidth: 0 }}>
        <div style={itemTitleStyle}>{item.product_title || "Product"}</div>

        {item.variant_title ? (
          <div style={variantTextStyle}>{item.variant_title}</div>
        ) : null}

        {item.sku ? <div style={skuTextStyle}>SKU: {item.sku}</div> : null}

        <div style={priceTextStyle}>
          Unit: {formatMoney(itemPrice)}
          <br />
          Line: <strong>{formatMoney(lineTotal)}</strong>
        </div>

        <div style={ruleTextStyle}>
          Box Quantity: {quantityRule.boxQuantity}
        </div>

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
            cursor: isUpdating ? "not-allowed" : "pointer",
            opacity: isUpdating ? 0.65 : 1,
          }}
        >
          Remove
        </button>
      </div>
    </div>
  );
}

const CartDrawerItem = memo(CartDrawerItemComponent);

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.42)",
  zIndex: 9998,
};

const drawerStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  right: 0,
  height: "100vh",
  width: "100%",
  maxWidth: 460,
  background: "#fff",
  zIndex: 9999,
  transition: "transform 0.25s ease",
  boxShadow: "-10px 0 40px rgba(0,0,0,0.16)",
  display: "flex",
  flexDirection: "column",
};

const headerStyle: React.CSSProperties = {
  padding: "20px 22px",
  borderBottom: "1px solid #ece3d7",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 16,
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 21,
  fontWeight: 850,
  color: "#171717",
  lineHeight: 1.2,
};

const subtitleStyle: React.CSSProperties = {
  margin: "7px 0 0",
  fontSize: 13,
  lineHeight: 1.5,
  color: "#6f665b",
};

const closeButtonStyle: React.CSSProperties = {
  border: "1px solid #ded4c7",
  background: "#fff",
  color: "#171717",
  width: 38,
  height: 38,
  borderRadius: 999,
  fontSize: 24,
  lineHeight: 1,
  cursor: "pointer",
};

const bodyStyle: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: 18,
  background: "#faf7f1",
};

const footerStyle: React.CSSProperties = {
  padding: 18,
  borderTop: "1px solid #ece3d7",
  background: "#fff",
  display: "grid",
  gap: 14,
};

const errorBoxStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 14,
  background: "#fff1f1",
  border: "1px solid #efc9c9",
  color: "#7a2222",
  fontSize: 13,
  lineHeight: 1.6,
  fontWeight: 700,
};

const noticeBoxStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 14,
  background: "#fff8e7",
  border: "1px solid #eadbb5",
  color: "#6b5530",
  fontSize: 13,
  lineHeight: 1.6,
  fontWeight: 700,
};

const emptyBoxStyle: React.CSSProperties = {
  border: "1px solid #e5ddd2",
  borderRadius: 18,
  background: "#fff",
  padding: 18,
  display: "grid",
  gap: 14,
};

const emptyTextStyle: React.CSSProperties = {
  margin: 0,
  color: "#5d554a",
  fontSize: 14,
  lineHeight: 1.7,
};

const emptyLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 44,
  borderRadius: 999,
  padding: "0 16px",
  background: "#171717",
  color: "#fff",
  textDecoration: "none",
  fontWeight: 850,
};

const itemWrapStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "92px minmax(0, 1fr)",
  gap: 14,
  padding: 14,
  borderRadius: 18,
  background: "#fff",
  border: "1px solid #e8dfd2",
};

const imageWrapStyle: React.CSSProperties = {
  width: 92,
  height: 92,
  borderRadius: 14,
  overflow: "hidden",
  background: "#f4efe7",
};

const imageStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

const imagePlaceholderStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  display: "grid",
  placeItems: "center",
  color: "#8a8175",
  fontSize: 12,
  fontWeight: 700,
};

const itemTitleStyle: React.CSSProperties = {
  color: "#171717",
  fontSize: 14,
  fontWeight: 850,
  lineHeight: 1.35,
};

const variantTextStyle: React.CSSProperties = {
  marginTop: 4,
  color: "#5d554a",
  fontSize: 12,
  lineHeight: 1.5,
};

const skuTextStyle: React.CSSProperties = {
  marginTop: 4,
  color: "#7b7367",
  fontSize: 11,
  fontWeight: 750,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
};

const priceTextStyle: React.CSSProperties = {
  marginTop: 8,
  color: "#171717",
  fontSize: 12,
  lineHeight: 1.55,
};

const ruleTextStyle: React.CSSProperties = {
  marginTop: 8,
  color: "#7b7367",
  fontSize: 11,
  lineHeight: 1.5,
  fontWeight: 700,
};

const quantityRowStyle: React.CSSProperties = {
  display: "inline-grid",
  gridTemplateColumns: "34px 46px 34px",
  alignItems: "center",
  marginTop: 10,
  border: "1px solid #ded4c7",
  borderRadius: 999,
  overflow: "hidden",
  background: "#fff",
};

const qtyButtonStyle: React.CSSProperties = {
  width: 34,
  height: 34,
  border: 0,
  background: "#f8f5ef",
  color: "#171717",
  fontWeight: 850,
};

const qtyValueStyle: React.CSSProperties = {
  minWidth: 46,
  textAlign: "center",
  color: "#171717",
  fontWeight: 850,
  fontSize: 13,
};

const removeButtonStyle: React.CSSProperties = {
  marginTop: 10,
  border: "none",
  background: "transparent",
  color: "#9a2f2f",
  fontSize: 12,
  fontWeight: 800,
  padding: 0,
  textDecoration: "underline",
};

const summaryWrapStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
};

const summaryRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  color: "#171717",
  fontSize: 14,
};

const noticeStyle: React.CSSProperties = {
  borderRadius: 14,
  padding: 12,
  background: "#f8f5ef",
  border: "1px solid #ece3d7",
  color: "#6f665b",
  fontSize: 12,
  lineHeight: 1.6,
};

const primaryLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 46,
  borderRadius: 999,
  background: "#171717",
  color: "#fff",
  textDecoration: "none",
  fontWeight: 850,
  border: "1px solid #171717",
};

const secondaryLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 46,
  borderRadius: 999,
  background: "#fff",
  color: "#171717",
  textDecoration: "none",
  fontWeight: 850,
  border: "1px solid #ded4c7",
};

const clearButtonStyle: React.CSSProperties = {
  minHeight: 44,
  borderRadius: 999,
  background: "#fff",
  color: "#8f2d2d",
  fontWeight: 850,
  border: "1px solid #e5c9c9",
};

export default memo(CartDrawerComponent);