"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import Link from "next/link";
import {loadFaceGuidance} from "@/lib/faceComparison";
import {checkDriverFrame,updateDriverHold,type Hold} from "@/lib/driverCapture";
import type {Pose} from "@/lib/liveIdentity";
type Evidence={portrait:File;video:File;consentAt:string};
type Props={darkMode:boolean;disabled:boolean;onChange:(evidence:Evidence|null,mode:"camera"|"manual"|null)=>void};
const prompts:Record<Pose,string>={centre:"Look directly at the camera",left:"Turn your head slowly left",right:"Turn your head slowly right"};
function photoOf(video:HTMLVideoElement):Promise<Blob>{
 const canvas=document.createElement("canvas");canvas.width=video.videoWidth;canvas.height=video.videoHeight;
 const context=canvas.getContext("2d");if(!context)return Promise.reject(new Error("Camera image unavailable"));
 context.drawImage(video,0,0);return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("Image could not be saved")),"image/jpeg",.86));
}
export default function VehicleSellerCameraCheck({darkMode,disabled,onChange}:Props){
 const [consent,setConsent]=useState(false),[stage,setStage]=useState<"idle"|"opening"|"capturing"|"done"|"manual">("idle");
 const [step,setStep]=useState(0),[error,setError]=useState("");
 const video=useRef<HTMLVideoElement>(null),stream=useRef<MediaStream|null>(null),run=useRef(0);
 const stop=useCallback(()=>{stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;if(video.current)video.current.srcObject=null},[]);
 useEffect(()=>()=>{run.current++;stop()},[stop]);
 const begin=async()=>{
  if(disabled||!consent||stage==="opening"||stage==="capturing")return;
  const id=++run.current;onChange(null,null);setError("");setStep(0);setStage("opening");
  let recording:MediaRecorder|null=null;
  try{
   if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==="undefined")throw new Error("Camera recording is not supported. Request staff review instead.");
   const media=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:"user",width:{ideal:720},height:{ideal:960}}});
   if(id!==run.current){media.getTracks().forEach(t=>t.stop());return}
   stream.current=media;
   const player=video.current;if(!player)throw new Error("Camera preview is unavailable");
   player.srcObject=media;await player.play();
   const face=await loadFaceGuidance();
   if(id!==run.current)return;
   const mime=["video/mp4","video/webm;codecs=vp8","video/webm"].find(type=>MediaRecorder.isTypeSupported(type));
   if(!mime)throw new Error("This browser cannot record face evidence. Request staff review.");
   recording=new MediaRecorder(media,{mimeType:mime,videoBitsPerSecond:420000});
   const chunks:Blob[]=[];recording.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
   let recordingFailure=false;recording.onerror=()=>{recordingFailure=true};
   const doneRecording=new Promise<void>(resolve=>{recording!.onstop=()=>resolve()});
   const poses:Pose[]=["centre",Math.random()>.5?"left":"right","centre",Math.random()>.5?"right":"left","centre"];
   let captured:Blob|null=null,hold:Hold|null=null;
   const started=performance.now();setStage("capturing");recording.start(250);
   for(let i=0;i<poses.length;i++){
    setStep(i);
    let accepted=false;
    while(!accepted){
     if(id!==run.current)return;
     if(recordingFailure||performance.now()-started>60000)throw new Error("Face capture timed out. Try again in good light.");
     const detector=await face.detectAllFaces(player,new face.TinyFaceDetectorOptions({inputSize:224,scoreThreshold:.5})).withFaceLandmarks(true).run();
     const target=poses[i];
     const f=detector.length===1?detector[0]:null;
     const quality=checkDriverFrame({faces:detector.length,box:f?.detection.box,points:f?.landmarks.positions,width:player.videoWidth,height:player.videoHeight},target);
     const next=updateDriverHold(hold,quality==="hold",performance.now());hold=next.hold;
     if(next.reached){
      if(!captured){captured=await photoOf(player)}
      accepted=true;hold=null;
     }else await new Promise(resolve=>setTimeout(resolve,90));
    }
   }
   if(recording.state!=="inactive")recording.stop();
   await Promise.race([doneRecording,new Promise<never>((_,reject)=>setTimeout(()=>reject(new Error("Recording did not finish")),3500))]);
   if(id!==run.current)return;
   const blob=new Blob(chunks,{type:mime.split(";")[0]});
   if(!captured||!blob.size||blob.size>8*1024*1024)throw new Error("Face evidence could not be saved. Try again or request staff review.");
   onChange({portrait:new File([captured],"seller-portrait.jpg",{type:"image/jpeg"}),video:new File([blob],`seller-face.${mime.includes("mp4")?"mp4":"webm"}`,{type:blob.type}),consentAt:new Date().toISOString()},"camera");
   setStage("done");
  }catch(e){
   if(id===run.current){setError(e instanceof Error?e.message:"Camera check failed");setStage("idle")}
  }finally{
   if(recording?.state==="recording")try{recording.stop()}catch{}
   stop();
  }
 };
 const manual=()=>{run.current++;stop();setError("");setStage("manual");onChange(null,"manual")};
 const card=darkMode?"border-white/15 bg-[#141414] text-white":"border-black/10 bg-white text-black";
 return <section className={`mt-4 rounded-2xl border p-4 ${card}`} aria-label="Private seller face evidence">
  <div className="flex items-start justify-between gap-3">
   <div><h3 className="text-base font-black">Owner identity check</h3><p className="mt-1 text-xs leading-5 opacity-70">Private sellers: complete the guided camera check, or request manual ID verification if your device cannot record.</p></div>
   <span className="rounded-full bg-[#f6b800] px-2.5 py-1 text-[10px] font-black text-black">PRIVATE</span>
  </div>
  <p className="mt-3 text-xs leading-5 opacity-70">With your consent, your selfie and short movement recording are stored privately for authorised staff review. This is not automatic facial identification or proof of liveness. <Link className="underline" href="/legal#verification-security">Privacy information</Link></p>
  <label className="mt-3 flex items-start gap-3 text-xs font-semibold leading-5">
   <input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} disabled={disabled} className="mt-1 h-4 w-4 accent-[#f6b800]"/>
   I consent to private capture, storage and staff review of my face evidence for vehicle listing verification.
  </label>
  {stage==="opening"||stage==="capturing"?<div className="mt-4 space-y-2">
    <video ref={video} autoPlay muted playsInline className="mx-auto max-h-64 w-full rounded-xl bg-black object-contain" aria-label="Selfie camera preview"/>
    <p role="status" className="text-sm font-bold">{stage==="opening"?"Opening camera…":`Step ${step+1} of 5 · ${prompts[["centre","left","centre","right","centre"][step] as Pose]}`}</p>
    <button type="button" onClick={()=>{run.current++;stop();setStage("idle")}} className="h-10 rounded-xl border border-current/20 px-4 text-xs font-bold">Cancel camera</button>
   </div>:null}
  {stage!=="opening"&&stage!=="capturing"?<div className="mt-4 flex flex-wrap gap-2">
    <button type="button" onClick={()=>void begin()} disabled={disabled||!consent} className="min-h-11 rounded-xl bg-[#f6b800] px-4 text-xs font-black text-black disabled:opacity-40">{stage==="done"?"Redo face check":"Start face check"}</button>
    <button type="button" onClick={manual} disabled={disabled||!consent} className="min-h-11 rounded-xl border border-current/20 px-4 text-xs font-bold disabled:opacity-40">Request staff review</button>
   </div>:null}
  {stage==="done"?<p role="status" className="mt-3 text-xs font-semibold text-emerald-600">Camera evidence captured. It will be reviewed by staff after submission.</p>:null}
  {stage==="manual"?<p role="status" className="mt-3 text-xs font-semibold">Manual verification requested. Staff will compare your uploaded identity documents. No automatic approval.</p>:null}
  {error?<p role="alert" className="mt-3 text-xs font-semibold text-red-500">{error}</p>:null}
 </section>;
}
