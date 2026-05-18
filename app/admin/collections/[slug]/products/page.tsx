import AdminCollectionProductsClient from "./AdminCollectionProductsClient";

export default async function AdminCollectionProductsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <AdminCollectionProductsClient slug={slug} />;
}