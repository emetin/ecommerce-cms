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

async function requestCart<TPayload = unknown>(
  url: string,
  options?: {
    method?: "GET" | "POST";
    payload?: TPayload;
    signal?: AbortSignal;
  }
) {
  const response = await fetch(url, {
    method: options?.method || "GET",
    credentials: "include",
    cache: "no-store",
    signal: options?.signal,
    headers:
      options?.method === "POST"
        ? {
            "Content-Type": "application/json",
          }
        : undefined,
    body:
      options?.method === "POST" && options?.payload !== undefined
        ? JSON.stringify(options.payload)
        : undefined,
  });

  const data = (await parseJsonSafe(response)) as CartApiResponse | null;

  if (!response.ok || !data?.ok) {
    throw new Error(data?.error || "Cart request failed.");
  }

  return data.cart;
}

export async function fetchCart(signal?: AbortSignal) {
  return requestCart("/api/cart/get", {
    method: "GET",
    signal,
  });
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
  return requestCart("/api/cart/add", {
    method: "POST",
    payload,
  });
}

export async function updateCartItem(payload: {
  item_id: string;
  quantity: number;
}) {
  return requestCart("/api/cart/update", {
    method: "POST",
    payload,
  });
}

export async function removeCartItemRequest(payload: { item_id: string }) {
  return requestCart("/api/cart/remove", {
    method: "POST",
    payload,
  });
}

export async function clearCart() {
  return requestCart("/api/cart/clear", {
    method: "POST",
  });
}