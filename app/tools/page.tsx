"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import AuthStatusButton from "@/components/AuthStatusButton";
import HomeLogoLink from "@/components/HomeLogoLink";
import LoadLinkThemeToggle from "@/components/LoadLinkThemeToggle";
import SiteMenu from "@/components/SiteMenu";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type ToolId = "quote" | "trip" | "checklist" | "documents" | "handover" | "costs" | "payment" | "pod" | "incident" | "collection" | "delivery" | "eta";
type ToolDef = { id: ToolId; label: string; short: string; category: "Plan" | "Money" | "Operations"; template?: string };
type QuoteField = "rate" | "vehicle" | "route" | "availability" | "vat" | "terms";
type PostOption = { id: string; title: string; city: string | null; vehicle_group: string | null; rate: string | null; description: string | null; listing_kind: string | null; status: string | null; moderation_status: string | null };

const TOOLS: ToolDef[] = [
  { id: "quote", label: "Rate quote", short: "Build a clear transport quote", category: "Money" },
  { id: "trip", label: "Trip brief", short: "Collection, delivery and cargo", category: "Plan", template: "TRIP BRIEF\n\nCollection\nAddress: [address]\nContact: [name + number]\nTime: [date / time]\n\nDelivery\nAddress: [address]\nContact: [name + number]\nTime: [date / time]\n\nCargo\nDescription: [cargo]\nWeight / quantity: [details]\n\nVehicle\nType / registration: [details]\n\nSpecial instructions\n[access, PPE, loading/offloading or other instructions]" },
  { id: "checklist", label: "Load checklist", short: "Pre-dispatch checks", category: "Plan", template: "LOAD CHECKLIST\n\n☐ Vehicle and driver confirmed\n☐ Cargo and weight confirmed\n☐ Collection contact confirmed\n☐ Delivery contact confirmed\n☐ Load restraints / equipment confirmed\n☐ PPE / induction / site access confirmed\n☐ POD requirements confirmed\n\nNotes: [add notes]" },
  { id: "documents", label: "Document request", short: "Request only what is needed", category: "Plan", template: "DOCUMENT REQUEST\n\nPlease provide the following for this load:\n• [vehicle details / permit / insurance]\n• [invoice details]\n• [POD requirements]\n• [other required document]\n\nDo not send passwords, PINs, OTPs or banking login information." },
  { id: "handover", label: "Driver handover", short: "Driver, vehicle and ETA", category: "Operations", template: "DRIVER HANDOVER\n\nDriver: [name]\nCell: [number]\nVehicle registration: [registration]\nTrailer registration: [registration / N/A]\nCollection ETA: [time]\nDelivery ETA: [time]\nNotes: [instructions]" },
  { id: "costs", label: "Cost breakdown", short: "Clarify charges before booking", category: "Money", template: "COST BREAKDOWN\n\nBase transport rate: [amount]\nVAT: [included / excluded / N/A]\nTolls: [included / excluded / amount]\nFuel surcharge: [included / excluded / amount]\nWaiting / detention: [free time + rate]\nLoading / offloading: [included / excluded / amount]\nOther charges: [details]\n\nFinal total: [amount]" },
  { id: "payment", label: "Payment terms", short: "Invoice, POD and payment", category: "Money", template: "PAYMENT TERMS\n\nPayment period: [7 / 14 / 30 days]\nInvoice requirements: [details]\nPOD requirements: [details]\nPayment reference: [reference]\nPayment contact: [name / department]\nOther terms: [details]" },
  { id: "pod", label: "POD request", short: "Follow up proof of delivery", category: "Operations", template: "POD REQUEST\n\nPlease send the signed proof of delivery for this load.\nLoad / reference: [reference]\nDelivery date: [date]\nReceiving contact: [name]\n\nPlease confirm the invoice/payment reference once received." },
  { id: "incident", label: "Incident update", short: "Structured operational issue", category: "Operations", template: "INCIDENT UPDATE\n\nTime: [time]\nLocation: [location]\nIssue: [breakdown / delay / damage / access / other]\nCargo status: [safe / affected / unknown]\nDriver status: [safe / assistance needed]\nAction being taken: [details]\nRevised ETA: [time / pending]\nNext update: [time]" },
  { id: "collection", label: "Collection brief", short: "Pickup details before dispatch", category: "Plan", template: "COLLECTION BRIEF\n\nAddress: [collection address]\nDate / time: [slot]\nContact: [name + number]\nCargo / quantity: [details]\nLoading method: [details]\nReference: [reference]\nSite requirements: [PPE / induction / access]" },
  { id: "delivery", label: "Delivery brief", short: "Receiving and offloading details", category: "Plan", template: "DELIVERY BRIEF\n\nAddress: [delivery address]\nDate / time: [slot]\nReceiving contact: [name + number]\nOffloading method: [details]\nPOD requirement: [details]\nReference: [reference]\nSite requirements: [PPE / induction / access]" },
  { id: "eta", label: "ETA update", short: "Clear revised arrival estimate", category: "Operations", template: "ETA UPDATE\n\nCurrent location: [location]\nCurrent ETA: [time]\nReason for change: [traffic / loading / breakdown / weather / other]\nNext update: [time / milestone]" },
];

const QUOTE_FIELDS: Array<{ id: QuoteField; label: string }> = [
  { id: "rate", label: "Rate" }, { id: "vehicle", label: "Vehicle" }, { id: "route", label: "Route" }, { id: "availability", label: "Availability" }, { id: "vat", label: "VAT" }, { id: "terms", label: "Terms" },
];

function clean(value: string) { return value.trim().replace(/\s+/g, " "); }
function extractAmount(rate: string | null) { return (rate || "").match(/[\d,.]+/)?.[0]?.replace(/,/g, "") || ""; }
function draftKey(id: ToolId) { return `loadlink-standalone-tool-draft:${id}`; }

export default function ToolsPage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [selectedId, setSelectedId] = useState<ToolId | null>(null);
  const [editorText, setEditorText] = useState("");
  const [savedNotice, setSavedNotice] = useState("");
  const [posts, setPosts] = useState<PostOption[]>([]);
  const [sourceId, setSourceId] = useState("");
  const [reuseFields, setReuseFields] = useState<QuoteField[]>([]);
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState<"total" | "km" | "ton" | "day">("total");
  const [vehicle, setVehicle] = useState("");
  const [route, setRoute] = useState("");
  const [availability, setAvailability] = useState("");
  const [vat, setVat] = useState<"included" | "excluded" | "not_applicable">("included");
  const [terms, setTerms] = useState("");

  const selected = TOOLS.find((tool) => tool.id === selectedId) || null;
  const page = darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black";
  const card = darkMode ? "border-white/10 bg-[#0d0d0d]" : "border-black/10 bg-white";
  const muted = darkMode ? "text-white/52" : "text-black/52";
  const input = `h-12 w-full rounded-2xl border px-4 text-sm font-semibold outline-none focus:border-[#f6b800] ${darkMode ? "border-white/12 bg-[#151515] text-white" : "border-black/10 bg-[#fbfaf7] text-black"}`;

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    void (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user || user.is_anonymous) return;
      const result = await supabase.from("job_listings")
        .select("id,title,city,vehicle_group,rate,description,listing_kind,status,moderation_status")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (!result.error) setPosts((result.data || []) as PostOption[]);
    })();
  }, []);

  function openTool(tool: ToolDef) {
    setSelectedId(tool.id);
    setSavedNotice("");
    if (tool.id === "quote") return;
    let stored = "";
    try { stored = window.localStorage.getItem(draftKey(tool.id)) || ""; } catch {}
    setEditorText(stored || tool.template || "");
  }

  function saveTextDraft() {
    if (!selected || selected.id === "quote") return;
    try { window.localStorage.setItem(draftKey(selected.id), editorText); } catch {}
    setSavedNotice("Draft saved on this device.");
  }

  async function copyText(value: string) {
    if (!value.trim()) return;
    try { await navigator.clipboard.writeText(value); setSavedNotice("Copied."); } catch { setSavedNotice("Select and copy the text manually."); }
  }

  async function shareText(value: string) {
    if (!value.trim()) return;
    if (navigator.share) {
      try { await navigator.share({ title: selected?.label || "LoadLink tool", text: value }); return; } catch {}
    }
    await copyText(value);
  }

  const activePosts = useMemo(() => posts.filter((post) => (post.status || "active") === "active" && (post.moderation_status || "pending") !== "rejected"), [posts]);
  const selectedPost = activePosts.find((post) => post.id === sourceId) || null;

  function choosePost(id: string) {
    setSourceId(id);
    const source = activePosts.find((post) => post.id === id);
    if (!source) { setReuseFields([]); return; }
    const available: QuoteField[] = [];
    if (source.rate) available.push("rate");
    if (source.vehicle_group || source.title) available.push("vehicle");
    if (source.city) available.push("route");
    available.push("availability", "vat", "terms");
    setReuseFields(available);
  }

  function applyPostInfo() {
    if (!selectedPost) return;
    if (reuseFields.includes("rate")) setAmount(extractAmount(selectedPost.rate));
    if (reuseFields.includes("vehicle")) setVehicle(clean([selectedPost.vehicle_group, selectedPost.title].filter(Boolean).join(" · ")));
    if (reuseFields.includes("route")) setRoute(selectedPost.city || "");
    if (reuseFields.includes("availability")) setAvailability("Available — confirm date and time");
    if (reuseFields.includes("vat")) setVat("included");
    if (reuseFields.includes("terms")) setTerms("");
    setSavedNotice("Selected information added to the quote.");
  }

  const quoteText = useMemo(() => {
    if (!amount.trim() && !vehicle.trim() && !route.trim()) return "";
    const unitText = unit === "total" ? "total trip" : unit === "km" ? "per km" : unit === "ton" ? "per ton" : "per day";
    return [
      "RATE QUOTE",
      amount.trim() ? `Rate: R${clean(amount)} ${unitText}` : "",
      vehicle.trim() ? `Vehicle: ${clean(vehicle)}` : "",
      route.trim() ? `Route: ${clean(route)}` : "",
      availability.trim() ? `Availability: ${clean(availability)}` : "",
      `VAT: ${vat.replace("_", " ")}`,
      terms.trim() ? `Terms: ${clean(terms)}` : "",
    ].filter(Boolean).join("\n");
  }, [amount, availability, route, terms, unit, vat, vehicle]);

  return (
    <main className={`min-h-screen ${page}`}>
      <header className={`sticky top-0 z-40 border-b ${darkMode ? "border-white/10 bg-black" : "border-black/10 bg-white"}`}>
        <div className="grid h-20 grid-cols-[92px_1fr_52px] items-center px-4 md:px-7">
          <div className="flex items-center gap-2"><SiteMenu darkMode={darkMode} /><AuthStatusButton darkMode={darkMode} /></div>
          <HomeLogoLink theme={darkMode ? "dark" : "light"} />
          <LoadLinkThemeToggle darkMode={darkMode} onToggle={toggleTheme} className="ml-auto" />
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-20 pt-7 md:px-7 md:pt-11">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#b88900]">LoadLink workspace</p><h1 className="mt-2 text-4xl font-black tracking-[-.055em] md:text-6xl">Logistics tools</h1><p className={`mt-3 max-w-2xl text-sm font-semibold leading-6 md:text-base ${muted}`}>Standalone tools you can use before, during or after a conversation. Pick a symbol, edit the output and use it anywhere.</p></div>
          <Link href="/messages" className={`flex h-11 items-center justify-center rounded-2xl border px-5 text-xs font-black ${darkMode ? "border-white/12" : "border-black/10"}`}>Open messages</Link>
        </div>

        {!selected ? (
          <>
            {(["Plan", "Money", "Operations"] as const).map((category) => (
              <section key={category} className="mt-8">
                <div className="mb-3 flex items-end justify-between"><div><h2 className="text-xl font-black">{category === "Plan" ? "Plan & prepare" : category === "Money" ? "Quotes & payment" : "Live operations"}</h2><p className={`mt-1 text-xs font-semibold ${muted}`}>{category === "Plan" ? "Get the load organised before dispatch." : category === "Money" ? "Keep pricing and payment details clear." : "Keep everyone aligned while the job is moving."}</p></div></div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {TOOLS.filter((tool) => tool.category === category).map((tool) => (
                    <button key={tool.id} type="button" onClick={() => openTool(tool)} className={`group min-h-[150px] rounded-[24px] border p-4 text-left transition hover:-translate-y-0.5 hover:border-[#f6b800] ${card}`}>
                      <span className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-black text-[#f6b800] ring-1 ring-[#f6b800]/30"><ToolIcon id={tool.id} /></span>
                      <strong className="mt-4 block text-base font-black tracking-[-.02em]">{tool.label}</strong>
                      <span className={`mt-1.5 block text-[11px] font-semibold leading-4 ${muted}`}>{tool.short}</span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </>
        ) : (
          <section className={`mt-7 overflow-hidden rounded-[28px] border ${card}`}>
            <div className={`flex items-start justify-between gap-4 border-b p-5 md:p-7 ${darkMode ? "border-white/10" : "border-black/10"}`}>
              <div className="flex min-w-0 items-start gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-black text-[#f6b800]"><ToolIcon id={selected.id} /></span><div><p className="text-[9px] font-black uppercase tracking-[.14em] text-[#b88900]">Standalone tool</p><h2 className="mt-1 text-3xl font-black tracking-[-.04em]">{selected.label}</h2><p className={`mt-1 text-xs font-semibold ${muted}`}>{selected.short}</p></div></div>
              <button type="button" onClick={() => { setSelectedId(null); setSavedNotice(""); }} className={`h-10 shrink-0 rounded-xl border px-3 text-xs font-black ${darkMode ? "border-white/12" : "border-black/10"}`}>All tools</button>
            </div>

            {selected.id === "quote" ? (
              <div className="grid gap-6 p-5 md:grid-cols-[.92fr_1.08fr] md:p-7">
                <div>
                  <div className={`rounded-[22px] border p-4 ${darkMode ? "border-white/10 bg-white/[.025]" : "border-black/10 bg-[#faf9f5]"}`}>
                    <p className="text-[10px] font-black uppercase tracking-[.13em] text-[#b88900]">Reuse a LoadLink post</p>
                    <p className={`mt-1 text-xs font-semibold leading-5 ${muted}`}>Choose one of your posts, then choose exactly which information should be copied into this quote.</p>
                    <select value={sourceId} onChange={(event: ChangeEvent<HTMLSelectElement>) => choosePost(event.target.value)} className={`mt-3 ${input}`}><option value="">Choose a post</option>{activePosts.map((post) => <option key={post.id} value={post.id}>{post.title} · {post.city || "No city"}</option>)}</select>
                    {selectedPost ? <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{QUOTE_FIELDS.map((field) => <label key={field.id} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-[11px] font-bold ${reuseFields.includes(field.id) ? "border-[#f6b800] bg-[#f6b800]/10" : darkMode ? "border-white/10" : "border-black/10"}`}><input type="checkbox" checked={reuseFields.includes(field.id)} onChange={() => setReuseFields((current) => current.includes(field.id) ? current.filter((item) => item !== field.id) : [...current, field.id])} className="accent-[#f6b800]" />{field.label}</label>)}</div> : null}
                    {selectedPost ? <button type="button" onClick={applyPostInfo} disabled={!reuseFields.length} className="mt-3 h-11 w-full rounded-xl bg-[#f6b800] text-xs font-black text-black disabled:opacity-40">Use selected information</button> : null}
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label><span className="mb-1.5 block text-[10px] font-black uppercase tracking-[.12em]">Rate</span><input className={input} inputMode="decimal" value={amount} onChange={(event: ChangeEvent<HTMLInputElement>) => setAmount(event.target.value)} placeholder="e.g. 18500" /></label>
                    <label><span className="mb-1.5 block text-[10px] font-black uppercase tracking-[.12em]">Unit</span><select className={input} value={unit} onChange={(event: ChangeEvent<HTMLSelectElement>) => setUnit(event.target.value as typeof unit)}><option value="total">Total trip</option><option value="km">Per km</option><option value="ton">Per ton</option><option value="day">Per day</option></select></label>
                    <label className="sm:col-span-2"><span className="mb-1.5 block text-[10px] font-black uppercase tracking-[.12em]">Vehicle</span><input className={input} value={vehicle} onChange={(event: ChangeEvent<HTMLInputElement>) => setVehicle(event.target.value)} placeholder="Vehicle type or unit" /></label>
                    <label className="sm:col-span-2"><span className="mb-1.5 block text-[10px] font-black uppercase tracking-[.12em]">Route</span><input className={input} value={route} onChange={(event: ChangeEvent<HTMLInputElement>) => setRoute(event.target.value)} placeholder="Collection → delivery" /></label>
                    <label><span className="mb-1.5 block text-[10px] font-black uppercase tracking-[.12em]">Availability</span><input className={input} value={availability} onChange={(event: ChangeEvent<HTMLInputElement>) => setAvailability(event.target.value)} placeholder="Date / time" /></label>
                    <label><span className="mb-1.5 block text-[10px] font-black uppercase tracking-[.12em]">VAT</span><select className={input} value={vat} onChange={(event: ChangeEvent<HTMLSelectElement>) => setVat(event.target.value as typeof vat)}><option value="included">Included</option><option value="excluded">Excluded</option><option value="not_applicable">Not applicable</option></select></label>
                    <label className="sm:col-span-2"><span className="mb-1.5 block text-[10px] font-black uppercase tracking-[.12em]">Terms</span><textarea className={`${input} min-h-28 py-3`} value={terms} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setTerms(event.target.value)} placeholder="Payment, waiting time, tolls or other terms" /></label>
                  </div>
                </div>
                <OutputPanel darkMode={darkMode} text={quoteText} notice={savedNotice} onCopy={() => void copyText(quoteText)} onShare={() => void shareText(quoteText)} />
              </div>
            ) : (
              <div className="grid gap-6 p-5 md:grid-cols-[1.05fr_.95fr] md:p-7">
                <div><label className="block text-[10px] font-black uppercase tracking-[.13em]">Edit the tool</label><textarea value={editorText} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setEditorText(event.target.value)} className={`mt-2 min-h-[460px] w-full rounded-[22px] border p-4 font-mono text-sm leading-6 outline-none focus:border-[#f6b800] ${darkMode ? "border-white/12 bg-[#111] text-white" : "border-black/10 bg-[#fbfaf7] text-black"}`} /><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={saveTextDraft} className={`h-11 rounded-xl border text-xs font-black ${darkMode ? "border-white/12" : "border-black/10"}`}>Save draft</button><button type="button" onClick={() => setEditorText(selected.template || "")} className={`h-11 rounded-xl border text-xs font-black ${darkMode ? "border-white/12" : "border-black/10"}`}>Reset</button></div></div>
                <OutputPanel darkMode={darkMode} text={editorText} notice={savedNotice} onCopy={() => void copyText(editorText)} onShare={() => void shareText(editorText)} />
              </div>
            )}
          </section>
        )}
      </section>
    </main>
  );
}

function OutputPanel({ darkMode, text, notice, onCopy, onShare }: { darkMode: boolean; text: string; notice: string; onCopy: () => void; onShare: () => void }) {
  return <div className={`h-fit rounded-[24px] border p-4 md:sticky md:top-28 md:p-5 ${darkMode ? "border-white/10 bg-black" : "border-black/10 bg-[#f8f4ea]"}`}><p className="text-[10px] font-black uppercase tracking-[.13em] text-[#b88900]">Ready to use</p><pre className={`mt-3 min-h-44 whitespace-pre-wrap rounded-2xl border p-4 font-sans text-xs font-semibold leading-6 ${darkMode ? "border-white/10 bg-white/[.035] text-white/75" : "border-black/10 bg-white text-black/70"}`}>{text || "Your completed tool will appear here."}</pre>{notice ? <p className="mt-2 text-[10px] font-bold text-[#b88900]">{notice}</p> : null}<div className="mt-3 grid grid-cols-2 gap-2"><button type="button" disabled={!text.trim()} onClick={onCopy} className="h-11 rounded-xl bg-[#f6b800] text-xs font-black text-black disabled:opacity-40">Copy</button><button type="button" disabled={!text.trim()} onClick={onShare} className={`h-11 rounded-xl border text-xs font-black disabled:opacity-40 ${darkMode ? "border-white/12" : "border-black/10"}`}>Share</button></div></div>;
}

function ToolIcon({ id }: { id: ToolId }) {
  const common = { width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", "aria-hidden": true } as const;
  if (id === "quote" || id === "costs" || id === "payment") return <svg {...common}><path d="M5 3h14v18H5V3Zm3 5h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
  if (id === "trip" || id === "collection" || id === "delivery" || id === "eta") return <svg {...common}><path d="M4 17h16M6 17V8h9l3 4v5M8 10h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><circle cx="8" cy="18" r="2" stroke="currentColor" strokeWidth="2" /><circle cx="17" cy="18" r="2" stroke="currentColor" strokeWidth="2" /></svg>;
  if (id === "checklist" || id === "documents" || id === "pod") return <svg {...common}><path d="M6 3h12v18H6V3Zm3 5 1 1 2-2m-3 6 1 1 2-2m2-4h2m-2 5h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (id === "incident") return <svg {...common}><path d="m12 3 9 17H3L12 3Zm0 6v5m0 3h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  return <svg {...common}><circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="2" /><path d="M3 21a5 5 0 0 1 10 0m3-12h5m-5 4h5m-5 4h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
}
