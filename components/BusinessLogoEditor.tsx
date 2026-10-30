"use client";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import LoadLinkIcon from "@/components/LoadLinkIcon";
import { openLogo, traceLogo } from "@/lib/logoCleaner";
import { brandingRequest } from "@/lib/businessBranding";
import { supabase } from "@/lib/supabaseClient";
import styles from "./BusinessLogoEditor.module.css";
export default function BusinessLogoEditor({ file, onClose, onSaved }: { file:File; onClose:()=>void; onSaved:(logo:string)=>void }) {
 const canvas=useRef<HTMLCanvasElement>(null), original=useRef<ImageData|null>(null), automatic=useRef<ImageData|null>(null), drawing=useRef(false), lastPoint=useRef<{x:number;y:number}|null>(null), mounted=useRef(true);
 const [phase,setPhase]=useState("Opening logo…"),[error,setError]=useState(""),[mode,setMode]=useState<"erase"|"restore">("erase"),[saving,setSaving]=useState(false),[ready,setReady]=useState(false),[brush,setBrush]=useState(8);
 useEffect(()=>{
  let active=true; mounted.current=true; const controller=new AbortController(); const previousOverflow=document.body.style.overflow; document.body.style.overflow="hidden";
  void openLogo(file).then(async source=>{
   if(!active||!canvas.current)return;
   original.current=source.image;canvas.current.width=source.image.width;canvas.current.height=source.image.height;canvas.current.getContext("2d")?.putImageData(source.image,0,0);setPhase("Preparing transparent preview…");
   try{const result=await traceLogo(source.canvas,source.image,value=>{if(active)setPhase(value);},controller.signal);if(!active)return;automatic.current=result;canvas.current?.getContext("2d")?.putImageData(result,0,0);}
   catch{if(active){automatic.current=source.image;setError("Automatic removal could not finish. You can refine the preview or keep the original.");}}
   finally{if(active){setPhase("");setReady(true);}}
  }).catch(e=>{if(active){setError(e instanceof Error?e.message:"The logo could not open.");setPhase("");}});
  const close=(event:KeyboardEvent)=>{if(event.key==="Escape")onClose();};document.addEventListener("keydown",close);
  return()=>{active=false;mounted.current=false;controller.abort();document.body.style.overflow=previousOverflow;document.removeEventListener("keydown",close);};
 },[file,onClose]);
 function paint(event:PointerEvent<HTMLCanvasElement>){
  if(!drawing.current||!ready||saving||!original.current)return;
  const el=event.currentTarget,ctx=el.getContext("2d",{willReadFrequently:true});if(!ctx)return;
  const bounds=el.getBoundingClientRect(),x=(event.clientX-bounds.left)*el.width/bounds.width,y=(event.clientY-bounds.top)*el.height/bounds.height,radius=brush*el.width/bounds.width;
  const previous=lastPoint.current||{x,y};lastPoint.current={x,y};const dx=x-previous.x,dy=y-previous.y,length=dx*dx+dy*dy;
  const image=ctx.getImageData(0,0,el.width,el.height);
  for(let py=Math.max(0,Math.floor(Math.min(y,previous.y)-radius));py<Math.min(el.height,Math.max(y,previous.y)+radius);py++)for(let px=Math.max(0,Math.floor(Math.min(x,previous.x)-radius));px<Math.min(el.width,Math.max(x,previous.x)+radius);px++){
   const t=length?Math.max(0,Math.min(1,((px-previous.x)*dx+(py-previous.y)*dy)/length)):0;const distance=Math.hypot(px-previous.x-t*dx,py-previous.y-t*dy);if(distance>radius)continue;const i=(py*el.width+px)*4,blend=Math.min(1,(1-distance/radius)*5);for(let c=0;c<3;c++)image.data[i+c]=original.current.data[i+c];const alpha=mode==="restore"?original.current.data[i+3]:0;image.data[i+3]=Math.round(image.data[i+3]*(1-blend)+alpha*blend);
  }ctx.putImageData(image,0,0);
 }
 async function save(){
  if(!canvas.current||!ready||saving)return;setSaving(true);setError("");
  try{
   const {data:{session}}=await supabase.auth.getSession();if(!session||!mounted.current)throw Error("Your account changed. Please retry.");
   let output=canvas.current,encoded=output.toDataURL("image/png");
   while(encoded.length>1330000&&output.width>256){const smaller=document.createElement("canvas");smaller.width=Math.round(output.width*.8);smaller.height=Math.max(1,Math.round(output.height*.8));smaller.getContext("2d")?.drawImage(output,0,0,smaller.width,smaller.height);output=smaller;encoded=output.toDataURL("image/png");}
   await brandingRequest({action:"save",image:encoded},session.user.id);
   const current=await supabase.auth.getSession();if(!mounted.current||current.data.session?.user.id!==session.user.id)return;
   onSaved(encoded);
  }catch(e){setError(e instanceof Error?e.message:"The logo could not be saved. Please retry.");}finally{setSaving(false);}
 }
 return createPortal(<div className={styles.overlay}><section role="dialog" aria-modal="true" aria-labelledby="logo-editor-title" className={styles.panel}><header><div><h2 id="logo-editor-title">Business logo</h2><p>Keep the logo. Remove the background.</p></div><button type="button" onClick={onClose} disabled={saving} aria-label="Close logo editor"><LoadLinkIcon name="close" size={20}/></button></header><div className={styles.preview}><canvas ref={canvas} aria-label="Transparent logo preview; drag to refine the edges" onPointerDown={event=>{drawing.current=true;lastPoint.current=null;event.currentTarget.setPointerCapture(event.pointerId);paint(event);}} onPointerMove={paint} onPointerUp={()=>{drawing.current=false;lastPoint.current=null;}} onPointerCancel={()=>{drawing.current=false;lastPoint.current=null;}} /></div>{phase?<p role="status" className={styles.status}>{phase}</p>:<div className={styles.tools}><button type="button" aria-pressed={mode==="erase"} onClick={()=>setMode("erase")} disabled={!ready||saving}>Erase</button><button type="button" aria-pressed={mode==="restore"} onClick={()=>setMode("restore")} disabled={!ready||saving}>Restore</button><button type="button" disabled={!ready||saving} onClick={()=>{if(automatic.current)canvas.current?.getContext("2d")?.putImageData(automatic.current,0,0);}}>Reset</button><button type="button" disabled={!ready||saving} onClick={()=>{if(original.current)canvas.current?.getContext("2d")?.putImageData(original.current,0,0);}}>Original</button></div>}{ready ? <label className={styles.brush}>Brush size<input type="range" min={3} max={24} value={brush} onChange={event=>setBrush(Number(event.target.value))} disabled={saving} /><span>{brush}</span></label> : null}<p className={styles.hint}>Check the fine lettering and edges. Use Erase or Restore to refine them. Your logo appears at the top right of every document.</p>{error?<p role="alert" className={styles.error}>{error}</p>:null}<footer><button type="button" onClick={onClose} disabled={saving}>Cancel</button><button type="button" className={styles.save} onClick={()=>void save()} disabled={!ready||saving}>{saving?"Saving…":"Use this logo"}</button></footer></section></div>,document.body);
}
