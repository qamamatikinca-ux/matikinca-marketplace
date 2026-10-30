"use client";

import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import SharedDocumentUpload from "@/components/DocumentUpload";
import DriverVerificationPanel from "@/components/DriverVerificationPanel";
import { identityReadyForSubmission, type DriverIdentityState } from "@/lib/driverVerification";
import LoadLinkLoading from "@/components/LoadLinkLoading";
import SouthAfricaLocationInput from "@/components/SouthAfricaLocationInput";
import { browserSupabase } from "@/lib/phase2/supabase";
import { SOUTH_AFRICAN_PROVINCES } from "@/lib/southAfricaLocations";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type Doc = { id: string; document_type: string; original_filename: string; size_bytes: number; mime_type?: string; uploaded_at?: string };
type FormState = {
  citizenship_status: string;
  nationality: string;
  passport_expiry: string;
  work_authorisation_type: string;
  work_authorisation_expiry: string;
  full_name: string;
  headline: string;
  city: string;
  province: string;
  phone: string;
  email: string;
  years_experience: number;
  licence_code: string;
  prdp_required: boolean;
  prdp_expiry: string;
  vehicle_types: string;
  route_experience: string;
  languages: string;
  previous_roles: string;
  availability: string;
  bio: string;
  status?: string;
  profile_status?: string;
  review_reason?: string;
  missing_document_type?: string;
};

type MessageType = "success" | "error" | "info";

const EMPTY: FormState = {
  citizenship_status: "", nationality: "", passport_expiry: "", work_authorisation_type: "", work_authorisation_expiry: "",
  full_name: "", headline: "", city: "", province: "", phone: "", email: "", years_experience: 0,
  licence_code: "", prdp_required: false, prdp_expiry: "", vehicle_types: "", route_experience: "", languages: "",
  previous_roles: "", availability: "Available immediately", bio: "",
};

const LABELS: Record<string, string> = {
  work_authorisation: "Work authorisation document",
  portrait: "Your profile photo",
  identity: "ID or passport",
  drivers_licence: "Driver’s licence",
  prdp: "PrDP",
  cv: "CV",
  driving_certificate: "Relevant driving certificate",
};

const STEP_LABELS = ["Personal", "Driving", "Availability", "Verification", "Review"];
const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;
const ACCEPTED_DOCUMENT_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);

function cleanMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof (error as { message?: unknown }).message === "string") {
    return String((error as { message: string }).message);
  }
  return fallback;
}

async function authToken() {
    const client = browserSupabase();
    const { data, error } = await client.auth.getSession();
    if (error) return "";
    let session = data.session;
    if (session && (!session.expires_at || session.expires_at * 1000 <= Date.now() + 30_000)) {
      const refreshed = await client.auth.refreshSession();
      if (refreshed.error || !refreshed.data.session) return "";
      session = refreshed.data.session;
    }
    return session?.access_token || "";
  }

export default function DriverProfileWizardV273() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploadingType, setUploadingType] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadProcessing, setUploadProcessing] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<MessageType>("info");
  const [submitted, setSubmitted] = useState(false);
  const [verification, setVerification] = useState<DriverIdentityState | null>(null);
  const [verificationBusy, setVerificationBusy] = useState(false);

  const documentMap = useMemo(() => Object.fromEntries(docs.map((doc) => [doc.document_type, doc])), [docs]);
  const page = darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black";
  const surface = darkMode ? "border-white/10 bg-[#0d0d0d]" : "border-black/10 bg-white";
  const muted = darkMode ? "text-white/52" : "text-black/52";
  const input = `mt-2 h-12 w-full rounded-xl border px-4 text-sm font-semibold outline-none transition focus:border-[#f6b800] ${darkMode ? "border-white/15 bg-[#151515] text-white placeholder:text-white/30" : "border-black/12 bg-[#fbfaf7] text-black placeholder:text-black/35"}`;
  const textarea = `${input} h-auto min-h-28 py-3`;


  const load = useCallback(() => {
    return authToken().then(async token => {
      if (!token) {
        router.replace(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return null;
      }
      const response = await fetch("/api/phase2/me", { cache: "no-store", headers: { Authorization: `Bearer ${token}` } });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "The profile could not be loaded.");
      return result;
    }).then(result => {
      if (!result) return;
      if (result.profile) {
        setForm({
          ...EMPTY,
          ...result.profile,
          vehicle_types: Array.isArray(result.profile.vehicle_types) ? result.profile.vehicle_types.join(", ") : String(result.profile.vehicle_types || ""),
          route_experience: Array.isArray(result.profile.route_experience) ? result.profile.route_experience.join(", ") : String(result.profile.route_experience || ""),
          languages: Array.isArray(result.profile.languages) ? result.profile.languages.join(", ") : String(result.profile.languages || ""),
          citizenship_status: String(result.profile.citizenship_status || ""),
          nationality: String(result.profile.nationality || ""),
          passport_expiry: String(result.profile.passport_expiry || "").slice(0,10),
          work_authorisation_type: String(result.profile.work_authorisation_type || ""),
          work_authorisation_expiry: String(result.profile.work_authorisation_expiry || "").slice(0,10),
          prdp_expiry: String(result.profile.prdp_expiry || result.profile.prdp_expires_at || "").slice(0, 10),
        });
        const status = String(result.profile.status || result.profile.profile_status || "");
        setSubmitted(["pending", "submitted"].includes(status));
      }
      setDocs(Array.isArray(result.documents) ? result.documents : []);
    }).catch(error => {
      setMessageType("error");
      setMessage(cleanMessage(error, "The driver profile could not be loaded."));
    }).finally(() => setLoading(false));
  }, [router]);

  useEffect(() => { void load().then(() => { if (new URLSearchParams(window.location.search).get("step") === "verification") setStep(4); }); }, [load]);

  function field<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function payload() {
    return {
      ...form,
      vehicle_types: form.vehicle_types.split(",").map((value) => value.trim()).filter(Boolean),
      route_experience: form.route_experience.split(",").map((value) => value.trim()).filter(Boolean),
      languages: form.languages.split(",").map((value) => value.trim()).filter(Boolean),
    };
  }

  function validateStep(current: number) {
    if (current === 1) {
      if (!["south_african", "foreign_national"].includes(form.citizenship_status)) return "Choose South African citizen or Foreign national.";
      if (form.citizenship_status === "foreign_national") {
        const today = new Date().toLocaleDateString("en-CA", {timeZone:"Africa/Johannesburg"});
        if (!form.nationality.trim()) return "Add your nationality.";
        if (form.passport_expiry && form.passport_expiry < today) return "Use a current ID or passport, or correct the passport expiry date.";
        if (!form.work_authorisation_type) return "Select your work authorisation type.";
        if (form.work_authorisation_type !== "permanent_residence" && (!form.work_authorisation_expiry || form.work_authorisation_expiry < today)) return "Add a valid work authorisation expiry date.";
      }
      if (!form.full_name.trim()) return "Add your full name.";
      if (!form.city.trim()) return "Choose your city or town.";
      if (!form.province.trim()) return "Choose your province.";
      if (!form.phone.trim()) return "Add your contact number.";
      if (!form.email.trim() || !/^\S+@\S+\.\S+$/.test(form.email.trim())) return "Add a valid email address.";
    }
    if (current === 2) {
      if (!form.licence_code.trim()) return "Add your driving licence code.";
      if (!form.vehicle_types.split(",").some((value) => value.trim())) return "Add at least one vehicle type you can drive.";
    }
    if (current === 3 && form.prdp_required && !form.prdp_expiry) return "Add your PrDP expiry date.";
    if (current === 4) {
      if (!identityReadyForSubmission(verification)) return "Complete the phone, email and identity check in Verification before continuing.";
      if (form.citizenship_status === "foreign_national" && !documentMap.work_authorisation) return "Upload evidence of your work authorisation before continuing.";
      if (!documentMap.portrait) return "Upload a clear profile photo of yourself before continuing.";
      if (!documentMap.identity) return "Upload your ID or passport before continuing.";
      if (!documentMap.drivers_licence) return "Upload your driver’s licence before continuing.";
      if (form.prdp_required && !documentMap.prdp) return "Upload your PrDP before continuing.";
    }
    return "";
  }

  async function saveProfile(showConfirmation = false) {
    const token = await authToken();
    if (!token) throw new Error("Your sign-in session expired. Sign in again and retry.");
    const response = await fetch("/api/phase2/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload()),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "The profile could not be saved.");
    if (showConfirmation) {
      setMessageType("success");
      setMessage("Profile details saved.");
    }
  }

  async function continueStep() {
    if (busy || uploadingType || verificationBusy) return;
    setMessage("");
    const validation = validateStep(step);
    if (validation) { setMessageType("error"); setMessage(validation); return; }
    setBusy(true);
    try {
      if (step <= 3) await saveProfile(false);
      setStep((current) => Math.min(5, current + 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setMessageType("error");
      setMessage(cleanMessage(error, "LoadLink could not save these details."));
    } finally {
      setBusy(false);
    }
  }

  async function upload(type: string, file: File | null) {
    if (!file || busy || uploadingType || verificationBusy) return;
    setMessage("");
    const label = LABELS[type] || "Document";
    const mime = file.type.toLowerCase().split(";")[0];
    if (type === "portrait" && !["image/jpeg", "image/png"].includes(mime)) { setMessageType("error"); setMessage("Choose a clear JPG or PNG portrait of yourself."); return; }
    if (!ACCEPTED_DOCUMENT_TYPES.has(mime)) {
      setMessageType("error"); setMessage(`${label}: choose a PDF, JPG or PNG file.`); return;
    }
    if (file.size < 1 || file.size > MAX_DOCUMENT_BYTES) {
      setMessageType("error"); setMessage(`${label}: the file must be smaller than 8 MB.`); return;
    }
    setUploadingType(type);
    setUploadProgress(0);
    setUploadProcessing(false);
    const report = (progress: number, processing = false) => {
      setUploadProgress(progress);
      setUploadProcessing(processing);
      window.dispatchEvent(new CustomEvent("loadlink:toast", { detail: {
        id: `loadlink-driver-doc-${type}`, kind: "progress",
        title: processing ? `Processing ${label}` : `Uploading ${label}`,
        message: processing ? "Transfer complete. LoadLink is verifying and securely attaching the document." : "Uploading document to LoadLink.",
        ...(processing ? {} : { progress }),
      } }));
    };
    report(0);
    try {
      await saveProfile(false);
      const token = await authToken();
      if (!token) throw new Error("Your sign-in session expired. Sign in again and retry.");
      const preparedResponse = await fetch("/api/phase2/documents", {method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({action:"prepare",documentType:type,filename:file.name,size:file.size,mime})});
      const prepared = await preparedResponse.json();
      if(!preparedResponse.ok) throw new Error(prepared.error || "The upload could not start.");
      await new Promise<void>((resolve,reject)=>{
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", prepared.signedUrl);
        xhr.setRequestHeader("Content-Type",mime);
        xhr.setRequestHeader("cache-control","3600");
        xhr.timeout=120000;
        xhr.upload.onprogress=event=>{if(event.lengthComputable)report(Math.min(99,Math.round(event.loaded/event.total*100)));};
        xhr.onerror=()=>reject(new Error("Network interrupted during document upload."));
        xhr.ontimeout=()=>reject(new Error("Document upload timed out. Please retry."));
        xhr.onload=()=>xhr.status>=200&&xhr.status<300?resolve():reject(new Error("The document transfer failed. Please retry."));
        xhr.send(file);
      });
      report(100,true);
      const finalizedResponse = await fetch("/api/phase2/documents", {method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({action:"finalize",documentType:type,filename:file.name,path:prepared.path})});
      const result = await finalizedResponse.json();
      if(!finalizedResponse.ok || !result.ok) throw new Error(result.error || "The document could not be attached. Please retry.");
      setMessageType("success");
      setMessage(`${label} uploaded successfully.`);
      window.dispatchEvent(new CustomEvent("loadlink:toast", { detail: { id: `loadlink-driver-doc-${type}`, kind: "success", title: `${label} uploaded`, message: "The document is attached to your LoadLink driver profile.", duration: 4800 } }));
      await load();
    } catch (error) {
      setMessageType("error");
      setMessage(`${label}: ${cleanMessage(error, "upload failed.")}`);
      window.dispatchEvent(new CustomEvent("loadlink:toast", { detail: { id: `loadlink-driver-doc-${type}`, kind: "error", title: `${label} not uploaded`, message: "The file was not attached. Check the document and try again.", duration: 6500 } }));
    } finally {
      setUploadingType("");
      setUploadProgress(0);
      setUploadProcessing(false);
    }
  }

  async function submit() {
    if (busy || uploadingType || verificationBusy) return;
    setMessage("");
    for (const current of [1, 2, 3, 4]) {
      const validation = validateStep(current);
      if (validation) { setStep(current); setMessageType("error"); setMessage(validation); return; }
    }
    setBusy(true);
    try {
      const token = await authToken();
      if (!token) throw new Error("Your sign-in session expired. Sign in again and retry.");
      const response = await fetch("/api/phase2/submit", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ payload: payload() }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "The driver profile could not be submitted.");
      setSubmitted(true);
      setForm((current) => ({ ...current, status: "pending", profile_status: "submitted", review_reason: "", missing_document_type: "" }));
      setMessageType("success");
      setMessage("Profile submitted. LoadLink has received it for review.");
      window.dispatchEvent(new Event("loadlink-driver-profile-updated"));
      window.dispatchEvent(new CustomEvent("loadlink:toast", { detail: { kind: "success", title: "Driver profile submitted", message: "LoadLink received your profile and documents for review.", duration: 5200 } }));
    } catch (error) {
      setMessageType("error");
      setMessage(cleanMessage(error, "The driver profile could not be submitted."));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <main className={`min-h-screen ${page}`}><LoadLinkLoading /></main>;

  return <main className={`min-h-screen ${page}`} data-loadlink-driver-wizard="v273">
    <Header darkMode={darkMode} toggleTheme={toggleTheme} />
    <section className="border-b border-[#f6b800]/25 bg-black text-white">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center gap-2"><span className="rounded-full bg-[#f6b800] px-3 py-1 text-[9px] font-black uppercase tracking-[.12em] text-black">Driver profile</span>{submitted ? <span className="rounded-full border border-white/20 px-3 py-1 text-[9px] font-black uppercase tracking-[.12em] text-white/70">Review in progress</span> : null}</div>
        <h1 className="mt-4 text-[40px] font-black tracking-[-.06em] sm:text-[48px]">{submitted ? "Update your driver profile" : "Build your driver profile"}</h1>
        <p className="mt-2 max-w-xl text-xs font-semibold leading-5 text-white/50">Complete each step, check your details, then send one clean profile to LoadLink for review.</p>
      </div>
    </section>

    <div className="mx-auto max-w-3xl px-4 py-6 pb-20">
      {form.review_reason ? <div className="mb-4 rounded-[18px] border border-red-500/40 bg-red-500/10 p-4 text-sm font-semibold"><strong className="block font-black">Review feedback</strong><span className="mt-1 block opacity-75">{form.review_reason}</span>{form.missing_document_type ? <button type="button" onClick={() => setStep(4)} className="mt-3 text-xs font-black underline underline-offset-4">Replace {LABELS[form.missing_document_type] || "requested document"}</button> : null}</div> : null}
      {message ? <div role="status" className={`mb-4 rounded-[16px] border p-4 text-xs font-bold leading-5 ${messageType === "error" ? "border-red-500/35 bg-red-500/10" : messageType === "success" ? "border-emerald-500/35 bg-emerald-500/10" : "border-[#f6b800]/30 bg-[#f6b800]/10"}`}>{message}</div> : null}

      <nav aria-label="Driver application steps" className="mb-4 flex gap-2 overflow-x-auto pb-1">{STEP_LABELS.map((label, index) => <button key={label} type="button" disabled={busy || Boolean(uploadingType) || verificationBusy} aria-current={step === index + 1 ? "step" : undefined} onClick={() => { setMessage(""); setStep(index + 1); }} className={`shrink-0 rounded-full border px-3 py-2 text-xs font-bold ${step === index + 1 ? "border-[#f6b800] bg-[#f6b800] text-black" : "border-current/15"}`}>{label}</button>)}</nav>
      <div className="mb-2 flex items-center justify-between text-[10px] font-black"><span>Step {step} of 5</span><span className="opacity-40">{STEP_LABELS[step - 1]}</span></div>
      <div className="mb-4 h-1 overflow-hidden rounded-full bg-current/10"><div className="h-full bg-[#f6b800] transition-[width] duration-200" style={{ width: `${step * 20}%` }} /></div>

      <section className={`rounded-[26px] border p-5 sm:p-7 ${surface}`}>
        {step === 1 ? <>
          <StepTitle title="Personal information" copy="Use accurate contact details businesses can rely on." muted={muted} />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Citizenship"><select className={input} value={form.citizenship_status} onChange={event=>field("citizenship_status",event.target.value)}><option value="">Select citizenship status</option><option value="south_african">South African citizen</option><option value="foreign_national">Foreign national</option></select></Field>
            {form.citizenship_status === "foreign_national" ? <>
              <Field label="Nationality"><input className={input} value={form.nationality} maxLength={100} autoComplete="country-name" onChange={event=>field("nationality",event.target.value)} placeholder="Country of nationality"/></Field>
              <Field label="Passport expiry (if applicable)"><input className={input} type="date" value={form.passport_expiry} onChange={event=>field("passport_expiry",event.target.value)}/></Field>
              <Field label="Work authorisation"><select className={input} value={form.work_authorisation_type} onChange={event=>field("work_authorisation_type",event.target.value)}><option value="">Select document type</option><option value="work_visa">Work visa or permit</option><option value="permanent_residence">Permanent residence</option><option value="other_authorisation">Other documented work authorisation</option></select></Field>
              {form.work_authorisation_type !== "permanent_residence" ? <Field label="Work authorisation expiry"><input className={input} type="date" value={form.work_authorisation_expiry} onChange={event=>field("work_authorisation_expiry",event.target.value)}/></Field> : null}
              <p className={`sm:col-span-2 text-sm leading-6 ${muted}`}>Add the documents that apply to your circumstances. Your identity and work authorisation documents are private and will be reviewed with your application.</p>
            </> : null}
            <Field label="Full name"><input className={input} value={form.full_name} onChange={(event) => field("full_name", event.target.value)} autoComplete="name" /></Field>
            <Field label="Professional headline"><input className={input} value={form.headline} onChange={(event) => field("headline", event.target.value)} placeholder="Code 14 long-distance driver" /></Field>
            <Field label="City or town"><SouthAfricaLocationInput className={input} value={form.city} onChange={(value, selected) => { field("city", value); if (selected?.province) field("province", selected.province); }} darkMode={darkMode} allowAllSouthAfrica={false} required /></Field>
            <Field label="Province"><select className={input} value={form.province} onChange={(event) => field("province", event.target.value)}><option value="">Select province</option>{SOUTH_AFRICAN_PROVINCES.map((province) => <option key={province} value={province}>{province}</option>)}</select></Field>
            <Field label="Contact number"><input className={input} value={form.phone} onChange={(event) => field("phone", event.target.value)} inputMode="tel" autoComplete="tel" /></Field>
            <Field label="Email"><input className={input} type="email" value={form.email} onChange={(event) => field("email", event.target.value)} autoComplete="email" /></Field>
          </div>
        </> : null}

        {step === 2 ? <>
          <StepTitle title="Driving experience" copy="Tell businesses what you can drive and where you have worked." muted={muted} />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Years of experience"><input className={input} type="number" min="0" max="60" value={form.years_experience} onChange={(event) => field("years_experience", Number(event.target.value))} /></Field>
            <Field label="Licence code"><input className={input} type="text" inputMode="text" autoCapitalize="sentences" value={form.licence_code} onChange={(event) => field("licence_code", event.target.value)} placeholder="e.g. EC / Code 14" /></Field>
            <Field label="Vehicle experience"><input className={input} type="text" inputMode="text" autoCapitalize="sentences" value={form.vehicle_types} onChange={(event) => field("vehicle_types", event.target.value)} placeholder="Truck, tanker, refrigerated truck" /></Field>
            <Field label="Route experience"><input className={input} type="text" inputMode="text" autoCapitalize="sentences" value={form.route_experience} onChange={(event) => field("route_experience", event.target.value)} placeholder="Gauteng, Durban, cross-border" /></Field>
            <Field label="Languages"><input className={input} type="text" inputMode="text" autoCapitalize="sentences" value={form.languages} onChange={(event) => field("languages", event.target.value)} placeholder="English, isiXhosa" /></Field>
            <Field label="Previous roles"><input className={input} type="text" inputMode="text" autoCapitalize="sentences" value={form.previous_roles} onChange={(event) => field("previous_roles", event.target.value)} placeholder="Long-haul driver, fleet driver" /></Field>
          </div>
        </> : null}

        {step === 3 ? <>
          <StepTitle title="Availability and PrDP" copy="Add your current availability and the credentials relevant to the work you want." muted={muted} />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Availability"><input className={input} type="text" inputMode="text" autoCapitalize="sentences" value={form.availability} onChange={(event) => field("availability", event.target.value)} placeholder="Available immediately" /></Field>
            <label className={`mt-2 flex min-h-12 items-center justify-between gap-4 rounded-xl border px-4 ${darkMode ? "border-white/15 bg-[#151515]" : "border-black/12 bg-[#fbfaf7]"}`}><span><strong className="block text-xs font-black">PrDP required for my work</strong><span className={`mt-0.5 block text-[9px] font-semibold ${muted}`}>Turn on if you use a PrDP.</span></span><input type="checkbox" checked={form.prdp_required} onChange={(event) => field("prdp_required", event.target.checked)} className="h-5 w-5 accent-[#f6b800]" /></label>
            {form.prdp_required ? <Field label="PrDP expiry"><input className={input} type="date" value={form.prdp_expiry} onChange={(event) => field("prdp_expiry", event.target.value)} /></Field> : null}
            <Field label="Professional summary" wide><textarea className={textarea} value={form.bio} onChange={(event) => field("bio", event.target.value)} placeholder="Briefly describe your driving experience, reliability and the type of work you are looking for." /></Field>
          </div>
        </> : null}

        {step === 4 ? <>
          <StepTitle title="Driver verification" copy="Add your files, then complete the contact and identity checks." muted={muted} />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><p className={`mb-3 text-sm leading-6 ${muted}`}>Your profile photo is shown after approval. Identity and licence documents stay private.</p><DocumentUpload type="portrait" label={LABELS.portrait} required fileName={documentMap.portrait?.original_filename} busy={busy || Boolean(uploadingType) || verificationBusy} uploading={uploadingType === "portrait"} progress={uploadProgress} processing={uploadProcessing} darkMode={darkMode} onFile={(file) => void upload("portrait", file)} /></div>
            <DocumentUpload type="identity" label={LABELS.identity} required fileName={documentMap.identity?.original_filename} busy={busy || Boolean(uploadingType) || verificationBusy} uploading={uploadingType === "identity"} progress={uploadProgress} processing={uploadProcessing} darkMode={darkMode} onFile={(file) => void upload("identity", file)} />
            <DocumentUpload type="drivers_licence" label={LABELS.drivers_licence} required fileName={documentMap.drivers_licence?.original_filename} busy={busy || Boolean(uploadingType) || verificationBusy} uploading={uploadingType === "drivers_licence"} progress={uploadProgress} processing={uploadProcessing} darkMode={darkMode} onFile={(file) => void upload("drivers_licence", file)} />
            {form.prdp_required ? <DocumentUpload type="prdp" label={LABELS.prdp} required fileName={documentMap.prdp?.original_filename} busy={busy || Boolean(uploadingType) || verificationBusy} uploading={uploadingType === "prdp"} progress={uploadProgress} processing={uploadProcessing} darkMode={darkMode} onFile={(file) => void upload("prdp", file)} /> : null}
            {form.citizenship_status === "foreign_national" ? <DocumentUpload type="work_authorisation" label={LABELS.work_authorisation} required fileName={documentMap.work_authorisation?.original_filename} busy={busy || Boolean(uploadingType) || verificationBusy} uploading={uploadingType === "work_authorisation"} progress={uploadProgress} processing={uploadProcessing} darkMode={darkMode} onFile={file=>void upload("work_authorisation",file)}/> : null}
            <DocumentUpload type="cv" label={LABELS.cv} fileName={documentMap.cv?.original_filename} busy={busy || Boolean(uploadingType) || verificationBusy} uploading={uploadingType === "cv"} progress={uploadProgress} processing={uploadProcessing} darkMode={darkMode} onFile={(file) => void upload("cv", file)} />
            <DocumentUpload type="driving_certificate" label={LABELS.driving_certificate} fileName={documentMap.driving_certificate?.original_filename} busy={busy || Boolean(uploadingType) || verificationBusy} uploading={uploadingType === "driving_certificate"} progress={uploadProgress} processing={uploadProcessing} darkMode={darkMode} onFile={(file) => void upload("driving_certificate", file)} />
          </div>
          <p className={`mt-4 text-[10px] font-semibold leading-5 ${muted}`}>Accepted: PDF, JPG or PNG. Maximum 8 MB per document. Use a clear ID photograph for the camera check.</p>
          <DriverVerificationPanel key={`${documentMap.identity?.uploaded_at || ""}:${documentMap.portrait?.uploaded_at || ""}`} phone={form.phone} email={form.email} disabled={busy || Boolean(uploadingType)} onStatus={setVerification} onBusy={setVerificationBusy} onEditContacts={() => setStep(1)} />
        </> : null}

        {step === 5 ? <>
          <StepTitle title="Review your profile" copy="Check each section before sending it to LoadLink." muted={muted} />
          <div className="mt-5 divide-y divide-current/10 overflow-hidden rounded-[18px] border border-current/10">
            <ReviewRow label="Personal" value={`${form.full_name} · ${form.city}, ${form.province}`} onEdit={() => setStep(1)} />
            <ReviewRow label="Citizenship" value={form.citizenship_status === "foreign_national" ? `Foreign national · ${form.nationality}${form.passport_expiry ? ` · Passport expires ${form.passport_expiry}` : ""}` : "South African citizen"} onEdit={()=>setStep(1)}/>
            {form.citizenship_status === "foreign_national" ? <ReviewRow label="Work evidence" value={`${form.work_authorisation_type.replaceAll("_"," ")} · ${form.work_authorisation_expiry || "No expiry (permanent residence)"} · ${documentMap.work_authorisation ? "Document added" : "Document missing"}`} onEdit={()=>setStep(1)}/> : null}
            <ReviewRow label="Contact" value={`${form.phone} · ${form.email}`} onEdit={() => setStep(1)} />
            <ReviewRow label="Licence" value={`${form.licence_code} · ${form.years_experience || 0} years experience`} onEdit={() => setStep(2)} />
            <ReviewRow label="Vehicles" value={form.vehicle_types || "—"} onEdit={() => setStep(2)} />
            <ReviewRow label="Availability" value={form.availability || "—"} onEdit={() => setStep(3)} />
            <ReviewRow label="PrDP" value={form.prdp_required ? `Required${form.prdp_expiry ? ` · expires ${form.prdp_expiry}` : ""}` : "Not marked as required"} onEdit={() => setStep(3)} />
            <ReviewRow label="Verification" value={identityReadyForSubmission(verification) ? `Phone and email verified · ${verification?.check?.mode === "manual" ? "Staff identity review requested" : "Camera evidence saved"}` : "Verification required"} onEdit={() => setStep(4)} />
            <ReviewRow label="Documents" value={`${documentMap.identity ? "ID added" : "ID missing"} · ${documentMap.drivers_licence ? "Licence added" : "Licence missing"}${form.prdp_required ? ` · ${documentMap.prdp ? "PrDP added" : "PrDP missing"}` : ""}`} onEdit={() => setStep(4)} />
          </div>
          {submitted ? <div className="mt-5 rounded-[16px] border border-[#f6b800]/35 bg-[#f6b800]/10 p-4 text-xs font-bold">Your profile is already with LoadLink for review. You can still correct your saved details if LoadLink requests changes.</div> : null}
        </> : null}

        <div className="mt-6 flex gap-2">
          {step > 1 ? <button type="button" disabled={busy || Boolean(uploadingType) || verificationBusy} onClick={() => { setMessage(""); setStep((current) => current - 1); }} className="h-12 rounded-full border border-current/12 px-5 text-xs font-black disabled:opacity-40">Back</button> : null}
          {step < 5 ? <button type="button" disabled={busy || Boolean(uploadingType) || verificationBusy} onClick={() => void continueStep()} className="h-12 flex-1 rounded-full bg-[#f6b800] px-5 text-sm font-black text-black disabled:opacity-40">{busy ? "Saving…" : "Continue"}</button> : <button type="button" disabled={busy || Boolean(uploadingType) || verificationBusy || submitted} onClick={() => void submit()} className="h-12 flex-1 rounded-full bg-[#f6b800] px-5 text-sm font-black tracking-[-.02em] text-black disabled:opacity-45">{busy ? "Submitting…" : submitted ? "Review in progress" : "Submit profile for review"}</button>}
        </div>
      </section>
    </div>
  </main>;
}

function Header({ darkMode, toggleTheme }: { darkMode: boolean; toggleTheme: () => void }) {
  return <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />;
}

function StepTitle({ title, copy, muted }: { title: string; copy: string; muted: string }) {
  return <div><h2 className="text-2xl font-black tracking-[-.035em] sm:text-3xl">{title}</h2><p className={`mt-2 text-xs font-semibold leading-5 ${muted}`}>{copy}</p></div>;
}

function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return <label className={wide ? "block sm:col-span-2" : "block"}><span className="text-xs font-black">{label}</span>{children}</label>;
}

function ReviewRow({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return <div className="flex items-center gap-4 px-4 py-4"><div className="min-w-0 flex-1"><span className="block text-[10px] font-bold uppercase tracking-[.08em] opacity-55">{label}</span><span className="mt-1 block break-words text-sm font-semibold leading-6">{value}</span></div><button type="button" onClick={onEdit} aria-label={`Edit ${label.toLowerCase()}`} className="shrink-0 rounded-full border border-current/20 px-3 py-2 text-xs font-bold">Edit</button></div>;
}

function DocumentUpload({ type, label, required = false, fileName, busy, uploading, progress, processing, onFile }: { type: string; label: string; required?: boolean; fileName?: string; busy: boolean; uploading: boolean; progress: number; processing: boolean; darkMode: boolean; onFile: (file: File | null) => void }) {
  return <SharedDocumentUpload label={label} required={required} fileName={fileName} disabled={busy} accept={type === "portrait" ? "image/jpeg,image/png" : "application/pdf,image/jpeg,image/png"} hint={type === "portrait" ? "Choose JPG or PNG" : "Choose PDF, JPG or PNG"} status={uploading ? processing ? "Attaching file…" : `Uploading ${progress}%` : undefined} progress={uploading ? progress : undefined} onFile={onFile} />;
}
