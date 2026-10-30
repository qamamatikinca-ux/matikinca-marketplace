"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { driverIdentityRequest } from "@/lib/driverIdentityClient";
import { loadFaceComparison, loadFaceGuidance } from "@/lib/faceComparison";
import { compareDriverEvidence } from "@/lib/driverFaceReview";
import { type Pose } from "@/lib/liveIdentity";
import { checkDriverFrame, updateDriverHold, type Hold } from "@/lib/driverCapture";
import type { DriverIdentityState } from "@/lib/driverVerification";

type Check = { id: string; user_id: string; challenge: Pose[] };
type Capture = { uploads: Record<string, { path: string; token: string }>; check: Check; portrait: Blob; clip: Blob; extension: string; observations: Record<string, unknown> };
async function timed<T>(promise: PromiseLike<T>, ms: number, message: string): Promise<T> {
 let timer: ReturnType<typeof setTimeout> | undefined;
 try { return await Promise.race([Promise.resolve(promise), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(message)), ms); })]); }
 finally { clearTimeout(timer); }
}
async function imageOf(blob: Blob) {
 const url = URL.createObjectURL(blob);
 try { const img = new Image(); img.src = url; await img.decode(); return img; }
 finally { URL.revokeObjectURL(url); }
}
async function portraitOf(video: HTMLVideoElement): Promise<Blob> {
 const canvas = document.createElement("canvas");
 canvas.width = video.videoWidth; canvas.height = video.videoHeight;
 const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Image capture is unavailable.");
 ctx.drawImage(video, 0, 0);
 return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Your face image could not be saved.")), "image/jpeg", .88));
}
const instruction = (pose: Pose) => pose === "centre" ? "Look straight at the camera" : `Slowly turn your head ${pose}`;
export default function DriverCameraCheck({ state, disabled, onSaved, onBusy }: { state: DriverIdentityState; disabled: boolean; onSaved: () => Promise<void>; onBusy: (value: boolean) => void }) {
 const [camera, setCamera] = useState<"user" | "environment">("user");
 const [consent, setConsent] = useState(false);
 const [stage, setStage] = useState<"idle" | "loading" | "opening" | "capturing" | "comparing" | "review" | "sending">("idle");
 const [comparisonNote, setComparisonNote] = useState("");
 const [prompt, setPrompt] = useState(""); const [progress, setProgress] = useState(0);
 const [target, setTarget] = useState<Pose>("centre"); const [error, setError] = useState("");
 const video = useRef<HTMLVideoElement>(null), frame = useRef<HTMLDivElement>(null);
 const stream = useRef<MediaStream | null>(null), recorder = useRef<MediaRecorder | null>(null);
 const run = useRef(0), busy = useRef(false), evidence = useRef<Capture | null>(null);
 const stop = useCallback(() => {
  if (recorder.current?.state === "recording") recorder.current.stop();
  stream.current?.getTracks().forEach(t => t.stop()); stream.current = null;
  if (video.current) video.current.srcObject = null;
 }, []);
 const invalidate = useCallback(() => { run.current++; stop(); }, [stop]);
 const cancel = useCallback(() => { invalidate(); evidence.current = null; busy.current = false; onBusy(false); setStage("idle"); }, [invalidate, onBusy]);
 useEffect(() => {
  const hidden = () => { if (document.hidden && busy.current && !evidence.current) { cancel(); setError("Camera check paused. Keep this page open and try again."); } };
  document.addEventListener("visibilitychange", hidden);
  return () => { document.removeEventListener("visibilitychange", hidden); invalidate(); onBusy(false); };
 }, [cancel, invalidate, onBusy]);
 async function start() {
  if (busy.current || disabled || !consent) return;
  busy.current = true; onBusy(true); const currentRun = ++run.current;
  const active = () => run.current === currentRun;
  setError(""); setComparisonNote(""); setStage("opening"); setPrompt("Allow camera access, then place your face in the oval"); setProgress(0);
  let watchdog: ReturnType<typeof setTimeout> | undefined;
  try {
   if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") throw new Error("This browser cannot run the camera check. Use a recent Safari or Chrome and try again.");
   if (state.identityMime === "application/pdf") throw new Error("Use a JPG or PNG photograph of your ID for this camera check.");
   const acquired = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: camera }, width: { ideal: 640 }, height: { ideal: 480 } } });
   if (!active()) { acquired.getTracks().forEach(t => t.stop()); return; }
   stream.current = acquired;
   const el = video.current; if (!el) throw new Error("The camera preview is unavailable.");
   el.srcObject = acquired; await timed(el.play(), 5000, "The camera preview did not start. Please retry.");
   if (!active()) return;
   setPrompt("Preparing face detection…");
   const api = await timed(loadFaceGuidance(), 25000, "Face detection could not load. Check your connection and try again.");
   if (!active()) return;
   // Warm the small movement models before starting the timed challenge.
   await timed(api.detectAllFaces(el, new api.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: .5 })).withFaceLandmarks(true).run(), 12000, "Face detection could not start on this device. Close other tabs and retry.");
   if (!active()) return;
   const started = await (await driverIdentityRequest({ action: "start", consent })).json();
   if (!active()) return;
   const check: Check = started.check;
   if (!Array.isArray(check?.challenge) || check.challenge.length !== 5 || check.challenge.some(p => !["centre", "left", "right"].includes(p))) throw new Error("The camera instructions could not load. Please retry.");
   if (document.hidden) throw new Error("Keep this page open while starting the camera.");
   const mime = ["video/webm;codecs=vp8", "video/mp4", "video/webm"].find(m => MediaRecorder.isTypeSupported(m));
   if (!mime) throw new Error("Video capture is unavailable in this browser. Please upload a clear ID photograph and retry.");
   const rec = new MediaRecorder(acquired, { mimeType: mime, videoBitsPerSecond: 500000 }); recorder.current = rec;
   const chunks: Blob[] = []; let bytes = 0;
   rec.ondataavailable = e => { if (e.data.size) { bytes += e.data.size; chunks.push(e.data); } };
   const stopped = new Promise<void>(resolve => { rec.onstop = () => resolve(); });
   let recordingError = false; rec.onerror = () => { recordingError = true; };
   const cameraStarted = performance.now(); let recordingStarted = 0;
   let hold: Hold | null = null, index = 0, missingSince = 0;
   let portrait: Blob | null = null, lastPortrait: Blob | null = null;
   const steps: Array<{ step: Pose; detected: boolean; elapsed_ms: number }> = [];
   setStage("capturing"); frame.current?.scrollIntoView({ block: "center", behavior: "smooth" });
   watchdog = setTimeout(() => { if (!active()) return; cancel(); setError("The movements did not finish in 25 seconds. Try again in good light."); }, 25000);
   while (active() && index < check.challenge.length) {
    if (recordingError || bytes > 5 * 1024 * 1024) throw new Error("The recording could not be completed. Please retry.");
    const pose = check.challenge[index]; setTarget(pose);
    const faces = await timed(api.detectAllFaces(el, new api.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: .5 })).withFaceLandmarks(true).run(), 3500, "Face detection stopped responding. Please retry.");
    if (!active()) return;
    const face = faces.length === 1 ? faces[0] : null;
    const quality = checkDriverFrame({ faces: faces.length, box: face?.detection.box, points: face?.landmarks.positions, width: el.videoWidth, height: el.videoHeight }, pose);
    const now = performance.now();
    if (quality === "missing" || quality === "multiple" || quality === "position") {
     missingSince ||= now;
     if (now - missingSince > 6500) throw new Error("We could not keep one face in frame. Move into good light and try again.");
    } else missingSince = 0;
    setPrompt(quality === "missing" ? "Place your face inside the oval" : quality === "multiple" ? "Only one person should be in frame" : quality === "position" ? "Keep your whole face inside the oval" : quality === "hold" ? "Hold still…" : instruction(pose));
    const next = updateDriverHold(hold, quality === "hold", now); hold = next.hold;
    if (next.reached) {
     if (index === 0 || index === check.challenge.length - 1) {
      if (index === 0) {
       portrait = await portraitOf(el); if (!active()) return; rec.start(250); recordingStarted = performance.now();
      } else {
       lastPortrait = await portraitOf(el);
      }
     }
     steps.push({ step: pose, detected: true, elapsed_ms: Math.round(performance.now() - cameraStarted) });
     index++; hold = null; setProgress(index); setPrompt(index < check.challenge.length ? instruction(check.challenge[index]) : "Camera check complete");
    }
    await new Promise(resolve => setTimeout(resolve, 80));
   }
   if (!active()) return;
   const duration = Math.round(performance.now() - recordingStarted);
   if (rec.state !== "inactive") rec.stop(); await timed(stopped, 2000, "The recording could not be saved. Please retry.");
   stop(); clearTimeout(watchdog);
   if (!active()) return;
   const clip = new Blob(chunks, { type: mime.split(";")[0] });
   if (!portrait || !clip.size || clip.size > 6291456) throw new Error("Your recording could not be saved. Please retry.");
   setStage("comparing"); setPrompt("Movements captured. Preparing your identity evidence…");
   let distance: number | null = null;
   let comparisonActive = true;
   try {
    const reviewed = await timed((async () => {
     const comparison = await loadFaceComparison();
     const images = { first: portrait!, last: lastPortrait || portrait!, identity: null as Blob | null };
     return compareDriverEvidence(async source => {
      if (!active() || !comparisonActive) throw new Error("Cancelled");
      if (source === "identity") {
       const response = await driverIdentityRequest({ action: "document" });
       images.identity = await response.blob();
       if (!["image/jpeg", "image/png"].includes(images.identity.type) || !images.identity.size) return [];
      }
      const image = await imageOf(images[source]!);
      // Bound phone photos before inference; never run a 600px ID model before the camera.
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 960 / Math.max(image.width, image.height));
      canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale));
      const ctx = canvas.getContext("2d"); if (!ctx) return [];
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      const faces = await comparison.detectAllFaces(canvas, new comparison.TinyFaceDetectorOptions({ inputSize: source === "identity" ? 320 : 224, scoreThreshold: .35 })).withFaceLandmarks(true).withFaceDescriptors().run();
      return faces.map(face => face.descriptor);
     });
    })(), 18000, "Comparison needs staff review");
    distance = reviewed.distance;
   } catch (comparisonError) {
    if (comparisonError instanceof Error && comparisonError.message.includes("same face throughout")) throw comparisonError;
   } finally { comparisonActive = false; }
   if (!active()) return;
   if (distance === null || distance > .6) setComparisonNote("Your ID needs staff comparison. Your completed recording can still be submitted for review.");
   evidence.current = { uploads: started.uploads, check, portrait, clip, extension: mime.includes("mp4") ? "mp4" : "webm", observations: { complete: true, steps, duration_ms: duration, comparison_distance: distance, camera } };
   setStage("review");
  } catch (e) { if (active()) { stop(); setError(e instanceof Error && e.name === "NotAllowedError" ? "Camera access was denied. Allow it in browser settings and try again." : e instanceof Error ? e.message : "The camera check failed. Please retry."); setStage("idle"); } }
  finally { clearTimeout(watchdog); if (active()) { busy.current = false; onBusy(false); } }
 }
 async function saveCapture() {
  const item = evidence.current; if (!item || busy.current) return;
  busy.current = true; onBusy(true); setStage("sending"); setError("");
  try {
   const { data: { user } } = await supabase.auth.getUser();
   if (!user || user.id !== item.check.user_id) throw new Error("Your account changed. Please start again.");
   for (const [key, blob] of [["portrait", item.portrait], [item.extension, item.clip]] as const) {
    const destination = item.uploads[key];
    if (!destination?.path || !destination.token) throw new Error("The upload link expired. Please start a new check.");
    const result = await supabase.storage.from("identity-live-evidence").uploadToSignedUrl(destination.path, destination.token, blob, { contentType: blob.type });
    if (result.error && String(result.error.statusCode) !== "409" && !/duplicate|already exists/i.test(result.error.message)) throw new Error("The upload failed. Keep this page open and retry saving.");
   }
   await driverIdentityRequest({ action: "finish", id: item.check.id, extension: item.extension, capture: item.observations });
   evidence.current = null; setStage("idle"); await onSaved();
  } catch (e) { setError(e instanceof Error ? e.message : "The check could not be saved."); setStage("review"); }
  finally { busy.current = false; onBusy(false); }
 }
 const working = ["loading", "opening", "capturing", "comparing", "sending"].includes(stage);
 const saved = state.check && ["pending_review", "manual_match"].includes(state.check.status);
 const btn = "rounded-full bg-[#f6b800] px-5 py-3 text-sm font-bold text-black disabled:opacity-40";
 return <div className="mt-5 border-t border-current/15 pt-5">
  <h3 className="text-lg font-black">Identity check</h3>
  {saved ? <p className="mt-2 text-sm leading-6">{state.check?.status === "manual_match" ? "Staff reviewed your identity evidence." : state.check?.mode === "manual" ? "Staff identity review requested. Your ID and profile photo are attached." : "Camera check saved. Your ID and recording are awaiting staff review."}</p> : <>
   <p className="mt-2 text-sm leading-6 opacity-70">Keep your phone still. Look straight ahead, then follow the left and right prompts.</p>
   {state.check?.review_feedback ? <p className="mt-3 text-sm" role="status">{state.check.review_feedback}</p> : null}
   {stage === "idle" ? <>
    <label className="mt-4 block text-sm font-bold">Camera<select value={camera} disabled={disabled} onChange={e => setCamera(e.target.value as typeof camera)} className="mt-2 w-full rounded-xl border border-current/20 bg-transparent p-3"><option value="user">Front camera</option><option value="environment">Back camera</option></select></label>
    <label className="mt-4 flex items-start gap-3 text-sm leading-6"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} disabled={disabled} className="mt-1" /><span>I agree to a private identity review using my ID, photo and camera recording. <Link href="/legal#verification-security" target="_blank" className="underline">Security policy</Link></span></label>
    <button type="button" onClick={() => void start()} disabled={disabled || !consent || !state.identityReady} className={`${btn} mt-4 w-full`}>{error ? "Try camera check again" : "Start camera check"}</button>

   </> : null}
  </>}
  {stage === "loading" || stage === "comparing" ? <div className="mt-4 rounded-2xl border border-current/15 p-4"><p role="status" aria-live="polite" className="text-sm font-bold">{prompt}</p><button type="button" onClick={cancel} className="mt-3 rounded-full border border-current/20 px-5 py-2 text-sm">Cancel</button></div> : null}
  <div ref={frame} className={stage === "opening" || stage === "capturing" ? "mt-4 overflow-hidden rounded-2xl bg-black text-white" : "hidden"}>
   <div className="relative mx-auto h-[min(60vh,480px)] min-h-72 max-w-sm overflow-hidden">
    <video ref={video} autoPlay muted playsInline aria-label="Live face preview" className={`absolute inset-0 h-full w-full object-contain ${camera === "user" ? "-scale-x-100" : ""}`} />
    <div className="pointer-events-none absolute inset-x-[15%] inset-y-[15%] rounded-[50%] border-2 border-[#f6b800]" />
    <div className="absolute inset-x-0 top-0 bg-black/85 px-4 py-3 text-center"><p className="text-xs">{stage === "opening" ? "Starting camera" : `Movement ${Math.min(progress + 1, 5)} of 5`}</p><p className="mt-1 text-xl font-black" role="status" aria-live="polite">{prompt}</p></div>
    {stage === "capturing" && target !== "centre" ? <svg aria-hidden="true" viewBox="0 0 64 32" className={`absolute bottom-10 left-1/2 h-10 w-20 -translate-x-1/2 text-[#f6b800] ${(target === "right") === (camera === "user") ? "rotate-180" : ""}`}><path d="M60 16H6m14-12L6 16l14 12" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /></svg> : null}
   </div>
   <div className="flex items-center justify-between gap-3 px-4 pb-4"><span className="text-xs text-white/70">Keep your face in view</span><button type="button" onClick={cancel} className="rounded-full border border-white/30 px-5 py-2 text-sm font-bold">Cancel</button></div>
  </div>
  {stage === "review" || stage === "sending" ? <div className="mt-4 space-y-3"><p className="text-sm font-bold">All five movements captured. Save this check to your driver application.</p>{comparisonNote ? <p className="text-sm leading-6 opacity-70">{comparisonNote}</p> : null}<div className="flex flex-wrap gap-3"><button type="button" disabled={working} className={btn} onClick={() => void saveCapture()}>{stage === "sending" ? "Saving…" : "Save camera check"}</button><button type="button" disabled={working} onClick={cancel} className="rounded-full border border-current/20 px-5 py-3 text-sm">Discard and retry</button></div></div> : null}
  {error ? <p role="alert" className="mt-4 text-sm leading-6">{error}</p> : null}
 </div>;
}
