"use client";

import { useState } from "react";

type Plan = "pro" | "dealer";
export default function PackageGuide({ darkMode=false }: { darkMode?: boolean }) {
  const [step,setStep]=useState(0); const [dealer,setDealer]=useState<boolean|null>(null); const [stock,setStock]=useState<"few"|"many"|null>(null); const [team,setTeam]=useState<boolean|null>(null);
  const muted=darkMode?"text-white/50":"text-black/50"; const surface=darkMode?"border-white/10 bg-[#0b0b0b]":"border-black/10 bg-white";
  const recommended:Plan = dealer || team || stock==="many" ? "dealer" : "pro";
  const progress=Math.min(100,((step+1)/4)*100);
  return <section className={`overflow-hidden rounded-[24px] border ${surface}`} data-loadlink-price-guide="v27-simple">
    <div className="h-1 bg-current/5"><div className="h-full bg-[#f6b800] transition-all" style={{width:`${progress}%`}}/></div>
    <div className="p-5 sm:p-7"><div className="text-[10px] font-black uppercase tracking-[.08em] opacity-35">Plan guide</div>
      {step===0?<><h1 className="mt-2 text-[28px] font-black tracking-[-.05em] sm:text-[36px]">Are you a dealership?</h1><p className={`mt-2 text-xs font-semibold ${muted}`}>Choose the option that best describes how you sell vehicles.</p><div className="mt-5 grid grid-cols-2 gap-2"><Choice label="Yes" onClick={()=>{setDealer(true);setStep(1)}}/><Choice label="No" onClick={()=>{setDealer(false);setStep(1)}}/></div></>:null}
      {step===1?<><h2 className="text-[26px] font-black tracking-[-.045em]">How much stock do you usually advertise?</h2><div className="mt-5 grid gap-2 sm:grid-cols-2"><Choice label="A few vehicles" detail="Individual owner or smaller operator" onClick={()=>{setStock('few');setStep(2)}}/><Choice label="A larger stock list" detail="Regular dealership or business inventory" onClick={()=>{setStock('many');setStep(2)}}/></div><Back onClick={()=>setStep(0)}/></>:null}
      {step===2?<><h2 className="text-[26px] font-black tracking-[-.045em]">Do other people need to work on the account?</h2><div className="mt-5 grid grid-cols-2 gap-2"><Choice label="Yes" onClick={()=>{setTeam(true);setStep(3)}}/><Choice label="No" onClick={()=>{setTeam(false);setStep(3)}}/></div><Back onClick={()=>setStep(1)}/></>:null}
      {step===3?<><div className="text-[10px] font-black uppercase tracking-[.08em] opacity-35">Recommended</div><h2 className="mt-2 text-[34px] font-black tracking-[-.055em]">{recommended==='dealer'?'Dealer':'Pro'}</h2><p className={`mt-2 max-w-lg text-xs font-semibold leading-5 ${muted}`}>{recommended==='dealer'?'Best for a dealership or business that needs a showroom, team tools, Status and sales workflow.':'Best for an individual owner or operator who needs better vehicle advertising and analytics.'}</p><div className="mt-5 flex gap-2"><button onClick={()=>document.getElementById(`${recommended}-package`)?.scrollIntoView({behavior:'smooth',block:'center'})} className="h-11 flex-1 rounded-xl bg-[#f6b800] px-4 text-sm font-black text-black">View {recommended==='dealer'?'Dealer':'Pro'}</button><button onClick={()=>setStep(0)} className="h-11 rounded-xl border border-current/10 px-4 text-xs font-black">Start again</button></div></>:null}
    </div>
  </section>;
}
function Choice({label,detail,onClick}:{label:string;detail?:string;onClick:()=>void}){return <button type="button" onClick={onClick} className="min-h-[64px] rounded-[16px] border border-current/10 px-4 py-3 text-left transition hover:border-[#f6b800]/70"><span className="block text-sm font-black">{label}</span>{detail?<span className="mt-1 block text-[9px] font-semibold opacity-42">{detail}</span>:null}</button>}
function Back({onClick}:{onClick:()=>void}){return <button type="button" onClick={onClick} className="mt-5 text-[10px] font-black opacity-45">Back</button>}
