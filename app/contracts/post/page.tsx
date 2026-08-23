"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import LoadLinkLoading from "@/components/LoadLinkLoading";
import SouthAfricaLocationInput from "@/components/SouthAfricaLocationInput";
import { getLoadLinkIntelligence } from "@/lib/loadlinkIntelligence";
import { createSafeRandomId, imageExtension, inferUploadContentType, prepareImageFileForForm, readableUploadError, validateImageFile } from "@/lib/mobilePosting";
import { supabase } from "@/lib/supabaseClient";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type VehicleGroup = "Catering / Event" | "Trucks / Trailers" | "Farming / Mining";
const groups: VehicleGroup[] = ["Trucks / Trailers", "Catering / Event", "Farming / Mining"];
const contractTypes = ["Recurring transport", "Project contract", "Tender opportunity", "Dedicated route", "Seasonal contract", "Other"];
const frequencies = ["Once-off project", "Daily", "Weekdays", "Weekly", "Fortnightly", "Monthly", "As required"];
const today = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const cleanPhone = (value: string) => value.replace(/[^\d+]/g, "");
const validPhone = (value: string) => /^0\d{9}$/.test(cleanPhone(value)) || /^\+27\d{9}$/.test(cleanPhone(value));

export default function PostContractPage() {
  const router = useRouter();
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(1);
  const [companyName, setCompanyName] = useState("");
  const [contractTitle, setContractTitle] = useState("");
  const [contractType, setContractType] = useState(contractTypes[0]);
  const [group, setGroup] = useState<VehicleGroup>("Trucks / Trailers");
  const [vehicleNeeded, setVehicleNeeded] = useState("");
  const [city, setCity] = useState("");
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState("");
  const [frequency, setFrequency] = useState(frequencies[0]);
  const [rate, setRate] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [description, setDescription] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const submissionId = useRef("");

  const page = darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black";
  const surface = darkMode ? "border-white/10 bg-white/[.045]" : "border-white/70 bg-white/[.68]";
  const input = `h-12 w-full rounded-[15px] border px-4 text-base font-semibold outline-none transition focus:border-[#f6b800] ${darkMode ? "border-white/12 bg-white/[.045] text-white placeholder:text-white/30" : "border-black/10 bg-white/78 text-black placeholder:text-black/35"}`;
  const muted = darkMode ? "text-white/52" : "text-black/52";
  const steps = ["Business", "Contract", "Schedule", "Terms", "Review"];

  useEffect(() => {
    let active = true;
    void (async () => {
      const intelligence = await getLoadLinkIntelligence();
      if (!active) return;
      if (!intelligence.authenticated) {
        window.location.replace(`/login?returnTo=${encodeURIComponent("/contracts/post")}`);
        return;
      }
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      submissionId.current = localStorage.getItem(`loadlink-contract-submission:${auth.user.id}`) || createSafeRandomId();
      localStorage.setItem(`loadlink-contract-submission:${auth.user.id}`, submissionId.current);
      const profile = await supabase.from("profiles").select("full_name,company_name,phone").eq("id", auth.user.id).maybeSingle();
      setCompanyName(String(profile.data?.company_name || ""));
      setContactName(String(profile.data?.full_name || profile.data?.company_name || ""));
      setContactPhone(String(profile.data?.phone || ""));
      const draft = localStorage.getItem(`loadlink-contract-draft-major:${auth.user.id}`);
      if (draft) {
        try {
          const value = JSON.parse(draft);
          setCompanyName(value.companyName || String(profile.data?.company_name || ""));
          setContractTitle(value.contractTitle || "");
          setContractType(value.contractType || contractTypes[0]);
          setGroup(value.group || "Trucks / Trailers");
          setVehicleNeeded(value.vehicleNeeded || "");
          setCity(value.city || "");
          setStartDate(value.startDate || today());
          setEndDate(value.endDate || "");
          setFrequency(value.frequency || frequencies[0]);
          setRate(value.rate || "");
          setPaymentTerms(value.paymentTerms || "");
          setDescription(value.description || "");
          setContactName(value.contactName || String(profile.data?.full_name || ""));
          setContactPhone(value.contactPhone || String(profile.data?.phone || ""));
          setStep(Math.max(1, Math.min(5, Number(value.step || 1))));
        } catch {}
      }
      setReady(true);
    })().catch(() => setReady(true));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    void supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      localStorage.setItem(`loadlink-contract-draft-major:${data.user.id}`, JSON.stringify({ companyName, contractTitle, contractType, group, vehicleNeeded, city, startDate, endDate, frequency, rate, paymentTerms, description, contactName, contactPhone, step }));
    });
  }, [ready, companyName, contractTitle, contractType, group, vehicleNeeded, city, startDate, endDate, frequency, rate, paymentTerms, description, contactName, contactPhone, step]);

  const summary = useMemo(() => [
    ["Company", companyName], ["Contract", contractTitle], ["Type", contractType], ["Vehicle / service", vehicleNeeded], ["Location", city], ["Starts", startDate], ["Ends", endDate || "Open / ongoing"], ["Frequency", frequency], ["Rate / budget", rate || "Negotiable"], ["Payment terms", paymentTerms || "Not specified"], ["Contact", contactName], ["Phone", contactPhone],
  ], [companyName, contractTitle, contractType, vehicleNeeded, city, startDate, endDate, frequency, rate, paymentTerms, contactName, contactPhone]);

  function next() {
    setMessage("");
    if (step === 1 && (!companyName.trim() || !contactName.trim() || !validPhone(contactPhone))) {
      setMessage(!companyName.trim() ? "Add the company or contracting business name." : !contactName.trim() ? "Add a contact person." : "Enter a valid South African contact number.");
      return;
    }
    if (step === 2 && (!contractTitle.trim() || !vehicleNeeded.trim())) {
      setMessage("Add a contract title and the required vehicle, unit or service.");
      return;
    }
    if (step === 3 && (!city.trim() || !startDate || startDate < today() || (endDate && endDate < startDate))) {
      setMessage(!city.trim() ? "Choose the contract location." : startDate < today() ? "The start date cannot be in the past." : "The end date cannot be before the start date.");
      return;
    }
    if (step === 4 && description.trim().length < 20) {
      setMessage("Add enough contract detail for an operator to understand the work and requirements.");
      return;
    }
    setStep((value) => Math.min(5, value + 1));
  }

  async function choosePhotos(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files || []).slice(0, 5);
    event.target.value = "";
    try {
      const preparedFiles: File[] = [];
      const previewUrls: string[] = [];
      for (const source of selected) {
        const error = validateImageFile(source, source.name || "Contract photo");
        if (error) throw new Error(error);
        const prepared = await prepareImageFileForForm(source, { maxWidth: 1440, maxHeight: 1440, quality: .78, namePrefix: "loadlink-contract" });
        preparedFiles.push(prepared.file);
        previewUrls.push(prepared.previewUrl);
      }
      setFiles(preparedFiles);
      setPreviews(previewUrls);
    } catch (error) {
      setMessage(readableUploadError(error, "One selected photo could not be prepared."));
    }
  }

  async function uploadPhotos(userId: string) {
    const urls: string[] = [];
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const type = inferUploadContentType(file);
      const path = `${userId}/contracts/${submissionId.current}/${index}.${imageExtension(type)}`;
      const result = await supabase.storage.from("job-photos").upload(path, file, { cacheControl: "3600", contentType: type, upsert: true });
      if (result.error) throw result.error;
      urls.push(supabase.storage.from("job-photos").getPublicUrl(path).data.publicUrl);
    }
    return urls;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setMessage("");
    try {
      const intelligence = await getLoadLinkIntelligence();
      if (!intelligence.authenticated) throw new Error("Sign in to post this contract.");
      if (["blocked", "suspended"].includes(String(intelligence.account_status))) throw new Error(intelligence.account_reason || "This account cannot post a contract right now.");
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Your sign-in session needs to be refreshed.");
      const photos = await uploadPhotos(auth.user.id);
      const structuredDescription = [
        `Company: ${companyName.trim()}`,
        `Contract type: ${contractType}`,
        `Frequency: ${frequency}`,
        `Start date: ${startDate}`,
        `End date: ${endDate || "Open / ongoing"}`,
        `Payment / tender terms: ${paymentTerms.trim() || "Not specified"}`,
        "",
        description.trim(),
      ].join("\n");
      const result = await supabase.rpc("loadlink_submit_contract", {
        p_title: contractTitle.trim(),
        p_city: city.trim(),
        p_vehicle_group: group,
        p_vehicle_needed: vehicleNeeded.trim(),
        p_needed_on: startDate,
        p_rate: rate.trim(),
        p_posted_by: companyName.trim(),
        p_contact_number: contactPhone.trim(),
        p_description: structuredDescription,
        p_photos: photos,
        p_client_request_id: submissionId.current,
      });
      if (result.error) throw result.error;
      localStorage.removeItem(`loadlink-contract-draft-major:${auth.user.id}`);
      localStorage.removeItem(`loadlink-contract-submission:${auth.user.id}`);
      window.dispatchEvent(new CustomEvent("loadlink:toast", { detail: { kind: "success", title: "Contract submitted", message: "LoadLink received the contract and sent it for review.", duration: 5200 } }));
      router.replace("/my-posts");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "LoadLink could not submit this contract right now. Your information is still saved.");
    } finally {
      setSaving(false);
    }
  }

  if (!ready) return <main className={`min-h-screen ${page}`}><LoadLinkLoading /></main>;

  return (
    <main className={`min-h-screen ${page}`} data-loadlink-contract-post="major-update">
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />
      <section className="mx-auto max-w-3xl px-4 pb-20 pt-8 sm:px-6">
        <p className={`text-[11px] font-black uppercase tracking-[.13em] ${muted}`}>Contract posting</p>
        <h1 className="mt-2 text-4xl font-black tracking-[-.05em] sm:text-5xl">Post a contract</h1>
        <p className={`mt-3 max-w-xl text-sm font-semibold leading-6 ${muted}`}>A contract is not an ordinary job. Add the business, term, schedule and commercial requirements operators need before they respond.</p>

        <form onSubmit={submit} className="mt-7">
          <div className="mb-3 flex items-center justify-between text-[11px] font-black"><span>Step {step} of 5</span><span className={muted}>{steps[step - 1]}</span></div>
          <div className={`mb-5 h-1 overflow-hidden rounded-full ${darkMode ? "bg-white/10" : "bg-black/8"}`}><div className="h-full bg-[#f6b800] transition-all" style={{ width: `${step * 20}%` }} /></div>

          <section className={`loadlink-glass rounded-[26px] border p-5 sm:p-7 ${surface}`}>
            {step === 1 ? <div className="grid gap-4">
              <Field label="Company name"><input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={input} placeholder="Business or contracting company" /></Field>
              <div className="grid gap-4 sm:grid-cols-2"><Field label="Contact person"><input value={contactName} onChange={(e) => setContactName(e.target.value)} className={input} placeholder="Full name" /></Field><Field label="Contact number"><input type="tel" inputMode="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className={input} placeholder="082 123 4567" /></Field></div>
            </div> : null}

            {step === 2 ? <div className="grid gap-4">
              <Field label="Contract title"><input value={contractTitle} onChange={(e) => setContractTitle(e.target.value)} className={input} placeholder="e.g. 12-month side tipper transport contract" /></Field>
              <div className="grid gap-4 sm:grid-cols-2"><Field label="Contract type"><select value={contractType} onChange={(e) => setContractType(e.target.value)} className={input}>{contractTypes.map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Category"><select value={group} onChange={(e) => setGroup(e.target.value as VehicleGroup)} className={input}>{groups.map((item) => <option key={item}>{item}</option>)}</select></Field></div>
              <Field label="Vehicle, unit or service required"><input value={vehicleNeeded} onChange={(e) => setVehicleNeeded(e.target.value)} className={input} placeholder="Side tipper, refrigerated truck, mobile unit…" /></Field>
            </div> : null}

            {step === 3 ? <div className="grid gap-4">
              <Field label="Location"><SouthAfricaLocationInput id="contract-post-location" value={city} onChange={setCity} darkMode={darkMode} placeholder="City, town or province" ariaLabel="Contract location" className={input} /></Field>
              <div className="grid gap-4 sm:grid-cols-2"><Field label="Start date"><input type="date" min={today()} value={startDate} onChange={(e) => setStartDate(e.target.value)} className={input} /></Field><Field label="End date (optional)"><input type="date" min={startDate || today()} value={endDate} onChange={(e) => setEndDate(e.target.value)} className={input} /></Field></div>
              <Field label="Frequency"><select value={frequency} onChange={(e) => setFrequency(e.target.value)} className={input}>{frequencies.map((item) => <option key={item}>{item}</option>)}</select></Field>
            </div> : null}

            {step === 4 ? <div className="grid gap-4">
              <Field label="Rate / budget"><input value={rate} onChange={(e) => setRate(e.target.value)} className={input} placeholder="R25 000 / month, per trip, tender, negotiable…" /></Field>
              <Field label="Payment or tender terms"><input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} className={input} placeholder="30 days, tender deadline, milestone payment…" /></Field>
              <Field label="Contract requirements"><textarea value={description} onChange={(e) => setDescription(e.target.value)} className={`${input} min-h-36 resize-y py-3`} placeholder="Routes, loads, required documents, capacity, operating times, compliance and any other contract requirements." /></Field>
              <Field label="Optional photos / documents as images"><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={choosePhotos} className={`${input} h-auto py-3`} /></Field>
              {previews.length ? <div className="grid grid-cols-3 gap-2">{previews.map((src) => <img key={src} src={src} alt="" className="aspect-square w-full rounded-xl object-cover" />)}</div> : null}
            </div> : null}

            {step === 5 ? <div>
              <h2 className="text-2xl font-black tracking-[-.035em]">Review contract</h2>
              <div className="mt-5 grid gap-px overflow-hidden rounded-2xl border border-current/10 bg-current/10 sm:grid-cols-2">{summary.map(([label, value]) => <div key={label} className={darkMode ? "bg-[#101010] p-4" : "bg-white p-4"}><span className={`block text-[10px] font-black uppercase tracking-[.1em] ${muted}`}>{label}</span><strong className="mt-1 block text-sm">{value || "Not supplied"}</strong></div>)}</div>
              <div className={`mt-4 rounded-2xl border border-current/10 p-4 text-sm font-semibold leading-6 ${muted}`}>{description}</div>
            </div> : null}
          </section>

          {message ? <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-semibold text-red-500">{message}</div> : null}

          <div className="mt-5 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => step > 1 ? setStep((value) => value - 1) : router.back()} className={`h-12 rounded-[14px] border text-sm font-black ${darkMode ? "border-white/12" : "border-black/10"}`}>{step > 1 ? "Back" : "Cancel"}</button>
            {step < 5 ? <button type="button" onClick={next} className="h-12 rounded-[14px] bg-[#f6b800] text-sm font-black text-black">Continue</button> : <button type="submit" disabled={saving} className="h-12 rounded-[14px] bg-[#f6b800] text-sm font-black text-black disabled:opacity-50">{saving ? "Submitting…" : "Submit contract"}</button>}
          </div>
        </form>
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-[11px] font-black uppercase tracking-[.08em] opacity-60">{label}</span>{children}</label>;
}
