import CheckoutSuccessPageClient from "../../../components/checkout/CheckoutSuccessPageClient";

type PageProps = {
  searchParams: Promise<{
    session_id?: string;
  }>;
};

export default async function CheckoutSuccessPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;

  return (
    <CheckoutSuccessPageClient sessionId={params.session_id || ""} />
  );
}