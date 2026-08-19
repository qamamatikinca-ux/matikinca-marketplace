"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function PhotoGalleryModernizer(){
  const pathname=usePathname();
  useEffect(()=>{
    if(pathname!=="/jobs")return;
    const timers:number[]=[];

    function modernize(){
      const overlays=Array.from(document.querySelectorAll<HTMLElement>("div.fixed.inset-0"));
      overlays.forEach(overlay=>{
        if(overlay.dataset.loadlinkGalleryModernized==="true")return;
        const figures=Array.from(overlay.querySelectorAll<HTMLElement>("figure"));
        if(!figures.length)return;
        const imageCount=overlay.querySelectorAll("figure img").length;
        if(!imageCount)return;

        overlay.dataset.loadlinkGalleryModernized="true";
        Object.assign(overlay.style,{background:"rgba(0,0,0,.96)",padding:"0",backdropFilter:"blur(10px)",WebkitBackdropFilter:"blur(10px)"});
        const shell=overlay.firstElementChild as HTMLElement|null;
        if(!shell)return;
        Object.assign(shell.style,{maxWidth:"100%",width:"100%",minHeight:"100dvh",padding:"0",display:"flex",flexDirection:"column"});

        const header=shell.firstElementChild as HTMLElement|null;
        if(header){
          header.className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-black/80 px-4 py-3 text-white backdrop-blur-xl";
          header.querySelectorAll<HTMLElement>("p").forEach(p=>{p.style.color="rgba(255,255,255,.5)";p.style.letterSpacing=".08em"});
          const close=header.querySelector<HTMLElement>("button");if(close)close.className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/[.06] text-2xl font-black text-white";
        }

        const rail=figures[0]?.parentElement as HTMLElement|null;
        if(!rail)return;
        Object.assign(rail.style,{display:"flex",gap:"0",overflowX:"auto",overflowY:"hidden",scrollSnapType:"x mandatory",scrollBehavior:"smooth",flex:"1",alignItems:"center",scrollbarWidth:"none"});
        rail.style.setProperty("-webkit-overflow-scrolling","touch");
        rail.querySelectorAll<HTMLElement>("figcaption").forEach(caption=>caption.remove());

        figures.forEach((figure,index)=>{
          Object.assign(figure.style,{flex:"0 0 100%",width:"100%",height:"calc(100dvh - 70px)",border:"0",background:"#000",display:"flex",alignItems:"center",justifyContent:"center",scrollSnapAlign:"center",scrollSnapStop:"always",position:"relative"});
          const image=figure.querySelector<HTMLElement>("img");if(image)Object.assign(image.style,{width:"100%",height:"100%",maxHeight:"calc(100dvh - 70px)",objectFit:"contain"});
          const counter=document.createElement("span");counter.textContent=`${index+1} / ${figures.length}`;counter.className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/65 px-3 py-1.5 text-[10px] font-black text-white backdrop-blur-xl";figure.appendChild(counter);
        });
      });
    }

    function scanAfterInteraction(){[0,80,180,400].forEach(delay=>timers.push(window.setTimeout(modernize,delay)))}
    document.addEventListener("click",scanAfterInteraction,true);
    document.addEventListener("keydown",scanAfterInteraction,true);
    return()=>{document.removeEventListener("click",scanAfterInteraction,true);document.removeEventListener("keydown",scanAfterInteraction,true);timers.forEach(window.clearTimeout)};
  },[pathname]);
  return null;
}
