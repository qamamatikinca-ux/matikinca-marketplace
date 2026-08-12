"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import LoadLinkIcon from "@/components/LoadLinkIcon";
import LoadLinkLoading from "@/components/LoadLinkLoading";
import { loginHref } from "@/lib/auth";
import { getLoadLinkIntelligence } from "@/lib/loadlinkIntelligence";
import { inspectLoadLinkImage, showLoadLinkImageQuality } from "@/lib/loadlinkImageQuality";
import {
  createSafeRandomId,
  imageExtension,
  inferUploadContentType,
  prepareImageFileForForm,
  readableUploadError,
  validateImageFile,
} from "@/lib/mobilePosting";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type VehicleGroup = "Catering / Event" | "Trucks / Trailers" | "Farming / Mining";
const groups: VehicleGroup[] = ["Trucks / Trailers", "Catering / Event", "Farming / Mining"];
const cities = ["Johannesburg", "Pretoria", "Centurion", "Midrand", "Sandton", "Durban", "Cape Town", "Gqeberha", "East London", "Bloemfontein", "Polokwane", "Mbombela", "Rustenburg", "Kimberley", "Mthatha"];
const today = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const cleanPhone = (value: string) => value.replace(/[^\d+]/g, "");
const validPhone = (value: string) => /^0\d{9}$/.test(cleanPhone(value)) || /^\+27\d{9}$/.test(cleanPhone(value));

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
  const draftVersion = isContract ? "loadlink-contract-draft-v282" : "loadlink-job-draft-v282";
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
  const [submitted, setSubmitted] = useState(false);
  const submission = useRef("");

  const page = darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black";
  const surface = darkMode
    ? "border-white/12 bg-white/[.045] text-white shadow-[0_24px_80px_rgba(0,0,0,.26)] backdrop-blur-2xl"
    : "border-white/75 bg-white/[.56] text-black shadow-[0_22px_70px_rgba(43,31,8,.08)] backdrop-blur-2xl";
  const input = `h-12 w-full rounded-[15px] border px-4 text-sm font-semibold outline-none transition focus:border-[#f6b800] ${darkMode ? "border-white/12 bg-white/[.045] text-white placeholder:text-white/30" : "border-black/10 bg-white/[.46] text-black placeholder:text-black/35"}`;
  const muted = darkMode ? "text-white/52" : "text-black/52";

  useEffect(() => {
    void (async () => {
      if (!isSupabaseConfigured) {
        window.location.assign(loginHref(returnPath));
        return;
      }
      const intelligence = await getLoadLinkIntelligence();
      if (!intelligence.authenticated) {
        window.location.assign(loginHref(returnPath));
        return;
      }
      if (["blocked", "suspended"].includes(intelligence.account_status)) {
        setMessage(intelligence.account_reason || "You cannot post while this account is restricted.");
      }
      const { data: auth } = await supabase.auth.getUser();
      if (auth.user) {
        const profile = await supabase.from("profiles").select("full_name,company_name,phone").eq("id", auth.user.id).maybeSingle();
        const name = String(profile.data?.company_name || profile.data?.full_name || auth.user.user_metadata?.full_name || "");
        const phone = String(profile.data?.phone || "");
        setPostedBy(name);
        setContact(phone);
        const submissionKey = `${submissionKeyPrefix}:${auth.user.id}`;
        submission.current = localStorage.getItem(submissionKey) || createSafeRandomId();
        localStorage.setItem(submissionKey, submission.current);
        const draft = localStorage.getItem(`${draftVersion}:${auth.user.id}`);
        if (draft) {
          try {
            const data = JSON.parse(draft);
            setGroup(data.group || "Trucks / Trailers");
            setVehicleNeeded(data.vehicleNeeded || "");
            setNeededOn(data.neededOn || today());
            setCity(data.city || "Johannesburg");
            setTitle(data.title || "");
            setRate(data.rate || "");
            setDescription(data.description || "");
            setPostedBy(data.postedBy || name);
            setContact(data.contact || phone);
            setStep(Math.min(5, Math.max(1, Number(data.step || 1))));
          } catch { /* ignore a damaged local draft */ }
        }
      }
      setReady(true);
    })().catch(() => setReady(true));
  }, [draftVersion, returnPath, submissionKeyPrefix]);

  useEffect(() => {
    if (!ready) return;
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (!active || !data.user) return;
      localStorage.setItem(`${draftVersion}:${data.user.id}`, JSON.stringify({ group, vehicleNeeded, neededOn, city, title, rate, description, postedBy, contact, step }));
    });
    return () => { active = false; };
  }, [ready, draftVersion, group, vehicleNeeded, neededOn, city, title, rate, description, postedBy, contact, step]);

  async function photos(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files || []).slice(0, 5);
    event.target.value = "";
    setMessage("");
    const nextFiles: File[] = [];
    const urls: string[] = [];
    try {
      for (let index = 0; index < selectedFiles.length; index += 1) {
        const source = selectedFiles[index];
        const validation = validateImageFile(source, source.name || `${postNameTitle} photo ${index + 1}`);
        if (validation) throw new Error(validation);
        const quality = await inspectLoadLinkImage(source);
        if (quality.messages.length) {
          const label = `Photo ${index + 1}${source.name ? ` (${source.name})` : ""}`;
          showLoadLinkImageQuality(quality.messages.map((item) => `${label}: ${item}`));
        }
        const prepared = await prepareImageFileForForm(source, { maxWidth: 1440, maxHeight: 1440, quality: .76, namePrefix: `loadlink-${postName}` });
        nextFiles.push(prepared.file);
        urls.push(prepared.previewUrl);
      }
      setFiles(nextFiles);
      setPreviews(urls);
    } catch (error) {
      setMessage(readableUploadError(error, "One selected photo could not be prepared."));
    }
  }

  function next() {
    setMessage("");
    if (step === 1 && !vehicleNeeded.trim()) {
      setMessage("Tell LoadLink what vehicle or mobile unit is needed.");
      return;
    }
    if (step === 2 && (!neededOn || neededOn < today() || !city.trim())) {
      setMessage(!neededOn ? "Choose the date this is needed." : neededOn < today() ? "That date has already passed. Choose today or a future date." : `Choose the ${postName} location.`);
      return;
    }
    if (step === 3 && (!title.trim() || !description.trim())) {
      setMessage(`Add a short title and enough ${postName} detail for an operator to understand the work.`);
      return;
    }
    if (step === 4 && (!postedBy.trim() || !validPhone(contact))) {
      setMessage(!postedBy.trim() ? "Add the contact or company name." : "Enter a valid South African contact number.");
      return;
    }
    setStep((value) => Math.min(5, value + 1));
  }

  async function upload(userId: string) {
    const urls: string[] = [];
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const type = inferUploadContentType(file);
      const path = `${userId}/${postName}s/${submission.current}/${index}.${imageExtension(type)}`;
      const result = await supabase.storage.from("job-photos").upload(path, file, { cacheControl: "3600", contentType: type, upsert: true });
      if (result.error) throw result.error;
      urls.push(supabase.storage.from("job-photos").getPublicUrl(path).data.publicUrl);
    }
    return urls;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving || submitted) return;
    setSaving(true);
    setMessage("");
    window.dispatchEvent(new CustomEvent("loadlink:toast", { detail: { id: "loadlink-post-submit", kind: "progress", title: `Submitting ${postName}`, message: "LoadLink is publishing your details securely.", progress: 42 } }));
    try {
      const intelligence = await getLoadLinkIntelligence();
      if (!intelligence.authenticated) throw new Error(`Sign in to post this ${postName}.`);
      if (["blocked", "suspended"].includes(intelligence.account_status)) throw new Error(intelligence.account_reason || "You cannot post while this account is restricted.");
      if (!neededOn || neededOn < today()) throw new Error("Choose today or a future date.");
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Your sign-in session needs to be refreshed.");
      const photoUrls = await upload(auth.user.id);
      const rpcName = isContract ? "loadlink_submit_contract" : "loadlink_submit_job";
      const result = await supabase.rpc(rpcName, {
        p_title: title.trim(),
        p_city: city.trim(),
        p_vehicle_group: group,
        p_vehicle_needed: vehicleNeeded.trim(),
        p_needed_on: neededOn,
        p_rate: rate.trim(),
        p_posted_by: postedBy.trim(),
        p_contact_number: contact.trim(),
        p_description: description.trim(),
        p_photos: photoUrls,
        p_client_request_id: submission.current,
      });
      if (result.error) throw result.error;
      localStorage.removeItem(`${draftVersion}:${auth.user.id}`);
      localStorage.removeItem(`${submissionKeyPrefix}:${auth.user.id}`);
      setSubmitted(true);
      window.dispatchEvent(new CustomEvent("loadlink:toast", { detail: { id: "loadlink-post-submit", kind: "success", title: `${postNameTitle} submitted`, message: `LoadLink received your ${postName}. Opening My Posts so you can view or edit it.`, duration: 5600 } }));
      window.dispatchEvent(new Event("loadlink-account-state-changed"));
      window.setTimeout(() => router.replace("/my-posts"), 850);
    } catch (error) {
      const raw = readablePostError(error);
      setMessage(/postgres|supabase|row level security|pgrst/i.test(raw) ? `LoadLink could not publish this ${postName} right now. Your information is still saved.` : raw);
      window.dispatchEvent(new CustomEvent("loadlink:toast", { detail: { id: "loadlink-post-submit", kind: "error", title: `${postNameTitle} not submitted`, message: "Your information is still saved. Review the message on this page and try again.", duration: 6500 } }));
    } finally {
      setSaving(false);
    }
  }

  if (!ready) return <main className={`min-h-screen ${page}`}><LoadLinkLoading /></main>;

  const labels = ["Need", "Date & location", "Details", "Contact", "Review"];

  return (
    <main className={`min-h-screen ${page}`} style={{ backgroundImage: darkMode ? "radial-gradient(circle at 92% 12%,rgba(246,184,0,.07),transparent 26%)" : "radial-gradient(circle at 92% 10%,rgba(246,184,0,.10),transparent 24%)" }}>
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />
      <section className="mx-auto max-w-3xl px-4 pb-16 pt-7 sm:px-5 sm:pt-10">
        <div className="mb-6">
          <p className={`text-[10px] font-black uppercase tracking-[.14em] ${darkMode ? "text-[#f6b800]" : "text-[#9a7000]"}`}>{isContract ? "Contract opportunity" : "LoadLink jobs"}</p>
          <h1 className="mt-2 text-[38px] font-black tracking-[-.055em] sm:text-[44px]">Post a {postName}</h1>
          <p className={`mt-2 max-w-xl text-sm font-semibold leading-6 ${muted}`}>{isContract ? "Add the opportunity in five clear steps." : "Job posting is free. Add what you need and when you need it."}</p>
        </div>

        <form onSubmit={submit}>
          <div className={`mb-3 flex items-center justify-between text-[10px] font-black ${muted}`}><span>Step {step} of 5</span><span>{labels[step - 1]}</span></div>
          <div className={`mb-5 h-1 overflow-hidden rounded-full ${darkMode ? "bg-white/10" : "bg-black/8"}`}><div className="h-full rounded-full bg-[#f6b800] transition-[width] duration-300" style={{ width: `${step * 20}%` }} /></div>

          <section className={`rounded-[30px] border p-5 sm:p-7 ${surface}`}>
            {step === 1 ? (
              <>
                <h2 className="text-2xl font-black tracking-[-.035em]">What do you need?</h2>
                <p className={`mt-2 text-xs font-semibold ${muted}`}>Choose the category and tell operators what vehicle or mobile unit is required.</p>
                <div className="mt-5 grid gap-4">
                  <Field label="Category"><select value={group} onChange={(event) => setGroup(event.target.value as VehicleGroup)} className={input}>{groups.map((item) => <option key={item}>{item}</option>)}</select></Field>
                  <Field label="Vehicle or unit needed"><input value={vehicleNeeded} onChange={(event) => setVehicleNeeded(event.target.value)} placeholder="e.g. Side tipper, lowbed, mobile fridge" className={input} /></Field>
                </div>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <h2 className="text-2xl font-black tracking-[-.035em]">When and where?</h2>
                <p className={`mt-2 text-xs font-semibold ${muted}`}>Choose the date from the LoadLink calendar and add the operating location.</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field label={isContract ? "Contract starts" : "Needed on"}>
                    <span className="relative block">
                      <input type="date" data-loadlink-future-date="true" value={neededOn} min={today()} onChange={(event) => setNeededOn(event.target.value)} className={`${input} pr-12`} />
                      <span className={`pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 ${darkMode ? "text-[#f6b800]" : "text-[#8d6800]"}`}><LoadLinkIcon name="calendar" size={19} /></span>
                    </span>
                  </Field>
                  <Field label="Location"><input list="loadlink-job-cities" value={city} onChange={(event) => setCity(event.target.value)} className={input} /><datalist id="loadlink-job-cities">{cities.map((item) => <option key={item} value={item} />)}</datalist></Field>
                </div>
              </>
            ) : null}

            {step === 3 ? (
              <>
                <h2 className="text-2xl font-black tracking-[-.035em]">{postNameTitle} details</h2>
                <p className={`mt-2 text-xs font-semibold ${muted}`}>Keep it clear enough for an operator to decide whether the work suits them.</p>
                <div className="mt-5 grid gap-4">
                  <Field label={`${postNameTitle} title`}><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={`Short ${postName} title`} className={input} /></Field>
                  <Field label="Rate or budget — optional"><input value={rate} onChange={(event) => setRate(event.target.value)} inputMode="decimal" placeholder="e.g. R18 000 or R28/km" className={input} /></Field>
                  <Field label="Details"><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder={isContract ? "Scope, route, duration, requirements and anything an operator should know" : "Route, load, requirements and anything an operator should know"} className={`${input} min-h-36 resize-y py-4`} /></Field>
                </div>
              </>
            ) : null}

            {step === 4 ? (
              <>
                <h2 className="text-2xl font-black tracking-[-.035em]">Contact</h2>
                <p className={`mt-2 text-xs font-semibold ${muted}`}>Use the person or company operators should contact about this {postName}.</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field label="Name or company"><input value={postedBy} onChange={(event) => setPostedBy(event.target.value)} placeholder="Your name or company" className={input} /></Field>
                  <Field label="Contact number"><input value={contact} onChange={(event) => setContact(event.target.value)} inputMode="tel" autoComplete="tel" placeholder="0821234567" className={input} /></Field>
                </div>
                <label className={`mt-5 block rounded-[20px] border p-4 ${darkMode ? "border-white/12 bg-white/[.025]" : "border-black/8 bg-white/[.30]"}`}>
                  <span className="text-xs font-black">Photos — optional</span>
                  <span className={`mt-1 block text-[10px] font-semibold ${muted}`}>Up to 5 clear images.</span>
                  <input type="file" accept="image/*" multiple onChange={photos} className="mt-3 block w-full text-xs" />
                </label>
                {previews.length ? <div className="mt-3 grid grid-cols-3 gap-2">{previews.map((url, index) => <div key={`${url}-${index}`} className="relative"><img src={url} alt={`Selected photo ${index + 1}`} className="aspect-square w-full rounded-[16px] object-cover" /><span className="absolute left-1.5 top-1.5 rounded-full bg-black/75 px-2 py-1 text-[8px] font-black text-white">Photo {index + 1}</span></div>)}</div> : null}
              </>
            ) : null}

            {step === 5 ? (
              <>
                <div className="flex items-end justify-between gap-3"><div><h2 className="text-2xl font-black tracking-[-.035em]">Review</h2><p className={`mt-2 text-xs font-semibold ${muted}`}>Check everything before submitting.</p></div></div>
                <div className={`mt-5 divide-y rounded-[20px] border ${darkMode ? "divide-white/10 border-white/10 bg-white/[.02]" : "divide-black/8 border-black/8 bg-white/[.26]"}`}>
                  <Review label="Need" value={vehicleNeeded} onEdit={() => setStep(1)} />
                  <Review label="Date" value={neededOn ? new Date(`${neededOn}T12:00:00`).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) : "Not selected"} onEdit={() => setStep(2)} />
                  <Review label="Location" value={city} onEdit={() => setStep(2)} />
                  <Review label={postNameTitle} value={title} onEdit={() => setStep(3)} />
                  <Review label="Rate" value={rate.trim() || "Negotiable"} onEdit={() => setStep(3)} />
                  <Review label="Contact" value={`${postedBy} · ${contact}`} onEdit={() => setStep(4)} />
                  <Review label="Photos" value={files.length ? `${files.length} selected` : "No photos"} onEdit={() => setStep(4)} />
                </div>
              </>
            ) : null}

            {message ? <div role="status" className={`mt-5 rounded-[17px] border px-4 py-3 text-xs font-bold ${darkMode ? "border-[#f6b800]/28 bg-[#f6b800]/[.07] text-white/82" : "border-[#b98b00]/25 bg-[#f6b800]/[.08] text-black/70"}`}>{message}</div> : null}

            <div className="mt-6 flex gap-2">
              {step > 1 ? <button type="button" onClick={() => { setMessage(""); setStep((value) => value - 1); }} className={`h-12 rounded-[16px] border px-5 text-xs font-black ${darkMode ? "border-white/14 bg-white/[.035]" : "border-black/10 bg-white/[.30]"}`}>Back</button> : null}
              {step < 5 ? <button type="button" onClick={next} className="h-12 flex-1 rounded-[16px] bg-[#f6b800] text-sm font-black text-black transition active:scale-[.99]">Continue</button> : <button type="submit" disabled={saving || submitted} className="h-12 flex-1 rounded-[16px] bg-[#f6b800] text-sm font-black text-black disabled:opacity-45">{submitted ? "Submitted" : saving ? "Submitting…" : `Submit ${postName}`}</button>}
            </div>
          </section>
        </form>
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-[10px] font-black uppercase tracking-[.08em] opacity-48">{label}</span>{children}</label>;
}

function Review({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return <div className="grid grid-cols-[88px_1fr_auto] items-center gap-3 px-4 py-3.5"><span className="text-[10px] font-black uppercase opacity-40">{label}</span><span className="min-w-0 truncate text-xs font-semibold">{value}</span><button type="button" onClick={onEdit} className="text-[10px] font-black text-[#a47700] underline underline-offset-4">Edit</button></div>;
}
