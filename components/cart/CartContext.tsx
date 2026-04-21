"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
} from "./cart-storage";

type CartPayload = {
  product_slug: string;
  variant_id?: string;
  product_title: string;
  variant_title?: string;
  sku?: string;
  image?: string;
  unit_price: number | string;
  compare_at_price?: number | string;
  quantity?: number;
};

type CartContextType = {
  cart: any | null;
  isLoading: boolean;
  isBootstrapping: boolean;
  isMutating: boolean;
  isDrawerOpen: boolean;
  error: string;
  openDrawer: () => void;
  closeDrawer: () => void;
  refreshCart: () => Promise<void>;
  handleAddToCart: (payload: CartPayload) => Promise<void>;
  handleUpdateQuantity: (itemId: string, quantity: number) => Promise<void>;
  handleRemoveItem: (itemId: string) => Promise<void>;
  handleClearCart: () => Promise<void>;
  itemCount: number;
};

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<any | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [error, setError] = useState("");

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const openDrawer = useCallback(() => {
    setIsDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

  const refreshCart = useCallback(async () => {
    const controller = new AbortController();

    try {
      if (mountedRef.current) {
        setError("");
      }

      const nextCart = await fetchCart(controller.signal);

      if (mountedRef.current) {
        setCart(nextCart);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load cart.";

      if (mountedRef.current && message !== "The operation was aborted.") {
        setError(message);
      }
    } finally {
      if (mountedRef.current) {
        setIsBootstrapping(false);
      }
    }
  }, []);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const handleAddToCart = useCallback(async (payload: CartPayload) => {
    try {
      if (mountedRef.current) {
        setIsMutating(true);
        setError("");
        setIsDrawerOpen(true);
      }

      const nextCart = await addToCart(payload);

      if (mountedRef.current) {
        setCart(nextCart);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to add to cart.";

      if (mountedRef.current) {
        setError(message);
      }

      throw err;
    } finally {
      if (mountedRef.current) {
        setIsMutating(false);
      }
    }
  }, []);

  const handleUpdateQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      try {
        if (mountedRef.current) {
          setIsMutating(true);
          setError("");
        }

        const nextCart = await updateCartItem({
          item_id: itemId,
          quantity,
        });

        if (mountedRef.current) {
          setCart(nextCart);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to update cart item.";

        if (mountedRef.current) {
          setError(message);
        }

        throw err;
      } finally {
        if (mountedRef.current) {
          setIsMutating(false);
        }
      }
    },
    []
  );

  const handleRemoveItem = useCallback(async (itemId: string) => {
    try {
      if (mountedRef.current) {
        setIsMutating(true);
        setError("");
      }

      const nextCart = await removeCartItemRequest({
        item_id: itemId,
      });

      if (mountedRef.current) {
        setCart(nextCart);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to remove cart item.";

      if (mountedRef.current) {
        setError(message);
      }

      throw err;
    } finally {
      if (mountedRef.current) {
        setIsMutating(false);
      }
    }
  }, []);

  const handleClearCart = useCallback(async () => {
    try {
      if (mountedRef.current) {
        setIsMutating(true);
        setError("");
      }

      const nextCart = await clearCart();

      if (mountedRef.current) {
        setCart(nextCart);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to clear cart.";

      if (mountedRef.current) {
        setError(message);
      }

      throw err;
    } finally {
      if (mountedRef.current) {
        setIsMutating(false);
      }
    }
  }, []);

  const itemCount = useMemo(() => {
    return Number(cart?.totals?.item_count || 0);
  }, [cart]);

  const isLoading = isBootstrapping || isMutating;

  const value = useMemo<CartContextType>(
    () => ({
      cart,
      isLoading,
      isBootstrapping,
      isMutating,
      isDrawerOpen,
      error,
      openDrawer,
      closeDrawer,
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
      isDrawerOpen,
      error,
      openDrawer,
      closeDrawer,
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