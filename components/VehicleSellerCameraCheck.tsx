"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import Link from "next/link";
import {loadFaceGuidance} from "@/lib/faceComparison";
import {checkDriverFrame,updateDriverHold,type Hold} from "@/lib/driverCapture";
import {cameraFailureText,selectRecordingMime,waitForCameraFrame} from "@/lib/vehicleFaceCamera";
import type {Pose} from "@/lib/liveIdentity";

type Evidence = {portrait:File;video:File;consentAt:string};
type Props = {darkMode:boolean;disabled:boolean;onChange:(evidence:Evidence|null,mode:"camera"|"manual"|null)=>void};
type Stage = "idle"|"opening"|"capturing"|"done"|"manual";
const prompts:Record<Pose,string> = {
  centre:"Look straight into the camera",
  left:"Slowly turn your head to your left",
  right:"Slowly turn your head to your right",
};
const hints:Record<string,string> = {
  missing:"No face detected. Move into better light and face the camera.",
  multiple:"Only the vehicle owner should be visible in the camera.",
  position:"Keep your whole face centred and at arm's length.",
  turn:"Move your head slowly in the requested direction.",
  hold:"Good position — hold still for a moment.",
};

function capturePortrait(player:HTMLVideoElement):Promise<Blob> {
  if (!player.videoWidth || !player.videoHeight) return Promise.reject(new Error("The camera picture is not ready."));
  const canvas=document.createElement("canvas");
  canvas.width=Math.min(player.videoWidth,960);
  canvas.height=Math.max(1,Math.round(player.videoHeight*canvas.width/player.videoWidth));
  const context=canvas.getContext("2d");
  if(!context) return Promise.reject(new Error("The camera photo could not be prepared."));
  context.drawImage(player,0,0,canvas.width,canvas.height);
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>{
    canvas.width=1;canvas.height=1;
    if(blob && blob.size>0) resolve(blob);
    else reject(new Error("The face photo could not be saved."));
  },"image/jpeg",.83));
}

export default function VehicleSellerCameraCheck({darkMode,disabled,onChange}:Props) {
  const [consent,setConsent]=useState(false);
  const consentRef=useRef(false);
  const [stage,setStage]=useState<Stage>("idle");
  const [hasCapture,setHasCapture]=useState(false);
  const [step,setStep]=useState(0);
  const [posePrompt,setPosePrompt]=useState<Pose>("centre");
  const [hint,setHint]=useState("Place your face in good natural light.");
  const [error,setError]=useState("");
  const video=useRef<HTMLVideoElement>(null),stream=useRef<MediaStream|null>(null),run=useRef(0),hintRef=useRef("");
  const stop=useCallback(()=>{
    stream.current?.getTracks().forEach(track=>track.stop());
    stream.current=null;
    if(video.current){video.current.pause();video.current.srcObject=null;}
  },[]);
  useEffect(()=>()=>{run.current++;stop()},[stop]);

  const begin=async()=>{
    if(disabled||!consentRef.current||stage==="opening"||stage==="capturing")return;
    const id=++run.current;
    setError("");setStep(0);setHint("Opening the front camera…");setStage("opening");
    let recorder:MediaRecorder|null=null;
    try{
      if(!window.isSecureContext) throw new Error("Camera access needs a secure HTTPS connection. Use the official LoadLink website.");
      if(!navigator.mediaDevices?.getUserMedia) throw new Error("This browser cannot access a selfie camera. Request staff review instead.");
      if(typeof MediaRecorder==="undefined") throw new Error("This browser does not support video evidence recording. Request staff review.");
      let media:MediaStream;
      try{
        media=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:"user"},width:{ideal:720},height:{ideal:960}}});
      }catch(e){
        if((e as {name?:string})?.name!=="OverconstrainedError")throw e;
        media=await navigator.mediaDevices.getUserMedia({audio:false,video:true});
      }
      if(id!==run.current){media.getTracks().forEach(track=>track.stop());return;}
      stream.current=media;
      // Rendering can complete after getUserMedia on iOS webviews.
      if(!video.current) await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
      const player=video.current;
      if(!player) throw new Error("The selfie camera preview did not appear. Retry or request staff review.");
      player.srcObject=media;
      player.muted=true;
      player.playsInline=true;
      await player.play();
      await waitForCameraFrame(player);
      if(id!==run.current)return;
      setHint("Loading face guidance on your device…");
      const face=await loadFaceGuidance();
      if(id!==run.current)return;
      const mime=selectRecordingMime(type=>MediaRecorder.isTypeSupported?.(type)===true);
      try{
        recorder=new MediaRecorder(media,{...(mime?{mimeType:mime}:{}),videoBitsPerSecond:420000});
      }catch{
        recorder=new MediaRecorder(media);
      }
      const recorderType=(recorder.mimeType||mime||"video/webm").split(";")[0];
      const chunks:Blob[]=[];
      let recordingFailure=false;
      recorder.ondataavailable=event=>{if(event.data.size>0)chunks.push(event.data);};
      recorder.onerror=()=>{recordingFailure=true;};
      const doneRecording=new Promise<void>(resolve=>{recorder!.onstop=()=>resolve();});
      // Five deliberately distinct guidance steps, not a claim of automated
      // identity confirmation or spoof-resistant liveness detection.
      const poses:Pose[]=["centre",Math.random()>.5?"left":"right","centre",Math.random()>.5?"right":"left","centre"];
      const started=performance.now();
      let captured:Blob|null=null,hold:Hold|null=null;
      recorder.start(400);
      setStage("capturing");
      for(let i=0;i<poses.length;i++){
        setStep(i);setPosePrompt(poses[i]);hold=null;hintRef.current="";
        let accepted=false;
        while(!accepted){
          if(id!==run.current)return;
          if(recordingFailure) throw new Error("The recording stopped unexpectedly. Retry or request staff review.");
          if(media.getVideoTracks().some(track=>track.readyState==="ended")) throw new Error("Camera connection was interrupted. Retry the scan.");
          if(performance.now()-started>90000) throw new Error("The scan timed out. Try brighter, even lighting or request staff review.");
          const faces=await face.detectAllFaces(player,new face.TinyFaceDetectorOptions({
            inputSize:224,scoreThreshold:.45,
          })).withFaceLandmarks(true).run();
          const entry=faces.length===1?faces[0]:null;
          const quality=checkDriverFrame({
            faces:faces.length,box:entry?.detection.box,points:entry?.landmarks.positions,
            width:player.videoWidth,height:player.videoHeight,
          },poses[i]);
          if(hintRef.current!==quality){
            hintRef.current=quality;
            setHint(hints[quality]||"Follow the camera guidance.");
          }
          const next=updateDriverHold(hold,quality==="hold",performance.now());
          hold=next.hold;
          if(next.reached){
            if(!captured)captured=await capturePortrait(player);
            accepted=true;
          }else await new Promise(resolve=>window.setTimeout(resolve,110));
        }
      }
      if(recorder.state!=="inactive")recorder.stop();
      await Promise.race([
        doneRecording,
        new Promise<never>((_,reject)=>window.setTimeout(()=>reject(new Error("Recording did not finish. Retry or request staff review.")),5500)),
      ]);
      if(id!==run.current || !consentRef.current)return;
      const recording=new Blob(chunks,{type:recorderType});
      if(!captured||!recording.size||recording.size>8*1024*1024)
        throw new Error("The scan completed, but the recording could not be saved. Retry or request staff review.");
      const extension=recorderType==="video/mp4"?"mp4":"webm";
      onChange({
        portrait:new File([captured],"seller-portrait.jpg",{type:"image/jpeg"}),
        video:new File([recording],"seller-face."+extension,{type:recorderType}),
        consentAt:new Date().toISOString(),
      },"camera");
      setHasCapture(true);setHint("Camera evidence ready for staff review.");setStage("done");
    }catch(e){
      if(id===run.current){
        setError(cameraFailureText(e));
        // A failed retake must never silently erase a previous valid capture.
        setStage(hasCapture?"done":"idle");
      }
    }finally{
      if(recorder?.state==="recording")try{recorder.stop();}catch{}
      stop();
    }
  };
  const manual=()=>{
    run.current++;stop();setError("");setStage("manual");setHasCapture(false);
    onChange(null,"manual");
  };
  const card=darkMode?"border-white/15 bg-[#141414] text-white":"border-black/10 bg-white text-black";
  return <section data-loadlink-guided-seller-face="true" className={`mt-4 rounded-xl border p-4 ${card}`} aria-label="Private seller face evidence">
    <h3 className="text-sm font-semibold">Owner identity check</h3>
    <p className="mt-2 text-xs leading-5 opacity-70">
      Scan your face using the front camera, or choose manual staff review if your phone does not support recording.
      Camera evidence is reviewed by authorised staff; this does not automatically identify you or prove liveness.
      {" "}<Link href="/legal#verification-security" className="underline">Privacy information</Link>
    </p>
    <label className="mt-3 flex items-start gap-3 text-xs font-medium leading-5">
      <input type="checkbox" checked={consent} onChange={event=>{
        const agreed=event.target.checked;
        consentRef.current=agreed;
        setConsent(agreed);
        if(!agreed){
          run.current++;stop();setStage("idle");setHasCapture(false);setError("");
          onChange(null,null);
        }
      }}
        disabled={disabled} className="mt-1 h-4 w-4 accent-[#f6b800]"/>
      I consent to private capture, storage and staff review of the face evidence for vehicle listing verification.
    </label>
    {stage==="opening"||stage==="capturing"?<div className="mt-4 space-y-3">
      <div className="relative mx-auto max-w-sm overflow-hidden rounded-lg bg-black">
        <video ref={video} autoPlay muted playsInline className="max-h-[40dvh] w-full -scale-x-100 object-contain"
          aria-label="Front-facing selfie scan preview"/>
        <div aria-hidden="true" className="pointer-events-none absolute inset-[12%_17%] rounded-[48%] border border-white/45"/>
      </div>
      <div aria-live="polite">
        <p className="text-sm font-semibold">{stage==="opening"?"Opening camera…":`Step ${step+1} of 5 · ${prompts[posePrompt]}`}</p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-current/10">
          <div className="h-full rounded-full bg-[#f6b800] transition-[width] duration-200"
            style={{width:stage==="opening"?"5%":`${Math.round((step+1)/5*100)}%`}}/>
        </div>
        <p role="status" className="mt-2 text-xs leading-5 opacity-75">{hint}</p>
      </div>
      <button type="button" onClick={()=>{run.current++;stop();setStage(hasCapture?"done":"idle");}}
        className="min-h-10 rounded-lg border border-current/20 px-4 text-xs font-semibold">Cancel scan</button>
    </div>:null}
    {stage!=="opening"&&stage!=="capturing"?<div className="mt-4 flex flex-wrap gap-2">
      <button type="button" onClick={()=>void begin()} disabled={disabled||!consent}
        className="min-h-11 rounded-lg bg-[#f6b800] px-4 text-xs font-semibold text-black disabled:opacity-40">
        {stage==="done"?"Redo scan":"Start face scan"}
      </button>
      <button type="button" onClick={manual} disabled={disabled||!consent}
        className="min-h-11 rounded-lg border border-current/20 px-4 text-xs font-semibold disabled:opacity-40">
        Request staff review
      </button>
    </div>:null}
    {stage==="done"?<p role="status" className="mt-3 text-xs font-semibold text-emerald-600">
      Scan recorded. Evidence will be checked by staff after submission; this is not identity approval.
    </p>:null}
    {stage==="manual"?<p role="status" className="mt-3 text-xs leading-5">
      Manual identity review selected. Your identity documents will be reviewed by staff. No automatic approval.
    </p>:null}
    {error?<p role="alert" className="mt-3 text-xs font-semibold leading-5 text-red-500">{error}</p>:null}
  </section>;
}
