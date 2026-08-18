"use client";

import PublicDealershipExperience from "@/components/dealer/PublicDealershipExperience";

export default function DealershipPage({ params }: { params: { slug: string } }) {
  return <PublicDealershipExperience slug={params.slug} />;
}
