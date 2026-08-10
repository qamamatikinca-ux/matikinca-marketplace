"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { dealerFetch, formatZar } from "@/lib/dealer/client";

type Sheet = { dealership: { name: string; logo?: string | null; phone?: string | null; email?: string | null; location?: string | null }; vehicle: { id: string; title: string; price?: number | null; city?: string | null; photos?: string[]; specs?: Array<{ label: string; value: string }> } };
export default function DealerBrochurePage() {
  const params = useParams<{ id: string }>(); const [data, setData] = useState<Sheet | null>(null);
  useEffect(() => { void dealerFetch<Sheet>(`/api/dealer/inventory?brochure=${params.id}`).then(setData).catch(() => setData(null)); }, [params.id]);
  if (!data) return <main className="min-h-screen bg-white p-8 text-black">Loading vehicle sheet…</main>;
  return <main className="min-h-screen bg-white text-black"><div className="mx-auto max-w-4xl p-6 sm:p-10"><div className="flex items-center justify-between gap-4 border-b border-black/10 pb-5"><div className="flex items-center gap-3">{data.dealership.logo ? <img src={data.dealership.logo} alt="" className="h-12 w-12 rounded-full object-cover" /> : null}<div><div className="text-lg font-black">{data.dealership.name}</div><div className="text-xs text-black/50">LoadLink Dealer</div></div></div><button type="button" className="print:hidden rounded-lg border border-black/10 px-4 py-2 text-sm font-black" onClick={() => window.print()}>Print / Save PDF</button></div>{data.vehicle.photos?.[0] ? <img src={data.vehicle.photos[0]} alt="" className="mt-6 aspect-[16/9] w-full object-cover" /> : null}<h1 className="mt-6 text-3xl font-black tracking-[-.04em]">{data.vehicle.title}</h1><div className="mt-2 text-xl font-black">{formatZar(data.vehicle.price)}</div><div className="mt-1 text-sm text-black/50">{data.vehicle.city}</div><div className="mt-6 grid grid-cols-2 border border-black/10 sm:grid-cols-3">{data.vehicle.specs?.map((spec) => <div key={spec.label} className="border-b border-r border-black/10 p-4"><div className="text-[10px] font-black uppercase tracking-[.1em] text-black/40">{spec.label}</div><div className="mt-1 text-sm font-black">{spec.value}</div></div>)}</div><div className="mt-8 border-t border-black/10 pt-5 text-sm"><b>{data.dealership.name}</b><div className="mt-1 text-black/55">{[data.dealership.phone, data.dealership.email, data.dealership.location].filter(Boolean).join(" · ")}</div><div className="mt-3 text-xs text-black/40">Vehicle reference: {data.vehicle.id}</div></div></div></main>;
}
