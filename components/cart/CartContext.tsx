"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  addToCart,
  clearCart,
  fetchCart,
  removeCartItemRequest,
  updateCartItem,
  type CartQuantityRuleResponse,
} from "./cart-storage";

type CartPayload = {
  product_slug: string;
  variant_id?: string;
  product_title?: string;
  variant_title?: string;
  sku?: string;
  image?: string;
  unit_price?: number | string;
  compare_at_price?: number | string;
  quantity?: number;
};

type CartMutationResult = {
  cart: any;
  quantityRule: CartQuantityRuleResponse | null;
};

type CartContextType = {
  cart: any | null;
  isLoading: boolean;
  isBootstrapping: boolean;
  isMutating: boolean;
  isAdding: boolean;
  isUpdating: boolean;
  isDrawerOpen: boolean;
  error: string;
  lastQuantityRule: CartQuantityRuleResponse | null;
  openDrawer: () => void;
  closeDrawer: () => void;
  clearError: () => void;
  clearLastQuantityRule: () => void;
  refreshCart: () => Promise<void>;
  handleAddToCart: (payload: CartPayload) => Promise<CartMutationResult>;
  handleUpdateQuantity: (
    itemId: string,
    quantity: number
  ) => Promise<CartMutationResult>;
  handleRemoveItem: (itemId: string) => Promise<CartMutationResult>;
  handleClearCart: () => Promise<CartMutationResult>;
  itemCount: number;
};

const CartContext = createContext<CartContextType | null>(null);

function createEmptyCartFallback() {
  return {
    cart: null,
    items: [],
    totals: {
      subtotal: 0,
      discount_total: 0,
      shipping_total: 0,
      tax_total: 0,
      grand_total: 0,
      item_count: 0,
    },
  };
}

function normalizeCart(nextCart: any) {
  if (!nextCart) {
    return createEmptyCartFallback();
  }

  return {
    cart: nextCart.cart || null,
    items: Array.isArray(nextCart.items) ? nextCart.items : [],
    totals: {
      subtotal: Number(nextCart?.totals?.subtotal || 0),
      discount_total: Number(nextCart?.totals?.discount_total || 0),
      shipping_total: Number(nextCart?.totals?.shipping_total || 0),
      tax_total: Number(nextCart?.totals?.tax_total || 0),
      grand_total: Number(nextCart?.totals?.grand_total || 0),
      item_count: Number(nextCart?.totals?.item_count || 0),
    },
  };
}

function createMutationResult(
  cart: any,
  quantityRule: CartQuantityRuleResponse | null = null
): CartMutationResult {
  return {
    cart: normalizeCart(cart),
    quantityRule,
  };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<any | null>(createEmptyCartFallback());
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [error, setError] = useState("");
  const [lastQuantityRule, setLastQuantityRule] =
    useState<CartQuantityRuleResponse | null>(null);

  const mountedRef = useRef(true);
  const hasLoadedCartRef = useRef(false);

  const safeSetCart = useCallback((nextCart: any) => {
    if (!mountedRef.current) return;
    setCart(normalizeCart(nextCart));
  }, []);

  const clearError = useCallback(() => {
    setError("");
  }, []);

  const clearLastQuantityRule = useCallback(() => {
    setLastQuantityRule(null);
  }, []);

  const refreshCart = useCallback(async () => {
    const controller = new AbortController();

    try {
      if (mountedRef.current) {
        setIsBootstrapping(true);
        setError("");
      }

      const nextCart = await fetchCart(controller.signal);

      safeSetCart(nextCart);
      hasLoadedCartRef.current = true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load cart.";

      if (mountedRef.current && message !== "The operation was aborted.") {
        setError(message);
        safeSetCart(createEmptyCartFallback());
      }
    } finally {
      if (mountedRef.current) {
        setIsBootstrapping(false);
      }
    }
  }, [safeSetCart]);

  const openDrawer = useCallback(() => {
    setIsDrawerOpen(true);

    if (!hasLoadedCartRef.current) {
      void refreshCart();
    }
  }, [refreshCart]);

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

  const handleAddToCart = useCallback(
    async (payload: CartPayload): Promise<CartMutationResult> => {
      try {
        if (mountedRef.current) {
          setIsAdding(true);
          setError("");
          setLastQuantityRule(null);
        }

        const result = await addToCart(payload);

        safeSetCart(result.cart);
        setLastQuantityRule(result.quantityRule);
        hasLoadedCartRef.current = true;

        if (mountedRef.current) {
          setIsDrawerOpen(true);
        }

        return createMutationResult(result.cart, result.quantityRule);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to add to cart.";

        if (mountedRef.current) {
          setError(message);
        }

        throw err;
      } finally {
        if (mountedRef.current) {
          setIsAdding(false);
        }
      }
    },
    [safeSetCart]
  );

  const handleUpdateQuantity = useCallback(
    async (
      itemId: string,
      quantity: number
    ): Promise<CartMutationResult> => {
      try {
        if (mountedRef.current) {
          setIsUpdating(true);
          setError("");
          setLastQuantityRule(null);
        }

        const result = await updateCartItem({
          item_id: itemId,
          quantity,
        });

        safeSetCart(result.cart);
        setLastQuantityRule(result.quantityRule);
        hasLoadedCartRef.current = true;

        return createMutationResult(result.cart, result.quantityRule);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to update cart item.";

        if (mountedRef.current) {
          setError(message);
        }

        throw err;
      } finally {
        if (mountedRef.current) {
          setIsUpdating(false);
        }
      }
    },
    [safeSetCart]
  );

  const handleRemoveItem = useCallback(
    async (itemId: string): Promise<CartMutationResult> => {
      try {
        if (mountedRef.current) {
          setIsUpdating(true);
          setError("");
          setLastQuantityRule(null);
        }

        const result = await removeCartItemRequest({
          item_id: itemId,
        });

        safeSetCart(result.cart);
        hasLoadedCartRef.current = true;

        return createMutationResult(result.cart, result.quantityRule);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to remove cart item.";

        if (mountedRef.current) {
          setError(message);
        }

        throw err;
      } finally {
        if (mountedRef.current) {
          setIsUpdating(false);
        }
      }
    },
    [safeSetCart]
  );

  const handleClearCart = useCallback(async (): Promise<CartMutationResult> => {
    try {
      if (mountedRef.current) {
        setIsUpdating(true);
        setError("");
        setLastQuantityRule(null);
      }

      const result = await clearCart();

      safeSetCart(result.cart);
      hasLoadedCartRef.current = true;

      return createMutationResult(result.cart, result.quantityRule);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to clear cart.";

      if (mountedRef.current) {
        setError(message);
      }

      throw err;
    } finally {
      if (mountedRef.current) {
        setIsUpdating(false);
      }
    }
  }, [safeSetCart]);

  const itemCount = useMemo(() => {
    return Number(cart?.totals?.item_count || 0);
  }, [cart]);

  const isMutating = isAdding || isUpdating;
  const isLoading = isBootstrapping || isMutating;

  const value = useMemo<CartContextType>(
    () => ({
      cart,
      isLoading,
      isBootstrapping,
      isMutating,
      isAdding,
      isUpdating,
      isDrawerOpen,
      error,
      lastQuantityRule,
      openDrawer,
      closeDrawer,
      clearError,
      clearLastQuantityRule,
      refreshCart,
      handleAddToCart,
      handleUpdateQuantity,
      handleRemoveItem,
      handleClearCart,
      itemCount,
    }),
    [
      cart,
      isLoading,
      isBootstrapping,
      isMutating,
      isAdding,
      isUpdating,
      isDrawerOpen,
      error,
      lastQuantityRule,
      openDrawer,
      closeDrawer,
      clearError,
      clearLastQuantityRule,
      refreshCart,
      handleAddToCart,
      handleUpdateQuantity,
      handleRemoveItem,
      handleClearCart,
      itemCount,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used within a CartProvider.");
  }

  return context;
}