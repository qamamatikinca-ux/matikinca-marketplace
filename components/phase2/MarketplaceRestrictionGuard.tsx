"use client";

import { useEffect } from "react";
import { browserSupabase } from "@/lib/phase2/supabase";

const ACTION_SELECTOR = [
  'a[href^="tel:"]','a[href*="/login"]','a[href*="/sign-in"]','a[href*="/signup"]',
  'a[href*="/chat"]','a[href*="/message"]','a[href*="/list-your"]','a[href*="/post"]',
  '[data-auth-action]','[data-marketplace-action]'
].join(',');

export default function MarketplaceRestrictionGuard(){
  useEffect(()=>{
    let observer:MutationObserver|undefined;
    let cancelled=false;
    const hide=()=>document.querySelectorAll<HTMLElement>(ACTION_SELECTOR).forEach(el=>{el.hidden=true;el.setAttribute('aria-hidden','true');});
    const run=async()=>{
      const supabase=browserSupabase();
      const {data}=await supabase.auth.getSession();
      const token=data.session?.access_token;
      const persisted=sessionStorage.getItem('loadlink-marketplace-restricted')==='1';
      if(!token && persisted){ document.documentElement.dataset.loadlinkActionsHidden='true'; hide(); }
      if(!token) return;
      const response=await fetch('/api/phase2/capabilities',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'});
      if(!response.ok) return;
      const capabilities=await response.json();
      if(cancelled) return;
      const accountRestricted=capabilities.status==='blocked'||capabilities.status==='suspended';
      if(accountRestricted){
        sessionStorage.setItem('loadlink-marketplace-restricted','1');
        document.documentElement.dataset.loadlinkActionsHidden='true';
        hide();
        observer=new MutationObserver(hide); observer.observe(document.body,{childList:true,subtree:true});
      } else {
        sessionStorage.removeItem('loadlink-marketplace-restricted');
        delete document.documentElement.dataset.loadlinkActionsHidden;
      }
    };
    run().catch(()=>undefined);
    const sync=()=>run().catch(()=>undefined);
    window.addEventListener('loadlink-access-state-changed',sync);
    return()=>{cancelled=true;observer?.disconnect();window.removeEventListener('loadlink-access-state-changed',sync);};
  },[]);
  return null;
}
