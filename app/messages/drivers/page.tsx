"use client";
import {useEffect} from "react";
import {useRouter} from "next/navigation";

export default function LegacyDriverMessageRedirect(){
 const router=useRouter();
 useEffect(()=>{
  const source=new URLSearchParams(window.location.search);
  const query=new URLSearchParams();
  const profile=source.get("driver");
  const thread=source.get("thread");
  if(profile)query.set("driver",profile);
  else if(thread)query.set("driverThread",thread);
  else query.set("driverInbox","1");
  router.replace(`/messages?${query.toString()}`);
 },[router]);
 return <main className="flex min-h-screen items-center justify-center bg-[#f8f8f7] p-6 text-sm font-semibold">Opening LoadLink Messages…</main>;
}
