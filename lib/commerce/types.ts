export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "completed"
  | "cancelled";

export type CartStatus = "active" | "converted" | "abandoned" | "expired";

export interface Customer {
  id: string;
  email: string;
  password_hash?: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  phone?: string;
  country?: string;
  city?: string;
  address_line_1?: string;
  address_line_2?: string;
  postal_code?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  last_login_at?: string;
  tax_exempt?: boolean | string;
  approved_at?: string;
  must_change_password?: boolean | string;
  price_tier?: string;
  currency?: string;
  customer_code?: string;
  reset_token?: string;
  reset_token_expires_at?: string;
  reset_requested_at?: string;
}

export interface Cart {
  id: string;
  cart_token: string;
  customer_id?: string;
  status: CartStatus;
  currency: string;
  subtotal: number;
  discount_total: number;
  shipping_total: number;
  tax_total: number;
  grand_total: number;
  item_count: number;
  note?: string;
  created_at: string;
  updated_at: string;
  expires_at?: string;
}

export interface CartItem {
  id: string;
  cart_id: string;
  product_slug: string;
  variant_id?: string;
  product_title: string;
  variant_title?: string;
  sku?: string;
  image?: string;
  unit_price: number;
  compare_at_price?: number;
  quantity: number;
  line_total: number;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  cart_token: string;
  cart_id: string;
  customer_id?: string;
  email: string;
  first_name: string;
  last_name: string;
  company?: string;
  phone?: string;
  country?: string;
  city?: string;
  address_line_1?: string;
  address_line_2?: string;
  postal_code?: string;
  note?: string;
  status: OrderStatus;
  currency: string;
  subtotal: number;
  discount_total: number;
  shipping_total: number;
  tax_total: number;
  grand_total: number;
  item_count: number;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_slug: string;
  variant_id?: string;
  product_title: string;
  variant_title?: string;
  sku?: string;
  image?: string;
  unit_price: number;
  compare_at_price?: number;
  quantity: number;
  line_total: number;
  created_at: string;
  updated_at: string;
}

export interface CreateOrderInput {
  cartId?: string;
  cartToken?: string;
  email: string;
  firstName: string;
  lastName: string;
  company?: string;
  phone?: string;
  country?: string;
  city?: string;
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
  note?: string;
}

export interface CreateOrderResult {
  success: boolean;
  order: Order;
  items: OrderItem[];
}