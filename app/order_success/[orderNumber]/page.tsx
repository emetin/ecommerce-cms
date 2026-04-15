import OrderSuccessPageClient from "../../../components/orders/OrderSuccessPageClient";

type PageProps = {
  params: Promise<{
    orderNumber: string;
  }>;
};

export default async function OrderSuccessPage({ params }: PageProps) {
  const { orderNumber } = await params;

  return <OrderSuccessPageClient orderNumber={orderNumber} />;
}