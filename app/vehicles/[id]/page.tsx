"use client";

import LoadLinkImage from "@/components/LoadLinkImage";

import LoadLinkIcon from "@/components/LoadLinkIcon";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import RequireAuthLink from "@/components/RequireAuthLink";
import VehicleFullDetails from "@/components/VehicleFullDetails";
import { formatListingRate } from "@/lib/formatCurrency";
import { jobVehicleRelevance } from "@/lib/vehiclePostingIntelligence";
import { jobVehicleRelevance } from "@/lib/vehiclePostingIntelligence";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";
import { supabase } from "@/lib/supabaseClient";

type VehicleListing = {
  id: string;
  title?: string | null;
  city?: string | null;
  vehicle_group?: string | null;
  rate?: string | null;
  posted_by?: string | null;
  contact_number?: string | null;
  whatsapp_number?: string | null;
  description?: string | null;
  photos?: string[] | null;
  listing_kind?: string | null;
  dealership_id?: string | null;
  user_id?: string | null;
  availability_confirmed_at?: string | null;
  stock_status?: string | null;
};

function isVehicle(row: VehicleListing) {
  const kind = String(row.listing_kind || "").toLowerCase();
  return ["vehicle", "asset", "truck_sale", "vehicle_listing"].includes(kind) || /^Listing type:\s*(Truck|Bakkie|Van|Trailer|Mobile Unit)/im.test(String(row.description || ""));
}

function whatsappHref(number: string | null | undefined, listing: VehicleListing) {
  const clean = String(number || "").replace(/\D/g, "").replace(/^0/, "27");
  if (!clean) return "";
  const message = `Hi, I’m interested in ${listing.title || "this vehicle"} on LoadLink. Is it still available?`;
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

export default function VehicleProductPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || "");
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [listing, setListing] = useState<VehicleListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [relatedJobs,setRelatedJobs]=useState<Array<{id:string;title?:string|null;city?:string|null}>>([]);
  const [viewerId,setViewerId] = useState<string|null>(null);
  const [availabilitySaving,setAvailabilitySaving] = useState(false);
  const [availabilityNotice,setAvailabilityNotice] = useState("");
  useEffect(()=>{let live=true;void supabase.auth.getUser().then(({data})=>{if(live)setViewerId(data.user?.id||null)}).catch(()=>{});return ()=>{live=false}},[]);
  async function confirmAvailability(available:boolean){
    if(!listing || !viewerId || viewerId!==listing.user_id)return;
    setAvailabilitySaving(true);setAvailabilityNotice("");
    const {data,error}=await supabase.rpc("loadlink_confirm_my_vehicle_availability",{p_listing_id:listing.id,p_is_available:available});
    if(error){setAvailabilityNotice(error.message||"Could not update this listing. Try again.");}
    else{
      setAvailabilityNotice(available?"Availability confirmed.":"Listing hidden from the public marketplace.");
      setListing(current=>current?{...current,stock_status:available?"available":"removed",availability_confirmed_at:String(data?.confirmed_at||new Date().toISOString())}:current);
    }
    setAvailabilitySaving(false);
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    fetch(`/api/job-listings?t=${Date.now()}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        if (!active) return;
        const row = ((payload.rows || []) as VehicleListing[]).find((item) => String(item.id) === id);
        if (!row || !isVehicle(row)) {
          setListing(null);
          setError("This vehicle is no longer available on the public marketplace.");
          return;
        }
        setListing(row);
        const desc = String(row.description || "");
        const subtype = desc.match(/^Vehicle subtype:\s*(.+)$/im)?.[1]?.trim() || "";
        const category = desc.match(/^Listing type:\s*(.+)$/im)?.[1]?.trim() || "vehicle";
        const matches = ((payload.rows || []) as Array<{id:string;title?:string|null;city?:string|null;description?:string|null;listing_kind?:string|null}>)
          .filter(x => x.listing_kind === "job" || x.listing_kind === "contract")
          .map(x => ({...x, score:jobVehicleRelevance([x.title||"",x.description||"",x.city||""].join(" "),category,subtype,row.city||"")}))
          .filter(x => x.score >= 4).sort((a,b) => b.score-a.score).slice(0,3);
        setRelatedJobs(matches);
      })
      .catch(() => active && setError("This vehicle could not be loaded right now."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [id]);

  useEffect(()=>{
    if(!viewerId || loading || listing)return;
    let active=true;
    void supabase.from("job_listings")
      .select("id,title,city,vehicle_group,rate,posted_by,contact_number,whatsapp_number,description,photos,listing_kind,dealership_id,stock_status,user_id")
      .eq("id",id).eq("user_id",viewerId).maybeSingle()
      .then(({data,error})=>{
        if(!active||error||!data||!isVehicle(data as VehicleListing))return;
        setListing(data as VehicleListing);setError("");
      });
    return ()=>{active=false;};
  },[viewerId,loading,listing,id]);

  const photos = useMemo(() => (listing?.photos || []).filter(Boolean), [listing?.photos]);
  const page = darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black";
  const surface = darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/[.08] bg-white";
  const muted = darkMode ? "text-white/55" : "text-black/55";
  const whatsapp = listing ? whatsappHref(listing.whatsapp_number || listing.contact_number, listing) : "";

  return (
    <main className={`min-h-screen ${page}`}>
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />

      <section className="mx-auto max-w-6xl px-4 pb-16 pt-6 md:px-6 md:pt-9">
        <Link href="/list-your-vehicle#vehicle-marketplace-vehicles" className={`inline-flex text-xs font-black uppercase tracking-[.08em] ${muted}`}>
          <LoadLinkIcon name="chevronLeft" size={16} className="inline-block align-middle" /> Back to vehicles
        </Link>

        {loading ? (
          <div className={`mt-5 grid gap-5 rounded-[28px] border p-5 ${surface}`}>
            <div className="aspect-[16/10] animate-pulse rounded-[22px] bg-current/[.06]" />
            <div className="h-36 animate-pulse rounded-[22px] bg-current/[.05]" />
          </div>
        ) : !listing ? (
          <div className={`mt-5 rounded-[28px] border p-8 text-center ${surface}`}>
            <h1 className="text-3xl font-black tracking-[-.04em]">Vehicle unavailable</h1>
            <p className={`mx-auto mt-3 max-w-lg text-sm font-semibold leading-6 ${muted}`}>{error || "This vehicle is not available."}</p>
            <Link href="/list-your-vehicle#vehicle-marketplace-vehicles" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#f6b800] px-6 text-xs font-black uppercase text-black">Browse available vehicles</Link>
          </div>
        ) : (
          <>
            <section className={`mt-5 overflow-hidden rounded-[28px] border ${surface}`}>
              <div data-loadlink-vehicle-gallery className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto bg-black/[.06]">
                {(photos.length ? photos : ["/images/truck-1.jpg"]).map((photo, index) => (
                  <div key={`${photo}-${index}`} className="aspect-[16/10] w-full shrink-0 snap-center bg-black/[.06]">
                    <LoadLinkImage src={photo} alt={`${listing.title || "LoadLink vehicle"} photo ${index + 1}`} className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
              {photos.length > 1 ? <div className="flex items-center justify-center gap-1.5 border-t border-current/10 px-4 py-3">{photos.map((_, index) => <span key={index} className={`h-1.5 w-1.5 rounded-full ${index === 0 ? "bg-[#f6b800]" : darkMode ? "bg-white/25" : "bg-black/20"}`} />)}</div> : null}

              <div className="p-5 md:p-7">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <p className={`text-[10px] font-black uppercase tracking-[.12em] ${muted}`}>{listing.vehicle_group || "Commercial vehicle"} · {listing.city || "South Africa"}</p>
                    <h1 className="mt-2 text-3xl font-black tracking-[-.045em] md:text-5xl">{listing.title || "Commercial vehicle"}</h1>
                    <p className={`mt-2 text-sm font-semibold ${muted}`}>Listed by {listing.posted_by || "LoadLink seller"}</p>
                  </div>
                  <div className="shrink-0 md:text-right">
                    <p className="text-3xl font-black tracking-[-.04em]">{formatListingRate(listing.rate)}</p>
                    <p className={`mt-1 text-xs font-bold ${muted}`}>{listing.stock_status === "reserved" ? "Reserved" : "Available"}</p>
                  </div>
                </div>

                {viewerId && listing.user_id===viewerId ? <div className={`mt-5 rounded-xl border p-4 ${darkMode?"border-white/15 bg-white/[.035]":"border-black/10 bg-black/[.025]"}`}>
                  <h3 className="text-sm font-black">Manage availability</h3>
                  <p className={`mt-1 text-xs ${muted}`}>Confirm that this vehicle is still available, or temporarily hide it. This does not renew expired paid access.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button disabled={availabilitySaving} type="button" onClick={()=>void confirmAvailability(true)} className="rounded-xl bg-[#f6b800] px-4 py-2.5 text-xs font-black text-black disabled:opacity-50">Still available</button>
                    <button disabled={availabilitySaving} type="button" onClick={()=>void confirmAvailability(false)} className="rounded-xl border border-current/20 px-4 py-2.5 text-xs font-black disabled:opacity-50">Hide listing</button>
                  </div>
                  {availabilityNotice?<p role="status" className="mt-3 text-xs font-semibold">{availabilityNotice}</p>:null}
                </div>:null}
                <div className="mt-6 grid gap-2 sm:grid-cols-3">
                  {listing.contact_number ? <a href={`tel:${String(listing.contact_number).replace(/\s/g, "")}`} className="flex min-h-13 items-center justify-center rounded-xl border border-[#168eea] bg-[#168eea] px-4 text-xs font-black uppercase text-white">Call seller</a> : null}
                  <RequireAuthLink href={`/messages?listing=${encodeURIComponent(listing.id)}&suggest=1`} className="flex min-h-13 items-center justify-center rounded-xl border border-[#f6b800] bg-[#f6b800] px-4 text-xs font-black uppercase text-black">Message</RequireAuthLink>
                  {whatsapp ? <a href={whatsapp} target="_blank" rel="noreferrer" className="flex min-h-13 items-center justify-center rounded-xl border border-[#0d442b] bg-[#0d442b] px-4 text-xs font-black uppercase text-white">WhatsApp</a> : null}
                </div>
              </div>
            </section>

            {relatedJobs.length ? <section className={`mt-5 rounded-[28px] border p-5 md:p-7 ${surface}`}>
              <h2 className="text-xl font-black">Potential transport opportunities</h2>
              <p className={`mt-2 text-sm ${muted}`}>Suggested from vehicle details and location. Check each job's requirements; suitability is not guaranteed.</p>
              <div className="mt-4 grid gap-2">{relatedJobs.map(job=><Link key={job.id} href={`/listing/${job.id}`} className="flex min-h-14 items-center justify-between rounded-xl border border-current/10 p-4 text-sm font-semibold"><span>{job.title||"Transport opportunity"}{job.city?" · "+job.city:""}</span><LoadLinkIcon name="chevronRight" size={18}/></Link>)}</div>
            </section> : null}
            <section className={`mt-5 rounded-[28px] border p-5 md:p-7 ${surface}`}>
              <VehicleFullDetails description={String(listing.description || "")} city={String(listing.city || "")} dealershipId={listing.dealership_id || null} darkMode={darkMode} />
            </section>
          </>
        )}
      </section>
    </main>
  );
}
