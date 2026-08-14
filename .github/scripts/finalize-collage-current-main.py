from pathlib import Path
import re

ROOT = Path.cwd()

def read(rel: str) -> str:
    return (ROOT / rel).read_text(encoding="utf-8")

def write(rel: str, text: str) -> None:
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")

# 1. Import the final presentation layer last and add a scroll-vs-tap guard.
t = read("app/layout.tsx")
if 'import "./loadlink-collage-repair.css";' not in t:
    anchor = 'import "./loadlink-mobile-final.css";'
    if anchor not in t:
        raise RuntimeError("loadlink-mobile-final.css import anchor missing")
    t = t.replace(anchor, anchor + '\nimport "./loadlink-collage-repair.css";', 1)

if 'import LoadLinkTouchScrollGuard from "@/components/LoadLinkTouchScrollGuard";' not in t:
    anchor = 'import LoadLinkInteractionSystem from "@/components/LoadLinkInteractionSystem";'
    if anchor not in t:
        raise RuntimeError("LoadLinkInteractionSystem import missing")
    t = t.replace(anchor, anchor + '\nimport LoadLinkTouchScrollGuard from "@/components/LoadLinkTouchScrollGuard";', 1)

if '<LoadLinkTouchScrollGuard />' not in t:
    anchor = '<LoadLinkInteractionSystem />'
    if anchor not in t:
        raise RuntimeError("LoadLinkInteractionSystem mount missing")
    t = t.replace(anchor, anchor + '\n        <LoadLinkTouchScrollGuard />', 1)

write("app/layout.tsx", t)

write("components/LoadLinkTouchScrollGuard.tsx", '''"use client";
import { useEffect } from "react";
const MENU='[data-loadlink-choice-sheet="true"],[data-loadlink-datalist-menu="true"],[role="listbox"]';
export default function LoadLinkTouchScrollGuard(){
  useEffect(()=>{let id=-1,x=0,y=0,moved=false,suppress=0;const inside=(t:EventTarget|null)=>t instanceof Element?t.closest(MENU):null;
    const down=(e:PointerEvent)=>{if(!inside(e.target))return;id=e.pointerId;x=e.clientX;y=e.clientY;moved=false;};
    const move=(e:PointerEvent)=>{if(e.pointerId!==id||!inside(e.target))return;if(Math.hypot(e.clientX-x,e.clientY-y)>9)moved=true;};
    const end=(e:PointerEvent)=>{if(e.pointerId!==id)return;if(moved)suppress=performance.now()+450;id=-1;};
    const scroll=(e:Event)=>{if(!inside(e.target))return;moved=true;suppress=performance.now()+450;};
    const click=(e:MouseEvent)=>{if(!inside(e.target)||performance.now()>=suppress)return;e.preventDefault();e.stopImmediatePropagation();};
    document.addEventListener("pointerdown",down,true);document.addEventListener("pointermove",move,true);document.addEventListener("pointerup",end,true);document.addEventListener("pointercancel",end,true);document.addEventListener("scroll",scroll,true);document.addEventListener("click",click,true);
    return()=>{document.removeEventListener("pointerdown",down,true);document.removeEventListener("pointermove",move,true);document.removeEventListener("pointerup",end,true);document.removeEventListener("pointercancel",end,true);document.removeEventListener("scroll",scroll,true);document.removeEventListener("click",click,true);};
  },[]);return null;
}
''')

# 2. Messages: plain circular chat photo and remove the old + attachment-actions control.
t = read("app/messages/page.tsx")
start = t.find("function DealerUpdateAvatar(")
end = t.find("\nfunction Avatar(", start)
if start >= 0 and end >= 0:
    t = t[:start] + '''function DealerUpdateAvatar({ name, photo }: { listingId: string; name: string; photo?: string | null; online?: boolean; darkMode: boolean }) {\n  return <Avatar name={name} photo={photo} size="h-11 w-11" />;\n}\n''' + t[end:]

needle = '''                  <div className="relative shrink-0">\n                    <button\n                      type="button"\n                      onClick={() => setComposerActionsOpen((value) => !value)}'''
marker = '''                  <div className="min-w-0 flex-1 rounded-2xl border border-black/10 bg-[#f6f4ee] px-3.5 py-2 focus-within:border-[#f6b800] focus-within:bg-white">'''
pos = t.find(needle)
endpos = t.find(marker, pos) if pos >= 0 else -1
if pos >= 0 and endpos >= 0:
    t = t[:pos] + '''                  <div className="loadlink-message-input min-w-0 flex-1 rounded-[22px] border border-black/10 bg-white/55 px-4 py-2.5 shadow-sm backdrop-blur-xl focus-within:border-[#f6b800]">''' + t[endpos + len(marker):]

t = t.replace('className="loadlink-chat-composer border-t border-black/10 bg-white p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] sm:p-4"', 'className="loadlink-chat-composer border-t border-black/10 bg-white/55 p-2.5 pb-[max(.65rem,env(safe-area-inset-bottom))] backdrop-blur-2xl sm:p-3"')
t = t.replace('className="mx-auto flex max-w-3xl items-end gap-2"', 'className="mx-auto flex w-full max-w-3xl items-end gap-2"')
t = t.replace('className="max-h-28 min-h-7 w-full resize-none bg-transparent py-1 text-sm font-medium outline-none placeholder:text-black/35 disabled:opacity-50"', 'className="max-h-28 min-h-7 w-full resize-none bg-transparent py-1 text-[15px] font-medium leading-6 outline-none placeholder:text-black/38 disabled:opacity-50"')
write("app/messages/page.tsx", t)

# 3. Business logo uploads: preserve current iPhone-friendly image selection and add a safe raw-file fallback.
t = read("components/LoadLinkDocumentPreview.tsx")
old = '''      const cleaned = await cleanLogoBackground(file);\n      setBusinessLogo(cleaned);'''
new = '''      let cleaned = "";\n      try { cleaned = await cleanLogoBackground(file); } catch { cleaned = await fileToDataUrl(file); }\n      setBusinessLogo(cleaned);'''
if old in t:
    t = t.replace(old, new, 1)
if 'function fileToDataUrl(file: File)' not in t:
    t += '''\nfunction fileToDataUrl(file: File) {\n  return new Promise<string>((resolve, reject) => {\n    const reader = new FileReader();\n    reader.onload = () => resolve(String(reader.result || ""));\n    reader.onerror = () => reject(reader.error || new Error("Image read failed"));\n    reader.readAsDataURL(file);\n  });\n}\n'''
write("components/LoadLinkDocumentPreview.tsx", t)

# 4. Remove the redundant embedded driver sentence, keeping the heading and cards.
t = read("components/phase2/DriversAvailableForWork.tsx")
t = t.replace('<p className={styles.embeddedCopy}>Browse approved profiles and contact a suitable driver through LoadLink.</p>', '')
write("components/phase2/DriversAvailableForWork.tsx", t)

# 5. Listing share metadata uses the actual listing image when available.
write("app/listing/[id]/layout.tsx", '''import type { Metadata } from "next";\nimport type { ReactNode } from "react";\nconst SITE="https://matikinca-marketplace.vercel.app";\ntype ListingRow={title?:string|null;city?:string|null;vehicle_group?:string|null;photos?:string[]|null;poster_photo?:string|null};\nasync function getListing(id:string):Promise<ListingRow|null>{const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!url||!key||!id)return null;try{const r=await fetch(`${url}/rest/v1/job_listings?id=eq.${encodeURIComponent(id)}&select=title,city,vehicle_group,photos,poster_photo&limit=1`,{headers:{apikey:key,Authorization:`Bearer ${key}`},next:{revalidate:60}});if(!r.ok)return null;const rows=(await r.json()) as ListingRow[];return rows[0]||null}catch{return null}}\nfunction imageUrl(v?:string|null){if(!v)return `${SITE}/images/loadlink-logo-light.png`;if(/^https?:\\/\\//i.test(v))return v;return `${SITE}${v.startsWith("/")?v:`/${v}`}`}\nexport async function generateMetadata({params}:{params:Promise<{id:string}>}):Promise<Metadata>{const {id}=await params;const l=await getListing(id);const title=l?.title?`${l.title} | LoadLink`:"LoadLink listing";const description=l?[l.city,l.vehicle_group,"Available on LoadLink"].filter(Boolean).join(" · "):"View this logistics listing on LoadLink.";const image=imageUrl(l?.photos?.find(Boolean)||l?.poster_photo);const canonical=`${SITE}/listing/${encodeURIComponent(id)}`;return{title,description,alternates:{canonical},openGraph:{title,description,url:canonical,siteName:"LoadLink",type:"website",images:[{url:image,alt:l?.title||"LoadLink listing"}]},twitter:{card:"summary_large_image",title,description,images:[image]}}}\nexport default function ListingLayout({children}:{children:ReactNode}){return children;}\n''')

# Final assertions before npm build.
assert 'loadlink-collage-repair.css' in read('app/layout.tsx')
assert 'LoadLinkTouchScrollGuard' in read('app/layout.tsx')
assert 'Browse approved profiles and contact a suitable driver through LoadLink.' not in read('components/phase2/DriversAvailableForWork.tsx')
assert 'fileToDataUrl(file: File)' in read('components/LoadLinkDocumentPreview.tsx')
assert 'photos?.find' in read('app/listing/[id]/layout.tsx')
assert 'return <Avatar name={name} photo={photo} size="h-11 w-11" />;' in read('app/messages/page.tsx')
print('LoadLink final collage repair applied to current main source')
