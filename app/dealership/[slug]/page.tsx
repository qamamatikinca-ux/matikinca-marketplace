import PublicDealershipExperience from "@/components/dealer/PublicDealershipExperience";

export default async function DealershipPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PublicDealershipExperience slug={slug} />;
}
