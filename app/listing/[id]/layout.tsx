import type { Metadata } from "next";
import type { ReactNode } from "react";
import ListingReportAction from "@/components/marketplace/ListingReportAction";
import { getPublicListing, stripPublicationFields } from "@/lib/marketplace/publicListingServer";

type ListingRow = {
  title?: string | null;
  city?: string | null;
  province?: string | null;
  vehicle_group?: string | null;
  photos?: string[] | null;
};

function siteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configured?.startsWith("https://")) return configured;
  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (productionHost) return `https://${productionHost}`;
  return "https://matikinca-marketplace.vercel.app";
}

function imageUrl(site: string, value?: string | null) {
  if (!value) return `${site}/images/loadlink-logo-light.png`;
  if (/^https?:\/\//i.test(value)) return value;
  return `${site}${value.startsWith("/") ? value : `/${value}`}`;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const row = stripPublicationFields(await getPublicListing(id));
  const listing = row as ListingRow | null;
  const site = siteUrl();
  const title = listing?.title ? `${listing.title} | LoadLink` : "LoadLink listing";
  const description = listing
    ? [listing.city || listing.province, listing.vehicle_group, "Available on LoadLink"].filter(Boolean).join(" · ")
    : "View this logistics listing on LoadLink.";
  const image = imageUrl(site, listing?.photos?.find(Boolean));
  const canonical = `${site}/listing/${encodeURIComponent(id)}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "LoadLink",
      type: "website",
      images: [{ url: image, alt: listing?.title || "LoadLink listing" }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default function ListingLayout({ children }: { children: ReactNode }) {
  return <>{children}<ListingReportAction /></>;
}
