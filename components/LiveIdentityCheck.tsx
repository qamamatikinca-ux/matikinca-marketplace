'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import LoadLinkSiteHeader from '@/components/LoadLinkSiteHeader';
import { useLoadLinkTheme } from '@/lib/useLoadLinkTheme';
import { supabase } from '@/lib/supabaseClient';
import { isAuthenticatedUser, loginHref } from '@/lib/auth';
import { loadFaceComparison } from '@/lib/faceComparison';
import { comparisonDistance, facePose, matchesPose, type Pose } from '@/lib/liveIdentity';

type Check = { id: string; user_id: string; challenge: Pose[]; status: string; review_feedback?: string; created_at: string };
type Evidence = { check: Check; identity: Blob; portrait: Blob; video: Blob; extension: string; observations: Record<string, unknown> };
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
async function jpeg(source: CanvasImageSource, width: number, height: number, max = 1280): Promise<Blob> {
  if (!width || !height) throw new Error('The camera image is not ready. Please retry.');
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, max / Math.max(width, height));
  canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser cannot capture images.');
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('The image could not be captured.')), 'image/jpeg', 0.88));
}
async function fileImage(file: File) {
  if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 8 * 1024 * 1024) throw new Error('Choose a JPG or PNG photograph of your ID, no larger than 8 MB.');
  const url = URL.createObjectURL(file);
  try { const img = new Image(); img.src = url; await img.decode(); return img; }
  finally { URL.revokeObjectURL(url); }
}
export default function LiveIdentityCheck({ initialPurpose = "account" }: { initialPurpose?: string }) {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [purpose, setPurpose] = useState(initialPurpose);
  const [camera, setCamera] = useState<'user' | 'environment'>('user');
  const [identity, setIdentity] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [stage, setStage] = useState<'ready' | 'preparing' | 'capturing' | 'review' | 'uploading' | 'done'>('ready');
  const [prompt, setPrompt] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [recent, setRecent] = useState<Check[]>([]);
  const [historyError, setHistoryError] = useState(false);
  const [preview, setPreview] = useState('');
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const evidence = useRef<Evidence | null>(null);
  const generation = useRef(0);
  const stopEarly = useRef(false);
  const starting = useRef(false);
  const uploading = useRef(false);
  const release = useCallback(() => {
    if (recorder.current && recorder.current.state !== 'inactive') recorder.current.stop();
    stream.current?.getTracks().forEach(track => track.stop()); stream.current = null;
  }, []);
  async function refreshHistory() {
    const { data, error: readError } = await supabase.from('identity_live_checks').select('id,user_id,challenge,status,review_feedback,created_at').order('created_at', { ascending: false }).limit(5);
    setHistoryError(Boolean(readError)); if (!readError) setRecent(data || []);
  }
  const invalidateCapture = useCallback(() => { generation.current++; release(); evidence.current = null; }, [release]);
  useEffect(() => {
    let active = true;
    void supabase.from("identity_live_checks").select("id,user_id,challenge,status,review_feedback,created_at").order("created_at", { ascending: false }).limit(5).then(({ data, error }) => {
      if (!active) return;
      setHistoryError(Boolean(error));
      if (!error) setRecent(data || []);
    });
    const visibility = () => { if (document.hidden && starting.current) { generation.current++; release(); evidence.current = null; setStage('ready'); setError('Capture stopped because the page was hidden. Start again when ready.'); } };
    document.addEventListener('visibilitychange', visibility);
    return () => { active = false; invalidateCapture(); document.removeEventListener('visibilitychange', visibility); };
  }, [invalidateCapture, release]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  function cancel() {
    generation.current++; release(); evidence.current = null; stopEarly.current = true;
    setPreview(''); setStage('ready'); setPrompt(''); setProgress(0);
  }
  async function start() {
    if (starting.current || !identity || !consent) return;
    starting.current = true;
    const run = ++generation.current;
    const valid = () => generation.current === run;
    setStage('preparing'); setError(''); setProgress(0); setPreview(''); evidence.current = null; stopEarly.current = false;
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!isAuthenticatedUser(user)) { window.location.assign(loginHref('/verify/live')); return; }
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('This browser cannot record a camera check. Use a recent Safari or Chrome, or request manual assistance below.');
      const img = await fileImage(identity);
      const idBlob = await jpeg(img, img.naturalWidth, img.naturalHeight, 2000);
      setPrompt('Preparing face guidance. This may take a moment on the first visit.');
      let api: Awaited<ReturnType<typeof loadFaceComparison>> | null = null;
      let idDescriptor: Float32Array | null = null;
      let comparisonNote = 'ID face could not be isolated; manual comparison required.';
      try {
        api = await Promise.race([loadFaceComparison(), delay(25000).then(() => { throw new Error('Model timeout'); })]);
        const faces = await api.detectAllFaces(img, new api.TinyFaceDetectorOptions({ inputSize: 608, scoreThreshold: 0.35 })).withFaceLandmarks().withFaceDescriptors();
        if (faces.length === 1) { idDescriptor = faces[0].descriptor; comparisonNote = 'Preliminary browser comparison only; not proof of identity or document authenticity.'; }
      } catch { api = null; comparisonNote = 'Automatic guidance unavailable; recording requires manual inspection.'; }
      if (!valid()) return;
      const { data: check, error: startError } = await supabase.rpc('loadlink_start_live_check', { p_purpose: purpose });
      if (startError) throw new Error(startError.code === '54000' ? 'Too many attempts. Try again in an hour.' : 'The check could not start. Sign in again or retry shortly.');
      if (!valid()) return;
      const currentStream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: camera }, width: { ideal: 640 }, height: { ideal: 480 } } });
      if (!valid()) { currentStream.getTracks().forEach(track => track.stop()); return; }
      stream.current = currentStream;
      const el = video.current;
      if (!el) throw new Error('Camera preview is unavailable.');
      el.srcObject = currentStream; await el.play();
      if (!valid()) return;
      const mime = ['video/webm;codecs=vp8', 'video/mp4', 'video/webm'].find(type => MediaRecorder.isTypeSupported(type));
      if (!mime) throw new Error('This browser cannot record a supported video. Use manual assistance below.');
      const chunks: Blob[] = [];
      const rec = new MediaRecorder(currentStream, { mimeType: mime, videoBitsPerSecond: 500000 });
      recorder.current = rec;
      let bytes = 0;
      rec.ondataavailable = event => { if (event.data.size) { bytes += event.data.size; chunks.push(event.data); if (bytes > 5 * 1024 * 1024) stopEarly.current = true; } };
      const stopped = new Promise<void>((resolve, reject) => { rec.onstop = () => resolve(); rec.onerror = () => reject(new Error('Video recording failed. Please retry.')); });
      let portrait = await jpeg(el, el.videoWidth, el.videoHeight, 800);
      let distance: number | null = null;
      let index = 0, stable = 0;
      const started = performance.now();
      let fallbackSince = started;
      rec.start(500); setStage('capturing');
      watchdog = setTimeout(() => { stopEarly.current = true; release(); }, 45000);
      const observations: Array<{ step: Pose; elapsed_ms: number; detected: boolean }> = [];
      while (valid() && index < check.challenge.length && performance.now() - started < 40000 && !stopEarly.current) {
        const target: Pose = check.challenge[index];
        const instructions = target === 'centre' ? 'Look straight at the camera and hold still.' : `Turn your head slowly towards the ${target} side of the preview. Keep the phone still.`;
        setPrompt(instructions);
        let reached = false;
        if (api) {
          const faces = await api.detectAllFaces(el, new api.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })).withFaceLandmarks().withFaceDescriptors();
          if (!valid()) return;
          const face = faces.length === 1 ? faces[0] : null;
          const position = face ? facePose(face.landmarks.positions) : null;
          const quality = Boolean(face && face.detection.box.width > el.videoWidth * 0.15);
          if (quality && matchesPose(position, target)) {
            stable++;
            if (stable >= 3) {
              reached = true;
              if (index === 0 && face) { portrait = await jpeg(el, el.videoWidth, el.videoHeight, 800); distance = idDescriptor ? comparisonDistance(idDescriptor, face.descriptor) : null; }
            }
          } else {
            stable = 0;
            if (!face) setPrompt(faces.length > 1 ? 'Only one person should be in the frame.' : 'Keep your face visible in good light. Remove anything covering your face.');
          }
        } else { reached = performance.now() - fallbackSince > 3000; }
        if (reached) { observations.push({ step: target, elapsed_ms: Math.round(performance.now() - started), detected: Boolean(api) }); index++; stable = 0; fallbackSince = performance.now(); setProgress(index); }
        await delay(200);
      }
      if (!valid()) return;
      if (rec.state !== 'inactive') rec.stop();
      await stopped; release();
      if (!valid()) return;
      const clip = new Blob(chunks, { type: mime.split(';')[0] });
      if (!clip.size || clip.size > 6 * 1024 * 1024) throw new Error('The recording could not be saved within the file limit. Please retry.');
      evidence.current = { check, identity: idBlob, portrait, video: clip, extension: mime.includes('mp4') ? 'mp4' : 'webm', observations: { steps: observations, complete: index === check.challenge.length, comparison_distance: distance, note: comparisonNote, duration_ms: Math.round(performance.now() - started), camera } };
      setPreview(URL.createObjectURL(clip)); setStage('review'); setPrompt('Review your recording before sending it privately to LoadLink.');
    } catch (e) {
      release();
      if (valid()) { setStage('ready'); setError(e instanceof Error && e.name === 'NotAllowedError' ? 'Camera access was not allowed. Enable camera access for LoadLink or use manual assistance.' : e instanceof Error ? e.message : 'The camera check could not finish. Please retry.'); }
    } finally { clearTimeout(watchdog); starting.current = false; }
  }
  async function submit() {
    const item = evidence.current;
    if (!item || uploading.current) return;
    uploading.current = true; setStage('uploading'); setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!isAuthenticatedUser(user) || user.id !== item.check.user_id) throw new Error('Your account changed. Start a new check after signing in.');
      const root = `${user.id}/${item.check.id}/`;
      for (const [name, blob] of [['identity.jpg', item.identity], ['portrait.jpg', item.portrait], [`capture.${item.extension}`, item.video]] as const) {
        const { error: uploadError } = await supabase.storage.from('identity-live-evidence').upload(root + name, blob, { contentType: blob.type, upsert: false });
        if (uploadError && String(uploadError.statusCode) !== '409' && !/already exists|duplicate/i.test(uploadError.message)) throw new Error('Evidence could not upload. Keep this page open and retry.');
      }
      const { error: finishError } = await supabase.rpc('loadlink_finish_live_check', { p_id: item.check.id, p_video_extension: item.extension, p_observations: item.observations });
      if (finishError) throw new Error(finishError.code === '55000' ? 'This check expired. Please record a new check.' : 'Submission could not be confirmed. Retry without recording again.');
      evidence.current = null; setPreview(''); setIdentity(null); setStage('done'); void refreshHistory();
    } catch (e) { setError(e instanceof Error ? e.message : 'Submission failed. Retry.'); setStage('review'); }
    finally { uploading.current = false; }
  }
  const busy = ['preparing', 'capturing', 'uploading'].includes(stage);
  const box = `rounded-2xl border p-5 ${darkMode ? 'border-white/15 bg-[#101010]' : 'border-black/10 bg-white'}`;
  const button = 'rounded-full bg-[#f6b800] px-5 py-3 text-sm font-bold text-black disabled:opacity-40';
  return <main className={`min-h-screen ${darkMode ? 'bg-black text-white' : 'bg-[#f4efe3] text-black'}`}>
    <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />
    <section className="mx-auto max-w-2xl space-y-5 px-4 py-8">
      <Link href="/verify" className="text-sm underline">Back to verification</Link>
      <h1 className="text-3xl font-black">Guided camera check</h1>
      <p className="text-sm leading-6 opacity-75">Have your ID or passport ready. Follow the head-turn prompts while keeping your phone still. Choose either camera. Recording stops after 40 seconds; preparation, upload and manual review can take longer.</p>
      <div className={box}>
        <p className="text-sm leading-6">This early version compares your face with the ID photo and records movement for staff review. It does not prove that an ID is genuine or rule out replay attacks. No automatic verified badge is awarded.</p>
        <p className="mt-3 text-sm leading-6">Your ID photo, face image and silent video are stored privately for security and review. Facial comparison runs on your device; facial descriptors are not stored. <Link href="/legal#verification-security" className="font-bold underline">Security and evidence policy</Link>.</p>
      </div>
      {stage === 'ready' || stage === 'preparing' ? <div className={`${box} space-y-4`}>
        <label className="block text-sm font-bold">Reason for checking<select disabled={busy} value={purpose} onChange={e => setPurpose(e.target.value)} className="mt-2 block w-full rounded-xl border border-current/25 bg-transparent p-3"><option value="account">Optional account verification</option><option value="driver">Driver profile</option><option value="vehicle">Vehicle listing</option></select></label>
        <label className="block text-sm font-bold">Camera<select disabled={busy} value={camera} onChange={e => setCamera(e.target.value as typeof camera)} className="mt-2 block w-full rounded-xl border border-current/25 bg-transparent p-3"><option value="user">Front camera</option><option value="environment">Back camera</option></select></label>
        <label className="block text-sm font-bold">Photo of the ID page showing your face<input type="file" disabled={busy} accept="image/jpeg,image/png" onChange={e => setIdentity(e.target.files?.[0] || null)} className="mt-2 block w-full text-sm" /></label>
        <p className="text-xs opacity-70">JPG or PNG, up to 8 MB. Show the complete document clearly. A PDF cannot be compared in this camera flow.</p>
        <label className="flex gap-3 text-sm leading-6"><input type="checkbox" disabled={busy} checked={consent} onChange={e => setConsent(e.target.checked)} />I agree to capture and send my ID, face image and silent recording for LoadLink’s private identity review.</label>
        <button type="button" className={button} disabled={!identity || !consent || busy} onClick={() => void start()}>{stage === 'preparing' ? 'Preparing…' : 'Start camera check'}</button>
      </div> : null}
      <div className={stage === 'capturing' || stage === 'preparing' ? box : 'hidden'}>
        <video ref={video} autoPlay muted playsInline className="aspect-[4/3] w-full rounded-xl bg-black object-contain" />
        <p role="status" aria-live="polite" className="mt-4 text-lg font-bold">{prompt}</p>
        <p className="mt-2 text-sm">Step {Math.min(progress + 1, 5)} of 5</p>
        <div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={cancel} className="rounded-full border border-current/25 px-5 py-3 text-sm">Cancel</button>{stage === 'capturing' ? <button type="button" onClick={() => { stopEarly.current = true; }} className="rounded-full border border-current/25 px-5 py-3 text-sm">Finish and request manual review</button> : null}</div>
      </div>
      {stage === 'review' || stage === 'uploading' ? <div className={`${box} space-y-4`}><h2 className="text-xl font-bold">Check your recording</h2><video src={preview} controls playsInline className="w-full rounded-xl bg-black" /><p className="text-sm">Staff will compare this recording with your ID. If movement or matching was unclear, they may ask you to retry.</p><div className="flex flex-wrap gap-3"><button type="button" disabled={busy} onClick={() => void submit()} className={button}>{stage === 'uploading' ? 'Sending evidence…' : 'Send for private review'}</button><button type="button" disabled={busy} onClick={cancel} className="rounded-full border border-current/25 px-5 py-3 text-sm">Discard and retry</button></div></div> : null}
      {stage === 'done' ? <div className={box}><h2 className="text-xl font-bold">Sent for manual review</h2><p className="mt-2 text-sm">Your evidence is in the Control Centre review queue. This is not an approval.</p><button className={`${button} mt-4`} onClick={cancel}>Start another check</button></div> : null}
      {error ? <p role="alert" className={`${box} text-sm`}>{error}</p> : null}
      <p className="text-sm leading-6">Cannot turn your head comfortably or use the camera? <Link href="/help" className="font-bold underline">Request manual assistance</Link>. Never force a movement.</p>
      <div className={box}><h2 className="font-bold">Recent checks</h2>{historyError ? <p className="mt-2 text-sm">Sign in to view your checks, or <button className="underline" onClick={() => void refreshHistory()}>retry loading</button>.</p> : recent.length ? recent.map(check => <div key={check.id} className="mt-3 border-t border-current/15 pt-3 text-sm"><p>{new Date(check.created_at).toLocaleDateString()} · {check.status === 'collecting' ? 'Not submitted' : check.status === 'manual_match' ? 'Staff recorded a visual match — account verification is separate' : check.status === 'retry_required' ? 'Another capture requested' : 'Waiting for manual review'}</p>{check.review_feedback ? <p className="mt-1 opacity-75">{check.review_feedback}</p> : null}</div>) : <p className="mt-2 text-sm opacity-70">No checks submitted yet.</p>}</div>
    </section>
  </main>;
}
