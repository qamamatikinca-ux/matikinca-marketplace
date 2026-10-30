// Self-host the browser bundle explicitly: the package's Node entry must never
// be selected by the app bundler. No demographic models are loaded.
type FaceApi = typeof import("@vladmandic/face-api");
type BrowserApi = FaceApi & { tf: { ready(): Promise<void>; setBackend(name: string): Promise<boolean> } };
let loading: Promise<FaceApi> | null = null;
export function loadFaceComparison() {
 loading ??= (async () => {
  let api = (window as Window & { faceapi?: BrowserApi }).faceapi;
  if (!api) {
   await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    const timer = setTimeout(() => { script.remove(); reject(new Error("Face guidance could not load. Check your connection and retry.")); }, 18000);
    script.src = "/models/identity-v1/face-api.js";
    script.onload = () => { clearTimeout(timer); resolve(); };
    script.onerror = () => { clearTimeout(timer); script.remove(); reject(new Error("Face guidance could not load. Please retry.")); };
    document.head.appendChild(script);
   });
   api = (window as Window & { faceapi?: BrowserApi }).faceapi;
  }
  if (!api) throw new Error("Face guidance is not supported by this browser.");
  try { if (!await api.tf.setBackend("webgl")) throw new Error("WebGL unavailable"); await api.tf.ready(); }
  catch { await api.tf.setBackend("cpu"); await api.tf.ready(); }
  await Promise.all([
   api.nets.tinyFaceDetector.loadFromUri("/models/identity-v1"),
   api.nets.faceLandmark68Net.loadFromUri("/models/identity-v1"),
   api.nets.faceRecognitionNet.loadFromUri("/models/identity-v1"),
  ]);
  return api as FaceApi;
 })().catch(error => { loading = null; throw error; });
 return loading;
}
