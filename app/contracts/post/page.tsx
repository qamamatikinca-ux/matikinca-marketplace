"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import LoadLinkLoading from "@/components/LoadLinkLoading";
import { loginHref } from "@/lib/auth";
import { getLoadLinkIntelligence } from "@/lib/loadlinkIntelligence";
import { inspectLoadLinkImage, showLoadLinkImageQuality } from "@/lib/loadlinkImageQuality";
import { createSafeRandomId, imageExtension, inferUploadContentType, prepareImageFileForForm, readableUploadError, validateImageFile } from "@/lib/mobilePosting";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type VehicleGroup = "Catering / Event" | "Trucks / Trailers" | "Farming / Mining";
const groups: VehicleGroup[] = ["Trucks / Trailers", "Catering / Event", "Farming / Mining"];
const today = () => { const now = new Date(); return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const cleanPhone = (value: string) => value.replace(/[^\d+]/g, "");
const validPhone = (value: string) => /^0\d{9}$/.test(cleanPhone(value)) || /^\+27\d{9}$/.test(cleanPhone(value));

export default function PostContractPage() {
  const router = useRouter();
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(1);
  const [companyName, setCompanyName] = useState("");
  const [contractTitle, setContractTitle] = useState("");
  const [contractType, setContractType] = useState("Recurring transport");
  const [group, setGroup] = useState<VehicleGroup>("Trucks / Trailers");
  const [serviceRequired, setServiceRequired] = useState("");
  const [vehicleNeeded, setVehicleNeeded] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState(today());
  const [term, setTerm] = useState("");
  const [frequency, setFrequency] = useState("");
  const [rate, setRate] = useState("");
  const [decisionDeadline, setDecisionDeadline] = useState("");
  const [description, setDescription] = useState("");
  const [contactName, setContactName] = useState("");
  const [contact, setContact] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const submission = useRef("");

  const page = darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black";
  const surface = darkMode ? "border-white/12 bg-white/[.045] text-white backdrop-blur-2xl" : "border-white/75 bg-white/[.62] text-black backdrop-blur-2xl";
  const input = `h-12 w-full rounded-[15px] border px-4 text-base font-semibold outline-none transition focus:border-[#f6b800] ${darkMode ? "border-white/12 bg-white/[.045] text-white placeholder:text-white/30" : "border-black/10 bg-white/70 text-black placeholder:text-black/35"}`;
  const muted = darkMode ? "text-white/52" : "text-black/52";
  const draft = "loadlink-contract-business-draft-v1";

  useEffect(() => {
    void (async () => {
      if (!isSupabaseConfigured) { window.location.assign(loginHref("/contracts/post")); return; }
      const intelligence = await getLoadLinkIntelligence();
      if (!intelligence.authenticated) { window.location.assign(loginHref("/contracts/post")); return; }
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { window.location.assign(loginHref("/contracts/post")); return; }
      const profile = await supabase.from("profiles").select("full_name,company_name,phone").eq("id", auth.user.id).maybeSingle();
      setCompanyName(String(profile.data?.company_name || auth.user.user_metadata?.company_name || ""));
      setContactName(String(profile.data?.full_name || auth.user.user_metadata?.full_name || ""));
      setContact(String(profile.data?.phone || ""));
      submission.current = localStorage.getItem(`loadlink-contract-submission:${auth.user.id}`) || createSafeRandomId();
      localStorage.setItem(`loadlink-contract-submission:${auth.user.id}`, submission.current);
      const saved = localStorage.getItem(`${draft}:${auth.user.id}`);
      if (saved) {
        try {
          const data = JSON.parse(saved);
          setCompanyName(data.companyName || String(profile.data?.company_name || "")); setContractTitle(data.contractTitle || ""); setContractType(data.contractType || "Recurring transport"); setGroup(data.group || "Trucks / Trailers"); setServiceRequired(data.serviceRequired || ""); setVehicleNeeded(data.vehicleNeeded || ""); setLocation(data.location || ""); setStartDate(data.startDate || today()); setTerm(data.term || ""); setFrequency(data.frequency || ""); setRate(data.rate || ""); setDecisionDeadline(data.decisionDeadline || ""); setDescription(data.description || ""); setContactName(data.contactName || String(profile.data?.full_name || "")); setContact(data.contact || String(profile.data?.phone || "")); setStep(Math.max(1, Math.min(5, Number(data.step || 1))));
        } catch {}
      }
      setReady(true);
    })().catch(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    void supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      localStorage.setItem(`${draft}:${data.user.id}`, JSON.stringify({ companyName, contractTitle, contractType, group, serviceRequired, vehicleNeeded, location, startDate, term, frequency, rate, decisionDeadline, description, contactName, contact, step }));
    });
  }, [ready, companyName, contractTitle, contractType, group, serviceRequired, vehicleNeeded, location, startDate, term, frequency, rate, decisionDeadline, description, contactName, contact, step]);

  async function choosePhotos(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files || []).slice(0, 5);
    event.target.value = "";
    const nextFiles: File[] = [];
    const urls: string[] = [];
    try {
      for (let index = 0; index < selected.length; index += 1) {
        const source = selected[index];
        const validation = validateImageFile(source, source.name || `Contract photo ${index + 1}`);
        if (validation) throw new Error(validation);
        const quality = await inspectLoadLinkImage(source);
        if (quality.messages.length) showLoadLinkImageQuality(quality.messages);
        const prepared = await prepareImageFileForForm(source, { maxWidth: 1440, maxHeight: 1440, quality: .78, namePrefix: "loadlink-contract" });
        nextFiles.push(prepared.file); urls.push(prepared.previewUrl);
      }
      previews.forEach((url) => URL.revokeObjectURL(url));
      setFiles(nextFiles); setPreviews(urls);
    } catch (error) { setMessage(readableUploadError(error, "One selected photo could not be prepared.")); }
  }

  function validateStep() {
    if (step === 1 && (!companyName.trim() || !contractTitle.trim())) return "Add the company name and a clear contract title.";
    if (step === 2 && (!serviceRequired.trim() || !vehicleNeeded.trim() || !location.trim())) return "Add the service, required vehicle or unit and work location.";
    if (step === 3 && (!startDate || startDate < today() || !term.trim() || !frequency.trim())) return "Add a valid start date, contract term and work frequency.";
    if (step === 4 && (!contactName.trim() || !validPhone(contact) || !description.trim())) return !validPhone(contact) ? "Enter a valid South African contact number." : "Add the contact person and enough contract detail for an operator to assess the opportunity.";
    return "";
  }

  function next() { const error = validateStep(); if (error) { setMessage(error); return; } setMessage(""); setStep((value) => Math.min(5, value + 1)); }

  const reviewLines = useMemo(() => [
    ["Company", companyName], ["Contract", contractTitle], ["Type", contractType], ["Service", serviceRequired], ["Vehicle / unit", vehicleNeeded], ["Location", location], ["Start", startDate], ["Term", term], ["Frequency", frequency], ["Commercial terms", rate || "Not supplied"], ["Contact", `${contactName} · ${contact}`],
  ], [companyName, contractTitle, contractType, serviceRequired, vehicleNeeded, location, startDate, term, frequency, rate, contactName, contact]);

  async function upload(userId: string) {
    const urls: string[] = [];
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index]; const type = inferUploadContentType(file); const path = `${userId}/contracts/${submission.current}/${index}.${imageExtension(type)}`;
      const result = await supabase.storage.from("job-photos").upload(path, file, { cacheControl: "3600", contentType: type, upsert: true });
      if (result.error) throw result.error;
      urls.push(supabase.storage.from("job-photos").getPublicUrl(path).data.publicUrl);
    }
    return urls;
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); if (saving) return;
    setSaving(true); setMessage("");
    try {
      const error = validateStep(); if (error) throw new Error(error);
      const { data: auth } = await supabase.auth.getUser(); if (!auth.user) throw new Error("Sign in again before submitting this contract.");
      const photos = await upload(auth.user.id);
      const detail = [`Company: ${companyName.trim()}`, `Contract type: ${contractType}`, `Service required: ${serviceRequired.trim()}`, `Contract term: ${term.trim()}`, `Frequency: ${frequency.trim()}`, decisionDeadline ? `Decision deadline: ${decisionDeadline}` : "", `Contact person: ${contactName.trim()}`, "", description.trim()].filter(Boolean).join("\n");
      const result = await supabase.rpc("loadlink_submit_contract", { p_title: contractTitle.trim(), p_city: location.trim(), p_vehicle_group: group, p_vehicle_needed: vehicleNeeded.trim(), p_needed_on: startDate, p_rate: rate.trim(), p_posted_by: companyName.trim(), p_contact_number: contact.trim(), p_description: detail, p_photos: photos, p_client_request_id: submission.current });
      if (result.error) throw result.error;
      localStorage.removeItem(`${draft}:${auth.user.id}`); localStorage.removeItem(`loadlink-contract-submission:${auth.user.id}`);
      window.dispatchEvent(new CustomEvent("loadlink:toast", { detail: { kind: "success", title: "Contract submitted", message: "LoadLink received the contract opportunity for review.", duration: 5200 } }));
      window.setTimeout(() => router.replace("/my-posts"), 650);
    } catch (error) { setMessage(error instanceof Error ? error.message : "LoadLink could not submit this contract. Your draft is still saved."); }
    finally { setSaving(false); }
  }

  if (!ready) return <main className={`min-h-screen ${page}`}><LoadLinkLoading /></main>;
  const labels = ["Business", "Requirement", "Schedule", "Contact", "Review"];

  return <main className={`min-h-screen ${page}`}><LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme}/><section className="mx-auto max-w-3xl px-4 pb-20 pt-8 sm:px-6">
    <p className={`text-[10px] font-black uppercase tracking-[.13em] ${muted}`}>Contract opportunity</p><h1 className="mt-2 text-4xl font-black tracking-[-.055em]">Post a contract</h1><p className={`mt-2 text-sm font-semibold leading-6 ${muted}`}>The same clear LoadLink posting process, with information a business contract actually needs.</p>
    <form onSubmit={submit} className="mt-7"><div className={`mb-3 flex justify-between text-[10px] font-black ${muted}`}><span>Step {step} of 5</span><span>{labels[step-1]}</span></div><div className={`mb-5 h-1 overflow-hidden rounded-full ${darkMode ? "bg-white/10" : "bg-black/[.07]"}`}><div className="h-full bg-[#f6b800] transition-all" style={{width:`${step*20}%`}}/></div>
      <section className={`rounded-[28px] border p-5 shadow-[0_20px_70px_rgba(0,0,0,.08)] sm:p-7 ${surface}`}>
        {step===1?<div className="grid gap-4"><Field label="Company name"><input value={companyName} onChange={e=>setCompanyName(e.target.value)} className={input} placeholder="Registered or trading name"/></Field><Field label="Contract title"><input value={contractTitle} onChange={e=>setContractTitle(e.target.value)} className={input} placeholder="e.g. 12-month regional delivery contract"/></Field><Field label="Contract type"><select value={contractType} onChange={e=>setContractType(e.target.value)} className={input}><option>Recurring transport</option><option>Project contract</option><option>Dedicated vehicle contract</option><option>Tender / RFQ opportunity</option><option>Service agreement</option></select></Field></div>:null}
        {step===2?<div className="grid gap-4"><Field label="Service required"><input value={serviceRequired} onChange={e=>setServiceRequired(e.target.value)} className={input} placeholder="Describe the work or service"/></Field><Field label="Vehicle or mobile unit required"><input value={vehicleNeeded} onChange={e=>setVehicleNeeded(e.target.value)} className={input} placeholder="Side tipper, refrigerated truck, mobile kitchen…"/></Field><Field label="Category"><select value={group} onChange={e=>setGroup(e.target.value as VehicleGroup)} className={input}>{groups.map(item=><option key={item}>{item}</option>)}</select></Field><Field label="Work area / location"><input value={location} onChange={e=>setLocation(e.target.value)} className={input} placeholder="City, province, route or operating area"/></Field></div>:null}
        {step===3?<div className="grid gap-4 sm:grid-cols-2"><Field label="Start date"><input type="date" min={today()} value={startDate} onChange={e=>setStartDate(e.target.value)} className={input}/></Field><Field label="Decision deadline"><input type="date" min={today()} value={decisionDeadline} onChange={e=>setDecisionDeadline(e.target.value)} className={input}/></Field><Field label="Contract term"><input value={term} onChange={e=>setTerm(e.target.value)} className={input} placeholder="12 months, 6 weeks, project duration…"/></Field><Field label="Frequency"><input value={frequency} onChange={e=>setFrequency(e.target.value)} className={input} placeholder="Daily, weekly, 4 trips per month…"/></Field><div className="sm:col-span-2"><Field label="Rate / commercial terms"><input value={rate} onChange={e=>setRate(e.target.value)} className={input} placeholder="R amount, per trip, tender terms or negotiable"/></Field></div></div>:null}
        {step===4?<div className="grid gap-4"><Field label="Contact person"><input value={contactName} onChange={e=>setContactName(e.target.value)} className={input}/></Field><Field label="Contact number"><input type="tel" inputMode="tel" value={contact} onChange={e=>setContact(e.target.value)} className={input} placeholder="082 123 4567"/></Field><Field label="Contract details"><textarea value={description} onChange={e=>setDescription(e.target.value)} className={`${input} min-h-32 resize-y py-3`} placeholder="Loads/services, operating requirements, documents, payment terms, insurance, decision process and anything an operator must know."/></Field><Field label="Photos or supporting images (optional)"><input type="file" accept="image/*" multiple onChange={choosePhotos} className="block w-full text-sm"/></Field>{previews.length?<div className="grid grid-cols-3 gap-2">{previews.map((src,i)=><img key={src} src={src} alt={`Contract preview ${i+1}`} className="aspect-square rounded-xl object-cover"/>)}</div>:null}</div>:null}
        {step===5?<div><h2 className="text-xl font-black">Review contract</h2><div className="mt-4 divide-y divide-current/10">{reviewLines.map(([label,value])=><div key={label} className="grid grid-cols-[120px_1fr] gap-3 py-3 text-xs"><span className={muted}>{label}</span><strong>{value||"Not supplied"}</strong></div>)}</div><p className={`mt-4 text-sm font-semibold leading-6 ${muted}`}>{description}</p></div>:null}
        {message?<div className="mt-5 rounded-[16px] border border-red-500/25 bg-red-500/[.06] px-4 py-3 text-xs font-bold text-red-500">{message}</div>:null}
        <div className="mt-6 flex items-center justify-between gap-3">{step>1?<button type="button" onClick={()=>{setMessage("");setStep(v=>Math.max(1,v-1));}} className="min-h-11 rounded-full border border-current/12 px-5 text-xs font-black">Back</button>:<span/>}{step<5?<button type="button" onClick={next} className="min-h-11 rounded-full bg-[#f6b800] px-6 text-xs font-black text-black">Continue</button>:<button type="submit" disabled={saving} className="min-h-11 rounded-full bg-[#f6b800] px-6 text-xs font-black text-black disabled:opacity-50">{saving?"Submitting…":"Submit contract"}</button>}</div>
      </section>
    </form>
  </section></main>;
}

function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="block"><span className="mb-2 block text-[11px] font-black">{label}</span>{children}</label>}
