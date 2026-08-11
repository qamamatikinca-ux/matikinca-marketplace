"use client";

import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthStatusButton from "@/components/AuthStatusButton";
import HomeLogoLink from "@/components/HomeLogoLink";
import LoadLinkLoading from "@/components/LoadLinkLoading";
import LoadLinkThemeToggle from "@/components/LoadLinkThemeToggle";
import SiteMenu from "@/components/SiteMenu";
import { getLoadLinkIntelligence } from "@/lib/loadlinkIntelligence";
import { inspectLoadLinkImage, showLoadLinkImageQuality } from "@/lib/loadlinkImageQuality";
import { createSafeRandomId, imageExtension, inferUploadContentType, prepareImageFileForForm, readableUploadError, validateImageFile } from "@/lib/mobilePosting";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type VehicleGroup = "Catering / Event" | "Trucks / Trailers" | "Farming / Mining";
const groups: VehicleGroup[] = ["Trucks / Trailers", "Catering / Event", "Farming / Mining"];
const cities = ["Johannesburg", "Pretoria", "Centurion", "Midrand", "Sandton", "Durban", "Cape Town", "Gqeberha", "East London", "Bloemfontein", "Polokwane", "Mbombela", "Rustenburg", "Kimberley", "Mthatha"];
const today = () => { const n = new Date(); return new Date(n.getTime() - n.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const cleanPhone = (v: string) => v.replace(/[^\d+]/g, "");
const validPhone = (v: string) => /^0\d{9}$/.test(cleanPhone(v)) || /^\+27\d{9}$/.test(cleanPhone(v));

function readablePostError(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object") {
    const candidate = error as { message?: unknown; details?: unknown; hint?: unknown; error?: unknown };
    for (const value of [candidate.message, candidate.details, candidate.hint, candidate.error]) {
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  }
  if (typeof error === "string" && error.trim() && error !== "[object Object]") return error.trim();
  return "LoadLink could not publish this post right now. Your information is still saved.";
}

export default function ListJobPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const isContract = searchParams.get("type") === "contract";
  const postName = isContract ? "contract" : "job";
  const postNameTitle = isContract ? "Contract" : "Job";
  const returnPath = isContract ? "/jobs/list?type=contract" : "/jobs/list";
  const draftVersion = isContract ? "loadlink-contract-draft-v273" : "loadlink-job-draft-v273";
  const submissionKeyPrefix = isContract ? "loadlink-contract-submission-id" : "loadlink-job-submission-id";

  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(1);
  const [group, setGroup] = useState<VehicleGroup>("Trucks / Trailers");
  const [vehicleNeeded, setVehicleNeeded] = useState("");
  const [neededOn, setNeededOn] = useState(today());
  const [city, setCity] = useState("Johannesburg");
  const [title, setTitle] = useState("");
  const [rate, setRate] = useState("");
  const [description, setDescription] = useState("");
  const [postedBy, setPostedBy] = useState("");
  const [contact, setContact] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submittedId, setSubmittedId] = useState("");
  const submission = useRef("");

  const surface = darkMode ? "border-white/10 bg-[#0c0c0c] text-white" : "border-black/10 bg-white text-black";
  const input = `h-13 w-full rounded-xl border px-4 text-sm font-semibold outline-none focus:border-[#f6b800] ${darkMode ? "border-white/12 bg-[#151515] text-white placeholder:text-white/30" : "border-black/10 bg-[#faf8f2] text-black placeholder:text-black/35"}`;

  useEffect(() => {
    void (async () => {
      if (!isSupabaseConfigured) { router.replace("/login"); return; }
      const intelligence = await getLoadLinkIntelligence();
      if (!intelligence.authenticated) { router.replace(`/login?returnTo=${encodeURIComponent(returnPath)}`); return; }
      if (["blocked", "suspended"].includes(intelligence.account_status)) setMessage(intelligence.account_reason || `You cannot post while this account is restricted.`);
      const { data: auth } = await supabase.auth.getUser();
      if (auth.user) {
        const profile = await supabase.from("profiles").select("full_name,company_name,phone").eq("id", auth.user.id).maybeSingle();
        setPostedBy(String(profile.data?.company_name || profile.data?.full_name || auth.user.user_metadata?.full_name || ""));
        setContact(String(profile.data?.phone || ""));
        const key = `${submissionKeyPrefix}:${auth.user.id}`;
        submission.current = localStorage.getItem(key) || createSafeRandomId();
        localStorage.setItem(key, submission.current);
        const draft = localStorage.getItem(`${draftVersion}:${auth.user.id}`);
        if (draft) try {
          const d = JSON.parse(draft);
          setGroup(d.group || "Trucks / Trailers"); setVehicleNeeded(d.vehicleNeeded || ""); setNeededOn(d.neededOn || today()); setCity(d.city || "Johannesburg"); setTitle(d.title || ""); setRate(d.rate || ""); setDescription(d.description || ""); setPostedBy(d.postedBy || profile.data?.company_name || profile.data?.full_name || ""); setContact(d.contact || profile.data?.phone || ""); setStep(Math.min(5, Math.max(1, Number(d.step || 1))));
        } catch { /* ignore damaged local draft */ }
      }
      setReady(true);
    })().catch(() => setReady(true));
  }, [draftVersion, returnPath, router, submissionKeyPrefix]);

  useEffect(() => {
    if (!ready) return;
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (!active || !data.user) return;
      localStorage.setItem(`${draftVersion}:${data.user.id}`, JSON.stringify({ group, vehicleNeeded, neededOn, city, title, rate, description, postedBy, contact, step }));
    });
    return () => { active = false; };
  }, [ready, draftVersion, group, vehicleNeeded, neededOn, city, title, rate, description, postedBy, contact, step]);

  async function photos(e: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || []).slice(0, 5);
    e.target.value = "";
    setMessage("");
    const next: File[] = [];
    const urls: string[] = [];
    try {
      for (let i = 0; i < selected.length; i += 1) {
        const source = selected[i];
        const validation = validateImageFile(source, source.name || `${postNameTitle} photo ${i + 1}`);
        if (validation) throw new Error(validation);
        const quality = await inspectLoadLinkImage(source);
        if (quality.messages.length) {
          const label = `Photo ${i + 1}${source.name ? ` (${source.name})` : ""}`;
          showLoadLinkImageQuality(quality.messages.map((item) => `${label}: ${item}`));
        }
        const prepared = await prepareImageFileForForm(source, { maxWidth: 1440, maxHeight: 1440, quality: .76, namePrefix: `loadlink-${postName}` });
        next.push(prepared.file);
        urls.push(prepared.previewUrl);
      }
      setFiles(next);
      setPreviews(urls);
    } catch (error) {
      setMessage(readableUploadError(error, "One selected photo could not be prepared."));
    }
  }

  function next() {
    setMessage("");
    if (step === 1 && !vehicleNeeded.trim()) return setMessage("Tell LoadLink what vehicle or mobile unit is needed.");
    if (step === 2 && (neededOn < today() || !city.trim())) return setMessage(neededOn < today() ? "That date has already passed. Choose today or a future date." : `Choose the ${postName} location.`);
    if (step === 3 && (!title.trim() || !description.trim())) return setMessage(`Add a short title and enough ${postName} detail for an operator to understand the work.`);
    if (step === 4 && (!postedBy.trim() || !validPhone(contact))) return setMessage(!postedBy.trim() ? "Add the contact or company name." : "Enter a valid South African contact number.");
    setStep((v) => Math.min(5, v + 1));
  }

  async function upload(userId: string) {
    const urls: string[] = [];
    for (let i = 0; i < files.length; i += 1) {
      const f = files[i];
      const type = inferUploadContentType(f);
      const path = `${userId}/${postName}s/${submission.current}/${i}.${imageExtension(type)}`;
      const r = await supabase.storage.from("job-photos").upload(path, f, { cacheControl: "3600", contentType: type, upsert: true });
      if (r.error) throw r.error;
      urls.push(supabase.storage.from("job-photos").getPublicUrl(path).data.publicUrl);
    }
    return urls;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setMessage("");
    try {
      const intelligence = await getLoadLinkIntelligence();
      if (!intelligence.authenticated) throw new Error(`Sign in to post this ${postName}.`);
      if (["blocked", "suspended"].includes(intelligence.account_status)) throw new Error(intelligence.account_reason || "You cannot post while this account is restricted.");
      if (neededOn < today()) throw new Error("That date has already passed. Choose today or a future date.");
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Your sign-in session needs to be refreshed.");
      const photoUrls = await upload(auth.user.id);
      const rpcName = isContract ? "loadlink_submit_contract" : "loadlink_submit_job";
      const r = await supabase.rpc(rpcName, { p_title: title.trim(), p_city: city.trim(), p_vehicle_group: group, p_vehicle_needed: vehicleNeeded.trim(), p_needed_on: neededOn, p_rate: rate.trim(), p_posted_by: postedBy.trim(), p_contact_number: contact.trim(), p_description: description.trim(), p_photos: photoUrls, p_client_request_id: submission.current });
      if (r.error) throw r.error;
      const result = r.data as { id?: string } | null;
      if (result?.id) setSubmittedId(String(result.id));
      localStorage.removeItem(`${draftVersion}:${auth.user.id}`);
      localStorage.removeItem(`${submissionKeyPrefix}:${auth.user.id}`);
      setSuccess(true);
      window.dispatchEvent(new Event("loadlink-account-state-changed"));
    } catch (error) {
      const raw = readablePostError(error);
      setMessage(/postgres|supabase|row level security|pgrst/i.test(raw) ? `LoadLink could not publish this ${postName} right now. Your information is still saved.` : raw);
    } finally {
      setSaving(false);
    }
  }

  if (!ready) return <main className={darkMode ? "min-h-screen bg-black text-white" : "min-h-screen bg-[#f4f0e7] text-black"}><LoadLinkLoading /></main>;

  if (success) return <main className={darkMode ? "min-h-screen bg-black text-white" : "min-h-screen bg-[#f4f0e7] text-black"}>
    <Header darkMode={darkMode} toggleTheme={toggleTheme} />
    <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-xl items-center px-4">
      <div className={`w-full rounded-[26px] border p-7 text-center ${surface}`}>
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f6b800] text-3xl font-black text-black">✓</div>
        <h1 className="mt-5 text-3xl font-black">{postNameTitle} submitted</h1>
        <p className="mt-2 text-xs font-semibold opacity-50">LoadLink received your {postName} and connected it to your account.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button onClick={() => router.push("/my-posts")} className="h-12 rounded-xl bg-[#f6b800] px-5 text-sm font-black text-black">Manage or edit post</button>
          <button onClick={() => router.push(submittedId ? `/listing/${submittedId}` : "/jobs")} className="h-12 rounded-xl border border-current/10 px-5 text-sm font-black">View {postName}</button>
        </div>
      </div>
    </div>
  </main>;

  return <main className={darkMode ? "min-h-screen bg-black text-white" : "min-h-screen bg-[#f4f0e7] text-black"}>
    <Header darkMode={darkMode} toggleTheme={toggleTheme} />
    <section className="border-b border-[#f6b800]/25 bg-black text-white">
      <div className="mx-auto max-w-3xl px-4 py-8"><h1 className="text-[40px] font-black tracking-[-.06em]">Post a {postName}</h1><p className="mt-2 text-xs font-semibold text-white/50">{isContract ? "Post the opportunity in a clear step-by-step flow." : "Job posting is free."}</p></div>
    </section>
    <form onSubmit={submit} className="mx-auto max-w-3xl px-4 py-6 pb-16">
      <div className="mb-2 flex items-center justify-between text-[10px] font-black"><span>Step {step} of 5</span><span className="opacity-40">{["Need", "Date & location", "Details", "Contact", "Review"][step - 1]}</span></div>
      <div className="mb-4 h-1 overflow-hidden rounded-full bg-current/10"><div className="h-full bg-[#f6b800] transition-[width] duration-200" style={{ width: `${step * 20}%` }} /></div>
      <section className={`rounded-[24px] border p-5 sm:p-7 ${surface}`}>
        {step === 1 ? <><h2 className="text-2xl font-black">What do you need?</h2><div className="mt-5 grid gap-3"><label><span className="mb-2 block text-[10px] font-black opacity-45">Category</span><select value={group} onChange={(e) => setGroup(e.target.value as VehicleGroup)} className={input}>{groups.map((x) => <option key={x}>{x}</option>)}</select></label><label><span className="mb-2 block text-[10px] font-black opacity-45">Vehicle or unit needed</span><input value={vehicleNeeded} onChange={(e) => setVehicleNeeded(e.target.value)} placeholder="e.g. Side tipper, Lowbed, Mobile fridge" className={input} /></label></div></> : null}
        {step === 2 ? <><h2 className="text-2xl font-black">When and where?</h2><div className="mt-5 grid gap-3 sm:grid-cols-2"><label><span className="mb-2 block text-[10px] font-black opacity-45">{isContract ? "Contract starts" : "Needed on"}</span><input type="date" data-loadlink-future-date="true" value={neededOn} min={today()} onChange={(e) => setNeededOn(e.target.value)} className={input} /></label><label><span className="mb-2 block text-[10px] font-black opacity-45">Location</span><input list="loadlink-job-cities" value={city} onChange={(e) => setCity(e.target.value)} className={input} /><datalist id="loadlink-job-cities">{cities.map((x) => <option key={x} value={x} />)}</datalist></label></div></> : null}
        {step === 3 ? <><h2 className="text-2xl font-black">{postNameTitle} details</h2><div className="mt-5 grid gap-3"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`Short ${postName} title`} className={input} /><input value={rate} onChange={(e) => setRate(e.target.value)} placeholder="Rate / budget — optional" className={input} /><textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={isContract ? "Scope, route, duration, requirements and anything an operator should know" : "Route, load, requirements and anything an operator should know"} className={`${input} min-h-36 py-4`} /></div></> : null}
        {step === 4 ? <><h2 className="text-2xl font-black">Contact</h2><div className="mt-5 grid gap-3 sm:grid-cols-2"><input value={postedBy} onChange={(e) => setPostedBy(e.target.value)} placeholder="Your name or company" className={input} /><input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="0821234567" className={input} /></div><label className="mt-4 block rounded-[18px] border border-current/10 p-4"><span className="text-xs font-black">Photos — optional</span><input type="file" accept="image/*" multiple onChange={photos} className="mt-3 block w-full text-xs" /></label>{previews.length ? <div className="mt-3 grid grid-cols-3 gap-2">{previews.map((u, i) => <div key={`${u}-${i}`} className="relative"><img src={u} alt={`Selected photo ${i + 1}`} className="aspect-square w-full rounded-xl object-cover" /><span className="absolute left-1.5 top-1.5 rounded-full bg-black/75 px-2 py-1 text-[8px] font-black text-white">Photo {i + 1}</span></div>)}</div> : null}</> : null}
        {step === 5 ? <><div className="flex items-center justify-between gap-3"><h2 className="text-2xl font-black">Review</h2><span className="text-[10px] font-semibold opacity-40">Check everything before submitting.</span></div><div className="mt-5 divide-y divide-current/10 rounded-[18px] border border-current/10"><Review label="Need" value={vehicleNeeded} onEdit={() => setStep(1)} /><Review label="Date" value={new Date(`${neededOn}T12:00:00`).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })} onEdit={() => setStep(2)} /><Review label="Location" value={city} onEdit={() => setStep(2)} /><Review label={postNameTitle} value={title} onEdit={() => setStep(3)} /><Review label="Rate" value={rate.trim() || "Negotiable"} onEdit={() => setStep(3)} /><Review label="Contact" value={`${postedBy} · ${contact}`} onEdit={() => setStep(4)} /><Review label="Photos" value={files.length ? `${files.length} selected` : "No photos"} onEdit={() => setStep(4)} /></div></> : null}
        {message ? <div className="mt-5 rounded-[16px] border border-[#f6b800]/35 bg-[#f6b800]/10 p-3 text-xs font-bold">{message}</div> : null}
        <div className="mt-6 flex gap-2">{step > 1 ? <button type="button" onClick={() => { setMessage(""); setStep((v) => v - 1); }} className="h-12 rounded-xl border border-current/10 px-5 text-xs font-black">Back</button> : null}{step < 5 ? <button type="button" onClick={next} className="h-12 flex-1 rounded-xl bg-[#f6b800] text-sm font-black text-black">Continue</button> : <button type="submit" disabled={saving} className="h-12 flex-1 rounded-xl bg-[#f6b800] text-sm font-black text-black disabled:opacity-45">{saving ? "Submitting…" : `Submit ${postName}`}</button>}</div>
      </section>
    </form>
  </main>;
}

function Header({ darkMode, toggleTheme }: { darkMode: boolean; toggleTheme: () => void }) {
  return <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />;
}

function Review({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return <div className="flex items-start justify-between gap-4 px-4 py-3"><span className="text-[9px] font-black uppercase opacity-35">{label}</span><div className="flex min-w-0 items-start gap-3"><span className="break-words text-right text-xs font-bold">{value || "—"}</span><button type="button" onClick={onEdit} className="shrink-0 text-[9px] font-black text-[#b88600] underline underline-offset-2">Edit</button></div></div>;
}
