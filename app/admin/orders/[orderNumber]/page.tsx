import AdminOrderDetailPageClient from "../../../../components/admin/AdminOrderDetailPageClient";

type PageProps = {
  params: Promise<{
    orderNumber: string;
  }>;
};

export default async function AdminOrderDetailPage({ params }: PageProps) {
  const { orderNumber } = await params;

  return <AdminOrderDetailPageClient orderNumber={orderNumber} />;
}