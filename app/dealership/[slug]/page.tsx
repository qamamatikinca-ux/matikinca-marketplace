import PublicDealershipExperienceV2 from "@/components/dealer/PublicDealershipExperienceV2";

export default async function DealershipPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PublicDealershipExperienceV2 slug={slug} />;
}
