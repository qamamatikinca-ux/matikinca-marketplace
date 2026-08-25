import PublicDealershipInstagramShowroom from "@/components/dealer/PublicDealershipInstagramShowroom";

export default async function DealershipPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PublicDealershipInstagramShowroom slug={slug} />;
}
