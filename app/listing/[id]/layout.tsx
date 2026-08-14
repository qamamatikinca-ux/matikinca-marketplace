import type { Metadata } from "next";
import type { ReactNode } from "react";

const SITE = "https://matikinca-marketplace.vercel.app";
type ListingRow = { title?: string | null; city?: string | null; vehicle_group?: string | null; photos?: string[] | null; poster_photo?: string | null };

async function getListing(id: string): Promise<ListingRow | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || !id) return null;
  try {
    const response = await fetch(`${url}/rest/v1/job_listings?id=eq.${encodeURIComponent(id)}&select=title,city,vehicle_group,photos,poster_photo&limit=1`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, next: { revalidate: 60 } });
    if (!response.ok) return null;
    const rows = (await response.json()) as ListingRow[];
    return rows[0] || null;
  } catch { return null; }
}

function imageUrl(value?: string | null) {
  if (!value) return `${SITE}/images/loadlink-logo-light.png`;
  if (/^https?:\/\//i.test(value)) return value;
  return `${SITE}${value.startsWith("/") ? value : `/${value}`}`;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListing(id);
  const title = listing?.title ? `${listing.title} | LoadLink` : "LoadLink listing";
  const description = listing ? [listing.city, listing.vehicle_group, "Available on LoadLink"].filter(Boolean).join(" · ") : "View this logistics listing on LoadLink.";
  const image = imageUrl(listing?.photos?.find(Boolean) || listing?.poster_photo);
  const canonical = `${SITE}/listing/${encodeURIComponent(id)}`;
  return { title, description, alternates: { canonical }, openGraph: { title, description, url: canonical, siteName: "LoadLink", type: "website", images: [{ url: image, alt: listing?.title || "LoadLink listing" }] }, twitter: { card: "summary_large_image", title, description, images: [image] } };
}

export default function ListingLayout({ children }: { children: ReactNode }) { return children; }
