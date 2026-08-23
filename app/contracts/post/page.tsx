"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import LoadLinkLoading from "@/components/LoadLinkLoading";
import { getLoadLinkIntelligence } from "@/lib/loadlinkIntelligence";
import { createSafeRandomId, imageExtension, inferUploadContentType, prepareImageFileForForm, readableUploadError, validateImageFile } from "@/lib/mobilePosting";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type VehicleGroup = "Catering / Event" | "Trucks / Trailers" | "Farming / Mining";
const groups: VehicleGroup[] = ["Trucks / Trailers", "Catering / Event", "Farming / Mining"];
const today = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const validPhone = (value: string) => /^0\d{9}$/.test(value.replace(/\D/g, "")) || /^27\d{9}$/.test(value.replace(/\D/g, ""));
const DRAFT = "loadlink-contract-draft-v20260823";

export default function PostContractPage() {
  const router = useRouter();
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(1);
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contact, setContact] = useState("");
  const [title, setTitle] = useState("");
  const [group, setGroup] = useState<VehicleGroup>("Trucks / Trailers");
  const [vehicleNeeded, setVehicleNeeded] = useState("");
  const [city, setCity] = useState("");
  const [startDate, setStartDate] = useState(today());
  const [duration, setDuration] = useState("");
  const [frequency, setFrequency] = useState("");
  const [rate, setRate] = useState("");
  const [applicationDeadline, setApplicationDeadline] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const requestId = useRef("");

  const page = darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black";
  const surface = darkMode ? "border-white/12 bg-white/[.045] text-white backdrop-blur-2xl" : "border-black/10 bg-white/[.62] text-black backdrop-blur-2xl";
  const input = `h-12 w-full rounded-[15px] border px-4 text-sm font-semibold outline-none ${darkMode ? "border-white/12 bg-white/[.045] text-white placeholder:text-white/30" : "border-black/10 bg-white/[.62] text-black placeholder:text-black/35"}`;
  const muted = darkMode ? "text-white/52" : "text-black/52";

  useEffect(() => {
    void (async () => {
      if (!isSupabaseConfigured) {
        window.location.replace(`/login?returnTo=${encodeURIComponent("/contracts/post")}`);
        return;
      }
      const intelligence = await getLoadLinkIntelligence();
      if (!intelligence.authenticated) {
        window.location.replace(`/login?returnTo=${encodeURIComponent("/contracts/post")}`);
        return;
      }
      const { data: auth } = await supabase.auth.getUser();
      if (auth.user) {
        requestId.current = localStorage.getItem(`${DRAFT}:request:${auth.user.id}`) || createSafeRandomId();
        localStorage.setItem(`${DRAFT}:request:${auth.user.id}`, requestId.current);
        const profile = await supabase.from("profiles").select("full_name,company_name,phone").eq("id", auth.user.id).maybeSingle();
        const defaultCompany = String(profile.data?.company_name || "");
        const defaultName = String(profile.data?.full_name || auth.user.user_metadata?.full_name || "");
        const defaultPhone = String(profile.data?.phone || "");
        setCompanyName(defaultCompany);
        setContactName(defaultName);
        setContact(defaultPhone);
        const stored = localStorage.getItem(`${DRAFT}:${auth.user.id}`);
        if (stored) {
          try {
            const draft = JSON.parse(stored);
            setCompanyName(draft.companyName || defaultCompany);
            setContactName(draft.contactName || defaultName);
            setContact(draft.contact || defaultPhone);
            setTitle(draft.title || ""); setGroup(draft.group || "Trucks / Trailers"); setVehicleNeeded(draft.vehicleNeeded || "");
            setCity(draft.city || ""); setStartDate(draft.startDate || today()); setDuration(draft.duration || ""); setFrequency(draft.frequency || "");
            setRate(draft.rate || ""); setApplicationDeadline(draft.applicationDeadline || ""); setDescription(draft.description || "");
            setStep(Math.min(5, Math.max(1, Number(draft.step || 1))));
          } catch {}
        }
      }
      setReady(true);
    })().catch(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    void supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      localStorage.setItem(`${DRAFT}:${data.user.id}`, JSON.stringify({ companyName, contactName, contact, title, group, vehicleNeeded, city, startDate, duration, frequency, rate, applicationDeadline, description, step }));
    });
  }, [ready, companyName, contactName, contact, title, group, vehicleNeeded, city, startDate, duration, frequency, rate, applicationDeadline, description, step]);

  async function choosePhotos(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files || []).slice(0, 5);
    event.target.value = "";
    setMessage("");
    const nextFiles: File[] = [];
    const nextPreviews: string[] = [];
    try {
      for (let index = 0; index < selected.length; index += 1) {
        const source = selected[index];
        const validation = validateImageFile(source, source.name || `Contract photo ${index + 1}`);
        if (validation) throw new Error(validation);
        const prepared = await prepareImageFileForForm(source, { maxWidth: 1440, maxHeight: 1440, quality: .78, namePrefix: "loadlink-contract" });
        nextFiles.push(prepared.file);
        nextPreviews.push(prepared.previewUrl);
      }
      setFiles(nextFiles); setPreviews(nextPreviews);
    } catch (error) {
      setMessage(readableUploadError(error, "One selected photo could not be prepared."));
    }
  }

  function next() {
    setMessage("");
    if (step === 1 && (!companyName.trim() || !contactName.trim() || !validPhone(contact))) {
      setMessage(!companyName.trim() ? "Add the company or contracting business name." : !contactName.trim() ? "Add a contact person." : "Enter a valid South African contact number.");
      return;
    }
    if (step === 2 && (!title.trim() || !vehicleNeeded.trim() || !description.trim())) {
      setMessage("Add a contract title, the required vehicle/service and the work scope.");
      return;
    }
    if (step === 3 && (!city.trim() || !startDate || startDate < today() || !duration.trim() || !frequency.trim())) {
      setMessage("Add the operating location, a valid start date, contract duration and work frequency.");
      return;
    }
    if (step === 4 && applicationDeadline && applicationDeadline < today()) {
      setMessage("The application or decision deadline cannot be in the past.");
      return;
    }
    setStep((value) => Math.min(5, value + 1));
  }

  async function upload(userId: string) {
    const urls: string[] = [];
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const type = inferUploadContentType(file);
      const path = `${userId}/contracts/${requestId.current}/${index}.${imageExtension(type)}`;
      const result = await supabase.storage.from("job-photos").upload(path, file, { cacheControl: "3600", contentType: type, upsert: true });
      if (result.error) throw result.error;
      urls.push(supabase.storage.from("job-photos").getPublicUrl(path).data.publicUrl);
    }
    return urls;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving || submitted) return;
    setSaving(true); setMessage("");
    try {
      const intelligence = await getLoadLinkIntelligence();
      if (!intelligence.authenticated) throw new Error("Sign in to post this contract.");
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Your sign-in session needs to be refreshed.");
      const photos = await upload(auth.user.id);
      const structuredDescription = [
        `Company: ${companyName.trim()}`,
        `Contact person: ${contactName.trim()}`,
        `Contract duration: ${duration.trim()}`,
        `Frequency: ${frequency.trim()}`,
        applicationDeadline ? `Application / decision deadline: ${applicationDeadline}` : "",
        "",
        description.trim(),
      ].filter(Boolean).join("\n");
      const result = await supabase.rpc("loadlink_submit_contract", {
        p_title: title.trim(),
        p_city: city.trim(),
        p_vehicle_group: group,
        p_vehicle_needed: vehicleNeeded.trim(),
        p_needed_on: startDate,
        p_rate: rate.trim(),
        p_posted_by: companyName.trim(),
        p_contact_number: contact.trim(),
        p_description: structuredDescription,
        p_photos: photos,
        p_client_request_id: requestId.current,
      });
      if (result.error) throw result.error;
      localStorage.removeItem(`${DRAFT}:${auth.user.id}`);
      localStorage.removeItem(`${DRAFT}:request:${auth.user.id}`);
      setSubmitted(true);
      window.dispatchEvent(new CustomEvent("loadlink:toast", { detail: { kind: "success", title: "Contract submitted", message: "LoadLink received the contract and is opening My Posts.", duration: 5200 } }));
      window.setTimeout(() => router.replace("/my-posts"), 850);
    } catch (error) {
      const raw = error instanceof Error ? error.message : String((error as { message?: unknown })?.message || "");
      setMessage(/postgres|supabase|row level security|pgrst/i.test(raw) ? "LoadLink could not publish this contract right now. Your information is still saved." : raw || "The contract could not be submitted.");
    } finally {
      setSaving(false);
    }
  }

  if (!ready) return <main className={`min-h-screen ${page}`}><LoadLinkLoading /></main>;
  const labels = ["Company", "Scope", "Timeline", "Commercial", "Review"];

  return (
    <main className={`min-h-screen ${page}`} data-loadlink-contract-post="20260823">
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />
      <section className="mx-auto max-w-3xl px-4 pb-16 pt-7 sm:px-5 sm:pt-10">
        <div className="mb-6"><p className={`text-[10px] font-black uppercase tracking-[.14em] ${muted}`}>Contract opportunity</p><h1 className="mt-2 text-[38px] font-black tracking-[-.055em] sm:text-[46px]">Post a contract</h1><p className={`mt-2 max-w-xl text-sm font-semibold leading-6 ${muted}`}>A contract has different requirements from a once-off job. Add the business, scope, operating period and commercial details clearly.</p></div>
        <form onSubmit={submit}>
          <div className={`mb-3 flex items-center justify-between text-[10px] font-black ${muted}`}><span>Step {step} of 5</span><span>{labels[step - 1]}</span></div>
          <div className={`mb-5 h-1 overflow-hidden rounded-full ${darkMode ? "bg-white/10" : "bg-black/8"}`}><div className={darkMode ? "h-full rounded-full bg-white transition-[width]" : "h-full rounded-full bg-black transition-[width]"} style={{ width: `${step * 20}%` }} /></div>
          <section className={`rounded-[30px] border p-5 sm:p-7 ${surface}`}>
            {step === 1 ? <><h2 className="text-2xl font-black">Who is offering the contract?</h2><p className={`mt-2 text-xs font-semibold ${muted}`}>Use the company or contracting business name operators should recognise.</p><div className="mt-5 grid gap-4"><Field label="Company name"><input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Company or contracting business" className={input} /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Contact person"><input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Full name" className={input} /></Field><Field label="Contact number"><input value={contact} onChange={(e) => setContact(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="0821234567" className={input} /></Field></div></div></> : null}
            {step === 2 ? <><h2 className="text-2xl font-black">Contract scope</h2><p className={`mt-2 text-xs font-semibold ${muted}`}>Describe what work is being awarded and what equipment or service is required.</p><div className="mt-5 grid gap-4"><Field label="Contract title"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 12-month side tipper transport contract" className={input} /></Field><Field label="Category"><select value={group} onChange={(e) => setGroup(e.target.value as VehicleGroup)} className={input}>{groups.map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Vehicle or service required"><input value={vehicleNeeded} onChange={(e) => setVehicleNeeded(e.target.value)} placeholder="e.g. 34-ton side tippers" className={input} /></Field><Field label="Scope and requirements"><textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Routes, cargo/service, capacity, compliance requirements, number of units and what operators need to deliver" className={`${input} min-h-36 resize-y py-4`} /></Field></div></> : null}
            {step === 3 ? <><h2 className="text-2xl font-black">Timeline and location</h2><p className={`mt-2 text-xs font-semibold ${muted}`}>Set the operating area and how long/frequently the contract will run.</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Operating location"><input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City, route or province" className={input} /></Field><Field label="Contract starts"><input type="date" min={today()} value={startDate} onChange={(e) => setStartDate(e.target.value)} className={input} /></Field><Field label="Duration"><input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 12 months" className={input} /></Field><Field label="Frequency"><input value={frequency} onChange={(e) => setFrequency(e.target.value)} placeholder="e.g. 5 trips per week" className={input} /></Field></div></> : null}
            {step === 4 ? <><h2 className="text-2xl font-black">Commercial details</h2><p className={`mt-2 text-xs font-semibold ${muted}`}>Give operators enough information to decide whether the opportunity fits.</p><div className="mt-5 grid gap-4"><Field label="Rate / budget / tender terms"><input value={rate} onChange={(e) => setRate(e.target.value)} inputMode="decimal" placeholder="e.g. R28/km, R180 000/month or tender terms" className={input} /></Field><Field label="Application or decision deadline — optional"><input type="date" min={today()} value={applicationDeadline} onChange={(e) => setApplicationDeadline(e.target.value)} className={input} /></Field><label className={`block rounded-[20px] border p-4 ${darkMode ? "border-white/12" : "border-black/8"}`}><span className="text-xs font-black">Supporting photos — optional</span><span className={`mt-1 block text-[10px] font-semibold ${muted}`}>Up to 5 relevant images.</span><input type="file" accept="image/*" multiple onChange={choosePhotos} className="mt-3 block w-full text-xs" /></label>{previews.length ? <div className="grid grid-cols-3 gap-2">{previews.map((url, index) => <img key={url} src={url} alt={`Selected contract photo ${index + 1}`} className="aspect-square w-full rounded-[16px] object-cover" />)}</div> : null}</div></> : null}
            {step === 5 ? <><h2 className="text-2xl font-black">Review contract</h2><p className={`mt-2 text-xs font-semibold ${muted}`}>Check the opportunity before submitting it to LoadLink.</p><div className={`mt-5 divide-y rounded-[20px] border ${darkMode ? "divide-white/10 border-white/10" : "divide-black/8 border-black/8"}`}><Review label="Company" value={companyName} /><Review label="Contact" value={`${contactName} · ${contact}`} /><Review label="Contract" value={title} /><Review label="Requirement" value={vehicleNeeded} /><Review label="Start" value={`${startDate} · ${duration}`} /><Review label="Frequency" value={frequency} /><Review label="Location" value={city} /><Review label="Terms" value={rate || "Not specified"} /></div></> : null}
            {message ? <div role="status" className={`mt-5 rounded-[17px] border px-4 py-3 text-xs font-bold ${darkMode ? "border-white/14 bg-white/[.05]" : "border-black/10 bg-black/[.035]"}`}>{message}</div> : null}
            <div className="mt-6 flex gap-2">{step > 1 ? <button type="button" onClick={() => { setMessage(""); setStep((value) => value - 1); }} className={`h-12 rounded-[16px] border px-5 text-xs font-black ${darkMode ? "border-white/14" : "border-black/10"}`}>Back</button> : null}{step < 5 ? <button type="button" onClick={next} className={darkMode ? "h-12 flex-1 rounded-[16px] bg-white text-sm font-black text-black" : "h-12 flex-1 rounded-[16px] bg-black text-sm font-black text-white"}>Continue</button> : <button type="submit" disabled={saving || submitted} className={darkMode ? "h-12 flex-1 rounded-[16px] bg-white text-sm font-black text-black disabled:opacity-45" : "h-12 flex-1 rounded-[16px] bg-black text-sm font-black text-white disabled:opacity-45"}>{submitted ? "Submitted" : saving ? "Submitting…" : "Submit contract"}</button>}</div>
          </section>
        </form>
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-[10px] font-black uppercase tracking-[.08em] opacity-48">{label}</span>{children}</label>;
}
function Review({ label, value }: { label: string; value: string }) {
  return <div className="grid grid-cols-[88px_1fr] gap-3 px-4 py-3.5"><span className="text-[10px] font-black uppercase opacity-40">{label}</span><span className="min-w-0 text-xs font-semibold">{value}</span></div>;
}
