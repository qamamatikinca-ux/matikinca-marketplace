"use client";

import { useEffect, useState } from "react";
import { getLoadLinkIntelligence, getPaystackManagementLink, requestLoadLinkPlan, startLoadLinkPayment, type LoadLinkIntelligenceState } from "@/lib/loadlinkIntelligence";

export type BusinessPlanId = "pro" | "dealer";
const entitled = new Set(["active","trial","trialing","grace_period","cancelled"]);
const plans = [
  { id:"pro" as const, name:"Pro", price:"R399", description:"For individual owners and operators who advertise vehicles regularly.", features:["Unlimited vehicle listings","Up to 15 photos per listing","Listing analytics","Unlimited messages","Higher search visibility","Priority support"] },
  { id:"dealer" as const, name:"Dealer", price:"R2 999", description:"For dealerships that need a showroom, sales workspace and team tools.", features:["Everything in Pro","Public dealership showroom","Dealer Status","Lead and customer workspace","Quotes and follow-ups","Team roles","Dealer analytics","Inventory and sales tools"] },
];

export default function BusinessPlans({darkMode=false,compact=false,selectable=false,selectedPlan=null,onSelect,enableRequests=false}:{darkMode?:boolean;compact?:boolean;selectable?:boolean;selectedPlan?:BusinessPlanId|null;onSelect?:(p:BusinessPlanId)=>void;enableRequests?:boolean}){
  const [state,setState]=useState<LoadLinkIntelligenceState|null>(null); const [busy,setBusy]=useState(""); const [notice,setNotice]=useState("");
  useEffect(()=>{void getLoadLinkIntelligence().then(setState).catch(()=>setState(null));},[]);
  const muted=darkMode?"text-white/52":"text-black/52"; const internal=String(state?.email||"").toLowerCase()==="loadlinksouthafrica@gmail.com";
  async function act(plan:BusinessPlanId){
    if(selectable){onSelect?.(plan);return;} if(!enableRequests)return; setBusy(plan);setNotice("");
    try{const fresh=await getLoadLinkIntelligence();setState(fresh);if(!fresh.authenticated){window.location.assign(`/login?returnTo=${encodeURIComponent('/packages#plans')}`);return;}
      if(["blocked","suspended"].includes(fresh.account_status))throw new Error(fresh.account_reason||"This account cannot request a plan right now.");
      const requestForPlan=fresh.plan_request_plan===plan;
      if(requestForPlan&&["approved_for_payment","payment_pending","payment_failed","payment_syncing"].includes(String(fresh.plan_request_state))&&fresh.plan_request_id){const p=await startLoadLinkPayment(fresh.plan_request_id);window.location.assign(p.authorization_url);return;}
      if(requestForPlan&&fresh.plan_request_state==="under_review"){setNotice(`Your ${plan === "dealer" ? "Dealer" : "Pro"} request is already under review. You don’t need to submit it again.`);return;}
      if(fresh.plan==="dealer"&&entitled.has(String(fresh.plan_state))){window.location.assign("/dealer");return;}
      if(fresh.plan===plan&&entitled.has(String(fresh.plan_state))){window.location.assign(plan==="dealer"?"/dealer":"/list-your-vehicle?plan=pro&smart=1");return;}
      const result:any=await requestLoadLinkPlan(plan);setNotice(result?.message||"Your request has been received.");setState(await getLoadLinkIntelligence());
    }catch(e){setNotice(e instanceof Error?e.message:"LoadLink could not complete that request.");}finally{setBusy("");}
  }
  async function manage(){setBusy("manage");setNotice("");try{const r=await getPaystackManagementLink();window.location.assign(r.link);}catch(e){setNotice(e instanceof Error?e.message:"Plan management is not available right now.");}finally{setBusy("");}}
  return <section id="plans" className={compact?"":`px-4 pb-14 pt-6 md:px-6 ${darkMode?"bg-black text-white":"bg-[#f4efe3] text-black"}`}><div className="mx-auto max-w-5xl">
    {!compact?<div className="mb-5"><h2 className="text-[28px] font-black tracking-[-.05em] md:text-[38px]">Choose how you sell vehicles</h2><p className={`mt-2 max-w-xl text-xs font-semibold leading-5 ${muted}`}>Job posting stays free. Vehicle advertising uses Pro or Dealer.</p></div>:null}
    <div className="grid gap-3 lg:grid-cols-2">{plans.map(plan=>{const active=state?.plan===plan.id&&entitled.has(String(state?.plan_state));const dealerIncludesPro=plan.id==="pro"&&state?.plan==="dealer"&&entitled.has(String(state?.plan_state));const requestForPlan=state?.plan_request_plan===plan.id;const requested=requestForPlan&&state?.plan_request_state==="under_review"&&!!state?.plan_request_id;const pay=requestForPlan&&["approved_for_payment","payment_pending","payment_failed","payment_syncing"].includes(String(state?.plan_request_state))&&!!state?.plan_request_id;const selected=selectedPlan===plan.id;const upgrading=plan.id==="dealer"&&state?.plan==="pro"&&entitled.has(String(state?.plan_state))&&!requestForPlan;return <article id={`${plan.id}-package`} key={plan.id} className={`rounded-[22px] border p-5 md:p-6 ${selected||active?"border-[#f6b800]":darkMode?"border-white/10 bg-[#0b0b0b]":"border-black/10 bg-white"}`}>
      <div className="flex items-start justify-between gap-3"><div><h3 className="text-2xl font-black tracking-[-.04em]">{plan.name}</h3><p className={`mt-1 text-xs font-semibold ${muted}`}>{plan.description}</p></div>{active?<span className="text-[9px] font-black uppercase tracking-[.08em] opacity-45">Current plan</span>:null}</div>
      <div className="mt-5 text-[42px] font-black tracking-[-.055em]">{plan.price}<span className={`ml-2 text-xs ${muted}`}>/ month</span></div><div className="my-5 h-px bg-current/10"/><ul className="grid gap-2.5 sm:grid-cols-2">{plan.features.map(f=><li key={f} className="flex gap-2 text-[11px] font-semibold"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#f6b800]"/>{f}</li>)}</ul>
      {plan.id==="dealer"&&!internal?<button type="button" onClick={()=>window.location.assign('/dealership/loadlink-test-dealership')} className="mt-5 text-[10px] font-black underline decoration-[#f6b800] decoration-2 underline-offset-4">View example dealership</button>:null}
      <button type="button" disabled={busy===plan.id||requested||dealerIncludesPro} onClick={()=>active?void manage():void act(plan.id)} className={`mt-5 h-12 w-full rounded-xl text-sm font-black ${active||dealerIncludesPro?darkMode?"border border-white/12 bg-white/[.04]":"border border-black/10 bg-black/[.03]":"bg-[#f6b800] text-black"} disabled:opacity-45`}>{busy===plan.id||(active&&busy==="manage")?"Working…":active?"Manage plan":dealerIncludesPro?"Included with Dealer":pay?"Continue payment":requested?"Under review":upgrading?"Upgrade to Dealer":selectable&&selected?"Selected":`Choose ${plan.name}`}</button>
    </article>})}</div>{notice?<div role="status" className={`mt-4 rounded-[16px] border p-4 text-xs font-bold ${darkMode?"border-white/10 bg-white/[.03]":"border-black/10 bg-white"}`}>{notice}</div>:null}
  </div></section>;
}
