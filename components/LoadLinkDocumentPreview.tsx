"use client";

import LoadLinkImage from "@/components/LoadLinkImage";
import { supabase } from "@/lib/supabaseClient";
import styles from "./LoadLinkDocumentPreview.module.css";
import BusinessLogoEditor from "./BusinessLogoEditor";
import { readBusinessBranding, brandingRequest } from "@/lib/businessBranding";
import { pdfFromPages } from "@/lib/logisticsPdf";
import { documentSections } from "@/lib/logisticsDocument";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

type DocumentPreviewProps = {
  darkMode?: boolean;
  documentType?: string;
  reference?: string;
  amount?: string;
  unit?: string;
  vehicle?: string;
  route?: string;
  availability?: string;
  vat?: string;
  terms?: string;
  clientName?: string;
  body?: string;
  compact?: boolean;
};

export type LoadLinkPdfDocument = {
  documentType?: string;
  reference?: string;
  amount?: string;
  unit?: string;
  vehicle?: string;
  route?: string;
  availability?: string;
  vat?: string;
  terms?: string;
  clientName?: string;
  businessLogo?: string;
  body?: string;
};



export default function LoadLinkDocumentPreview({
  darkMode = false,
  documentType = "Rate quote",
  reference,
  amount = "",
  unit = "total",
  vehicle = "",
  route = "",
  availability = "",
  vat = "included",
  terms = "",
  clientName = "",
  body,
}: DocumentPreviewProps) {
  const [businessLogo, setBusinessLogo] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [canBrand, setCanBrand] = useState(false);
  const [logoBusy, setLogoBusy] = useState(true);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [logoMessage, setLogoMessage] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const closeLogo = useCallback(() => setLogoFile(null), []);

  useEffect(() => {
    let active = true, generation = 0, authUser: string | null = null;
    const load = () => {
      if (!active) return; const current = ++generation; setLogoBusy(true);
      void readBusinessBranding().then(state => { if (active && current === generation) { authUser = state.userId; setBusinessLogo(state.logo); setCanBrand(state.allowed); setLogoMessage(""); } }).catch(() => { if (active && current === generation) { setBusinessLogo(""); setCanBrand(false); setLogoMessage("Business branding could not load. Retry to include your logo, or download without it."); } }).finally(() => { if (active && current === generation) setLogoBusy(false); });
    };
    const frame = requestAnimationFrame(load);
    const auth = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") { authUser = null; generation++; setBusinessLogo(""); setLogoFile(null); setCanBrand(false); setLogoBusy(false); }
      else if (event === "SIGNED_IN" && session?.user.id !== authUser) { generation++; setBusinessLogo(""); setLogoFile(null); setCanBrand(false); setTimeout(load, 0); }
    });
    window.addEventListener("loadlink-business-branding-updated", load); window.addEventListener("focus", load);
    return () => { active = false; generation++; cancelAnimationFrame(frame); auth.data.subscription.unsubscribe(); window.removeEventListener("loadlink-business-branding-updated", load); window.removeEventListener("focus", load); };
  }, []);

  const stamp = useMemo(() => new Intl.DateTimeFormat("en-ZA", { day: "2-digit", month: "short", year: "numeric" }).format(new Date()), []);
  const docReference = useMemo(() => makeReference({ documentType, vehicle, route, amount, unit, availability, vat, terms, body }, reference), [amount, availability, documentType, reference, route, terms, unit, vat, vehicle, body]);
  const rateUnit = unit === "km" ? "per km" : unit === "ton" ? "per ton" : unit === "day" ? "per day" : "total";

  function uploadBusinessLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]; event.currentTarget.value = "";
    if (file && canBrand) setLogoFile(file);
  }
  async function removeLogo() {
    setLogoBusy(true);
    try { await brandingRequest({ action: "remove" }); setBusinessLogo(""); window.dispatchEvent(new Event("loadlink-business-branding-updated")); }
    catch (error) { setLogoMessage(error instanceof Error ? error.message : "The logo could not be removed."); }
    finally { setLogoBusy(false); }
  }

  async function downloadPdf() {
    setPdfBusy(true);
    try {
      await downloadLoadLinkPdf({ documentType, reference: docReference, amount, unit, vehicle, route, availability, vat, terms, clientName, businessLogo, body });
    } catch {
      setLogoMessage("The PDF could not be created. Please retry.");
    } finally {
      setPdfBusy(false);
    }
  }

  return <section className={`overflow-hidden rounded-2xl border ${darkMode ? "border-white/15 bg-[#111] text-white" : "border-black/10 bg-[#f5f3ed] text-black"}`} data-loadlink-document-preview="20261030">
    <div className="p-3 sm:p-4">
      <article className={styles.paper} data-loadlink-document-paper>
        <header className={styles.header}>
          <LoadLinkImage src="/images/loadlink-logo-light.png?v=universal-theme-v1" alt="LoadLink" className={styles.logo} />
          {businessLogo ? <LoadLinkImage src={businessLogo} alt="Business logo" className={styles.businessLogo} /> : null}
        </header>
        <div className={styles.heading}><div><p className={styles.label}>{documentType}</p><h3>{route || vehicle || documentType}</h3>{clientName ? <p className={styles.note}>Prepared for {clientName}</p> : null}</div><div className={styles.reference}><span>{docReference}</span><p className={styles.note}>{stamp}</p></div></div>
        {body !== undefined ? <div className={styles.documentBody}>{documentSections(body, documentType).map((section, index) => <section key={index} className={styles.bodySection}><p className={styles.label}>{section.title}</p><p>{section.text}</p></section>)}{!body.trim() ? <p className={styles.note}>Complete the document details to build your preview.</p> : null}</div> : <>
        <div className={styles.fields}>
          <DocumentField label="Vehicle / service" value={vehicle || "Not specified"} />
          <DocumentField label="Route" value={route || "Not specified"} />
          <DocumentField label="Availability" value={availability || "Not confirmed"} />
          <DocumentField label="VAT" value={vat ? vat.replaceAll("_", " ") : "Not confirmed"} />
        </div>
        <div className={styles.amount}><div><p className={styles.label}>Quoted amount</p><p className={styles.note}>{rateUnit}</p></div><strong>{amount ? `R${amount}` : "Rate pending"}</strong></div>
        <div className={styles.terms}><p className={styles.label}>Terms / notes</p><p>{terms || "No additional terms supplied."}</p></div></>}

        <footer className={styles.footer}>Confirm scope, rates and payment terms with the sender before work begins.</footer>
      </article>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        {canBrand ? <div className="flex flex-wrap gap-2"><input ref={inputRef} type="file" aria-label="Business logo" accept="image/png,image/jpeg,image/webp" onChange={uploadBusinessLogo} className="hidden" /><button type="button" disabled={logoBusy} onClick={() => inputRef.current?.click()} className="min-h-10 rounded-full border border-current/20 px-4 text-xs font-semibold disabled:opacity-45">{businessLogo ? "Change business logo" : "Add business logo"}</button>{businessLogo ? <button type="button" onClick={() => void removeLogo()} disabled={logoBusy} className="min-h-10 rounded-full border border-current/20 px-4 text-xs font-semibold">Remove logo</button> : null}</div> : null}<button type="button" disabled={pdfBusy || logoBusy} onClick={() => void downloadPdf()} className="ml-auto min-h-10 rounded-full bg-[#f6b800] px-4 text-xs font-bold text-black disabled:opacity-45">{pdfBusy ? "Creating PDF…" : logoMessage && !businessLogo ? "Download without logo" : "Download PDF"}</button>
      </div>
      {logoFile ? <BusinessLogoEditor file={logoFile} onClose={closeLogo} onSaved={logo => { setBusinessLogo(logo); setLogoFile(null); window.dispatchEvent(new Event("loadlink-business-branding-updated")); }} /> : null}
      {logoMessage ? <div className="mt-3 text-xs leading-5"><p role="status">{logoMessage}</p><button type="button" disabled={logoBusy} onClick={() => window.dispatchEvent(new Event("loadlink-business-branding-updated"))} className="mt-2 rounded-full border border-current/20 px-3 py-2 font-semibold">Retry branding</button></div> : null}
    </div>
  </section>;
}

function DocumentField({ label, value }: { label: string; value: string }) {
 return <div className={styles.field}><p className={styles.label}>{label}</p><p>{value}</p></div>;
}

function makeReference(doc: LoadLinkPdfDocument, provided?: string) {
  if (provided) return provided;
  const source = `${doc.documentType}|${doc.vehicle}|${doc.route}|${doc.amount}|${doc.unit}|${doc.availability}|${doc.vat}|${doc.terms}|${doc.body || ""}`;
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) { hash ^= source.charCodeAt(index); hash = Math.imul(hash, 16777619); }
  return `LL-${(hash >>> 0).toString(36).toUpperCase().padStart(7, "0").slice(0, 7)}`;
}

export async function downloadLoadLinkPdf(input: LoadLinkPdfDocument) {
  if (input.body !== undefined) return downloadBodyPdf(input);
  if ((input.terms || "").length > 200 || [input.terms, input.vehicle, input.route, input.availability].some(value => value?.includes("\n")) || [input.vehicle, input.route, input.availability].some(value => (value || "").length > 50) || (input.amount || "").length > 12) return downloadBodyPdf({ ...input, body: `VEHICLE / SERVICE\n${input.vehicle || "Not provided"}\n\nROUTE\n${input.route || "Not provided"}\n\nAVAILABILITY\n${input.availability || "Not confirmed"}\n\nQUOTED AMOUNT\n${input.amount ? `R${input.amount}` : "Rate pending"} ${input.unit === "km" ? "per km" : input.unit === "ton" ? "per ton" : input.unit === "day" ? "per day" : "total trip"}\nVAT: ${input.vat ? input.vat.replaceAll("_", " ") : "Not confirmed"}\n\nTERMS / NOTES\n${input.terms || "No additional terms supplied."}` });
  const canvas = document.createElement("canvas");
  canvas.width = 1240; canvas.height = 1754;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("PDF canvas unavailable");
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height);

  const logo = await loadImage("/images/loadlink-logo-light.png?v=universal-theme-v1").catch(() => null);
  if (logo) drawContained(ctx, logo, 90, 80, 340, 100, "left");
  ctx.fillStyle = "#a47600"; ctx.font = "700 28px Arial"; ctx.fillText("LOGISTICS MADE EASIER", 90, 210);
  if (input.businessLogo) { const business = await loadImage(input.businessLogo).catch(() => null); if (business) drawContained(ctx, business, 820, 70, 310, 125, "right"); }


  ctx.strokeStyle="#e8e8e8"; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(0,260); ctx.lineTo(1240,260); ctx.stroke();
  const documentType=input.documentType||"LoadLink document"; const reference=makeReference(input,input.reference);
  ctx.fillStyle="#aaaaaa"; ctx.font="700 26px Arial"; ctx.fillText(documentType.toUpperCase(), 90, 355);
  ctx.fillStyle="#080808"; ctx.font="700 58px Arial"; ctx.fillText(documentType, 90, 425);
  ctx.fillStyle="#aaaaaa"; ctx.font="700 24px Arial"; ctx.fillText("REFERENCE", 875, 355);
  ctx.fillStyle="#111111"; ctx.font="700 31px Arial"; ctx.fillText(reference, 875, 405);
  ctx.fillStyle="#999999"; ctx.font="600 22px Arial"; ctx.fillText(new Intl.DateTimeFormat("en-ZA",{day:"2-digit",month:"short",year:"numeric"}).format(new Date()), 875, 448);
  ctx.strokeStyle="#eeeeee"; ctx.beginPath(); ctx.moveTo(90,505); ctx.lineTo(1150,505); ctx.stroke();

  const fields=[["VEHICLE / SERVICE",input.vehicle||"Not specified"],["ROUTE",input.route||"Not specified"],["AVAILABILITY",input.availability||"Confirm with provider"],["VAT",String(input.vat||"Not confirmed").replaceAll("_"," ")]];
  fields.forEach(([label,value],index)=>{const col=index%2,row=Math.floor(index/2);drawField(ctx,90+col*535,570+row*210,495,170,label,value)});

  ctx.fillStyle="#fff8dc"; ctx.strokeStyle="#f4c742"; ctx.lineWidth=2; roundRect(ctx,90,1015,1060,235,28); ctx.fill(); ctx.stroke();
  ctx.fillStyle="#936d00"; ctx.font="700 25px Arial"; ctx.fillText("QUOTED AMOUNT",135,1090);
  ctx.fillStyle="#99936f"; ctx.font="600 23px Arial"; ctx.fillText(input.unit === "km" ? "per km" : input.unit === "ton" ? "per ton" : input.unit === "day" ? "per day" : "total trip",135,1130);
  ctx.fillStyle="#050505"; ctx.font="700 62px Arial"; const amount=input.amount?`R${input.amount}`:"Rate pending"; ctx.fillText(amount,650,1150);

  ctx.fillStyle="#f7f7f5"; ctx.strokeStyle="#e5e5e5"; roundRect(ctx,90,1300,1060,300,28); ctx.fill(); ctx.stroke();
  ctx.fillStyle="#a0a0a0"; ctx.font="700 24px Arial"; ctx.fillText("TERMS / NOTES",135,1370);
  ctx.fillStyle="#555555"; ctx.font="600 25px Arial"; drawWrapped(ctx,input.terms||"No additional terms supplied.",135,1430,960,38,5);
  ctx.fillStyle="#aaaaaa"; ctx.font="500 18px Arial"; drawWrapped(ctx,"This LoadLink document reflects the details supplied by the sender. Confirm final scope, rates and payment terms before work begins.",90,1660,1060,28,3);

  const jpeg=canvas.toDataURL("image/jpeg",0.9); const bytes=dataUrlBytes(jpeg); const pdf=pdfFromPages([bytes]);
  const blob=new Blob([pdf],{type:"application/pdf"}); const url=URL.createObjectURL(blob); const anchor=document.createElement("a"); anchor.href=url; anchor.download=`LoadLink-${documentType.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"document"}-${reference}.pdf`; document.body.appendChild(anchor); anchor.click(); anchor.remove(); window.setTimeout(()=>URL.revokeObjectURL(url),1500);
}

function drawField(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,label:string,value:string){ctx.fillStyle="#fafafa";ctx.strokeStyle="#e5e5e5";ctx.lineWidth=2;roundRect(ctx,x,y,w,h,26);ctx.fill();ctx.stroke();ctx.fillStyle="#aaaaaa";ctx.font="700 22px Arial";ctx.fillText(label,x+35,y+55);ctx.fillStyle="#444";ctx.font="700 31px Arial";drawWrapped(ctx,String(value),x+35,y+112,w-70,40,2)}
function drawWrapped(ctx:CanvasRenderingContext2D,text:string,x:number,y:number,maxWidth:number,lineHeight:number,maxLines:number){const words=String(text).replace(/\s+/g," ").trim().split(" ");let line="",lines=0;for(const word of words){const test=line?`${line} ${word}`:word;if(ctx.measureText(test).width>maxWidth&&line){ctx.fillText(line,x,y+lines*lineHeight);lines++;line=word;if(lines>=maxLines)return;}else line=test;}if(line&&lines<maxLines)ctx.fillText(line,x,y+lines*lineHeight)}
function roundRect(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function drawContained(ctx:CanvasRenderingContext2D,img:HTMLImageElement,x:number,y:number,w:number,h:number,align:"left"|"right"){const ratio=Math.min(w/img.naturalWidth,h/img.naturalHeight);const dw=img.naturalWidth*ratio,dh=img.naturalHeight*ratio;const dx=align==="right"?x+w-dw:x;ctx.drawImage(img,dx,y+(h-dh)/2,dw,dh)}
function loadImage(src:string){return new Promise<HTMLImageElement>((resolve,reject)=>{const img=new Image();img.decoding="async";img.onload=()=>resolve(img);img.onerror=()=>reject(new Error("Image failed"));img.src=src})}
function dataUrlBytes(dataUrl:string){const raw=atob(dataUrl.split(",")[1]||"");const out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out}


async function downloadBodyPdf(input:LoadLinkPdfDocument){
 const pages:HTMLCanvasElement[]=[];
 const logo=await loadImage("/images/loadlink-logo-light.png?v=universal-theme-v1").catch(()=>null);
 const business=input.businessLogo?await loadImage(input.businessLogo).catch(()=>null):null;
 const title=input.documentType||"Logistics document",reference=makeReference(input,input.reference);
 let canvas!:HTMLCanvasElement,ctx!:CanvasRenderingContext2D,y=0;
 function page(){canvas=document.createElement("canvas");canvas.width=1240;canvas.height=1754;ctx=canvas.getContext("2d")!;if(!ctx)throw Error("PDF rendering is unavailable.");ctx.fillStyle="#fff";ctx.fillRect(0,0,1240,1754);if(logo)drawContained(ctx,logo,80,65,290,90,"left");if(business)drawContained(ctx,business,860,65,300,90,"right");ctx.fillStyle="#9b7200";ctx.font="700 18px Arial";ctx.fillText("LOGISTICS MADE EASIER",80,195);ctx.fillStyle="#151515";ctx.font="700 42px Arial";drawWrapped(ctx,title,80,285,790,50,2);ctx.font="600 21px Arial";ctx.fillStyle="#555";ctx.fillText(reference,920,270);ctx.font="400 18px Arial";ctx.fillText(new Intl.DateTimeFormat("en-ZA",{day:"2-digit",month:"short",year:"numeric"}).format(new Date()),920,305);ctx.strokeStyle="#deded8";ctx.beginPath();ctx.moveTo(80,340);ctx.lineTo(1160,340);ctx.stroke();y=405;pages.push(canvas);}
 function line(text:string,heading=false){if(y>1570)page();ctx.fillStyle=heading?"#7d6425":"#252525";ctx.font=heading?"700 24px Arial":"400 27px Arial";ctx.fillText(text,80,y);y+=heading?43:42;}
 page();
 for(const section of documentSections(input.body||"",title)){
  if(y>1480)page();line(section.title.toUpperCase(),true);
  for(const paragraph of section.text.split("\n")){
   const words=paragraph.split(/\s+/);let buffer="";ctx.font="400 27px Arial";
   for(const word of words){const next=buffer?`${buffer} ${word}`:word;if(ctx.measureText(next).width>1080&&buffer){line(buffer);buffer=word;}else buffer=next;while(ctx.measureText(buffer).width>1080){let split=buffer.length-1;while(split>1&&ctx.measureText(buffer.slice(0,split)).width>1080)split--;line(buffer.slice(0,split));buffer=buffer.slice(split);}}
   line(buffer||" ");
  }y+=26;
 }
 pages.forEach((page,index)=>{const context=page.getContext("2d")!;context.strokeStyle="#deded8";context.beginPath();context.moveTo(80,1630);context.lineTo(1160,1630);context.stroke();context.font="400 17px Arial";context.fillStyle="#666";context.fillText("Prepared on LoadLink. Confirm the details with the sender before use.",80,1670);context.fillText(`${index+1} / ${pages.length}`,1090,1670);});
 const pdf=pdfFromPages(pages.map(page=>dataUrlBytes(page.toDataURL("image/jpeg",.92))));
 const url=URL.createObjectURL(new Blob([pdf],{type:"application/pdf"})),anchor=document.createElement("a");anchor.href=url;anchor.download=`LoadLink-${title.toLowerCase().replace(/[^a-z0-9]+/g,"-")}-${reference}.pdf`;document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
