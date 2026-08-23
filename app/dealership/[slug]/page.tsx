import PublicDealershipExperience from "@/components/dealer/PublicDealershipExperience";

export default async function DealershipPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <div data-loadlink-major-showroom="true"><PublicDealershipExperience slug={slug} /></div>;
}
