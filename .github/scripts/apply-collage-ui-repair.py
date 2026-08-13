from pathlib import Path
import re

ROOT = Path.cwd()

def read(rel): return (ROOT/rel).read_text(encoding="utf-8")
def write(rel, text):
    p=ROOT/rel; p.parent.mkdir(parents=True,exist_ok=True); p.write_text(text,encoding="utf-8")

# Layout: keep every current integration, import final repair last and mount touch guard.
t=read("app/layout.tsx")
if 'import "./loadlink-collage-repair.css";' not in t:
    anchor='import "./loadlink-mobile-final.css";'
    if anchor not in t: anchor='import "./loadlink-responsive-experience.css";'
    if anchor not in t: raise RuntimeError("UI stylesheet anchor missing")
    t=t.replace(anchor,anchor+'\nimport "./loadlink-collage-repair.css";',1)
if 'import LoadLinkTouchScrollGuard from "@/components/LoadLinkTouchScrollGuard";' not in t:
    anchor='import LoadLinkInteractionSystem from "@/components/LoadLinkInteractionSystem";'
    if anchor not in t: raise RuntimeError("Interaction system import missing")
    t=t.replace(anchor,anchor+'\nimport LoadLinkTouchScrollGuard from "@/components/LoadLinkTouchScrollGuard";',1)
if '<LoadLinkTouchScrollGuard />' not in t:
    anchor='<LoadLinkInteractionSystem />'
    if anchor not in t: raise RuntimeError("Interaction system mount missing")
    t=t.replace(anchor,anchor+'\n        <LoadLinkTouchScrollGuard />',1)
write("app/layout.tsx",t)

# Global touch guard: a swipe/scroll must never be interpreted as an option tap.
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

# Packages: restore guide + all plans together so prices are directly comparable.
write("app/packages/page.tsx", '''"use client";
import BusinessPlans from "@/components/BusinessPlans";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import PackageGuide, { type PackageRecommendation } from "@/components/PackageGuide";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";
export default function PackagesPage(){
  const {darkMode,toggleTheme}=useLoadLinkTheme();
  function focusPlan(plan:PackageRecommendation){window.setTimeout(()=>document.getElementById(`${plan}-package`)?.scrollIntoView({behavior:"smooth",block:"center"}),30);}
  return <main data-loadlink-packages-page="compare-restored" className={darkMode?"min-h-screen bg-black text-white":"min-h-screen bg-[#f4efe3] text-black"}>
    <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme}/>
    <section className="mx-auto w-full max-w-6xl px-3 pb-3 pt-6 sm:px-5 md:px-6 md:pt-9"><PackageGuide darkMode={darkMode} onComplete={focusPlan}/></section>
    <BusinessPlans darkMode={darkMode} enableRequests/>
  </main>;
}
''')

# Login: preserve current information/auth methods; change only the presentation to image-backed floating glass.
write("components/AuthLandingShell.tsx", '''"use client";
import type { ReactNode } from "react";
import Link from "next/link";
export default function AuthLandingShell({darkMode,children,footer,title="Welcome to LoadLink",subtitle="Logistics made easier"}:{darkMode:boolean;children:ReactNode;footer?:ReactNode;title?:string;subtitle?:string;}){
  return <main data-loadlink-auth-landing="v290" className={`relative min-h-[100svh] overflow-hidden ${darkMode?"bg-black text-white":"bg-[#f4efe3] text-black"}`}>
    <section className="loadlink-auth-hero absolute inset-0 overflow-hidden bg-[#8d360d]">
      <img src="/images/loadlink-login-hero-hd.webp" alt="LoadLink logistics made easier" className="loadlink-auth-hero-image absolute inset-0 h-full w-full object-cover object-center" loading="eager" fetchPriority="high" decoding="async"/>
      <div className="loadlink-auth-hero-vignette absolute inset-0 z-[1]" aria-hidden="true"/>
      <div className="absolute inset-x-0 top-0 z-10 p-5 sm:p-7"><Link href="/" aria-label="LoadLink home" className="inline-flex h-10 items-center rounded-full border border-white/20 bg-black/20 px-3 backdrop-blur-xl"><img src="/images/loadlink-logo-dark.png?v=universal-theme-v1" alt="LoadLink" className="h-[17px] w-auto max-w-[100px] object-contain"/></Link></div>
    </section>
    <div className="relative z-20 flex min-h-[100svh] items-end justify-center px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-24 sm:items-center sm:px-5">
      <section className={`loadlink-glass loadlink-auth-panel w-full max-w-[430px] rounded-[30px] border px-5 py-6 shadow-2xl sm:px-8 sm:py-8 ${darkMode?"text-white":"text-black"}`}>
        <div className="mx-auto w-full max-w-[390px]"><div className="text-center"><h1 className="text-[28px] font-black tracking-[-.04em] sm:text-[32px]">{title}</h1><p className={`mt-1.5 text-sm font-semibold ${darkMode?"text-white/58":"text-black/55"}`}>{subtitle}</p></div><div className="mt-5">{children}</div>{footer?<div className={`mt-5 text-center text-sm font-semibold ${darkMode?"text-white/68":"text-black/64"}`}>{footer}</div>:null}</div>
      </section>
    </div>
  </main>;
}
''')

# Messages: plain circular photo (no dealer-update/online overlays) and remove the + action menu completely.
t=read("app/messages/page.tsx")
start=t.find("function DealerUpdateAvatar("); end=t.find("\nfunction Avatar(",start)
if start<0 or end<0: raise RuntimeError("DealerUpdateAvatar block not found")
t=t[:start]+'''function DealerUpdateAvatar({ name, photo }: { listingId: string; name: string; photo?: string | null; online?: boolean; darkMode: boolean }) {\n  return <Avatar name={name} photo={photo} size="h-11 w-11" />;\n}\n'''+t[end:]
t=re.sub(r'\n\s*\{online \? \(\n\s*<span\n\s*className="absolute bottom-\[-1px\] right-\[-1px\] h-3\.5 w-3\.5 rounded-full border-2 border-white bg-\[#25b85a\] shadow-sm"\n\s*aria-label="Active in messages"\n\s*/>\n\s*\) : null\}',"",t)
t=t.replace('function Avatar({\n  name,\n  photo,\n  size,\n  online = false,\n}: {','function Avatar({\n  name,\n  photo,\n  size,\n}: {')
t=t.replace('rounded-full bg-black text-xs font-black text-[#f6b800] ring-1 ring-[#f6b800]/35','rounded-full bg-black text-xs font-black text-[#f6b800]')
needle='''                  <div className="relative shrink-0">\n                    <button\n                      type="button"\n                      onClick={() => setComposerActionsOpen((value) => !value)}'''
marker='''                  <div className="min-w-0 flex-1 rounded-2xl border border-black/10 bg-[#f6f4ee] px-3.5 py-2 focus-within:border-[#f6b800] focus-within:bg-white">'''
pos=t.find(needle); endpos=t.find(marker,pos)
if pos>=0 and endpos>=0:
    t=t[:pos]+'''                  <div className="loadlink-message-input min-w-0 flex-1 rounded-[22px] border border-black/10 bg-white/55 px-4 py-2.5 shadow-sm backdrop-blur-xl focus-within:border-[#f6b800]">'''+t[endpos+len(marker):]
elif 'aria-label="Open message actions"' in t: raise RuntimeError("Message action UI changed unexpectedly")
t=t.replace('className="loadlink-chat-composer border-t border-black/10 bg-white p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] sm:p-4"','className="loadlink-chat-composer border-t border-black/10 bg-white/55 p-2.5 pb-[max(.65rem,env(safe-area-inset-bottom))] backdrop-blur-2xl sm:p-3"')
t=t.replace('className="mx-auto flex max-w-3xl items-end gap-2"','className="mx-auto flex w-full max-w-3xl items-end gap-2"')
t=t.replace('className="max-h-28 min-h-7 w-full resize-none bg-transparent py-1 text-sm font-medium outline-none placeholder:text-black/35 disabled:opacity-50"','className="max-h-28 min-h-7 w-full resize-none bg-transparent py-1 text-[15px] font-medium leading-6 outline-none placeholder:text-black/38 disabled:opacity-50"')
write("app/messages/page.tsx",t)

# Business logo/image: iPhone-friendly input + raw-image fallback if canvas pixel processing fails.
t=read("components/LoadLinkDocumentPreview.tsx")
t=t.replace('accept="image/png,image/jpeg,image/webp"','accept="image/*"')
t=t.replace('''    if (!/^image\\/(png|jpeg|webp)$/i.test(file.type) || file.size > 5 * 1024 * 1024) {\n      setLogoMessage("Use a PNG, JPG or WebP logo smaller than 5 MB.");\n      return;\n    }''','''    const imageLike = file.type.startsWith("image/") || /\\.(png|jpe?g|webp|heic|heif)$/i.test(file.name);\n    if (!imageLike || file.size > 12 * 1024 * 1024) { setLogoMessage("Use an image smaller than 12 MB."); return; }''')
t=t.replace('''      const cleaned = await cleanLogoBackground(file);\n      setBusinessLogo(cleaned);''','''      let cleaned = "";\n      try { cleaned = await cleanLogoBackground(file); } catch { cleaned = await fileToDataUrl(file); }\n      setBusinessLogo(cleaned);''')
if 'function fileToDataUrl(file: File)' not in t:
    t += '''\nfunction fileToDataUrl(file: File) { return new Promise<string>((resolve,reject)=>{ const reader=new FileReader(); reader.onload=()=>resolve(String(reader.result||"")); reader.onerror=()=>reject(reader.error||new Error("Image read failed")); reader.readAsDataURL(file); }); }\n'''
write("components/LoadLinkDocumentPreview.tsx",t)

# Redundant driver sentence removed from source.
t=read("components/phase2/DriversAvailableForWork.tsx")
t=t.replace('<p className={styles.embeddedCopy}>Browse approved profiles and contact a suitable driver through LoadLink.</p>','')
write("components/phase2/DriversAvailableForWork.tsx",t)

# Listing route metadata uses the actual first listing photo for social/iPhone share previews.
write("app/listing/[id]/layout.tsx", '''import type { Metadata } from "next";\nimport type { ReactNode } from "react";\nconst SITE="https://matikinca-marketplace.vercel.app";\ntype ListingRow={title?:string|null;city?:string|null;vehicle_group?:string|null;photos?:string[]|null;poster_photo?:string|null};\nasync function getListing(id:string):Promise<ListingRow|null>{const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!url||!key||!id)return null;try{const r=await fetch(`${url}/rest/v1/job_listings?id=eq.${encodeURIComponent(id)}&select=title,city,vehicle_group,photos,poster_photo&limit=1`,{headers:{apikey:key,Authorization:`Bearer ${key}`},next:{revalidate:60}});if(!r.ok)return null;const rows=(await r.json()) as ListingRow[];return rows[0]||null}catch{return null}}\nfunction imageUrl(v?:string|null){if(!v)return `${SITE}/images/loadlink-logo-light.png`;if(/^https?:\\/\\//i.test(v))return v;return `${SITE}${v.startsWith("/")?v:`/${v}`}`}\nexport async function generateMetadata({params}:{params:Promise<{id:string}>}):Promise<Metadata>{const {id}=await params;const l=await getListing(id);const title=l?.title?`${l.title} | LoadLink`:"LoadLink listing";const description=l?[l.city,l.vehicle_group,"Available on LoadLink"].filter(Boolean).join(" · "):"View this logistics listing on LoadLink.";const image=imageUrl(l?.photos?.find(Boolean)||l?.poster_photo);const canonical=`${SITE}/listing/${encodeURIComponent(id)}`;return{title,description,alternates:{canonical},openGraph:{title,description,url:canonical,siteName:"LoadLink",type:"website",images:[{url:image,alt:l?.title||"LoadLink listing"}]},twitter:{card:"summary_large_image",title,description,images:[image]}}}\nexport default function ListingLayout({children}:{children:ReactNode}){return children;}\n''')

# Final safety assertions before build.
assert 'loadlink-collage-repair.css' in read('app/layout.tsx')
assert 'LoadLinkTouchScrollGuard' in read('app/layout.tsx')
assert 'aria-label="Open message actions"' not in read('app/messages/page.tsx')
assert 'compare-restored' in read('app/packages/page.tsx')
assert 'data-loadlink-auth-landing="v290"' in read('components/AuthLandingShell.tsx')
assert 'Browse approved profiles and contact a suitable driver through LoadLink.' not in read('components/phase2/DriversAvailableForWork.tsx')
print("LoadLink collage UI repair source patch complete")
