"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import HomeLogoLink from "@/components/HomeLogoLink";
import LoadLinkThemeToggle from "@/components/LoadLinkThemeToggle";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";
import { dealerFetch } from "@/lib/dealer/client";

function InviteContent() {
  const { darkMode, toggleTheme } = useLoadLinkTheme(); const params = useSearchParams(); const token = params.get("token") || "";
  const [state, setState] = useState<"idle"|"busy"|"done"|"error">("idle"); const [message,setMessage]=useState("");
  async function accept() { setState("busy"); setMessage(""); try { await dealerFetch("/api/dealer/team/accept",{method:"POST",body:JSON.stringify({token})}); setState("done"); } catch(e){ setState("error"); setMessage(e instanceof Error?e.message:"Invitation could not be accepted."); } }
  useEffect(()=>{ if(!token){setState("error");setMessage("This Dealer invitation link is incomplete.");}},[token]);
  return <main className={`min-h-screen ${darkMode?"bg-[#0b0b0b] text-white":"bg-[#f5f3ed] text-black"}`}><header className="relative flex h-16 items-center justify-center border-b border-current/10 px-4"><HomeLogoLink className="h-8 w-auto"/><div className="absolute right-4"><LoadLinkThemeToggle darkMode={darkMode} onToggle={toggleTheme}/></div></header><div className="mx-auto max-w-xl px-4 py-16"><section className={`${darkMode?"bg-[#111]":"bg-white"} border border-current/10 p-6 sm:p-8`}><div className="text-xs font-black uppercase tracking-[.12em] opacity-45">Dealer team</div><h1 className="mt-3 text-3xl font-black tracking-[-.04em]">Accept invitation</h1>{state==="done"?<><p className="mt-4 text-sm leading-6 opacity-65">Your dealership access is active. Your Control Centre will show only the tools allowed by your role.</p><Link href="/dealer" className="mt-6 inline-flex bg-black px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-black">Open Dealer</Link></>:<><p className="mt-4 text-sm leading-6 opacity-65">Sign in with the exact email address that received this invitation. The link is single-use and expires after seven days.</p>{message?<p className="mt-4 text-sm font-bold text-red-500">{message}</p>:null}<button type="button" disabled={!token||state==="busy"} onClick={accept} className="mt-6 bg-black px-5 py-3 text-sm font-black text-white disabled:opacity-40 dark:bg-white dark:text-black">{state==="busy"?"Accepting…":"Accept invitation"}</button></>}</section></div></main>;
}
export default function DealerInvitePage(){return <Suspense fallback={null}><InviteContent/></Suspense>}
