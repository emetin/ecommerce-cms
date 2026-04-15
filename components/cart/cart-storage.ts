export type CartApiResponse = {
  ok: boolean;
  error?: string;
  cart?: any;
};

async function parseJsonSafe(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function fetchCart() {
  const response = await fetch("/api/cart/get", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  const data = (await parseJsonSafe(response)) as CartApiResponse | null;

  if (!response.ok || !data?.ok) {
    throw new Error(data?.error || "Failed to fetch cart.");
  }

  return data.cart;
}

export async function addToCart(payload: {
  product_slug: string;
  variant_id?: string;
  product_title: string;
  variant_title?: string;
  sku?: string;
  image?: string;
  unit_price: number | string;
  compare_at_price?: number | string;
  quantity?: number;
}) {
  const response = await fetch("/api/cart/add", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = (await parseJsonSafe(response)) as CartApiResponse | null;

  if (!response.ok || !data?.ok) {
    throw new Error(data?.error || "Failed to add to cart.");
  }

  return data.cart;
}

export async function updateCartItem(payload: {
  item_id: string;
  quantity: number;
}) {
  const response = await fetch("/api/cart/update", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = (await parseJsonSafe(response)) as CartApiResponse | null;

  if (!response.ok || !data?.ok) {
    throw new Error(data?.error || "Failed to update cart item.");
  }

  return data.cart;
}

export async function removeCartItemRequest(payload: { item_id: string }) {
  const response = await fetch("/api/cart/remove", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = (await parseJsonSafe(response)) as CartApiResponse | null;

  if (!response.ok || !data?.ok) {
    throw new Error(data?.error || "Failed to remove cart item.");
  }

  return data.cart;
}

export async function clearCart() {
  const response = await fetch("/api/cart/clear", {
    method: "POST",
    credentials: "include",
  });

  const data = (await parseJsonSafe(response)) as CartApiResponse | null;

  if (!response.ok || !data?.ok) {
    throw new Error(data?.error || "Failed to clear cart.");
  }

  return data.cart;
}