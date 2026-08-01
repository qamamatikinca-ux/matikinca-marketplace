"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import AuthStatusButton from "@/components/AuthStatusButton";
import HomeLogoLink from "@/components/HomeLogoLink";
import SiteMenu from "@/components/SiteMenu";
import { FollowPreferences, getFollowedProfiles, removeFollowedProfile, saveFollowedProfile } from "@/lib/following";
import { browserSupabase } from "@/lib/phase2/supabase";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";
import LoadLinkThemeToggle from "@/components/LoadLinkThemeToggle";
import LoadLinkPagination from "@/components/LoadLinkPagination";

type Tab = "inventory" | "updates" | "about";
type Truck = { title: string; year: string; price: string; mileage: string; image: string; description: string; previousOwners: string; transmission: string; fuel: string; condition: string; serviceHistory: string; bodyType: string };

const DEALER_ID = "loadlink-commercial-centurion";
const DEALER_NAME = "LoadLink Commercial Centurion";
const DEALER_HREF = "/dealership/loadlink-commercial-centurion";
const OWNER_EMAIL = "loadlinksouthafrica@gmail.com";
const PAGE_SIZE = 7;

const inventory: Truck[] = [
  { title: "Mercedes-Benz Actros 2645", year: "2023", price: "R1 695 000", mileage: "188 000 km", image: "/images/truck-1.jpg", previousOwners: "1", transmission: "Automated manual", fuel: "Diesel", condition: "Excellent", serviceHistory: "Full service history", bodyType: "Tractor unit / horse", description: "Automatic long-haul tractor with full service history and nationwide delivery support." },
  { title: "Volvo FH 440 Globetrotter", year: "2022", price: "Request a quote", mileage: "247 000 km", image: "/images/truck-2.jpg", previousOwners: "1", transmission: "Automatic", fuel: "Diesel", condition: "Very good", serviceHistory: "Full service history", bodyType: "Tractor unit / horse", description: "Well-maintained sleeper cab configured for regional and long-distance operations." },
  { title: "Scania R-series 460", year: "2021", price: "R1 250 000", mileage: "315 000 km", image: "/images/truck-3.jpg", previousOwners: "2", transmission: "Automated manual", fuel: "Diesel", condition: "Very good", serviceHistory: "Full service history", bodyType: "Tractor unit / horse", description: "High-roof tractor unit with strong fleet records and finance assistance available." },
  { title: "MAN TGS 26.440", year: "2020", price: "R985 000", mileage: "402 000 km", image: "/images/jobs/job-card-1.jpg", previousOwners: "2", transmission: "Automatic", fuel: "Diesel", condition: "Good", serviceHistory: "Partial service history", bodyType: "Rigid truck", description: "Reliable heavy-duty workhorse suitable for construction and line-haul applications." },
  { title: "Mercedes-Benz Axor 3340", year: "2019", price: "R875 000", mileage: "466 000 km", image: "/images/jobs/jobs-hero-fleet.jpg", previousOwners: "2", transmission: "Manual", fuel: "Diesel", condition: "Good", serviceHistory: "Full service history", bodyType: "Rigid truck", description: "Fleet-ready unit with inspection report, ownership documents and service records." },
  { title: "DAF XF 480", year: "2022", price: "R1 420 000", mileage: "271 000 km", image: "/images/contracts-1.jpg", previousOwners: "1", transmission: "Automatic", fuel: "Diesel", condition: "Very good", serviceHistory: "Full service history", bodyType: "Tractor unit / horse", description: "Comfortable long-haul cab with economical drivetrain and verified roadworthy status." },
  { title: "Isuzu FTR 850 Dropside", year: "2021", price: "R799 000", mileage: "198 500 km", image: "/images/jobs/job-card-2.jpg", previousOwners: "1", transmission: "Manual", fuel: "Diesel", condition: "Very good", serviceHistory: "Full service history", bodyType: "Dropside", description: "Versatile rigid truck for local distribution, construction and general freight." },
  { title: "Hino 700 2841", year: "2020", price: "R925 000", mileage: "338 000 km", image: "/images/jobs/job-card-3.jpg", previousOwners: "2", transmission: "Automatic", fuel: "Diesel", condition: "Good", serviceHistory: "Partial service history", bodyType: "Rigid truck", description: "Heavy-duty chassis prepared for fleet use with nationwide enquiry support." },
  { title: "UD Quon GW26 410", year: "2022", price: "R1 080 000", mileage: "224 000 km", image: "/images/jobs/job-card-4.jpg", previousOwners: "1", transmission: "Automated manual", fuel: "Diesel", condition: "Excellent", serviceHistory: "Full service history", bodyType: "Tractor unit / horse", description: "Modern automated transmission, clean cab and complete dealership inspection." },
];

const updates = [
  { date: "Today", title: "New long-haul stock added", copy: "Three inspected tractor units have joined the showroom and are ready for nationwide enquiries." },
  { date: "This week", title: "Trade-ins now considered", copy: "Truck owners can submit their current vehicle details for a dealership trade-in assessment." },
  { date: "Dealer support", title: "Finance document guidance", copy: "The sales team can explain the documents generally requested by commercial vehicle finance providers." },
];

const DEFAULT_PREFERENCES: FollowPreferences = { newListings: true, updates: true, priceChanges: false };

export default function LoadLinkCommercialDealership() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const sliderRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<Tab>("inventory");
  const [following, setFollowing] = useState(false);
  const [preferences, setPreferences] = useState<FollowPreferences>(DEFAULT_PREFERENCES);
  const [followDialog, setFollowDialog] = useState(false);
  const [followers, setFollowers] = useState(1824);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Truck | null>(null);
  const [followMessage, setFollowMessage] = useState("");
  const [canCustomize, setCanCustomize] = useState(false);
  const [customizeDialog, setCustomizeDialog] = useState(false);
  const [bannerImage, setBannerImage] = useState("/images/jobs/jobs-hero-fleet.jpg");
  const [profileImage, setProfileImage] = useState("/images/truck-1.jpg");
  const [showDescription, setShowDescription] = useState(false);
  const [showroomDescription, setShowroomDescription] = useState("");

  useEffect(() => {
    const saved = getFollowedProfiles().find((item) => item.type === "dealership" && item.id === DEALER_ID);
    if (saved) {
      setFollowing(true);
      setPreferences(saved.preferences);
      setFollowers(1825);
    }
  }, []);

  useEffect(() => {
    try {
      setBannerImage(localStorage.getItem("loadlink-demo-dealer-banner") || "/images/jobs/jobs-hero-fleet.jpg");
      setProfileImage(localStorage.getItem("loadlink-demo-dealer-profile") || "/images/truck-1.jpg");
      setShowDescription(localStorage.getItem("loadlink-demo-dealer-show-description") === "true");
      setShowroomDescription(localStorage.getItem("loadlink-demo-dealer-description") || "");
    } catch {
      // Keep the approved defaults when browser storage is unavailable.
    }
    try {
      const supabase = browserSupabase();
      supabase.auth.getUser().then(({ data }) => setCanCustomize((data.user?.email || "").toLowerCase() === OWNER_EMAIL)).catch(() => setCanCustomize(false));
    } catch {
      setCanCustomize(false);
    }
  }, []);

  function updateShowroomImage(event: ChangeEvent<HTMLInputElement>, kind: "banner" | "profile") {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      setFollowMessage("Choose a JPG, PNG or WebP image smaller than 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || "");
      if (!value) return;
      try {
        localStorage.setItem(kind === "banner" ? "loadlink-demo-dealer-banner" : "loadlink-demo-dealer-profile", value);
      } catch {
        setFollowMessage("This browser could not save the showroom image locally.");
      }
      if (kind === "banner") setBannerImage(value); else setProfileImage(value);
    };
    reader.readAsDataURL(file);
  }

  function saveShowroomPreferences() {
    try {
      localStorage.setItem("loadlink-demo-dealer-show-description", String(showDescription));
      localStorage.setItem("loadlink-demo-dealer-description", showroomDescription.trim());
    } catch {
      setFollowMessage("This browser could not save the showroom preferences locally.");
    }
    setCustomizeDialog(false);
    setFollowMessage("Dealership branding updated for this showroom preview.");
  }

  const totalPages = Math.max(1, Math.ceil(inventory.length / PAGE_SIZE));
  const visibleInventory = useMemo(() => inventory.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [page]);
  const pageBg = darkMode ? "bg-black text-white" : "bg-[#f3f0e8] text-black";
  const surface = darkMode ? "border-white/10 bg-[#0d0d0d]" : "border-black/10 bg-white";
  const muted = darkMode ? "text-white/58" : "text-black/58";

  async function syncFollowToAccount(nextPreferences: FollowPreferences | null) {
    try {
      const supabase = browserSupabase();
      const { data } = await supabase.auth.getSession();
      if (!data.session?.user?.id) return;
      if (!nextPreferences) {
        await supabase.from("loadlink_profile_follows").delete().eq("target_type", "dealership").eq("target_id", DEALER_ID);
        return;
      }
      await supabase.from("loadlink_profile_follows").upsert({
        user_id: data.session.user.id,
        target_type: "dealership",
        target_id: DEALER_ID,
        target_name: DEALER_NAME,
        target_href: DEALER_HREF,
        target_location: "Centurion, Gauteng",
        target_image: "/images/jobs/jobs-hero-fleet.jpg",
        notify_new_listings: nextPreferences.newListings,
        notify_updates: nextPreferences.updates,
        notify_price_changes: nextPreferences.priceChanges,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,target_type,target_id" });
    } catch {
      // The local follow remains available even before the optional database migration is installed.
    }
  }

  function openFollowSettings() {
    setFollowMessage("");
    setFollowDialog(true);
  }

  async function confirmFollow() {
    saveFollowedProfile({
      id: DEALER_ID,
      type: "dealership",
      name: DEALER_NAME,
      href: DEALER_HREF,
      location: "Centurion, Gauteng",
      image: "/images/jobs/jobs-hero-fleet.jpg",
      preferences,
      followedAt: new Date().toISOString(),
    });
    setFollowing(true);
    setFollowers(1825);
    setFollowDialog(false);
    setFollowMessage("Dealership followed. Your notification preferences were saved.");
    await syncFollowToAccount(preferences);
  }

  async function unfollow() {
    removeFollowedProfile("dealership", DEALER_ID);
    setFollowing(false);
    setFollowers(1824);
    setFollowDialog(false);
    setFollowMessage("Dealership removed from your LoadLink network.");
    await syncFollowToAccount(null);
  }

  function changeTab(next: Tab) {
    setTab(next);
    setPage(1);
  }

  function moveSlider(direction: -1 | 1) {
    const node = sliderRef.current;
    if (!node) return;
    node.scrollBy({ left: direction * Math.max(280, node.clientWidth * 0.82), behavior: "smooth" });
  }

  return (
    <main className={`min-h-screen ${pageBg}`}>
      <header className={`sticky top-0 z-50 border-b backdrop-blur ${darkMode ? "border-white/10 bg-black/95" : "border-black/10 bg-white/95"}`}>
        <div className="grid h-20 grid-cols-[56px_1fr_auto] items-center gap-3 px-4 md:grid-cols-[150px_1fr_150px] md:px-7">
          <SiteMenu darkMode={darkMode} className="text-3xl font-black" />
          <HomeLogoLink theme={darkMode ? "dark" : "light"} />
          <div className="flex items-center justify-self-end gap-2">
            <AuthStatusButton darkMode={darkMode} />
            <LoadLinkThemeToggle darkMode={darkMode} onToggle={toggleTheme} />
          </div>
        </div>
      </header>

      <section className="relative min-h-[330px] overflow-hidden bg-black text-white md:min-h-[430px]">
        <img src={bannerImage} alt="Commercial trucks at LoadLink Commercial Centurion" className="absolute inset-0 h-full w-full object-cover opacity-68" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />
        <div className="relative mx-auto flex min-h-[330px] max-w-7xl items-end px-5 pb-8 md:min-h-[430px] md:px-8 md:pb-12">
          <div className="max-w-3xl">
            <span className="inline-flex rounded-full bg-[#f6b800] px-3 py-1 text-[9px] font-black uppercase tracking-[.16em] text-black">Verified LoadLink dealership</span>
            <h1 className="mt-4 text-4xl font-black tracking-[-.055em] sm:text-5xl md:text-7xl">{DEALER_NAME}</h1>
            {showDescription && showroomDescription.trim() ? <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-white/80">{showroomDescription}</p> : null}
          </div>
        </div>
      </section>

      <section className={`border-b ${darkMode ? "border-white/10 bg-[#080808]" : "border-black/10 bg-white"}`}>
        <div className="mx-auto max-w-7xl px-5 py-7 md:px-8 md:py-9">
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-start">
            <div className="flex gap-4">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[22px] border-4 border-[#f6b800] bg-black md:h-28 md:w-28"><img src={profileImage} alt="LoadLink Commercial Centurion profile" className="h-full w-full object-cover" /></div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><h2 className="text-2xl font-black tracking-[-.04em] md:text-3xl">{DEALER_NAME}</h2><span className="rounded-full bg-[#f6b800] px-2.5 py-1 text-[9px] font-black uppercase text-black">Verified dealer</span></div>
                <p className={`mt-2 text-sm font-semibold ${muted}`}>Centurion, Gauteng · Commercial trucks · Nationwide enquiries</p>
                
              </div>
            </div>
            <div className="grid grid-cols-3 gap-5 text-center md:min-w-[330px]">
              <Stat value={String(inventory.length)} label="Vehicles" muted={muted} />
              <Stat value={followers.toLocaleString("en-ZA")} label="Followers" muted={muted} />
              <Stat value="12 min" label="Reply time" muted={muted} />
            </div>
          </div>

          <div className="mt-6 grid gap-2 sm:grid-cols-3 md:flex md:flex-wrap">
            <button type="button" onClick={openFollowSettings} className={`h-11 rounded-xl px-6 text-xs font-black uppercase tracking-[.11em] ${following ? darkMode ? "border border-white/20 bg-white/5" : "border border-black/15 bg-white" : "bg-[#f6b800] text-black"}`}>{following ? "Following · settings" : "Follow dealership"}</button>
            <Link href="/messages" className="flex h-11 items-center justify-center rounded-xl bg-black px-6 text-xs font-black uppercase tracking-[.11em] text-[#f6b800] ring-1 ring-white/10">Message sales team</Link>
            <a href={`mailto:${OWNER_EMAIL}?subject=LoadLink%20commercial%20vehicle%20enquiry`} className={`flex h-11 items-center justify-center rounded-xl border px-6 text-xs font-black uppercase tracking-[.11em] ${darkMode ? "border-white/15 bg-white/5" : "border-black/15 bg-white"}`}>Email dealership</a>
            {canCustomize ? <button type="button" onClick={() => setCustomizeDialog(true)} className={`h-11 rounded-xl border px-6 text-xs font-black uppercase tracking-[.11em] ${darkMode ? "border-white/15 bg-white/5" : "border-black/15 bg-white"}`}>Customize showroom</button> : null}
          </div>
          {followMessage ? <p role="status" className={`mt-4 rounded-xl border px-4 py-3 text-sm font-bold ${darkMode ? "border-[#f6b800]/30 bg-[#f6b800]/10 text-[#ffd760]" : "border-[#d79f00]/35 bg-[#fff5ce] text-[#5f4600]"}`}>{followMessage}</p> : null}
        </div>
      </section>

      <nav className={`sticky top-20 z-40 border-b ${darkMode ? "border-white/10 bg-black" : "border-black/10 bg-white"}`} aria-label="Dealership profile sections">
        <div className="mx-auto grid max-w-7xl grid-cols-3 px-5 md:px-8">
          {(["inventory", "updates", "about"] as Tab[]).map((item) => (
            <button key={item} type="button" onClick={() => changeTab(item)} className={`h-14 border-b-2 text-[10px] font-black uppercase tracking-[.16em] ${tab === item ? darkMode ? "border-[#f6b800] text-[#f6b800]" : "border-black text-black" : "border-transparent opacity-45"}`}>{item}</button>
          ))}
        </div>
      </nav>

      <section className="mx-auto max-w-7xl px-3 py-7 sm:px-5 md:px-8 md:py-10">
        {tab === "inventory" ? (
          <>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3 px-2 sm:px-0">
              <h2 className="text-3xl font-black tracking-[-.04em]">Available commercial vehicles</h2>
              
            </div>
            <div className="mb-3 hidden justify-end gap-2 sm:flex">
              <button type="button" onClick={() => moveSlider(-1)} className={`flex h-10 w-10 items-center justify-center rounded-full border ${darkMode ? "border-white/20" : "border-black/15"}`} aria-label="Previous dealership products">←</button>
              <button type="button" onClick={() => moveSlider(1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f6b800] text-black" aria-label="Next dealership products">→</button>
            </div>
            <div ref={sliderRef} className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-4 touch-pan-x">
              {visibleInventory.map((truck) => (
                <button type="button" key={truck.title} onClick={() => setSelected(truck)} className="group relative aspect-square w-[82vw] max-w-[310px] shrink-0 snap-start overflow-hidden rounded-[18px] bg-black text-left sm:w-[285px] sm:rounded-[24px]">
                  <img src={truck.image} alt={truck.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-transparent to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-3 text-white sm:p-5">
                    <p className="text-[9px] font-black uppercase tracking-[.12em] text-[#f6b800]">{truck.year} · {truck.mileage}</p>
                    <h3 className="mt-1 line-clamp-2 text-sm font-black leading-tight sm:text-xl">{truck.title}</h3>
                    <p className="mt-1 text-xs font-black sm:text-base">{truck.price}</p>
                    <p className="mt-2 text-[9px] font-black uppercase tracking-[.1em] text-white/65">Tap for full details</p>
                  </div>
                </button>
              ))}
            </div>
            {totalPages > 1 ? <LoadLinkPagination current={page} total={totalPages} onChange={setPage} darkMode={darkMode} label="Dealership inventory pages" /> : null}
          </>
        ) : null}

        {tab === "updates" ? (
          <div className="grid gap-4 md:grid-cols-3">{updates.map((update) => <article key={update.title} className={`rounded-[22px] border p-6 ${surface}`}><p className={`text-xs font-black ${muted}`}>{update.date}</p><h2 className="mt-3 text-2xl font-black">{update.title}</h2><p className={`mt-3 text-sm leading-6 ${muted}`}>{update.copy}</p></article>)}</div>
        ) : null}

        {tab === "about" ? (
          <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
            <article className={`rounded-[24px] border p-6 md:p-8 ${surface}`}><h2 className="text-3xl font-black">Commercial vehicle support through LoadLink</h2><p className={`mt-4 text-sm leading-7 ${muted}`}>This featured dealership lets customers browse organised inventory, follow stock updates and contact a sales team without leaving LoadLink.</p><p className={`mt-4 text-sm leading-7 ${muted}`}>Following the dealership saves your notification choices for this dealership.</p></article>
            <article className="rounded-[24px] border border-[#f6b800]/30 bg-black p-6 text-white md:p-8"><h2 className="text-2xl font-black text-[#f6b800]">Business information</h2><dl className="mt-5 space-y-5"><Detail label="Location" value="Centurion, Gauteng" /><Detail label="Sales coverage" value="South Africa" /><Detail label="Contact" value={OWNER_EMAIL} /><Detail label="Profile status" value="Verified LoadLink dealership" /></dl></article>
          </div>
        ) : null}
      </section>

      {selected ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/78 p-0 sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-label={selected.title}>
          <button type="button" className="absolute inset-0" onClick={() => setSelected(null)} aria-label="Close vehicle details" />
          <div className={`relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-[28px] shadow-2xl sm:rounded-[28px] ${darkMode ? "bg-[#0d0d0d] text-white" : "bg-white text-black"}`}>
            <div className="relative aspect-[16/9] bg-black"><img src={selected.image} alt={selected.title} className="h-full w-full object-contain" /><button type="button" onClick={() => setSelected(null)} className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl font-black text-black" aria-label="Close vehicle details">×</button></div>
            <div className="p-5 md:p-7"><p className={`text-xs font-black ${muted}`}>{selected.year} · {selected.mileage}</p><h2 className="mt-2 text-3xl font-black tracking-[-.04em]">{selected.title}</h2><p className="mt-3 text-2xl font-black text-[#c59100]">{selected.price}</p>
              <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
                {[['Mileage', selected.mileage], ['Previous owners', selected.previousOwners], ['Transmission', selected.transmission], ['Fuel', selected.fuel], ['Condition', selected.condition], ['Service history', selected.serviceHistory], ['Body type', selected.bodyType], ['Seller', DEALER_NAME]].map(([label, value]) => <div key={label} className={`rounded-xl border p-3 ${darkMode ? "border-white/10 bg-white/[.03]" : "border-black/10 bg-black/[.02]"}`}><p className={`text-[10px] font-black uppercase ${muted}`}>{label}</p><p className="mt-1 text-sm font-black">{value}</p></div>)}
              </div>
              <h3 className="mt-6 text-lg font-black">Description</h3><p className={`mt-2 text-sm leading-7 ${muted}`}>{selected.description}</p><div className="mt-6 grid gap-2 sm:grid-cols-2"><a href={`mailto:${OWNER_EMAIL}?subject=${encodeURIComponent(`Vehicle enquiry: ${selected.title}`)}`} className="flex h-12 items-center justify-center rounded-xl bg-[#f6b800] px-5 text-xs font-black uppercase text-black">Enquire by email</a><Link href="/messages" className="flex h-12 items-center justify-center rounded-xl bg-black px-5 text-xs font-black uppercase text-[#f6b800] ring-1 ring-white/15">Open messages</Link></div></div>
          </div>
        </div>
      ) : null}

      {customizeDialog ? (
        <div className="fixed inset-0 z-[125] flex items-end justify-center bg-black/75 p-0 sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-label="Customize dealership showroom">
          <div className={`w-full max-w-xl rounded-t-[30px] border p-5 shadow-2xl sm:rounded-[30px] sm:p-7 ${surface}`}>
            <div className="flex items-center justify-between gap-4"><h2 className="text-3xl font-black tracking-[-.04em]">Customize showroom</h2><button type="button" onClick={() => setCustomizeDialog(false)} className={`flex h-10 w-10 items-center justify-center rounded-full border text-xl ${darkMode ? "border-white/15" : "border-black/10"}`}>×</button></div>
            <div className="mt-6 grid gap-4">
              <label className="text-xs font-black uppercase tracking-[.12em]">Banner image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => updateShowroomImage(event, "banner")} className="mt-2 block w-full text-sm font-semibold normal-case" /></label>
              <label className="text-xs font-black uppercase tracking-[.12em]">Profile picture<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => updateShowroomImage(event, "profile")} className="mt-2 block w-full text-sm font-semibold normal-case" /></label>
              <div className={`rounded-xl border p-4 ${darkMode ? "border-white/10" : "border-black/10"}`}>
                <div className="flex items-center justify-between gap-4"><span className="text-sm font-black">Show dealership description</span><button type="button" role="switch" aria-checked={showDescription} onClick={() => setShowDescription((value) => !value)} className={`relative h-7 w-12 rounded-full border transition ${showDescription ? "border-[#f6b800] bg-[#f6b800]" : darkMode ? "border-white/20 bg-white/10" : "border-black/20 bg-black/10"}`}><span className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${showDescription ? "translate-x-5" : "translate-x-0"}`} /></button></div>
                {showDescription ? <textarea value={showroomDescription} onChange={(event) => setShowroomDescription(event.target.value)} maxLength={240} placeholder="Optional showroom description" className={`mt-4 min-h-24 w-full rounded-xl border px-4 py-3 text-sm font-semibold outline-none focus:border-[#f6b800] ${darkMode ? "border-white/15 bg-black text-white" : "border-black/15 bg-white text-black"}`} /> : null}
              </div>
              <button type="button" onClick={saveShowroomPreferences} className="h-12 rounded-xl bg-[#f6b800] text-xs font-black uppercase tracking-[.11em] text-black">Save showroom</button>
            </div>
          </div>
        </div>
      ) : null}

      {followDialog ? (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/75 p-0 sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="follow-title">
          <div className={`w-full max-w-lg rounded-t-[30px] border p-5 shadow-2xl sm:rounded-[30px] sm:p-7 ${surface}`}>
            <div className="flex items-start justify-between gap-4">
              <div><h2 id="follow-title" className="text-3xl font-black tracking-[-.04em]">{following ? "Dealership notifications" : "Follow this dealership"}</h2><p className={`mt-2 text-sm leading-6 ${muted}`}>Choose what LoadLink should alert you about. You can change these choices later.</p></div>
              <button type="button" onClick={() => setFollowDialog(false)} className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-xl ${darkMode ? "border-white/15" : "border-black/10"}`} aria-label="Close follow settings">×</button>
            </div>
            <div className="mt-6 grid gap-3">
              <Preference checked={preferences.newListings} onChange={(value) => setPreferences((current) => ({ ...current, newListings: value }))} title="New vehicle listings" copy="Alert me when this dealership adds new commercial vehicles." darkMode={darkMode} />
              <Preference checked={preferences.updates} onChange={(value) => setPreferences((current) => ({ ...current, updates: value }))} title="Dealership updates" copy="Alert me about business updates, services and announcements." darkMode={darkMode} />
              <Preference checked={preferences.priceChanges} onChange={(value) => setPreferences((current) => ({ ...current, priceChanges: value }))} title="Price changes" copy="Alert me when a listed vehicle price changes." darkMode={darkMode} />
            </div>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {following ? <button type="button" onClick={() => void unfollow()} className="h-12 rounded-xl border border-red-500/50 text-xs font-black uppercase tracking-[.11em] text-red-500">Unfollow</button> : <button type="button" onClick={() => setFollowDialog(false)} className={`h-12 rounded-xl border text-xs font-black uppercase tracking-[.11em] ${darkMode ? "border-white/15" : "border-black/15"}`}>Cancel</button>}
              <button type="button" onClick={() => void confirmFollow()} className="h-12 rounded-xl bg-[#f6b800] text-xs font-black uppercase tracking-[.11em] text-black">{following ? "Save preferences" : "Follow and save"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function Preference({ checked, onChange, title, copy, darkMode }: { checked: boolean; onChange: (value: boolean) => void; title: string; copy: string; darkMode: boolean }) {
  return <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 ${darkMode ? "border-white/12 bg-white/[.04]" : "border-black/10 bg-[#faf9f5]"}`}><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1 h-5 w-5 accent-[#f6b800]" /><span><strong className="block text-sm font-black">{title}</strong><span className={`mt-1 block text-xs leading-5 ${darkMode ? "text-white/55" : "text-black/55"}`}>{copy}</span></span></label>;
}

function Stat({ value, label, muted }: { value: string; label: string; muted: string }) {
  return <div><strong className="block text-xl font-black md:text-2xl">{value}</strong><span className={`text-[9px] font-black uppercase ${muted}`}>{label}</span></div>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-[9px] font-black uppercase tracking-[.15em] text-white/40">{label}</dt><dd className="mt-1 text-sm font-bold">{value}</dd></div>;
}
