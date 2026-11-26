/** Camera readiness and useful device permission errors for the guided evidence capture. */
export function cameraFailureText(error: unknown): string {
  const e = error as { name?: string; message?: string } | null;
  if (e?.name === "NotAllowedError" || e?.name === "PermissionDeniedError")
    return "Camera access was denied. Allow camera access for LoadLink in your browser settings, then retry or request staff review.";
  if (e?.name === "NotFoundError" || e?.name === "DevicesNotFoundError")
    return "No available front camera was detected. Try another device or request staff review.";
  if (e?.name === "NotReadableError" || e?.name === "TrackStartError")
    return "Another app may be using the camera. Close other camera apps and try again.";
  if (e?.name === "OverconstrainedError")
    return "Your front camera could not open with the requested settings. Retry with basic camera settings.";
  return e?.message || "The camera check could not finish. Retry or request staff review.";
}

export function selectRecordingMime(isSupported: (type: string) => boolean) {
  return ["video/mp4", "video/webm;codecs=vp8", "video/webm"].find(isSupported) || "";
}

export function waitForCameraFrame(video: HTMLVideoElement, timeoutMs = 12000): Promise<void> {
  if (video.videoWidth > 0 && video.videoHeight > 0 && video.readyState >= 2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    let finished = false;
    const finish = (error?: Error) => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timer);
      video.removeEventListener("loadedmetadata", check);
      video.removeEventListener("loadeddata", check);
      video.removeEventListener("playing", check);
      if (error) reject(error);
      else resolve();
    };
    const check = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0 && video.readyState >= 2) finish();
    };
    const timer = window.setTimeout(
      () => finish(new Error("The camera opened but did not provide a picture. Retry or request staff review.")),
      timeoutMs,
    );
    video.addEventListener("loadedmetadata", check);
    video.addEventListener("loadeddata", check);
    video.addEventListener("playing", check);
    check();
  });
}
