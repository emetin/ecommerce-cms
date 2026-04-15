"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  addToCart,
  clearCart,
  fetchCart,
  removeCartItemRequest,
  updateCartItem,
} from "./cart-storage";

type CartContextType = {
  cart: any | null;
  isLoading: boolean;
  isDrawerOpen: boolean;
  error: string;
  openDrawer: () => void;
  closeDrawer: () => void;
  refreshCart: () => Promise<void>;
  handleAddToCart: (payload: {
    product_slug: string;
    variant_id?: string;
    product_title: string;
    variant_title?: string;
    sku?: string;
    image?: string;
    unit_price: number | string;
    compare_at_price?: number | string;
    quantity?: number;
  }) => Promise<void>;
  handleUpdateQuantity: (itemId: string, quantity: number) => Promise<void>;
  handleRemoveItem: (itemId: string) => Promise<void>;
  handleClearCart: () => Promise<void>;
  itemCount: number;
};

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [error, setError] = useState("");

  const openDrawer = useCallback(() => {
    setIsDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

  const refreshCart = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      const nextCart = await fetchCart();
      setCart(nextCart);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cart.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const handleAddToCart = useCallback(
    async (payload: {
      product_slug: string;
      variant_id?: string;
      product_title: string;
      variant_title?: string;
      sku?: string;
      image?: string;
      unit_price: number | string;
      compare_at_price?: number | string;
      quantity?: number;
    }) => {
      try {
        setIsLoading(true);
        setError("");
        const nextCart = await addToCart(payload);
        setCart(nextCart);
        setIsDrawerOpen(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add to cart.");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const handleUpdateQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      try {
        setIsLoading(true);
        setError("");
        const nextCart = await updateCartItem({
          item_id: itemId,
          quantity,
        });
        setCart(nextCart);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update cart item."
        );
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const handleRemoveItem = useCallback(async (itemId: string) => {
    try {
      setIsLoading(true);
      setError("");
      const nextCart = await removeCartItemRequest({
        item_id: itemId,
      });
      setCart(nextCart);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to remove cart item."
      );
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleClearCart = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      const nextCart = await clearCart();
      setCart(nextCart);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear cart.");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const itemCount = useMemo(() => {
    return Number(cart?.totals?.item_count || 0);
  }, [cart]);

  const value = useMemo<CartContextType>(
    () => ({
      cart,
      isLoading,
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