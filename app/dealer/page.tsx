"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import AuthStatusButton from "@/components/AuthStatusButton";
import HomeLogoLink from "@/components/HomeLogoLink";
import LoadLinkPagination from "@/components/LoadLinkPagination";
import LoadLinkThemeToggle from "@/components/LoadLinkThemeToggle";
import SiteMenu from "@/components/SiteMenu";
import SouthAfricaLocationInput from "@/components/SouthAfricaLocationInput";
import SubmissionSuccess from "@/components/SubmissionSuccess";
import { isAuthenticatedUser, loginHref } from "@/lib/auth";
import { getVehicleListingAccess } from "@/lib/packageAccess";
import { supabase } from "@/lib/supabaseClient";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

const OWNER_EMAIL = "loadlinksouthafrica@gmail.com";
const POSTS_PER_PAGE = 7;

type Tab = "overview" | "profile" | "add_post" | "inventory" | "updates" | "leads" | "staff" | "billing";
type Profile = {
  id: string;
  owner_user_id: string;
  slug: string;
  name: string;
  profile_image_url?: string | null;
  cover_image_url?: string | null;
  short_bio?: string | null;
  business_description?: string | null;
  physical_location?: string | null;
  contact_email?: string | null;
  phone_number?: string | null;
  whatsapp_number?: string | null;
  website_url?: string | null;
  trading_hours?: string | null;
  year_established?: number | null;
  verification_status: string;
  verification_reason?: string | null;
  is_public: boolean;
};
type Listing = { id: string; title: string; city: string; rate: string; photos?: string[] | null; stock_status: string; moderation_status?: string; created_at: string };
type Update = { id: string; update_type: string; title: string; body: string; created_at: string; status: string };
type Lead = { id: string; customer_name?: string | null; customer_email?: string | null; customer_phone?: string | null; message?: string | null; status: string; assigned_to?: string | null; created_at: string };
type Staff = { id: string; user_id?: string | null; invited_email?: string | null; role: string; is_active: boolean };

const tabs: Array<[Tab, string]> = [
  ["overview", "Overview"],
  ["profile", "Profile"],
  ["add_post", "Add vehicle"],
  ["inventory", "Inventory"],
  ["updates", "Updates"],
  ["leads", "Leads"],
  ["staff", "Staff"],
  ["billing", "Billing"],
];

export default function DealerDashboard() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [userId, setUserId] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    name: "", slug: "", short_bio: "", business_description: "", physical_location: "", contact_email: "", phone_number: "", whatsapp_number: "", website_url: "", trading_hours: "", year_established: "",
  });
  const [inventoryPage, setInventoryPage] = useState(1);
  const [updateForm, setUpdateForm] = useState({ update_type: "new_stock", title: "", body: "" });
  const [invite, setInvite] = useState({ email: "", role: "salesperson" });
  const [docs, setDocs] = useState<Record<string, File | null>>({ company: null, tax: null, address: null, authority: null });

  useEffect(() => {
    void boot();
    const params = new URLSearchParams(window.location.search);
    if (params.get("posted")) setTab("inventory");
  }, []);

  async function boot() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!isAuthenticatedUser(user)) {
      window.location.assign(loginHref("/dealer"));
      return;
    }
    setUserId(user.id);
    const owner = user.email?.toLowerCase() === OWNER_EMAIL;
    if (owner) setAllowed(true);
    else {
      const access = await getVehicleListingAccess();
      setAllowed(access.plan === "dealer" && Boolean(access.subscriptionStatus === "active"));
    }
    await load(user.id);
    setLoading(false);
  }

  async function load(uid = userId) {
    if (!uid) return;
    const p = await supabase.from("dealership_profiles").select("*").eq("owner_user_id", uid).maybeSingle();
    if (!p.data) {
      setProfile(null);
      setListings([]);
      setUpdates([]);
      setLeads([]);
      setStaff([]);
      return;
    }

    const d = p.data as Profile;
    setProfile(d);
    setForm({
      name: d.name || "",
      slug: d.slug || "",
      short_bio: d.short_bio || "",
      business_description: d.business_description || "",
      physical_location: d.physical_location || "",
      contact_email: d.contact_email || "",
      phone_number: d.phone_number || "",
      whatsapp_number: d.whatsapp_number || "",
      website_url: d.website_url || "",
      trading_hours: d.trading_hours || "",
      year_established: d.year_established ? String(d.year_established) : "",
    });

    const [l, u, le, s] = await Promise.all([
      supabase.from("job_listings").select("id,title,city,rate,photos,stock_status,moderation_status,created_at").eq("dealership_id", d.id).order("created_at", { ascending: false }),
      supabase.from("dealership_updates").select("*").eq("dealership_id", d.id).order("created_at", { ascending: false }),
      supabase.from("dealership_leads").select("*").eq("dealership_id", d.id).order("created_at", { ascending: false }),
      supabase.from("dealership_staff").select("*").eq("dealership_id", d.id).order("created_at", { ascending: true }),
    ]);
    setListings((l.data || []) as Listing[]);
    setUpdates((u.data || []) as Update[]);
    setLeads((le.data || []) as Lead[]);
    setStaff((s.data || []) as Staff[]);
  }

  async function uploadAsset(file: File, kind: string) {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/${kind}-${Date.now()}.${ext}`;
    const up = await supabase.storage.from("dealership-assets").upload(path, file, { upsert: true });
    if (up.error) throw up.error;
    return supabase.storage.from("dealership-assets").getPublicUrl(path).data.publicUrl;
  }

  async function saveProfile() {
    setMessage("");
    if (!allowed) {
      setMessage("An active Dealer subscription is required before creating a dealership profile.");
      return;
    }
    if (form.name.trim().length < 2 || form.slug.trim().length < 2) {
      setMessage("Enter a dealership name and profile address.");
      return;
    }
    const payload = {
      owner_user_id: userId,
      name: form.name.trim(),
      slug: form.slug.toLowerCase().trim().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, ""),
      short_bio: form.short_bio.trim() || null,
      business_description: form.business_description.trim() || null,
      physical_location: form.physical_location.trim() || null,
      contact_email: form.contact_email.trim() || null,
      phone_number: form.phone_number.trim() || null,
      whatsapp_number: form.whatsapp_number.trim() || null,
      website_url: form.website_url.trim() || null,
      trading_hours: form.trading_hours.trim() || null,
      year_established: form.year_established ? Number(form.year_established) : null,
    };

    if (profile) {
      const updateResult = await supabase.from("dealership_profiles").update(payload).eq("id", profile.id);
      if (updateResult.error) { setMessage(updateResult.error.message); return; }
    } else {
      const createResult = await supabase.from("dealership_profiles").insert({ ...payload, verification_status: "pending", is_public: false }).select("id").single();
      if (createResult.error) { setMessage(createResult.error.message); return; }
      if (!createResult.data) { setMessage("The dealership profile was saved but no profile ID was returned."); return; }
      const staffResult = await supabase.from("dealership_staff").insert({ dealership_id: createResult.data.id, user_id: userId, role: "owner", is_active: true, invited_by: userId });
      if (staffResult.error) { setMessage(staffResult.error.message); return; }
    }
    setSuccess(true);
    setTimeout(() => setSuccess(false), 1900);
    await load(userId);
  }

  async function changeBrandImage(event: ChangeEvent<HTMLInputElement>, kind: "profile" | "cover") {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !profile) return;
    setMessage("");
    try {
      const url = await uploadAsset(file, kind);
      const field = kind === "profile" ? "profile_image_url" : "cover_image_url";
      const result = await supabase.from("dealership_profiles").update({ [field]: url }).eq("id", profile.id);
      if (result.error) throw result.error;
      await load(userId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    }
  }

  async function submitVerification() {
    if (!profile) return;
    setMessage("");
    for (const key of ["company", "tax", "address", "authority"]) {
      if (!docs[key]) { setMessage("Upload all four dealership verification documents."); return; }
    }
    try {
      const paths: Record<string, string> = {};
      for (const [key, file] of Object.entries(docs)) {
        const f = file as File;
        const path = `${userId}/${profile.id}/${key}-${Date.now()}-${f.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
        const up = await supabase.storage.from("dealership-documents").upload(path, f);
        if (up.error) throw up.error;
        paths[key] = path;
      }
      const result = await supabase.from("dealership_verification").upsert({
        dealership_id: profile.id,
        applicant_user_id: userId,
        company_registration_path: paths.company,
        tax_document_path: paths.tax,
        business_address_path: paths.address,
        representative_authority_path: paths.authority,
        status: "pending",
        rejection_reason: null,
      }, { onConflict: "dealership_id" });
      if (result.error) throw result.error;
      setMessage("Dealership verification submitted for review.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Verification upload failed.");
    }
  }

  async function publishUpdate() {
    if (!profile || !updateForm.title.trim() || !updateForm.body.trim()) return;
    setMessage("");
    const result = await supabase.from("dealership_updates").insert({ dealership_id: profile.id, author_user_id: userId, ...updateForm, status: "approved" });
    if (result.error) setMessage(result.error.message);
    else {
      setUpdateForm({ ...updateForm, title: "", body: "" });
      await load(userId);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 1700);
    }
  }

  async function updateStock(id: string, stock_status: string) {
    const result = await supabase.from("job_listings").update({ stock_status }).eq("id", id);
    if (result.error) setMessage(result.error.message);
    else await load(userId);
  }

  async function updateLead(id: string, status: string) {
    const result = await supabase.from("dealership_leads").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    if (result.error) setMessage(result.error.message);
    else await load(userId);
  }

  async function addStaff() {
    if (!profile || !invite.email.trim()) return;
    setMessage("");
    const result = await supabase.from("dealership_staff").insert({ dealership_id: profile.id, invited_email: invite.email.trim().toLowerCase(), role: invite.role, is_active: true, invited_by: userId });
    if (result.error) setMessage(result.error.message);
    else {
      setInvite({ email: "", role: "salesperson" });
      await load(userId);
    }
  }

  const metrics = useMemo(() => ({
    active: listings.filter((item) => item.stock_status === "available").length,
    reserved: listings.filter((item) => item.stock_status === "reserved").length,
    sold: listings.filter((item) => item.stock_status === "sold").length,
    newLeads: leads.filter((item) => item.status === "new").length,
  }), [listings, leads]);

  const inventoryTotalPages = Math.max(1, Math.ceil(listings.length / POSTS_PER_PAGE));
  const visibleInventory = listings.slice((inventoryPage - 1) * POSTS_PER_PAGE, inventoryPage * POSTS_PER_PAGE);
  useEffect(() => setInventoryPage((page) => Math.min(page, inventoryTotalPages)), [inventoryTotalPages]);

  const surface = darkMode ? "border-white/10 bg-[#0b0b0b] text-white" : "border-black/10 bg-white text-black";
  const muted = darkMode ? "text-white/55" : "text-black/55";
  const input = `h-12 w-full rounded-xl border px-4 text-sm font-bold outline-none transition focus:border-[#f6b800] ${darkMode ? "border-white/15 bg-[#151515] text-white placeholder:text-white/28" : "border-black/10 bg-[#faf8f2] text-black placeholder:text-black/32"}`;

  if (loading) {
    return (
      <main className={`min-h-screen ${darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black"}`}>
        <StandardHeader darkMode={darkMode} toggleTheme={toggleTheme} />
        <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-7xl items-center justify-center px-4">
          <div className={`w-full max-w-sm rounded-[26px] border p-7 text-center ${surface}`}>
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-current/10 border-t-[#f6b800]" />
            <p className="mt-5 text-lg font-black">Loading dealership workspace</p>
            <p className={`mt-2 text-xs font-semibold ${muted}`}>Opening inventory, leads and profile tools.</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main data-loadlink-dealer-workspace="v2619" className={`min-h-screen ${darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black"}`}>
      <SubmissionSuccess open={success} title="Changes saved" message="Your dealership information has been updated." />
      <StandardHeader darkMode={darkMode} toggleTheme={toggleTheme} />

      {!allowed ? (
        <DealerSalesLanding darkMode={darkMode} />
      ) : (
        <section className="mx-auto max-w-7xl px-4 pb-14 pt-5 md:px-6 md:pt-8">
          <DealerHero profile={profile} darkMode={darkMode} onCreateProfile={() => setTab("profile")} />

          <nav className={`no-scrollbar mt-4 flex gap-2 overflow-x-auto rounded-2xl border p-2 ${darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white"}`} aria-label="Dealer workspace sections">
            {tabs.map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={`shrink-0 rounded-xl border px-4 py-2.5 text-[11px] font-black transition ${tab === value ? "border-[#f6b800] bg-[#f6b800] text-black" : darkMode ? "border-white/8 bg-white/[.025] text-white/55" : "border-black/8 bg-[#faf8f2] text-black/55"}`}
              >
                {label}
              </button>
            ))}
          </nav>

          {tab === "overview" ? (
            <div className="mt-5 grid gap-5">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <MetricCard label="Available" value={metrics.active} hint="Live stock" darkMode={darkMode} />
                <MetricCard label="Reserved" value={metrics.reserved} hint="In progress" darkMode={darkMode} />
                <MetricCard label="Sold" value={metrics.sold} hint="Completed" darkMode={darkMode} />
                <MetricCard label="New leads" value={metrics.newLeads} hint="Needs response" darkMode={darkMode} accent={metrics.newLeads > 0} />
              </div>

              <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
                <section className={`overflow-hidden rounded-[26px] border ${surface}`}>
                  <div className="flex items-start justify-between gap-4 border-b border-current/10 p-5 md:p-6">
                    <div><p className={`text-[9px] font-black uppercase tracking-[.16em] ${muted}`}>Dealership command centre</p><h2 className="mt-1 text-2xl font-black">What needs attention</h2></div>
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f6b800] text-black"><DashboardIcon /></span>
                  </div>
                  <div className="grid gap-3 p-5 sm:grid-cols-2 md:p-6">
                    <ActionTile title={profile ? "Edit dealership profile" : "Create dealership profile"} body="Brand, location, contacts and public showroom details." onClick={() => setTab("profile")} darkMode={darkMode} />
                    <ActionTile title="Add dealership vehicle" body="Dealer listings use 10–15 photos; the standard package includes 15." onClick={() => setTab("add_post")} darkMode={darkMode} />
                    <ActionTile title="Work sales leads" body={`${metrics.newLeads} new lead${metrics.newLeads === 1 ? "" : "s"} waiting in the pipeline.`} onClick={() => setTab("leads")} darkMode={darkMode} />
                    <ActionTile title="Publish an update" body="Share arrivals, offers, trading hours or dealership announcements." onClick={() => setTab("updates")} darkMode={darkMode} />
                  </div>
                </section>

                <section className={`rounded-[26px] border p-5 md:p-6 ${surface}`}>
                  <div className="flex items-center justify-between gap-3"><div><p className={`text-[9px] font-black uppercase tracking-[.16em] ${muted}`}>Account status</p><h2 className="mt-1 text-2xl font-black">Dealer active</h2></div><span className="rounded-full bg-[#f6b800] px-3 py-1.5 text-[9px] font-black uppercase text-black">R2 999/mo</span></div>
                  <div className={`mt-5 rounded-2xl border p-4 ${darkMode ? "border-white/10 bg-white/[.03]" : "border-black/8 bg-[#faf8f2]"}`}>
                    <InfoRow label="Verification" value={profile?.verification_status || "Profile needed"} />
                    <InfoRow label="Public showroom" value={profile?.is_public ? "Live" : "Not live yet"} />
                    <InfoRow label="Photo allowance" value="15 per vehicle" />
                    <InfoRow label="Team" value={`${staff.length || (profile ? 1 : 0)} account member${staff.length === 1 ? "" : "s"}`} last />
                  </div>
                  {profile ? <Link href={`/dealership/${profile.slug}`} className="mt-4 flex h-12 items-center justify-center rounded-xl border border-[#f6b800] text-sm font-black">Open public dealership</Link> : <button type="button" onClick={() => setTab("profile")} className="mt-4 h-12 w-full rounded-xl bg-[#f6b800] text-sm font-black text-black">Create dealership profile</button>}
                </section>
              </div>
            </div>
          ) : null}

          {tab === "profile" ? (
            <div className="mt-5 grid gap-5 lg:grid-cols-[1.08fr_.92fr]">
              <section className={`rounded-[26px] border p-5 md:p-6 ${surface}`}>
                <SectionHeading eyebrow="Public information" title="Dealership profile" description="Keep the public-facing details clean. Leave the long description blank if you do not want it displayed." muted={muted} />
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <Field label="Dealership name"><input className={input} placeholder="Dealership name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
                  <Field label="Profile address"><input className={input} placeholder="your-dealership" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></Field>
                  <Field label="Short biography"><input className={input} placeholder="Short dealership biography" value={form.short_bio} onChange={(e) => setForm({ ...form, short_bio: e.target.value })} /></Field>
                  <Field label="Location"><SouthAfricaLocationInput className={input} placeholder="City, town or province" value={form.physical_location} onChange={(value) => setForm({ ...form, physical_location: value })} darkMode={darkMode} ariaLabel="Dealership physical location" /></Field>
                  <Field label="Contact email"><input className={input} placeholder="sales@dealer.co.za" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></Field>
                  <Field label="Phone"><input className={input} placeholder="Phone number" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} /></Field>
                  <Field label="WhatsApp"><input className={input} placeholder="WhatsApp number" value={form.whatsapp_number} onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })} /></Field>
                  <Field label="Website"><input className={input} placeholder="https://" value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} /></Field>
                  <Field label="Trading hours"><input className={input} placeholder="Mon–Fri 08:00–17:00" value={form.trading_hours} onChange={(e) => setForm({ ...form, trading_hours: e.target.value })} /></Field>
                  <Field label="Year established"><input className={input} type="number" placeholder="2018" value={form.year_established} onChange={(e) => setForm({ ...form, year_established: e.target.value })} /></Field>
                  <div className="md:col-span-2"><Field label="Business description"><textarea className={`${input} min-h-32 py-3`} placeholder="Optional business description — leave blank to hide" value={form.business_description} onChange={(e) => setForm({ ...form, business_description: e.target.value })} /></Field></div>
                </div>
                <button onClick={() => void saveProfile()} className="mt-5 h-12 rounded-xl bg-[#f6b800] px-6 text-sm font-black text-black">Save profile</button>
              </section>

              <section className={`rounded-[26px] border p-5 md:p-6 ${surface}`}>
                <SectionHeading eyebrow="Brand + trust" title="Branding and verification" description="Use clear dealership branding and submit the four business documents required for review." muted={muted} />
                {profile ? (
                  <>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <BrandUpload label="Profile picture" detail="Square logo or dealership image" preview={profile.profile_image_url} darkMode={darkMode} onChange={(event) => void changeBrandImage(event, "profile")} />
                      <BrandUpload label="Cover image" detail="Wide showroom or stock image" preview={profile.cover_image_url} darkMode={darkMode} wide onChange={(event) => void changeBrandImage(event, "cover")} />
                    </div>

                    <div className={`mt-6 rounded-2xl border p-4 ${darkMode ? "border-white/10 bg-white/[.025]" : "border-black/8 bg-[#faf8f2]"}`}>
                      <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-black">Verification documents</p><p className={`mt-1 text-[11px] font-semibold ${muted}`}>PDF or image. All four are required.</p></div><StatusChip value={profile.verification_status} /></div>
                      <div className="mt-4 grid gap-2">
                        {([[
                          "company", "Company registration",
                        ], ["tax", "Tax document"], ["address", "Business address"], ["authority", "Representative authority"]] as Array<[string, string]>).map(([key, label]) => (
                          <label key={key} className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 transition hover:border-[#f6b800] ${darkMode ? "border-white/10 bg-black" : "border-black/8 bg-white"}`}>
                            <div className="min-w-0"><p className="text-xs font-black">{label}</p><p className={`mt-1 truncate text-[10px] font-semibold ${muted}`}>{docs[key]?.name || "Choose document"}</p></div>
                            <span className="shrink-0 rounded-lg bg-[#f6b800] px-3 py-2 text-[9px] font-black uppercase text-black">Browse</span>
                            <input type="file" accept=".pdf,image/*" className="sr-only" onChange={(event) => setDocs({ ...docs, [key]: event.target.files?.[0] || null })} />
                          </label>
                        ))}
                      </div>
                      <button onClick={() => void submitVerification()} className="mt-4 h-12 w-full rounded-xl border border-[#f6b800] text-sm font-black">Submit verification</button>
                    </div>
                  </>
                ) : (
                  <div className={`mt-5 rounded-2xl border p-5 text-sm font-semibold ${darkMode ? "border-white/10 bg-white/[.025] text-white/55" : "border-black/8 bg-[#faf8f2] text-black/55"}`}>Save the dealership profile first. Branding and verification unlock immediately after the profile exists.</div>
                )}
              </section>
            </div>
          ) : null}

          {tab === "add_post" ? (
            <section className={`mt-5 rounded-[26px] border p-5 md:p-6 ${surface}`}>
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <SectionHeading eyebrow="Dealer inventory" title="Add a vehicle" description="Dealer listings use 10–15 photos. The standard R2 999 Dealer package includes up to 15 photos per vehicle and links every approved post to your showroom." muted={muted} />
                {profile ? <Link href={`/list-your-vehicle?plan=dealer&dealership=${profile.id}`} className="flex h-12 shrink-0 items-center justify-center rounded-xl bg-[#f6b800] px-6 text-sm font-black text-black">Create dealership post</Link> : <button type="button" onClick={() => setTab("profile")} className="h-12 shrink-0 rounded-xl border border-[#f6b800] px-6 text-sm font-black">Create profile first</button>}
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <VehicleType title="Truck" body="Commercial trucks, tractor units and specialist truck bodies." />
                <VehicleType title="Trailer" body="Flatbeds, tautliners, tippers, tankers and other trailer stock." />
                <VehicleType title="Mobile unit" body="Mobile toilets, kitchens, clinics, offices and other mobile units." />
              </div>
              <div className={`mt-5 flex flex-col gap-2 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${darkMode ? "border-[#f6b800]/25 bg-[#f6b800]/[.06]" : "border-[#d49b00]/25 bg-[#fff4c8]"}`}><p className="text-sm font-black">Dealer photo rule</p><p className={`text-xs font-semibold ${muted}`}>Never 5 photos. Minimum 10; standard Dealer includes 15 per vehicle.</p></div>
            </section>
          ) : null}

          {tab === "inventory" ? (
            <section className={`mt-5 overflow-hidden rounded-[26px] border ${surface}`}>
              <div className="flex items-center justify-between gap-3 border-b border-current/10 p-5 md:p-6"><div><p className={`text-[9px] font-black uppercase tracking-[.16em] ${muted}`}>Stock control</p><h2 className="mt-1 text-2xl font-black">Inventory</h2></div><Link href={profile ? `/list-your-vehicle?plan=dealer&dealership=${profile.id}` : "/list-your-vehicle?plan=dealer"} className="rounded-xl bg-[#f6b800] px-4 py-3 text-xs font-black text-black">Add vehicle</Link></div>
              {listings.length ? (
                <>
                  <div className="divide-y divide-current/10">
                    {visibleInventory.map((item) => (
                      <div key={item.id} className="grid gap-4 p-4 sm:grid-cols-[82px_1fr] md:grid-cols-[82px_1fr_190px] md:items-center md:p-5">
                        <div className={`h-[82px] w-[82px] overflow-hidden rounded-xl ${darkMode ? "bg-white/[.05]" : "bg-black/[.04]"}`}>{item.photos?.[0] ? <img src={item.photos[0]} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[9px] font-black text-[#b88900]">NO IMAGE</div>}</div>
                        <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="truncate font-black">{item.title}</p><StockChip value={item.stock_status || "available"} /></div><p className={`mt-1 text-xs font-semibold ${muted}`}>{item.city} · {item.rate}</p><p className={`mt-1 text-[10px] font-bold uppercase ${muted}`}>Moderation: {item.moderation_status || "pending"} · {item.photos?.length || 0} photos</p></div>
                        <select className={input} value={item.stock_status || "available"} onChange={(event) => void updateStock(item.id, event.target.value)}><option value="available">Available</option><option value="reserved">Reserved</option><option value="sold">Sold</option></select>
                      </div>
                    ))}
                  </div>
                  {inventoryTotalPages > 1 ? <div className="border-t border-current/10 p-4"><LoadLinkPagination current={inventoryPage} total={inventoryTotalPages} onChange={setInventoryPage} darkMode={darkMode} label="Dealership inventory pages" /></div> : null}
                </>
              ) : <EmptyState title="No dealership vehicles yet" body="Add the first vehicle and it will appear here after it is linked to this dealership." muted={muted} />}
            </section>
          ) : null}

          {tab === "updates" ? (
            <div className="mt-5 grid gap-5 lg:grid-cols-[.82fr_1.18fr]">
              <section className={`rounded-[26px] border p-5 md:p-6 ${surface}`}>
                <SectionHeading eyebrow="Followers + showroom" title="Publish an update" description="Post useful dealership news without turning the page into a social feed." muted={muted} />
                <select className={`${input} mt-5`} value={updateForm.update_type} onChange={(event) => setUpdateForm({ ...updateForm, update_type: event.target.value })}>{["new_stock", "new_arrival", "price_reduction", "weekend_special", "finance_offer", "clearance", "branch_announcement", "trading_hours"].map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select>
                <input className={`${input} mt-3`} placeholder="Update title" value={updateForm.title} onChange={(event) => setUpdateForm({ ...updateForm, title: event.target.value })} />
                <textarea className={`${input} mt-3 min-h-32 py-3`} placeholder="Update details" value={updateForm.body} onChange={(event) => setUpdateForm({ ...updateForm, body: event.target.value })} />
                <button onClick={() => void publishUpdate()} className="mt-4 h-12 w-full rounded-xl bg-[#f6b800] text-sm font-black text-black">Publish update</button>
              </section>
              <section className={`overflow-hidden rounded-[26px] border ${surface}`}>
                <div className="border-b border-current/10 p-5 md:p-6"><p className={`text-[9px] font-black uppercase tracking-[.16em] ${muted}`}>Public dealership activity</p><h2 className="mt-1 text-2xl font-black">Recent updates</h2></div>
                {updates.length ? <div className="divide-y divide-current/10">{updates.map((item) => <article key={item.id} className="p-5"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#f6b800] px-2.5 py-1 text-[8px] font-black uppercase text-black">{item.update_type.replaceAll("_", " ")}</span><span className={`text-[9px] font-black uppercase ${muted}`}>{item.status}</span></div><h3 className="mt-3 font-black">{item.title}</h3><p className={`mt-2 text-sm font-semibold leading-6 ${muted}`}>{item.body}</p></article>)}</div> : <EmptyState title="No updates published" body="New arrivals, offers and branch news will appear here." muted={muted} />}
              </section>
            </div>
          ) : null}

          {tab === "leads" ? (
            <section className={`mt-5 overflow-hidden rounded-[26px] border ${surface}`}>
              <div className="flex items-end justify-between gap-3 border-b border-current/10 p-5 md:p-6"><div><p className={`text-[9px] font-black uppercase tracking-[.16em] ${muted}`}>Sales pipeline</p><h2 className="mt-1 text-2xl font-black">Dealership leads</h2></div><span className="rounded-full bg-[#f6b800] px-3 py-1.5 text-[9px] font-black text-black">{metrics.newLeads} new</span></div>
              {leads.length ? <div className="divide-y divide-current/10">{leads.map((item) => <div key={item.id} className="grid gap-4 p-5 md:grid-cols-[1fr_210px] md:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-black">{item.customer_name || item.customer_email || "LoadLink customer"}</p><LeadChip value={item.status} /></div><p className={`mt-2 text-sm font-semibold ${muted}`}>{item.message || "Vehicle enquiry"}</p><p className={`mt-2 text-xs font-semibold ${muted}`}>{item.customer_phone || item.customer_email || "Contact details in account"}</p></div><select className={input} value={item.status} onChange={(event) => void updateLead(item.id, event.target.value)}>{["new", "contacted", "interested", "viewing_arranged", "negotiating", "finance_pending", "sold", "closed"].map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></div>)}</div> : <EmptyState title="No dealership leads yet" body="Customer enquiries connected to this dealership will appear here." muted={muted} />}
            </section>
          ) : null}

          {tab === "staff" ? (
            <div className="mt-5 grid gap-5 md:grid-cols-[.72fr_1.28fr]">
              <section className={`rounded-[26px] border p-5 md:p-6 ${surface}`}>
                <SectionHeading eyebrow="Team access" title="Invite staff" description="Add the people who manage sales and inventory for this dealership." muted={muted} />
                <input className={`${input} mt-5`} placeholder="Staff email" value={invite.email} onChange={(event) => setInvite({ ...invite, email: event.target.value })} />
                <select className={`${input} mt-3`} value={invite.role} onChange={(event) => setInvite({ ...invite, role: event.target.value })}><option value="manager">Manager</option><option value="salesperson">Salesperson</option><option value="inventory_manager">Inventory manager</option></select>
                <button onClick={() => void addStaff()} className="mt-4 h-12 w-full rounded-xl bg-[#f6b800] text-sm font-black text-black">Invite staff</button>
              </section>
              <section className={`overflow-hidden rounded-[26px] border ${surface}`}>
                <div className="border-b border-current/10 p-5 md:p-6"><p className={`text-[9px] font-black uppercase tracking-[.16em] ${muted}`}>Workspace members</p><h2 className="mt-1 text-2xl font-black">Team</h2></div>
                {staff.length ? <div className="divide-y divide-current/10">{staff.map((item) => <div key={item.id} className="flex items-center gap-3 p-4 md:p-5"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f6b800] text-xs font-black text-black">{(item.invited_email || "LL").slice(0, 2).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate font-black">{item.invited_email || item.user_id || "Dealership owner"}</p><p className={`mt-1 text-[10px] font-bold uppercase ${muted}`}>{item.role.replaceAll("_", " ")} · {item.is_active ? "active" : "inactive"}</p></div></div>)}</div> : <EmptyState title="No invited staff yet" body="The dealership owner remains the primary account administrator." muted={muted} />}
              </section>
            </div>
          ) : null}

          {tab === "billing" ? (
            <section className={`mt-5 overflow-hidden rounded-[26px] border ${surface}`}>
              <div className="grid gap-5 p-5 md:grid-cols-[1fr_auto] md:items-center md:p-7"><div><p className={`text-[9px] font-black uppercase tracking-[.16em] ${muted}`}>Dealer package</p><h2 className="mt-1 text-3xl font-black tracking-[-.04em]">R2 999 / month</h2><p className={`mt-3 max-w-2xl text-sm font-semibold leading-6 ${muted}`}>Includes the dealership showroom, inventory workspace, leads, staff tools, analytics and up to 15 photos per vehicle.</p></div><Link href="/account/packages" className="flex h-12 items-center justify-center rounded-xl bg-[#f6b800] px-6 text-sm font-black text-black">Open billing history</Link></div>
            </section>
          ) : null}

          {message ? <p role="status" className={`mt-5 rounded-2xl border border-[#f6b800]/40 bg-[#f6b800]/10 p-4 text-sm font-bold leading-6 ${darkMode ? "text-white" : "text-black"}`}>{message}</p> : null}
        </section>
      )}
    </main>
  );
}

function StandardHeader({ darkMode, toggleTheme }: { darkMode: boolean; toggleTheme: () => void }) {
  return (
    <header className={`sticky top-0 z-50 border-b ${darkMode ? "border-white/10 bg-black/95" : "border-black/10 bg-white/95"}`}>
      <div className="grid h-20 grid-cols-[92px_1fr_52px] items-center px-4 backdrop-blur-md">
        <div className="flex items-center gap-2"><SiteMenu darkMode={darkMode} /><AuthStatusButton darkMode={darkMode} /></div>
        <HomeLogoLink theme={darkMode ? "dark" : "light"} />
        <LoadLinkThemeToggle darkMode={darkMode} onToggle={toggleTheme} className="ml-auto" />
      </div>
    </header>
  );
}

function DealerHero({ profile, darkMode, onCreateProfile }: { profile: Profile | null; darkMode: boolean; onCreateProfile: () => void }) {
  const muted = "text-white/65";
  const cover = profile?.cover_image_url;
  return (
    <section className="relative min-h-[290px] overflow-hidden rounded-[30px] border border-[#f6b800]/35 bg-[#090909] text-white shadow-[0_24px_70px_rgba(0,0,0,.14)]">
      {cover ? <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover opacity-55" /> : <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_15%,rgba(246,184,0,.2),transparent_36%),linear-gradient(135deg,#090909_0%,#111_55%,#050505_100%)]" />}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20" />
      <div className="pointer-events-none absolute -right-14 -top-14 h-56 w-56 rounded-full border border-[#f6b800]/20" />
      <div className="relative flex min-h-[290px] flex-col justify-end p-5 md:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 items-end gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-[#f6b800] bg-black shadow-xl md:h-24 md:w-24">
              {profile?.profile_image_url ? <img src={profile.profile_image_url} alt="" className="h-full w-full object-cover" /> : <span className="text-xl font-black text-[#f6b800]">{(profile?.name || "LL").slice(0, 2).toUpperCase()}</span>}
            </div>
            <div className="min-w-0 pb-1">
              <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#f6b800] px-2.5 py-1 text-[8px] font-black uppercase text-black">Dealer workspace</span><span className="rounded-full border border-white/20 bg-black/40 px-2.5 py-1 text-[8px] font-black uppercase text-white/70">{profile?.verification_status || "Profile needed"}</span></div>
              <h1 className="mt-3 truncate text-3xl font-black tracking-[-.05em] sm:text-4xl md:text-5xl">{profile?.name || "Build your LoadLink dealership"}</h1>
              <p className={`mt-2 max-w-2xl text-sm font-semibold leading-6 ${muted}`}>{profile?.short_bio || "Manage stock, dealership branding, enquiries, staff and updates from one focused workspace."}</p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            {profile ? <Link href={`/dealership/${profile.slug}`} className="flex h-11 items-center justify-center rounded-xl border border-white/20 bg-black/45 px-4 text-xs font-black backdrop-blur">View showroom</Link> : <button type="button" onClick={onCreateProfile} className="h-11 rounded-xl bg-[#f6b800] px-4 text-xs font-black text-black">Create profile</button>}
          </div>
        </div>
      </div>
    </section>
  );
}

function DealerSalesLanding({ darkMode }: { darkMode: boolean }) {
  const surface = darkMode ? "border-white/10 bg-[#0b0b0b] text-white" : "border-black/10 bg-white text-black";
  const muted = darkMode ? "text-white/55" : "text-black/55";
  return (
    <section className="mx-auto max-w-7xl px-4 py-7 md:px-6 md:py-10">
      <div className="relative overflow-hidden rounded-[30px] border border-[#f6b800]/45 bg-black p-6 text-white md:p-9">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full border border-[#f6b800]/20" />
        <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#f6b800]">LoadLink Dealer</p>
        <div className="relative mt-3 grid gap-7 lg:grid-cols-[1fr_.55fr] lg:items-end">
          <div><h1 className="max-w-4xl text-4xl font-black tracking-[-.055em] md:text-6xl">A dealership workspace built to sell stock, not just display it.</h1><p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-white/60 md:text-base">Public showroom, inventory, dealership updates, lead management, staff access and analytics — connected to the LoadLink marketplace.</p></div>
          <div className="rounded-2xl border border-white/12 bg-white/[.05] p-5 backdrop-blur"><p className="text-[9px] font-black uppercase tracking-[.14em] text-white/45">Standard Dealer</p><div className="mt-2 flex items-end gap-2"><span className="text-4xl font-black">R2 999</span><span className="pb-1 text-xs font-bold text-white/45">/ month</span></div><p className="mt-3 text-xs font-semibold leading-5 text-white/55">15 photos per vehicle. Dealer-style tailored access never estimates below R2 500/month.</p><Link href="/packages#dealer-package" className="mt-4 flex h-12 items-center justify-center rounded-xl bg-[#f6b800] text-sm font-black text-black">View Dealer package</Link></div>
        </div>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <BenefitCard title="Showroom + inventory" body="A branded dealership page with vehicle detail pages and public stock." surface={surface} muted={muted} />
        <BenefitCard title="Sales pipeline" body="Turn LoadLink enquiries into organised leads and move them through deal stages." surface={surface} muted={muted} />
        <BenefitCard title="Team workspace" body="Managers, salespeople and inventory staff can work from one dealership account." surface={surface} muted={muted} />
      </div>
      <div className={`mt-5 flex flex-col gap-4 rounded-[26px] border p-5 sm:flex-row sm:items-center sm:justify-between ${surface}`}><div><p className="font-black">Need a commercial setup?</p><p className={`mt-1 text-xs font-semibold ${muted}`}>Use the package guide for a recommendation or send a tailored request to LoadLink Sales.</p></div><Link href="/packages#plan-guide" className="flex h-11 shrink-0 items-center justify-center rounded-xl bg-[#f6b800] px-5 text-xs font-black text-black">Talk to Sales through packages</Link></div>
    </section>
  );
}

function SectionHeading({ eyebrow, title, description, muted }: { eyebrow: string; title: string; description: string; muted: string }) {
  return <div><p className={`text-[9px] font-black uppercase tracking-[.16em] ${muted}`}>{eyebrow}</p><h2 className="mt-1 text-2xl font-black tracking-[-.035em] md:text-3xl">{title}</h2><p className={`mt-2 max-w-2xl text-sm font-semibold leading-6 ${muted}`}>{description}</p></div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-[10px] font-black uppercase tracking-[.08em] opacity-55">{label}</span>{children}</label>;
}

function BrandUpload({ label, detail, preview, darkMode, wide = false, onChange }: { label: string; detail: string; preview?: string | null; darkMode: boolean; wide?: boolean; onChange: (event: ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <label className={`group cursor-pointer overflow-hidden rounded-2xl border transition hover:border-[#f6b800] ${darkMode ? "border-white/10 bg-white/[.025]" : "border-black/8 bg-[#faf8f2]"}`}>
      <div className={`${wide ? "aspect-[16/8]" : "aspect-square"} relative overflow-hidden ${darkMode ? "bg-black" : "bg-white"}`}>{preview ? <img src={preview} alt="" className="h-full w-full object-cover transition group-hover:scale-[1.02]" /> : <div className="flex h-full items-center justify-center"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f6b800] text-xl font-black text-black">+</span></div>}</div>
      <div className="flex items-center justify-between gap-3 p-3"><div><p className="text-xs font-black">{label}</p><p className="mt-1 text-[10px] font-semibold opacity-50">{detail}</p></div><span className="rounded-lg bg-[#f6b800] px-3 py-2 text-[9px] font-black uppercase text-black">Change</span></div>
      <input type="file" accept="image/*" className="sr-only" onChange={onChange} />
    </label>
  );
}

function MetricCard({ label, value, hint, darkMode, accent = false }: { label: string; value: number; hint: string; darkMode: boolean; accent?: boolean }) {
  return <article className={`rounded-2xl border p-4 md:p-5 ${accent ? "border-[#f6b800]" : darkMode ? "border-white/10" : "border-black/10"} ${darkMode ? "bg-[#0b0b0b]" : "bg-white"}`}><div className="flex items-center justify-between"><p className={`text-[9px] font-black uppercase tracking-[.12em] ${darkMode ? "text-white/45" : "text-black/45"}`}>{label}</p><span className={`h-2 w-2 rounded-full ${accent ? "bg-[#f6b800]" : darkMode ? "bg-white/20" : "bg-black/15"}`} /></div><p className="mt-3 text-3xl font-black tracking-[-.04em]">{value}</p><p className={`mt-1 text-[10px] font-semibold ${darkMode ? "text-white/38" : "text-black/40"}`}>{hint}</p></article>;
}

function ActionTile({ title, body, onClick, darkMode }: { title: string; body: string; onClick: () => void; darkMode: boolean }) {
  return <button type="button" onClick={onClick} className={`rounded-2xl border p-4 text-left transition hover:border-[#f6b800] ${darkMode ? "border-white/10 bg-white/[.025]" : "border-black/8 bg-[#faf8f2]"}`}><div className="flex items-center justify-between gap-3"><p className="font-black">{title}</p><span className="text-lg text-[#c89200]">→</span></div><p className={`mt-2 text-xs font-semibold leading-5 ${darkMode ? "text-white/48" : "text-black/50"}`}>{body}</p></button>;
}

function InfoRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return <div className={`flex items-center justify-between gap-3 py-2.5 ${last ? "" : "border-b border-current/10"}`}><span className="text-xs font-semibold opacity-50">{label}</span><span className="text-xs font-black capitalize">{value}</span></div>;
}

function VehicleType({ title, body }: { title: string; body: string }) {
  return <div className="rounded-2xl border border-current/10 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f6b800] text-sm font-black text-black">LL</div><p className="mt-4 font-black">{title}</p><p className="mt-2 text-xs font-semibold leading-5 opacity-55">{body}</p></div>;
}

function BenefitCard({ title, body, surface, muted }: { title: string; body: string; surface: string; muted: string }) {
  return <div className={`rounded-[24px] border p-5 ${surface}`}><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f6b800] font-black text-black">✓</span><p className="mt-4 font-black">{title}</p><p className={`mt-2 text-xs font-semibold leading-5 ${muted}`}>{body}</p></div>;
}

function StatusChip({ value }: { value: string }) {
  return <span className="rounded-full border border-[#f6b800]/40 bg-[#f6b800]/10 px-2.5 py-1 text-[8px] font-black uppercase text-[#b88900]">{value || "pending"}</span>;
}
function StockChip({ value }: { value: string }) {
  const cls = value === "sold" ? "bg-black text-white" : value === "reserved" ? "bg-[#f6b800]/15 text-[#b27e00]" : "bg-emerald-500/12 text-emerald-600";
  return <span className={`rounded-full px-2.5 py-1 text-[8px] font-black uppercase ${cls}`}>{value}</span>;
}
function LeadChip({ value }: { value: string }) {
  return <span className={`rounded-full px-2.5 py-1 text-[8px] font-black uppercase ${value === "new" ? "bg-[#f6b800] text-black" : "bg-black/10 text-current"}`}>{value.replaceAll("_", " ")}</span>;
}
function EmptyState({ title, body, muted }: { title: string; body: string; muted: string }) {
  return <div className="p-7 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#f6b800] font-black text-black">LL</div><p className="mt-4 font-black">{title}</p><p className={`mx-auto mt-2 max-w-sm text-xs font-semibold leading-5 ${muted}`}>{body}</p></div>;
}
function DashboardIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>;
}
