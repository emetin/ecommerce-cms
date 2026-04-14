export type CartItem = {
  productSlug: string;
  productTitle: string;
  variantId: string;
  variantLabel: string;
  sku: string;
  image: string;
  unitPrice: number;
  quantity: number;
  minOrderQuantity: number;
  quantityStep: number;
  lineTotal: number;
};