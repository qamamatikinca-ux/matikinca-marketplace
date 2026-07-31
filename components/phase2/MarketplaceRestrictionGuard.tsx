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
      const response=await fetch('/api/phase2/capabilities',{headers:{Authorization:`Bearer ${token}`}});
      if(!response.ok) return;
      const capabilities=await response.json();
      if(cancelled) return;
      if(capabilities.hideActions || !capabilities.canLogin){
        sessionStorage.setItem('loadlink-marketplace-restricted','1');
        document.documentElement.dataset.loadlinkActionsHidden='true';
        hide();
        observer=new MutationObserver(hide); observer.observe(document.body,{childList:true,subtree:true});
        await supabase.auth.signOut();
      } else sessionStorage.removeItem('loadlink-marketplace-restricted');
    };
    run().catch(()=>undefined);
    return()=>{cancelled=true;observer?.disconnect();};
  },[]);
  return null;
}
