import Link from "next/link";
import StatusBadge from "@/components/platform/StatusBadge";
import { formatListingRate } from "@/lib/formatCurrency";

export type MarketplaceCardItem = {
  id: string;
  title?: string | null;
  city?: string | null;
  province?: string | null;
  rate?: string | null;
  price_amount?: number | null;
  photos?: string[] | null;
  stock_status?: string | null;
  sponsored?: boolean | null;
  vehicle_year?: number | null;
  brand?: string | null;
  model?: string | null;
  odometer_km?: number | null;
  verification_level?: string | null;
  dealership_id?: string | null;
};

export default function MarketplaceCard({ item, darkMode, href = `/vehicles/${item.id}`, compare, onCompare }: { item: MarketplaceCardItem; darkMode: boolean; href?: string; compare?: boolean; onCompare?: (item: MarketplaceCardItem) => void }) {
  const image = item.photos?.find(Boolean) || "/images/jobs/job-card-1.jpg";
  const price = item.rate || (item.price_amount ? `R ${Number(item.price_amount).toLocaleString("en-ZA")}` : "Price on application");
  return <article className={`group overflow-hidden rounded-[22px] border ${darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white"}`}><Link href={href} className="block"><div className="relative aspect-[4/3] overflow-hidden bg-black/10"><img src={image} alt={item.title || "Commercial vehicle"} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]" /><div className="absolute left-3 top-3 flex flex-wrap gap-2">{item.sponsored ? <span className="rounded-full bg-[#f6b800] px-2.5 py-1 text-[9px] font-black uppercase text-black">Sponsored</span> : null}<StatusBadge status={item.stock_status || "active"} /></div></div><div className="p-4"><p className={`text-[10px] font-black uppercase tracking-[.13em] ${darkMode ? "text-white/45" : "text-black/45"}`}>{[item.vehicle_year, item.brand, item.model].filter(Boolean).join(" ") || "Commercial vehicle"}</p><h2 className="mt-2 line-clamp-2 min-h-[48px] text-lg font-black leading-6">{item.title || "LoadLink vehicle"}</h2><p className={`mt-2 text-xs font-bold ${darkMode ? "text-white/50" : "text-black/50"}`}>{[item.city, item.province].filter(Boolean).join(", ") || "South Africa"}{item.odometer_km != null ? ` · ${Number(item.odometer_km).toLocaleString("en-ZA")} km` : ""}</p><p className="mt-3 text-xl font-black text-[#b88900]">{formatListingRate(price)}</p><span className="mt-4 inline-flex text-[10px] font-black uppercase tracking-[.1em] text-[#b88900]">View full details →</span></div></Link>{onCompare ? <button type="button" onClick={() => onCompare(item)} className={`w-full border-t px-4 py-3 text-xs font-black uppercase ${darkMode ? "border-white/10 hover:bg-white/5" : "border-black/10 hover:bg-black/5"}`}>{compare ? "Remove from compare" : "Add to compare"}</button> : null}</article>;
}
