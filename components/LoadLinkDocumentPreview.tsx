"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

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
};

const LOGO_STORAGE_KEY = "loadlink-business-logo-clean-v1";

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
  compact = false,
}: DocumentPreviewProps) {
  const [businessLogo, setBusinessLogo] = useState("");
  const [logoBusy, setLogoBusy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [logoMessage, setLogoMessage] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try { setBusinessLogo(localStorage.getItem(LOGO_STORAGE_KEY) || ""); } catch { /* optional local preference */ }
  }, []);

  const stamp = useMemo(() => new Intl.DateTimeFormat("en-ZA", { day: "2-digit", month: "short", year: "numeric" }).format(new Date()), []);
  const docReference = useMemo(() => makeReference({ documentType, vehicle, route, amount, unit, availability, vat, terms }, reference), [amount, availability, documentType, reference, route, terms, unit, vat, vehicle]);
  const rateUnit = unit === "km" ? "per km" : unit === "ton" ? "per ton" : unit === "day" ? "per day" : "total";

  async function uploadBusinessLogo(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;

    const imageLike = file.type.startsWith("image/") || /\.(png|jpe?g|webp|heic|heif)$/i.test(file.name);
    if (!imageLike || file.size > 12 * 1024 * 1024) {
      setLogoMessage("Choose an image smaller than 12 MB.");
      return;
    }

    setLogoBusy(true);
    setLogoMessage("");
    try {
      let cleaned = "";
      try { cleaned = await cleanLogoBackground(file); } catch { cleaned = await fileToDataUrl(file); }
      setBusinessLogo(cleaned);
      try {
        localStorage.setItem(LOGO_STORAGE_KEY, cleaned);
        setLogoMessage("Business logo added to this document style.");
      } catch {
        setLogoMessage("Logo added for this session. Browser storage is full, so it may need to be added again later.");
      }
    } catch {
      setLogoMessage("This image could not be opened. Try JPG, PNG or WebP if the photo is in an unsupported phone format.");
    } finally {
      setLogoBusy(false);
    }
  }

  function removeLogo() {
    setBusinessLogo(""); setLogoMessage("");
    try { localStorage.removeItem(LOGO_STORAGE_KEY); } catch { /* optional */ }
  }

  async function downloadPdf() {
    setPdfBusy(true);
    try {
      await downloadLoadLinkPdf({ documentType, reference: docReference, amount, unit, vehicle, route, availability, vat, terms, clientName, businessLogo });
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <section className={`overflow-hidden rounded-[26px] border ${darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-[#f8f6f0]"}`} data-loadlink-document-preview="v2714">
      <div className="p-3 sm:p-4">
        <article className="mx-auto overflow-hidden rounded-[22px] border border-black/10 bg-white text-black shadow-[0_18px_55px_rgba(0,0,0,.12)]">
          <header className="flex min-h-[86px] items-start justify-between gap-5 border-b border-black/8 px-5 py-5 sm:px-6">
            <div className="min-w-0">
              <img src="/images/loadlink-logo-light.png?v=universal-theme-v1" alt="LoadLink" className="h-7 w-auto max-w-[150px] object-contain object-left" />
              <p className="mt-2 text-[9px] font-black uppercase tracking-[.16em] text-[#9b7200]">Logistics made easier</p>
            </div>
            <div className="flex min-w-[96px] max-w-[42%] flex-col items-end">
              {businessLogo ? <img src={businessLogo} alt="Business logo" className="max-h-12 max-w-full object-contain object-right" /> : <span className="flex h-11 min-w-[88px] items-center justify-center rounded-xl border border-dashed border-black/15 px-3 text-center text-[8px] font-black uppercase tracking-[.08em] text-black/35">Business logo</span>}
            </div>
          </header>

          <div className="px-5 py-5 sm:px-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><p className="text-[9px] font-black uppercase tracking-[.16em] text-black/38">{documentType}</p><h3 className="mt-1 text-2xl font-black tracking-[-.04em]">{route || vehicle || documentType}</h3>{clientName ? <p className="mt-1 text-xs font-semibold text-black/48">Prepared for {clientName}</p> : null}</div>
              <div className="text-right"><p className="text-[9px] font-black uppercase tracking-[.12em] text-black/35">Reference</p><p className="mt-1 text-xs font-black">{docReference}</p><p className="mt-1 text-[10px] font-semibold text-black/42">{stamp}</p></div>
            </div>

            <div className="my-5 h-px bg-black/8" />

            <div className={`grid gap-3 ${compact ? "grid-cols-2" : "sm:grid-cols-2"}`}>
              <DocumentField label="Vehicle / service" value={vehicle || "Not specified"} />
              <DocumentField label="Route" value={route || "Not specified"} />
              <DocumentField label="Availability" value={availability || "Confirm with provider"} />
              <DocumentField label="VAT" value={String(vat || "included").replaceAll("_", " ")} capitalize />
            </div>

            <div className="mt-5 overflow-hidden rounded-[18px] border border-[#f6b800]/35 bg-[#fff8dc]">
              <div className="flex items-end justify-between gap-4 px-4 py-4">
                <div><p className="text-[9px] font-black uppercase tracking-[.14em] text-[#8b6700]">Quoted amount</p><p className="mt-1 text-[11px] font-semibold text-black/46">{rateUnit}</p></div>
                <p className="text-[28px] font-black tracking-[-.045em]">{amount ? `R${amount}` : "Rate pending"}</p>
              </div>
            </div>

            <div className="mt-4 rounded-[18px] border border-black/8 bg-[#f7f7f5] p-4">
              <p className="text-[9px] font-black uppercase tracking-[.14em] text-black/35">Terms / notes</p>
              <p className="mt-2 whitespace-pre-wrap text-xs font-semibold leading-5 text-black/65">{terms || "No additional terms supplied."}</p>
            </div>
          </div>

          <footer className="border-t border-black/8 px-5 py-4 text-[9px] font-semibold leading-4 text-black/38 sm:px-6">
            This LoadLink document reflects the details supplied by the sender. Confirm final scope, rates and payment terms before work begins.
          </footer>
        </article>

        <div className={`mt-3 flex flex-wrap items-center justify-between gap-2 rounded-[16px] border p-3 ${darkMode ? "border-white/10 bg-white/[.025]" : "border-black/8 bg-white"}`}>
          <div className="min-w-0"><p className="text-[10px] font-black">Document & business branding</p><p className={`mt-0.5 text-[9px] font-semibold ${darkMode ? "text-white/42" : "text-black/42"}`}>PDF export stays on this device and includes LoadLink branding plus your optional business logo.</p>{logoMessage ? <p className="mt-1 text-[9px] font-bold text-[#b88900]">{logoMessage}</p> : null}</div>
          <div className="flex flex-wrap gap-2"><input ref={inputRef} type="file" accept="image/*" onChange={uploadBusinessLogo} className="hidden"/><button type="button" disabled={logoBusy} onClick={() => inputRef.current?.click()} className="h-9 rounded-xl border border-current/10 px-3 text-[9px] font-black disabled:opacity-45">{logoBusy ? "Preparing…" : businessLogo ? "Change logo" : "Add logo"}</button>{businessLogo ? <button type="button" onClick={removeLogo} className="h-9 rounded-xl border border-current/10 px-3 text-[9px] font-black">Remove</button> : null}<button type="button" disabled={pdfBusy} onClick={() => void downloadPdf()} className="h-9 rounded-xl bg-[#f6b800] px-3 text-[9px] font-black text-black disabled:opacity-45">{pdfBusy ? "Building PDF…" : "Download PDF"}</button></div>
        </div>
      </div>
    </section>
  );
}

function DocumentField({ label, value, capitalize = false }: { label: string; value: string; capitalize?: boolean }) {
  return <div className="rounded-[16px] border border-black/8 bg-[#fafafa] p-3.5"><p className="text-[8px] font-black uppercase tracking-[.13em] text-black/33">{label}</p><p className={`mt-1.5 text-xs font-black leading-5 text-black/75 ${capitalize ? "capitalize" : ""}`}>{value}</p></div>;
}

function makeReference(doc: LoadLinkPdfDocument, provided?: string) {
  if (provided) return provided;
  const source = `${doc.documentType}|${doc.vehicle}|${doc.route}|${doc.amount}|${doc.unit}|${doc.availability}|${doc.vat}|${doc.terms}`;
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) { hash ^= source.charCodeAt(index); hash = Math.imul(hash, 16777619); }
  return `LL-${(hash >>> 0).toString(36).toUpperCase().padStart(7, "0").slice(0, 7)}`;
}

export async function downloadLoadLinkPdf(input: LoadLinkPdfDocument) {
  const canvas = document.createElement("canvas");
  canvas.width = 1240; canvas.height = 1754;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("PDF canvas unavailable");
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height);

  const logo = await loadImage("/images/loadlink-logo-light.png?v=universal-theme-v1").catch(() => null);
  if (logo) drawContained(ctx, logo, 90, 80, 340, 100, "left");
  ctx.fillStyle = "#a47600"; ctx.font = "700 28px Arial"; ctx.fillText("LOGISTICS MADE EASIER", 90, 210);
  if (input.businessLogo) { const business = await loadImage(input.businessLogo).catch(() => null); if (business) drawContained(ctx, business, 820, 70, 310, 125, "right"); }
  else { ctx.strokeStyle="#d3d3d3"; ctx.setLineDash([12,10]); roundRect(ctx, 850, 70, 280, 110, 24); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle="#a0a0a0"; ctx.font="700 23px Arial"; ctx.fillText("BUSINESS LOGO", 900, 135); }

  ctx.strokeStyle="#e8e8e8"; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(0,260); ctx.lineTo(1240,260); ctx.stroke();
  const documentType=input.documentType||"LoadLink document"; const reference=makeReference(input,input.reference);
  ctx.fillStyle="#aaaaaa"; ctx.font="700 26px Arial"; ctx.fillText(documentType.toUpperCase(), 90, 355);
  ctx.fillStyle="#080808"; ctx.font="700 58px Arial"; ctx.fillText(documentType, 90, 425);
  ctx.fillStyle="#aaaaaa"; ctx.font="700 24px Arial"; ctx.fillText("REFERENCE", 875, 355);
  ctx.fillStyle="#111111"; ctx.font="700 31px Arial"; ctx.fillText(reference, 875, 405);
  ctx.fillStyle="#999999"; ctx.font="600 22px Arial"; ctx.fillText(new Intl.DateTimeFormat("en-ZA",{day:"2-digit",month:"short",year:"numeric"}).format(new Date()), 875, 448);
  ctx.strokeStyle="#eeeeee"; ctx.beginPath(); ctx.moveTo(90,505); ctx.lineTo(1150,505); ctx.stroke();

  const fields=[["VEHICLE / SERVICE",input.vehicle||"Not specified"],["ROUTE",input.route||"Not specified"],["AVAILABILITY",input.availability||"Confirm with provider"],["VAT",String(input.vat||"Included").replaceAll("_"," ")]];
  fields.forEach(([label,value],index)=>{const col=index%2,row=Math.floor(index/2);drawField(ctx,90+col*535,570+row*210,495,170,label,value)});

  ctx.fillStyle="#fff8dc"; ctx.strokeStyle="#f4c742"; ctx.lineWidth=2; roundRect(ctx,90,1015,1060,235,28); ctx.fill(); ctx.stroke();
  ctx.fillStyle="#936d00"; ctx.font="700 25px Arial"; ctx.fillText("QUOTED AMOUNT",135,1090);
  ctx.fillStyle="#99936f"; ctx.font="600 23px Arial"; ctx.fillText(input.unit||"total",135,1130);
  ctx.fillStyle="#050505"; ctx.font="700 62px Arial"; const amount=input.amount?`R${input.amount}`:"Rate pending"; ctx.fillText(amount,650,1150);

  ctx.fillStyle="#f7f7f5"; ctx.strokeStyle="#e5e5e5"; roundRect(ctx,90,1300,1060,300,28); ctx.fill(); ctx.stroke();
  ctx.fillStyle="#a0a0a0"; ctx.font="700 24px Arial"; ctx.fillText("TERMS / NOTES",135,1370);
  ctx.fillStyle="#555555"; ctx.font="600 25px Arial"; drawWrapped(ctx,input.terms||"No additional terms supplied.",135,1430,960,38,5);
  ctx.fillStyle="#aaaaaa"; ctx.font="500 18px Arial"; drawWrapped(ctx,"This LoadLink document reflects the details supplied by the sender. Confirm final scope, rates and payment terms before work begins.",90,1660,1060,28,3);

  const jpeg=canvas.toDataURL("image/jpeg",0.9); const bytes=dataUrlBytes(jpeg); const pdf=pdfFromJpeg(bytes,canvas.width,canvas.height);
  const blob=new Blob([pdf],{type:"application/pdf"}); const url=URL.createObjectURL(blob); const anchor=document.createElement("a"); anchor.href=url; anchor.download=`LoadLink-${documentType.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"document"}-${reference}.pdf`; document.body.appendChild(anchor); anchor.click(); anchor.remove(); window.setTimeout(()=>URL.revokeObjectURL(url),1500);
}

function drawField(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,label:string,value:string){ctx.fillStyle="#fafafa";ctx.strokeStyle="#e5e5e5";ctx.lineWidth=2;roundRect(ctx,x,y,w,h,26);ctx.fill();ctx.stroke();ctx.fillStyle="#aaaaaa";ctx.font="700 22px Arial";ctx.fillText(label,x+35,y+55);ctx.fillStyle="#444";ctx.font="700 31px Arial";drawWrapped(ctx,String(value),x+35,y+112,w-70,40,2)}
function drawWrapped(ctx:CanvasRenderingContext2D,text:string,x:number,y:number,maxWidth:number,lineHeight:number,maxLines:number){const words=String(text).replace(/\s+/g," ").trim().split(" ");let line="",lines=0;for(const word of words){const test=line?`${line} ${word}`:word;if(ctx.measureText(test).width>maxWidth&&line){ctx.fillText(line,x,y+lines*lineHeight);lines++;line=word;if(lines>=maxLines)return;}else line=test;}if(line&&lines<maxLines)ctx.fillText(line,x,y+lines*lineHeight)}
function roundRect(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function drawContained(ctx:CanvasRenderingContext2D,img:HTMLImageElement,x:number,y:number,w:number,h:number,align:"left"|"right"){const ratio=Math.min(w/img.naturalWidth,h/img.naturalHeight);const dw=img.naturalWidth*ratio,dh=img.naturalHeight*ratio;const dx=align==="right"?x+w-dw:x;ctx.drawImage(img,dx,y+(h-dh)/2,dw,dh)}
function loadImage(src:string){return new Promise<HTMLImageElement>((resolve,reject)=>{const img=new Image();img.decoding="async";img.onload=()=>resolve(img);img.onerror=()=>reject(new Error("Image failed"));img.src=src})}
function dataUrlBytes(dataUrl:string){const raw=atob(dataUrl.split(",")[1]||"");const out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out}
function pdfFromJpeg(jpeg:Uint8Array,width:number,height:number){const enc=new TextEncoder();const parts:Uint8Array[]=[];const offsets:number[]=[0];let length=0;const push=(value:string|Uint8Array)=>{const b=typeof value==="string"?enc.encode(value):value;parts.push(b);length+=b.length};push("%PDF-1.4\n%âãÏÓ\n");const obj=(id:number,body:string|(()=>void))=>{offsets[id]=length;push(`${id} 0 obj\n`);typeof body==="string"?push(body):body();push("\nendobj\n")};obj(1,"<< /Type /Catalog /Pages 2 0 R >>");obj(2,"<< /Type /Pages /Kids [3 0 R] /Count 1 >>");obj(3,"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>");obj(4,()=>{push(`<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);push(jpeg);push("\nendstream")});const content=enc.encode("q\n595 0 0 842 0 0 cm\n/Im0 Do\nQ\n");obj(5,()=>{push(`<< /Length ${content.length} >>\nstream\n`);push(content);push("endstream")});const xref=length;push("xref\n0 6\n0000000000 65535 f \n");for(let i=1;i<=5;i++)push(`${String(offsets[i]).padStart(10,"0")} 00000 n \n`);push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);const total=parts.reduce((n,p)=>n+p.length,0);const out=new Uint8Array(total);let offset=0;for(const p of parts){out.set(p,offset);offset+=p.length}return out}

async function cleanLogoBackground(file: File) {
  const source = await fileToImage(file);
  const max = 560;
  const scale = Math.min(1, max / Math.max(source.naturalWidth, source.naturalHeight));
  const width = Math.max(1, Math.round(source.naturalWidth * scale));
  const height = Math.max(1, Math.round(source.naturalHeight * scale));
  const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true }); if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(source, 0, 0, width, height); const image = ctx.getImageData(0, 0, width, height); const data = image.data;
  for (let i = 0; i < data.length; i += 4) { const r=data[i],g=data[i+1],b=data[i+2],brightest=Math.max(r,g,b),darkest=Math.min(r,g,b); if(brightest>238&&darkest>226&&brightest-darkest<24){const whiteness=(brightest-226)/29;data[i+3]=Math.round(255*Math.max(0,1-whiteness));} }
  ctx.putImageData(image, 0, 0); const webp = canvas.toDataURL("image/webp", 0.88); return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/png", 0.9);
}
function fileToImage(file: File) { return new Promise<HTMLImageElement>((resolve, reject) => { const url=URL.createObjectURL(file),image=new Image();image.decoding="async";image.onload=()=>{URL.revokeObjectURL(url);resolve(image)};image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("Image failed"))};image.src=url; }); }
function fileToDataUrl(file: File) { return new Promise<string>((resolve, reject) => { const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||""));reader.onerror=()=>reject(reader.error||new Error("Image read failed"));reader.readAsDataURL(file); }); }
