"use client";


import LoadLinkIcon from "@/components/LoadLinkIcon";

import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import VehicleUsefulTools from "@/components/VehicleUsefulTools";
import LogisticsDocumentEditor from "@/components/LogisticsDocumentEditor";
import LoadLinkDocumentPreview from "@/components/LoadLinkDocumentPreview";
import Link from "next/link";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { parsePostedRate, rateUnitLabel, type RateUnit } from "@/lib/logisticsQuote";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type Category = "All" | "Planning" | "Money" | "Operations";
type ToolId = "quote" | "trip" | "checklist" | "documents" | "handover" | "costs" | "payment" | "pod" | "incident" | "collection" | "delivery" | "eta";
type Tool = { id: ToolId; name: string; description: string; category: Exclude<Category,"All">; template?: string };
type QuoteField = "rate" | "vehicle" | "route";
type PostRow = { id:string; title:string; city:string|null; vehicle_group:string|null; rate:string|null; description:string|null; status:string|null; moderation_status:string|null };

const TOOLS: Tool[] = [
  { id:"quote", name:"Rate quote", description:"Build a clean transport quote", category:"Money" },
  { id:"trip", name:"Trip brief", description:"Collection, delivery and cargo", category:"Planning", template:"TRIP BRIEF\n\nCollection\nAddress: \nContact: \nTime: \n\nDelivery\nAddress: \nContact: \nTime: \n\nCargo\nDescription: \nWeight / quantity: \n\nVehicle\nType / registration: \n\nSpecial instructions:\n" },
  { id:"checklist", name:"Load checklist", description:"Pre-dispatch checks", category:"Planning", template:"LOAD CHECKLIST\n\n[ ] Vehicle and driver confirmed\n[ ] Cargo and weight confirmed\n[ ] Collection contact confirmed\n[ ] Delivery contact confirmed\n[ ] Load restraints / equipment confirmed\n[ ] PPE / site access confirmed\n[ ] POD requirements confirmed\n\nNotes:\n" },
  { id:"documents", name:"Document request", description:"Ask for required documents", category:"Planning", template:"DOCUMENT REQUEST\n\nLoad / reference: \nVehicle / permit details: \nInvoice details: \nPOD requirements: \nOther required document: \n\nDo not send passwords, PINs or OTPs." },
  { id:"handover", name:"Driver handover", description:"Driver, vehicle and ETA", category:"Operations", template:"DRIVER HANDOVER\n\nDriver: \nCell: \nVehicle registration: \nTrailer registration: \nCollection ETA: \nDelivery ETA: \nNotes:\n" },
  { id:"costs", name:"Cost breakdown", description:"Clarify all charges", category:"Money", template:"COST BREAKDOWN\n\nBase transport rate: \nVAT: \nTolls: \nFuel surcharge: \nWaiting / detention: \nLoading / offloading: \nOther charges: \n\nFinal total:\n" },
  { id:"payment", name:"Payment terms", description:"Invoice, POD and payment", category:"Money", template:"PAYMENT TERMS\n\nPayment period: \nInvoice requirements: \nPOD requirements: \nPayment reference: \nPayment contact: \nOther terms:\n" },
  { id:"pod", name:"POD request", description:"Request proof of delivery", category:"Operations", template:"POD REQUEST\n\nPlease send the signed proof of delivery.\nLoad / reference: \nDelivery date: \nReceiving contact: \n\nPlease confirm the invoice/payment reference once received." },
  { id:"incident", name:"Incident update", description:"Structured operational issue", category:"Operations", template:"INCIDENT UPDATE\n\nTime: \nLocation: \nIssue: \nCargo status: \nDriver status: \nAction being taken: \nRevised ETA: \nNext update:\n" },
  { id:"collection", name:"Collection brief", description:"Pickup details before dispatch", category:"Planning", template:"COLLECTION BRIEF\n\nAddress: \nDate / time: \nContact: \nCargo / quantity: \nLoading method: \nReference: \nSite requirements:\n" },
  { id:"delivery", name:"Delivery brief", description:"Receiving and offloading", category:"Planning", template:"DELIVERY BRIEF\n\nAddress: \nDate / time: \nReceiving contact: \nOffloading method: \nPOD requirement: \nReference: \nSite requirements:\n" },
  { id:"eta", name:"ETA update", description:"Share a revised arrival time", category:"Operations", template:"ETA UPDATE\n\nCurrent location: \nCurrent ETA: \nReason for change: \nNext update:\n" },
];

const FIELDS: Array<{id:QuoteField; label:string}> = [
  {id:"rate",label:"Rate"},{id:"vehicle",label:"Vehicle"},{id:"route",label:"Route"},
];

export default function ToolsPage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [category,setCategory] = useState<Category>("All");
  const [selected,setSelected] = useState<ToolId|null>(null);
  const [workspaceTab, setWorkspaceTab] = useState<"details" | "preview">("details");
  const [text,setText] = useState("");
  const [notice,setNotice] = useState("");
  const [posts,setPosts] = useState<PostRow[]>([]);
  const [sourceId,setSourceId] = useState("");
  const [reuse,setReuse] = useState<QuoteField[]>([]);
  const [amount,setAmount] = useState("");
  const [quantity,setQuantity] = useState("");
  const closeToolRef = useRef<HTMLButtonElement>(null);
  const [unit, setUnit] = useState<RateUnit>("total");
  const [vehicle,setVehicle] = useState("");
  const [route,setRoute] = useState("");
  const [availability,setAvailability] = useState("");
  const [vat,setVat] = useState<""|"included"|"excluded"|"not_applicable">("");
  const [terms,setTerms] = useState("");

  const page = darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black";
  const card = darkMode ? "border-white/10 bg-[#0d0d0d]" : "border-black/10 bg-white";
  const muted = darkMode ? "text-white/50" : "text-black/50";
  const input = `h-12 w-full rounded-xl border px-4 text-sm font-bold outline-none focus:border-[#f6b800] ${darkMode?"border-white/10 bg-white/[.035]":"border-black/10 bg-[#faf9f5]"}`;
  const visible = category === "All" ? TOOLS : TOOLS.filter(tool=>tool.category===category);
  const tool = TOOLS.find(item=>item.id===selected) || null;
  const activePosts = useMemo(()=>posts.filter(p=>(p.status||"active")==="active" && (p.moderation_status||"pending")!=="rejected"),[posts]);
  const source = activePosts.find(p=>p.id===sourceId)||null;
  useEffect(() => {
    if (!selected) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => closeToolRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [selected]);

  useEffect(()=>{
    if(!isSupabaseConfigured) return;
    void (async()=>{
      const {data:userData}=await supabase.auth.getUser();
      if(!userData.user || userData.user.is_anonymous) return;
      const result=await supabase.from("job_listings").select("id,title,city,vehicle_group,rate,description,status,moderation_status").eq("user_id",userData.user.id).order("created_at",{ascending:false}).limit(30);
      if(!result.error) setPosts((result.data||[]) as PostRow[]);
    })();
  },[]);

  function openTool(id:ToolId){
    setSelected(id); setWorkspaceTab("details"); setNotice("");
    const current=TOOLS.find(item=>item.id===id);
    if(id==="quote") return;
    let stored="";
    try{stored=localStorage.getItem(`loadlink-tool:${id}`)||"";}catch{}
    setText(stored||current?.template||"");
    // The selected tool opens as a contained dialog instead of scrolling the whole page.
  }

  function choosePost(id:string){
    setSourceId(id);
    const post=activePosts.find(p=>p.id===id);
    if(!post){setReuse([]);return;}
    const next:QuoteField[]=[];
    if(parsePostedRate(post.rate)) next.push("rate");
    if(post.vehicle_group) next.push("vehicle");
    if(post.city) next.push("route");
    setReuse(next);
  }

  function applyPost(){
    if(!source) return;
    if(reuse.includes("rate")) { const rate = parsePostedRate(source.rate); if (rate) { setAmount(rate.amount); setUnit(rate.unit); } }
    if(reuse.includes("vehicle")) setVehicle(source.vehicle_group||"");
    if(reuse.includes("route")) setRoute(source.city||"");
    setNotice("Selected information added.");
  }

  // A per-unit rate is not the final payable total until a quantity is supplied.
  // Keep VAT conditional on the poster's explicit selection; never assume VAT registration.
  const rate = Number(amount);
  const units = unit === "total" ? 1 : Number(quantity);
  const hasBase = amount.trim() !== "" && Number.isFinite(rate) && rate >= 0;
  const hasQuantity = unit === "total" || (quantity.trim() !== "" && Number.isFinite(units) && units > 0);
  const subtotal = hasBase && hasQuantity ? Math.round((rate * units + Number.EPSILON) * 100) / 100 : null;
  const vatValue = subtotal === null || !vat ? null : vat === "included" ? Math.round((subtotal / 1.15 * 0.15) * 100) / 100 : vat === "excluded" ? Math.round(subtotal * 0.15 * 100) / 100 : 0;
  const finalTotal = subtotal === null ? null : vat === "excluded" && vatValue !== null ? Math.round((subtotal + vatValue) * 100) / 100 : subtotal;
  const money = (value: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", minimumFractionDigits: 2 }).format(value);
  const quoteText = [
    "LOADLINK RATE QUOTE",
    "",
    "Rate: " + (hasBase ? money(rate) + " " + rateUnitLabel(unit) : "Not entered"),
    ...(unit === "total" ? [] : ["Quantity (" + (unit === "km" ? "km" : unit === "ton" ? "tonnes" : "days") + "): " + (hasQuantity ? String(units) : "Not entered")]),
    "Vehicle: " + (vehicle.trim() || "Not specified"),
    "Route: " + (route.trim() || "Not specified"),
    "Availability: " + (availability.trim() || "Not confirmed"),
    "VAT: " + (vat ? vat.replaceAll("_", " ") + (vat === "not_applicable" ? "" : " (15%)") : "Not confirmed"),
    ...(subtotal !== null ? ["", "Amount before VAT adjustments: " + money(subtotal)] : ["", "Total: Enter the rate and quantity to calculate"]),
    ...(vatValue !== null ? ["VAT component: " + money(vatValue)] : []),
    ...(finalTotal !== null ? ["Quoted total" + (!vat ? " (VAT unconfirmed)" : "") + ": " + money(finalTotal)] : []),
    "",
    "Terms: " + (terms.trim() || "Not specified"),
    "",
    "Draft estimate. Confirm route, loads, VAT treatment and commercial terms before sending.",
  ].join("\\n");

  async function copy(value:string){
    if(!value.trim()) return;
    try{await navigator.clipboard.writeText(value);setNotice("Copied.");}catch{setNotice("Select the text and copy it manually.");}
  }
  async function share(value:string){
    if(!value.trim()) return;
    if(navigator.share){try{await navigator.share({title:tool?.name||"LoadLink tool",text:value});return;}catch{}}
    await copy(value);
  }
  function save(){
    if(!tool || tool.id==="quote") return;
    try{localStorage.setItem(`loadlink-tool:${tool.id}`,text);setNotice("Draft saved on this device.");}catch{setNotice("Draft could not be saved on this device.");}
  }

  return <main className={`min-h-screen ${page}`}>
    <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />

    <section data-loadlink-tools className="mx-auto max-w-6xl px-4 pb-24 pt-7 md:px-7 md:pt-11">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div><h1 className="text-4xl font-black tracking-[-.05em] md:text-6xl">Logistics tools</h1><p className={`mt-3 max-w-2xl text-sm font-semibold leading-6 md:text-base ${muted}`}>Create quotes, plan trips and prepare updates. Choose a tool to get started.</p></div>
        {!tool ? <div className={`flex gap-1 overflow-x-auto rounded-2xl border p-1 ${card}`}>
          {(["All","Planning","Money","Operations"] as Category[]).map(item=><button key={item} type="button" onClick={()=>setCategory(item)} className={`shrink-0 rounded-xl px-4 py-2.5 text-xs font-black ${category===item?"bg-[#f6b800] text-black shadow-sm":muted}`}>{item}</button>)}
        </div> : <button type="button" onClick={() => setSelected(null)} className="self-start rounded-full border border-current/20 px-5 py-3 text-sm font-bold">All tools</button>}
      </div>

      {!tool ? <><VehicleUsefulTools darkMode={darkMode} />

      <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {visible.map(item=><button key={item.id} type="button" onClick={()=>openTool(item.id)} className={`group min-h-[128px] rounded-2xl border p-4 text-left transition ${selected===item.id?"border-[#f6b800] bg-[#f6b800] text-black":card}`}>
          <ToolIcon id={item.id} active={selected===item.id}/>
          <h2 className="mt-3 text-base font-black tracking-[-.02em]">{item.name}</h2>
          <p className={`mt-1 text-xs font-semibold leading-5 ${selected===item.id?"text-black/60":muted}`}>{item.description}</p>
        </button>)}
      </div></> : null}

      {tool ? <div role="presentation" className="fixed inset-0 z-[1100] overflow-y-auto overscroll-contain bg-black/75 p-0 sm:p-5" data-loadlink-tool-dialog="true">
        <button type="button" onClick={() => setSelected(null)} className="fixed inset-0 z-0 cursor-default" aria-label="Close tool dialog" />
        <section role="dialog" aria-modal="true" aria-labelledby="loadlink-tool-dialog-title" id="tool-workspace" className={`relative z-10 mx-auto min-h-[100dvh] w-full max-w-5xl overflow-hidden border-0 shadow-[0_20px_80px_rgba(0,0,0,.25)] sm:my-4 sm:min-h-0 sm:rounded-[18px] sm:border ${card}`}>
        <div className={`flex items-start justify-between gap-4 border-b p-5 md:p-6 ${darkMode?"border-white/10":"border-black/10"}`}>
          <div className="flex items-center gap-3"><ToolIcon id={tool.id}/><div><h2 id="loadlink-tool-dialog-title" className="text-xl font-bold tracking-[-.03em]">{tool.name}</h2><p className={`mt-1 text-xs font-semibold ${muted}`}>{tool.description}</p></div></div>
          <button ref={closeToolRef} type="button" onClick={()=>setSelected(null)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-current/10 text-xl" aria-label="Close"><LoadLinkIcon name="close" size={18} className="inline-block shrink-0 align-middle" /></button>
        </div>

        <div className="mx-4 mt-4 grid grid-cols-2 rounded-full border border-current/15 p-1 md:hidden">{(["details", "preview"] as const).map(tab => <button key={tab} type="button" aria-pressed={workspaceTab === tab} onClick={() => setWorkspaceTab(tab)} className={`rounded-full px-4 py-3 text-sm font-bold ${workspaceTab === tab ? "bg-[#f6b800] text-black" : ""}`}>{tab === "details" ? "Details" : "Preview"}</button>)}</div>{tool.id==="quote" ? <><div className="grid items-start gap-5 p-4 md:grid-cols-[.9fr_1.1fr] md:p-6">
          <div className={`${workspaceTab === "details" ? "grid" : "hidden"} gap-4 md:grid`}>
            {activePosts.length ? <div className={`rounded-2xl border p-4 ${darkMode?"border-white/10 bg-white/[.02]":"border-black/10 bg-[#faf9f5]"}`}>
              <h3 className="text-sm font-black">Reuse from one of your posts</h3>
              <p className={`mt-1 text-xs font-semibold ${muted}`}>Choose a post, then choose only the information you want.</p>
              <select value={sourceId} onChange={(e: ChangeEvent<HTMLSelectElement>)=>choosePost(e.target.value)} className={`mt-3 ${input}`}><option value="">Choose a post</option>{activePosts.map(post=><option key={post.id} value={post.id}>{post.title} · {post.city||"No location"}</option>)}</select>
              {source ? <><div className="mt-3 grid grid-cols-2 gap-2">{FIELDS.filter(field => (field.id === "rate" && parsePostedRate(source.rate)) || (field.id === "vehicle" && source.vehicle_group) || (field.id === "route" && source.city)).map(field=><label key={field.id} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-black ${darkMode?"border-white/10":"border-black/10"}`}><input type="checkbox" checked={reuse.includes(field.id)} onChange={()=>setReuse(current=>current.includes(field.id)?current.filter(v=>v!==field.id):[...current,field.id])} className="accent-[#f6b800]"/>{field.label}</label>)}</div><button type="button" onClick={applyPost} className="mt-3 h-11 w-full rounded-full bg-[#f6b800] text-xs font-bold text-black">Use selected information</button></> : null}
            </div> : null}
            <div className="grid grid-cols-2 gap-3"><label className="text-xs font-black">Rate (R)<input value={amount} onChange={(e: ChangeEvent<HTMLInputElement>)=>setAmount(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" placeholder="e.g. 8500" className={`mt-2 ${input}`}/></label><label className="text-xs font-black">Rate unit<select value={unit} onChange={event => setUnit(event.target.value as RateUnit)} className={`mt-2 ${input}`}><option value="total">Total trip</option><option value="km">Per km</option><option value="ton">Per ton</option><option value="day">Per day</option></select></label></div>
            {unit !== "total" ? (
              <label className="text-xs font-semibold">Quantity ({unit === "km" ? "km" : unit === "ton" ? "tonnes" : "days"})
                <input type="text" inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="Enter the quantity for this quote" className={`mt-2 ${input}`} />
              </label>
            ) : null}
            {finalTotal !== null ? <p className="text-sm font-semibold" aria-live="polite">Estimated quote total: <strong>{money(finalTotal)}</strong>{!vat ? " · VAT not confirmed" : null}</p> : null}
            <label className="text-xs font-black">Vehicle<input value={vehicle} onChange={(e: ChangeEvent<HTMLInputElement>)=>setVehicle(e.target.value)} placeholder="e.g. 34-ton side tipper" className={`mt-2 ${input}`}/></label>
            <label className="text-xs font-black">Route<input value={route} onChange={(e: ChangeEvent<HTMLInputElement>)=>setRoute(e.target.value)} placeholder="Collection → delivery" className={`mt-2 ${input}`}/></label>
            <label className="text-xs font-black">Availability<input value={availability} onChange={(e: ChangeEvent<HTMLInputElement>)=>setAvailability(e.target.value)} placeholder="Date / time" className={`mt-2 ${input}`}/></label>
            <label className="text-xs font-black">VAT<select value={vat} onChange={(e: ChangeEvent<HTMLSelectElement>)=>setVat(e.target.value as typeof vat)} className={`mt-2 ${input}`}><option value="">Select VAT status</option><option value="included">Included</option><option value="excluded">Excluded</option><option value="not_applicable">Not applicable</option></select></label>
            <label className="text-xs font-black">Terms<textarea value={terms} onChange={(e: ChangeEvent<HTMLTextAreaElement>)=>setTerms(e.target.value)} rows={3} className={`mt-2 min-h-24 py-3 ${input}`}/></label>
          </div>
          <div className={`${workspaceTab === "preview" ? "grid" : "hidden"} min-w-0 gap-3 md:grid`}><LoadLinkDocumentPreview darkMode={darkMode} documentType="Rate quote" body={quoteText} /><ToolOutput value={quoteText} showText={false} darkMode={darkMode} onCopy={()=>void copy(quoteText)} onShare={()=>void share(quoteText)}/></div>
        </div></> : <div className="grid gap-5 p-4 md:grid-cols-[1fr_.8fr] md:p-6">
          <div className={`${workspaceTab === "details" ? "block" : "hidden"} md:block`}><LogisticsDocumentEditor value={text} template={tool.template || ""} title={tool.name} darkMode={darkMode} onChange={setText} /></div>
          <div className={`${workspaceTab === "preview" ? "block" : "hidden"} md:block min-w-0 space-y-3`}><LoadLinkDocumentPreview darkMode={darkMode} documentType={tool.name} body={text} /><ToolOutput value={text} showText={false} darkMode={darkMode} onCopy={()=>void copy(text)} onShare={()=>void share(text)}/><button type="button" onClick={save} className="mt-3 h-11 w-full rounded-xl border border-current/10 text-xs font-black">Save draft on this device</button></div>
        </div>}

        {notice ? <p role="status" className={`border-t px-5 py-3 text-xs font-bold md:px-6 ${darkMode?"border-white/10 text-white/55":"border-black/10 text-black/55"}`}>{notice}</p> : null}
        </section>
      </div> : null}
    </section>
  </main>
}

function ToolOutput({value,darkMode,onCopy,onShare,showText=true}:{value:string;darkMode:boolean;onCopy:()=>void;onShare:()=>void;showText?:boolean}){
  return <div className={`rounded-2xl border p-4 ${darkMode?"border-white/10 bg-white/[.025]":"border-black/10 bg-[#faf9f5]"}`}>{showText ? <><h3 className="text-sm font-black">Text preview</h3><pre className="mt-3 max-h-[360px] overflow-auto whitespace-pre-wrap break-words text-xs font-semibold leading-6 opacity-65">{value||"Complete the fields to build your output."}</pre></> : null}<div className={`${showText ? "mt-4" : ""} grid grid-cols-2 gap-2`}><button type="button" onClick={onCopy} className="h-11 rounded-full bg-[#f6b800] text-xs font-bold text-black">Copy</button><button type="button" onClick={onShare} className="h-11 rounded-full border border-current/20 text-xs font-bold">Share</button></div></div>
}

function ToolIcon({id,active=false}:{id:ToolId;active?:boolean}){
  const cls=`flex h-11 w-11 items-center justify-center rounded-xl ${active?"bg-black text-[#f6b800]":"bg-black text-[#f6b800]"}`;
  const common={width:21,height:21,viewBox:"0 0 24 24",fill:"none","aria-hidden":true} as const;
  return <span className={cls}>{id==="quote"?<svg {...common}><path d="M5 4h14v16H5V4Zm3 4h8M8 12h5M8 16h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  :id==="trip"||id==="collection"||id==="delivery"?<svg {...common}><path d="M4 17h16M6 17V8h8l4 4v5M8 20h.01M17 20h.01M14 8v4h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
  :id==="checklist"?<svg {...common}><path d="M9 6h10M9 12h10M9 18h10M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  :id==="documents"||id==="pod"?<svg {...common}><path d="M6 3h9l3 3v15H6V3Zm9 0v4h4M9 11h6M9 15h6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/></svg>
  :id==="costs"||id==="payment"?<svg {...common}><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M3 9h18M7 15h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  :id==="incident"?<svg {...common}><path d="M12 3 2.8 20h18.4L12 3Zm0 6v5m0 3h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
  :id==="eta"?<svg {...common}><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  :<svg {...common}><circle cx="8" cy="7" r="3" stroke="currentColor" strokeWidth="2"/><path d="M3 20a5 5 0 0 1 10 0M15 8h6M18 5v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>}</span>
}
